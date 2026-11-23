import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiAuthError, apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { parseModuleFromRequest } from "@/lib/modules/server"
import { hashPassword } from "@/lib/password"
import { PERMISSIONS, type AdminRole, type Permission } from "@/lib/roles"
import { emailTakenByOtherStaff, getStaffMember, updateStaffMember } from "@/lib/staff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const assignableRoles = ["manager", "hr_manager", "interviewer", "cashier", "field_agent", "accountant"] as const

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().max(200).optional(),
    role: z.enum(assignableRoles).optional(),
    modules: z.array(z.enum(["medical", "pharmacy"])).min(1).optional(),
    status: z.enum(["active", "inactive"]).optional(),
    maxDiscountPercent: z.number().min(0).max(100).optional(),
    permissions: z.array(z.enum(PERMISSIONS as unknown as [Permission, ...Permission[]])).nullable().optional(),
    phone: z.string().trim().max(50).optional(),
    idNumber: z.string().trim().max(80).optional(),
    newPassword: z.string().min(8).max(128).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Enter at least one field to update.",
  })

interface Context {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Context) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid staff update." },
      { status: 400 }
    )
  }

  try {
    const admin = await requireAdmin(request, { permission: "staff.manage" })
    const { id } = await params
    const existing = await getStaffMember(id)
    if (!existing) return NextResponse.json({ error: "Staff account not found." }, { status: 404 })
    if (existing.role === "owner") {
      throw new ApiAuthError("The owner account is managed from My account.", 400)
    }
    if (parsed.data.email && (await emailTakenByOtherStaff(parsed.data.email, id))) {
      throw new ApiAuthError("Another account already uses that email address.", 400)
    }

    const { newPassword, ...profile } = parsed.data
    const staff = await updateStaffMember(id, {
      ...profile,
      role: profile.role ? (profile.role as AdminRole) : undefined,
      passwordHash: newPassword ? await hashPassword(newPassword) : undefined,
      mustChangePassword: newPassword ? true : undefined,
    })
    if (!staff) return NextResponse.json({ error: "Staff account not found." }, { status: 404 })

    await writeAudit({
      adminId: admin.id,
      module: parseModuleFromRequest(request),
      action: newPassword ? "staff.password_reset" : "staff.update",
      entityType: "admin_user",
      entityId: staff.id,
      before: {
        role: existing.role,
        modules: existing.modules,
        permissions: existing.permissions,
        status: existing.status,
        maxDiscountPercent: existing.maxDiscountPercent,
      },
      after: {
        role: staff.role,
        modules: staff.modules,
        permissions: staff.permissions,
        status: staff.status,
        maxDiscountPercent: staff.maxDiscountPercent,
        passwordChanged: Boolean(newPassword),
      },
    })

    return NextResponse.json({ staff })
  } catch (error) {
    return apiErrorResponse(error, "Could not update the staff account.")
  }
}
