import { randomUUID } from "crypto"
import type { QueryResultRow } from "pg"
import { ensureSchema, getAdminByEmail, query } from "@/lib/db"
import type { AppModule } from "@/lib/modules/types"
import { hashPassword } from "@/lib/password"
import {
  normalizeModules,
  normalizePermissions,
  normalizeRole,
  type AdminRole,
  type Permission,
} from "@/lib/roles"

export interface StaffMember {
  id: string
  name: string
  email: string
  role: AdminRole
  modules: AppModule[]
  status: "active" | "inactive"
  maxDiscountPercent: number
  permissions: Permission[] | null
  mustChangePassword: boolean
  phone: string
  idNumber: string
  branchId: string | null
  createdAt: string
  updatedAt: string
}

interface StaffRow extends QueryResultRow {
  id: string
  name: string
  email: string
  role?: string
  modules?: string[] | string | null
  status?: string
  max_discount_percent?: string | number
  permissions?: string[] | string | null
  must_change_password?: boolean
  phone?: string
  id_number?: string
  branch_id?: string | null
  created_at: string
  updated_at: string
}

const STAFF_SELECT = `
  SELECT id, name, email, role, modules, status, max_discount_percent,
         permissions, must_change_password, phone, id_number, branch_id,
         created_at, updated_at
  FROM admin_users
`

function mapStaff(row: StaffRow): StaffMember {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: normalizeRole(row.role) as AdminRole,
    modules: normalizeModules(row.modules),
    status: row.status === "inactive" ? "inactive" : "active",
    maxDiscountPercent: Number(row.max_discount_percent ?? 0),
    permissions: normalizePermissions(row.permissions),
    mustChangePassword: Boolean(row.must_change_password),
    phone: row.phone || "",
    idNumber: row.id_number || "",
    branchId: row.branch_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listStaffMembers(): Promise<StaffMember[]> {
  await ensureSchema()
  const result = await query<StaffRow>(`${STAFF_SELECT} ORDER BY created_at ASC LIMIT 300`)
  return result.rows.map(mapStaff)
}

export async function getStaffMember(id: string): Promise<StaffMember | null> {
  await ensureSchema()
  const result = await query<StaffRow>(`${STAFF_SELECT} WHERE id = $1`, [id])
  return result.rows[0] ? mapStaff(result.rows[0]) : null
}

export interface CreateStaffInput {
  name: string
  email: string
  password: string
  role: AdminRole
  modules: AppModule[]
  status?: "active" | "inactive"
  maxDiscountPercent?: number
  permissions?: Permission[] | null
  phone?: string
  idNumber?: string
}

export async function createStaffMember(input: CreateStaffInput): Promise<StaffMember> {
  await ensureSchema()
  const result = await query<StaffRow>(
    `INSERT INTO admin_users
       (id, name, email, password_hash, role, modules, status, max_discount_percent,
        permissions, must_change_password, phone, id_number)
     VALUES ($1,$2,$3,$4,$5,$6::text[],$7,$8,$9::text[],TRUE,$10,$11)
     RETURNING id, name, email, role, modules, status, max_discount_percent,
               permissions, must_change_password, phone, id_number, branch_id,
               created_at, updated_at`,
    [
      randomUUID(),
      input.name.trim(),
      input.email.trim().toLowerCase(),
      await hashPassword(input.password),
      input.role,
      input.modules,
      input.status || "active",
      input.maxDiscountPercent ?? 0,
      input.permissions ?? null,
      input.phone || "",
      input.idNumber || "",
    ]
  )
  return mapStaff(result.rows[0])
}

export interface UpdateStaffInput {
  name?: string
  email?: string
  role?: AdminRole
  modules?: AppModule[]
  status?: "active" | "inactive"
  maxDiscountPercent?: number
  permissions?: Permission[] | null
  mustChangePassword?: boolean
  phone?: string
  idNumber?: string
  passwordHash?: string | null
}

export async function updateStaffMember(id: string, input: UpdateStaffInput): Promise<StaffMember | null> {
  await ensureSchema()
  const existing = await getStaffMember(id)
  if (!existing) return null

  const result = await query<StaffRow>(
    `UPDATE admin_users
        SET name = $2,
            email = $3,
            role = $4,
            modules = $5::text[],
            status = $6,
            max_discount_percent = $7,
            permissions = $8::text[],
            must_change_password = COALESCE($9, must_change_password),
            phone = $10,
            id_number = $11,
            password_hash = COALESCE($12, password_hash),
            updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, email, role, modules, status, max_discount_percent,
                permissions, must_change_password, phone, id_number, branch_id,
                created_at, updated_at`,
    [
      id,
      (input.name ?? existing.name).trim(),
      (input.email ?? existing.email).trim().toLowerCase(),
      input.role ?? existing.role,
      input.modules ?? existing.modules,
      input.status ?? existing.status,
      input.maxDiscountPercent ?? existing.maxDiscountPercent,
      input.permissions !== undefined ? input.permissions : existing.permissions,
      input.mustChangePassword ?? null,
      input.phone ?? existing.phone,
      input.idNumber ?? existing.idNumber,
      input.passwordHash ?? null,
    ]
  )
  if (input.passwordHash) {
    await query("DELETE FROM admin_sessions WHERE admin_id = $1", [id])
  }
  return result.rows[0] ? mapStaff(result.rows[0]) : null
}

export async function resetStaffPassword(id: string, password: string): Promise<StaffMember | null> {
  await ensureSchema()
  return updateStaffMember(id, {
    passwordHash: await hashPassword(password),
    mustChangePassword: true,
  })
}

export async function clearMustChangePassword(id: string): Promise<void> {
  await ensureSchema()
  await query("UPDATE admin_users SET must_change_password = FALSE, updated_at = NOW() WHERE id = $1", [id])
}

export async function deleteAllAdminSessions(adminId: string): Promise<void> {
  await ensureSchema()
  await query("DELETE FROM admin_sessions WHERE admin_id = $1", [adminId])
}

export async function emailTakenByOtherStaff(email: string, excludeId?: string): Promise<boolean> {
  await ensureSchema()
  const existing = await getAdminByEmail(email)
  return Boolean(existing && existing.id !== excludeId)
}

interface AdminTokenRow extends QueryResultRow {
  admin_id: string
}

export async function createAdminPasswordResetToken(
  adminId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<void> {
  await ensureSchema()
  await query("DELETE FROM admin_password_reset_tokens WHERE admin_id = $1", [adminId])
  await query(
    `INSERT INTO admin_password_reset_tokens (token_hash, admin_id, expires_at)
     VALUES ($1, $2, $3)`,
    [tokenHash, adminId, expiresAt]
  )
}

export async function deleteAdminPasswordResetTokens(adminId: string): Promise<void> {
  await ensureSchema()
  await query("DELETE FROM admin_password_reset_tokens WHERE admin_id = $1", [adminId])
}

export async function consumeAdminPasswordResetToken(tokenHash: string): Promise<StaffMember | null> {
  await ensureSchema()
  const result = await query<AdminTokenRow>(
    `DELETE FROM admin_password_reset_tokens
      WHERE token_hash = $1 AND expires_at > NOW()
      RETURNING admin_id`,
    [tokenHash]
  )
  const adminId = result.rows[0]?.admin_id
  return adminId ? getStaffMember(adminId) : null
}
