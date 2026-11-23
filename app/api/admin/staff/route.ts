import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiAuthError, apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { parseModuleFromRequest } from "@/lib/modules/server"
import { PERMISSIONS, type AdminRole, type Permission } from "@/lib/roles"
import { createStaffMember, emailTakenByOtherStaff, listStaffMembers } from "@/lib/staff"
import { sendStaffWelcomeEmail } from "@/lib/staff-email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const assignableRoles = ["manager", "hr_manager", "interviewer", "cashier", "field_agent", "accountant"] as const

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(128),
  role: z.enum(assignableRoles),
  modules: z.array(z.enum(["medical", "pharmacy"])).min(1),
  status: z.enum(["active", "inactive"]).default("active"),
  maxDiscountPercent: z.number().min(0).max(100).default(0),
  permissions: z.array(z.enum(PERMISSIONS as unknown as [Permission, ...Permission[]])).nullable().optional(),
  sendEmail: z.boolean().default(true),
  phone: z.string().trim().max(50).default(""),
  idNumber: z.string().trim().max(80).default(""),
})

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permission: "staff.manage" })
    const staff = await listStaffMembers()
    return NextResponse.json({ staff })
  } catch (error) {
    return apiErrorResponse(error, "Could not load staff accounts.")
  }
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid staff details." },
      { status: 400 }
    )
  }

  try {
    const admin = await requireAdmin(request, { permission: "staff.manage" })
    if (await emailTakenByOtherStaff(parsed.data.email)) {
      throw new ApiAuthError("Another account already uses that email address.", 400)
    }

    const { sendEmail, ...staffInput } = parsed.data
    const staff = await createStaffMember({
      ...staffInput,
      role: parsed.data.role as AdminRole,
    })

    const emailResult = sendEmail
      ? await sendStaffWelcomeEmail({
          name: staff.name,
          email: staff.email,
          password: parsed.data.password,
          origin: new URL(request.url).origin,
        })
      : { sent: false, error: "Email skipped." }

    await writeAudit({
      adminId: admin.id,
      module: parseModuleFromRequest(request),
      action: "staff.create",
      entityType: "admin_user",
      entityId: staff.id,
      after: {
        name: staff.name,
        email: staff.email,
        role: staff.role,
        modules: staff.modules,
        permissions: staff.permissions,
        status: staff.status,
        emailSent: emailResult.sent,
      },
    })

    return NextResponse.json(
      { staff, emailSent: emailResult.sent, emailError: emailResult.error },
      { status: 201 }
    )
  } catch (error) {
    return apiErrorResponse(error, "Could not create the staff account.")
  }
}
