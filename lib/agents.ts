import { randomUUID } from "crypto"
import { ensureSchema, query } from "@/lib/db"
import type { AppModule } from "@/lib/modules/types"

export interface Agent {
  id: string
  adminUserId: string | null
  module: AppModule
  type: string
  branchId: string | null
  territory: string
  status: string
  commissionBasis: string
  commissionValue: number
  monthlyTarget: number
  targetBonus: number
  photoUrl: string
  phone: string
  email: string
  idNumber: string
  createdAt: string
  updatedAt: string
  adminName?: string
  adminEmail?: string
}

interface AgentRow {
  id: string
  admin_user_id: string | null
  module: AppModule
  type: string
  branch_id: string | null
  territory: string
  status: string
  commission_basis: string
  commission_value: string | number
  monthly_target: string | number
  target_bonus: string | number
  photo_url: string
  phone: string
  email: string
  id_number: string
  created_at: string
  updated_at: string
  admin_name?: string
  admin_email?: string
}

function num(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    adminUserId: row.admin_user_id,
    module: row.module,
    type: row.type,
    branchId: row.branch_id,
    territory: row.territory || "",
    status: row.status,
    commissionBasis: row.commission_basis,
    commissionValue: num(row.commission_value),
    monthlyTarget: num(row.monthly_target),
    targetBonus: num(row.target_bonus),
    photoUrl: row.photo_url || "",
    phone: row.phone || "",
    email: row.email || "",
    idNumber: row.id_number || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    adminName: row.admin_name || undefined,
    adminEmail: row.admin_email || undefined,
  }
}

const AGENT_SELECT = `
  SELECT ag.*, a.name AS admin_name, a.email AS admin_email
  FROM agents ag
  LEFT JOIN admin_users a ON a.id = ag.admin_user_id
`

export async function listAgents(filters: { module?: AppModule; status?: string } = {}): Promise<Agent[]> {
  await ensureSchema()
  const clauses: string[] = []
  const params: unknown[] = []
  if (filters.module) {
    params.push(filters.module)
    clauses.push(`ag.module = $${params.length}`)
  }
  if (filters.status) {
    params.push(filters.status)
    clauses.push(`ag.status = $${params.length}`)
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""
  const result = await query<AgentRow>(
    `${AGENT_SELECT} ${where} ORDER BY ag.created_at DESC LIMIT 300`,
    params
  )
  return result.rows.map(mapAgent)
}

export async function getAgent(id: string): Promise<Agent | null> {
  await ensureSchema()
  const result = await query<AgentRow>(`${AGENT_SELECT} WHERE ag.id = $1`, [id])
  return result.rows[0] ? mapAgent(result.rows[0]) : null
}

export interface SaveAgentInput {
  id?: string
  adminUserId?: string | null
  module: AppModule
  type?: string
  branchId?: string | null
  territory?: string
  status?: string
  commissionBasis?: string
  commissionValue?: number
  monthlyTarget?: number
  targetBonus?: number
  photoUrl?: string
  phone?: string
  email?: string
  idNumber?: string
}

export async function saveAgent(input: SaveAgentInput): Promise<Agent> {
  await ensureSchema()
  const id = input.id || randomUUID()
  const result = await query<AgentRow>(
    `INSERT INTO agents
       (id, admin_user_id, module, type, branch_id, territory, status, commission_basis,
        commission_value, monthly_target, target_bonus, photo_url, phone, email, id_number)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (id) DO UPDATE SET
       admin_user_id = EXCLUDED.admin_user_id,
       module = EXCLUDED.module,
       type = EXCLUDED.type,
       branch_id = EXCLUDED.branch_id,
       territory = EXCLUDED.territory,
       status = EXCLUDED.status,
       commission_basis = EXCLUDED.commission_basis,
       commission_value = EXCLUDED.commission_value,
       monthly_target = EXCLUDED.monthly_target,
       target_bonus = EXCLUDED.target_bonus,
       photo_url = EXCLUDED.photo_url,
       phone = EXCLUDED.phone,
       email = EXCLUDED.email,
       id_number = EXCLUDED.id_number,
       updated_at = NOW()
     RETURNING *`,
    [
      id,
      input.adminUserId || null,
      input.module,
      input.type || "field",
      input.branchId || null,
      input.territory || "",
      input.status || "active",
      input.commissionBasis || "sales",
      input.commissionValue ?? 0,
      input.monthlyTarget ?? 0,
      input.targetBonus ?? 0,
      input.photoUrl || "",
      input.phone || "",
      input.email || "",
      input.idNumber || "",
    ]
  )
  const saved = mapAgent(result.rows[0])
  const withAdmin = await getAgent(saved.id)
  return withAdmin || saved
}

export async function deleteAgent(id: string): Promise<boolean> {
  await ensureSchema()
  const result = await query("DELETE FROM agents WHERE id = $1", [id])
  return (result.rowCount ?? 0) > 0
}

export interface AdminOption {
  id: string
  name: string
  email: string
  role: string
}

export async function listAgentAdminOptions(module?: AppModule): Promise<AdminOption[]> {
  await ensureSchema()
  const clauses = [`status = 'active'`, `role IN ('cashier', 'field_agent', 'manager')`]
  const params: unknown[] = []
  if (module) {
    params.push(module)
    clauses.push(`$${params.length} = ANY(modules)`)
  }
  const result = await query<AdminOption>(
    `SELECT id, name, email, role FROM admin_users
     WHERE ${clauses.join(" AND ")}
     ORDER BY name ASC LIMIT 300`,
    params
  )
  return result.rows
}
