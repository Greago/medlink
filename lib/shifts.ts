import { randomUUID } from "crypto"
import { ensureSchema, getSettings, query, withTransaction } from "@/lib/db"
import { nextDocumentNumberIn } from "@/lib/document-numbering"
import type { AppModule } from "@/lib/modules/types"

export interface Shift {
  id: string
  module: AppModule
  branchId: string | null
  cashierId: string
  shiftNumber: string
  openingFloat: number
  expectedCash: number
  countedCash: number | null
  variance: number | null
  notes: string
  status: "open" | "closed"
  openedAt: string
  closedAt: string | null
  cashierName?: string
}

interface ShiftRow {
  id: string
  module: AppModule
  branch_id: string | null
  cashier_id: string
  shift_number: string
  opening_float: string | number
  expected_cash: string | number
  counted_cash: string | number | null
  variance: string | number | null
  notes: string
  status: string
  opened_at: string
  closed_at: string | null
  cashier_name?: string
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    module: row.module,
    branchId: row.branch_id,
    cashierId: row.cashier_id,
    shiftNumber: row.shift_number,
    openingFloat: numberOrZero(row.opening_float),
    expectedCash: numberOrZero(row.expected_cash),
    countedCash: row.counted_cash == null ? null : numberOrZero(row.counted_cash),
    variance: row.variance == null ? null : numberOrZero(row.variance),
    notes: row.notes || "",
    status: row.status === "closed" ? "closed" : "open",
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    cashierName: row.cashier_name || undefined,
  }
}

const SHIFT_SELECT = `
  SELECT s.*, a.name AS cashier_name
  FROM shifts s
  LEFT JOIN admin_users a ON a.id = s.cashier_id
`

export async function getCurrentShift(module: AppModule, cashierId: string): Promise<Shift | null> {
  await ensureSchema()
  const result = await query<ShiftRow>(
    `${SHIFT_SELECT} WHERE s.module = $1 AND s.cashier_id = $2 AND s.status = 'open'
     ORDER BY s.opened_at DESC LIMIT 1`,
    [module, cashierId]
  )
  return result.rows[0] ? mapShift(result.rows[0]) : null
}

export async function openShift(input: {
  module: AppModule
  cashierId: string
  branchId?: string | null
  openingFloat: number
  notes?: string
}): Promise<Shift> {
  await ensureSchema()
  return withTransaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM shifts WHERE module = $1 AND cashier_id = $2 AND status = 'open' LIMIT 1",
      [input.module, input.cashierId]
    )
    if (existing.rows[0]) throw new Error("You already have an open shift. Close it before opening another.")

    const settings = await getSettings()
    const shiftNumber = await nextDocumentNumberIn(client, input.module, "shift", settings)
    const id = randomUUID()
    const result = await client.query<ShiftRow>(
      `INSERT INTO shifts (id, module, branch_id, cashier_id, shift_number, opening_float, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [id, input.module, input.branchId || null, input.cashierId, shiftNumber, input.openingFloat, input.notes || ""]
    )
    return mapShift(result.rows[0])
  })
}

async function computeExpectedCash(client: { query: typeof query }, shiftId: string, openingFloat: number): Promise<number> {
  const [cashSales, cashRefunds] = await Promise.all([
    client.query<{ total: string | number }>(
      `SELECT COALESCE(SUM(sp.amount), 0) AS total
       FROM sale_payments sp
       JOIN sales s ON s.id = sp.sale_id
       WHERE s.shift_id = $1 AND sp.method = 'cash' AND s.is_void = FALSE`,
      [shiftId]
    ),
    client.query<{ total: string | number }>(
      `SELECT COALESCE(SUM(r.total), 0) AS total
       FROM returns r
       JOIN sales s ON s.id = r.sale_id
       WHERE s.shift_id = $1 AND r.refund_method = 'cash' AND r.store_credit = 0`,
      [shiftId]
    ),
  ])
  return Number(
    (numberOrZero(openingFloat) + numberOrZero(cashSales.rows[0]?.total) - numberOrZero(cashRefunds.rows[0]?.total)).toFixed(2)
  )
}

export async function closeShift(input: {
  shiftId: string
  adminId: string
  countedCash: number
  notes?: string
}): Promise<Shift> {
  await ensureSchema()
  return withTransaction(async (client) => {
    const result = await client.query<ShiftRow>(
      "SELECT * FROM shifts WHERE id = $1 FOR UPDATE OF shifts",
      [input.shiftId]
    )
    const shift = result.rows[0]
    if (!shift) throw new Error("Shift not found.")
    if (shift.status === "closed") throw new Error("This shift is already closed.")

    const expected = await computeExpectedCash(client, input.shiftId, numberOrZero(shift.opening_float))
    const variance = Number((numberOrZero(input.countedCash) - expected).toFixed(2))
    const updated = await client.query<ShiftRow>(
      `UPDATE shifts
       SET counted_cash = $2, expected_cash = $3, variance = $4, notes = COALESCE(NULLIF($5, ''), notes),
           status = 'closed', closed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [input.shiftId, input.countedCash, expected, variance, input.notes || ""]
    )
    return mapShift(updated.rows[0])
  })
}

export interface ShiftReport {
  shift: Shift
  salesCount: number
  voidedCount: number
  refundTotal: number
  paymentBreakdown: { method: string; total: number }[]
  expectedCash: number
  variance: number | null
}

export async function getShiftReport(shiftId: string): Promise<ShiftReport | null> {
  await ensureSchema()
  const shiftResult = await query<ShiftRow>(`${SHIFT_SELECT} WHERE s.id = $1`, [shiftId])
  const shiftRow = shiftResult.rows[0]
  if (!shiftRow) return null

  const [summary, refunds, payments] = await Promise.all([
    query<{ sales_count: number; voided_count: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE is_void = FALSE)::int AS sales_count,
         COUNT(*) FILTER (WHERE is_void = TRUE)::int AS voided_count
       FROM sales WHERE shift_id = $1`,
      [shiftId]
    ),
    query<{ total: string | number }>(
      `SELECT COALESCE(SUM(r.total), 0) AS total
       FROM returns r JOIN sales s ON s.id = r.sale_id
       WHERE s.shift_id = $1`,
      [shiftId]
    ),
    query<{ method: string; total: string | number }>(
      `SELECT sp.method, COALESCE(SUM(sp.amount), 0) AS total
       FROM sale_payments sp JOIN sales s ON s.id = sp.sale_id
       WHERE s.shift_id = $1 AND s.is_void = FALSE
       GROUP BY sp.method ORDER BY sp.method`,
      [shiftId]
    ),
  ])

  const shift = mapShift(shiftRow)
  const expectedCash =
    shift.status === "open"
      ? await computeExpectedCash({ query }, shiftId, shift.openingFloat)
      : shift.expectedCash
  return {
    shift,
    salesCount: numberOrZero(summary.rows[0]?.sales_count),
    voidedCount: numberOrZero(summary.rows[0]?.voided_count),
    refundTotal: numberOrZero(refunds.rows[0]?.total),
    paymentBreakdown: payments.rows.map((row) => ({ method: row.method, total: numberOrZero(row.total) })),
    expectedCash,
    variance: shift.status === "open" ? null : shift.variance,
  }
}

export async function listShifts(filters: {
  module: AppModule
  cashierId?: string
  from?: string
  to?: string
  limit?: number
}): Promise<Shift[]> {
  await ensureSchema()
  const clauses = ["s.module = $1"]
  const params: unknown[] = [filters.module]
  if (filters.cashierId) {
    params.push(filters.cashierId)
    clauses.push(`s.cashier_id = $${params.length}`)
  }
  if (filters.from) {
    params.push(filters.from)
    clauses.push(`s.opened_at >= $${params.length}`)
  }
  if (filters.to) {
    params.push(filters.to)
    clauses.push(`s.opened_at <= $${params.length}`)
  }
  params.push(Math.min(Math.max(filters.limit || 100, 1), 500))
  const result = await query<ShiftRow>(
    `${SHIFT_SELECT} WHERE ${clauses.join(" AND ")} ORDER BY s.opened_at DESC LIMIT $${params.length}`,
    params
  )
  return result.rows.map(mapShift)
}
