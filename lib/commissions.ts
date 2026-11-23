import { randomUUID } from "crypto"
import { ensureSchema, query, withTransaction } from "@/lib/db"
import type { AppModule } from "@/lib/modules/types"
import { getAgent } from "@/lib/agents"

export interface CommissionStatement {
  id: string
  agentId: string
  module: AppModule
  periodStart: string
  periodEnd: string
  salesTotal: number
  grossProfit: number
  commissionAmount: number
  bonusAmount: number
  status: string
  approvedBy: string | null
  paidAt: string | null
  createdAt: string
  agentName?: string
}

interface StatementRow {
  id: string
  agent_id: string
  module: AppModule
  period_start: string
  period_end: string
  sales_total: string | number
  gross_profit: string | number
  commission_amount: string | number
  bonus_amount: string | number
  status: string
  approved_by: string | null
  paid_at: string | null
  created_at: string
  agent_name?: string
}

function num(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapStatement(row: StatementRow): CommissionStatement {
  return {
    id: row.id,
    agentId: row.agent_id,
    module: row.module,
    periodStart: String(row.period_start).slice(0, 10),
    periodEnd: String(row.period_end).slice(0, 10),
    salesTotal: num(row.sales_total),
    grossProfit: num(row.gross_profit),
    commissionAmount: num(row.commission_amount),
    bonusAmount: num(row.bonus_amount),
    status: row.status,
    approvedBy: row.approved_by,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    agentName: row.agent_name || undefined,
  }
}

const STATEMENT_SELECT = `
  SELECT cs.*,
         COALESCE(a.name, ag.territory, 'Agent') AS agent_name
  FROM commission_statements cs
  LEFT JOIN agents ag ON ag.id = cs.agent_id
  LEFT JOIN admin_users a ON a.id = ag.admin_user_id
`

export async function listStatements(filters: { module?: AppModule; agentId?: string } = {}): Promise<CommissionStatement[]> {
  await ensureSchema()
  const clauses: string[] = []
  const params: unknown[] = []
  if (filters.module) {
    params.push(filters.module)
    clauses.push(`cs.module = $${params.length}`)
  }
  if (filters.agentId) {
    params.push(filters.agentId)
    clauses.push(`cs.agent_id = $${params.length}`)
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""
  const result = await query<StatementRow>(
    `${STATEMENT_SELECT} ${where} ORDER BY cs.period_start DESC, cs.created_at DESC LIMIT 300`,
    params
  )
  return result.rows.map(mapStatement)
}

export async function getStatement(id: string): Promise<CommissionStatement | null> {
  await ensureSchema()
  const result = await query<StatementRow>(`${STATEMENT_SELECT} WHERE cs.id = $1`, [id])
  return result.rows[0] ? mapStatement(result.rows[0]) : null
}

export async function generateStatement(input: {
  agentId: string
  periodStart: string
  periodEnd: string
}): Promise<CommissionStatement> {
  await ensureSchema()
  const agent = await getAgent(input.agentId)
  if (!agent) throw new Error("Agent not found.")

  return withTransaction(async (client) => {
    const totals = await client.query<{
      sales_total: string | number
      gross_profit: string | number
    }>(
      `SELECT COALESCE(SUM(total), 0) AS sales_total, COALESCE(SUM(profit), 0) AS gross_profit
       FROM sales
       WHERE agent_id = $1 AND is_void = FALSE AND status IN ('completed', 'paid')
         AND created_at::date >= $2::date AND created_at::date <= $3::date`,
      [input.agentId, input.periodStart, input.periodEnd]
    )
    const salesTotal = num(totals.rows[0]?.sales_total)
    const grossProfit = num(totals.rows[0]?.gross_profit)

    const rulesResult = await client.query<{
      category_id: string | null
      basis: string
      percentage: string | number
      flat_amount: string | number
    }>(
      `SELECT category_id, basis, percentage, flat_amount
       FROM commission_rules
       WHERE agent_id = $1 AND active = TRUE AND effective_from::date <= $2::date`,
      [input.agentId, input.periodEnd]
    )
    const rules = rulesResult.rows

    let ruleCommission = 0
    let flatCommission = 0
    if (rules.length) {
      const lines = await client.query<{
        line_total: string | number
        profit: number
        category: string
      }>(
        `SELECT si.line_total,
                (si.line_total - si.tax_amount - si.unit_cost * si.quantity) AS profit,
                p.category
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         JOIN products p ON p.id = si.product_id
         WHERE s.agent_id = $1 AND s.is_void = FALSE AND s.status IN ('completed', 'paid')
           AND s.created_at::date >= $2::date AND s.created_at::date <= $3::date`,
        [input.agentId, input.periodStart, input.periodEnd]
      )
      for (const line of lines.rows) {
        const matching = rules.filter((rule) => !rule.category_id || rule.category_id === line.category)
        const rule = matching.sort((a, b) => (a.category_id ? -1 : 1) - (b.category_id ? -1 : 1))[0]
        if (!rule) continue
        const base = rule.basis === "profit" ? num(line.profit) : num(line.line_total)
        ruleCommission += (base * num(rule.percentage)) / 100
        flatCommission += num(rule.flat_amount)
      }
    }

    const agentValue = num(agent.commissionValue)
    const agentBase =
      agent.commissionBasis === "flat"
        ? agentValue
        : agent.commissionBasis === "profit"
          ? (grossProfit * agentValue) / 100
          : (salesTotal * agentValue) / 100
    const commissionAmount = Number((rules.length ? ruleCommission + flatCommission : agentBase).toFixed(2))
    const bonusAmount =
      agent.monthlyTarget > 0 && salesTotal >= agent.monthlyTarget ? num(agent.targetBonus) : 0

    const existing = await client.query<{ id: string; status: string }>(
      `SELECT id, status FROM commission_statements
       WHERE agent_id = $1 AND period_start = $2::date AND period_end = $3::date
       ORDER BY created_at DESC LIMIT 1`,
      [input.agentId, input.periodStart, input.periodEnd]
    )
    const previous = existing.rows[0]
    if (previous && previous.status !== "draft") {
      throw new Error("A finalised statement already exists for this agent and period.")
    }

    const id = previous?.id || randomUUID()
    const result = await client.query<StatementRow>(
      `INSERT INTO commission_statements
         (id, agent_id, module, period_start, period_end, sales_total, gross_profit,
          commission_amount, bonus_amount, status)
       VALUES ($1,$2,$3,$4::date,$5::date,$6,$7,$8,$9,'draft')
       ON CONFLICT (id) DO UPDATE SET
         sales_total = EXCLUDED.sales_total,
         gross_profit = EXCLUDED.gross_profit,
         commission_amount = EXCLUDED.commission_amount,
         bonus_amount = EXCLUDED.bonus_amount
       RETURNING *`,
      [
        id,
        input.agentId,
        agent.module,
        input.periodStart,
        input.periodEnd,
        salesTotal,
        grossProfit,
        commissionAmount,
        bonusAmount,
      ]
    )
    return mapStatement(result.rows[0])
  })
}

export async function updateStatementStatus(
  id: string,
  status: "approved" | "paid",
  adminId: string
): Promise<CommissionStatement | null> {
  await ensureSchema()
  const current = await getStatement(id)
  if (!current) return null
  if (status === "paid" && current.status !== "approved") {
    throw new Error("Only approved statements can be marked as paid.")
  }
  const result = await query<StatementRow>(
    `UPDATE commission_statements
     SET status = $2,
         approved_by = CASE WHEN $2 = 'approved' THEN $3 ELSE approved_by END,
         paid_at = CASE WHEN $2 = 'paid' THEN NOW() ELSE paid_at END
     WHERE id = $1
     RETURNING *`,
    [id, status, adminId]
  )
  const statement = mapStatement(result.rows[0])
  const withAgent = await getStatement(statement.id)
  return withAgent || statement
}
