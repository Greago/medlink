import { NextResponse } from "next/server"
import { z } from "zod"
import {
  hashAdminSessionToken,
  parseAdminSessionToken,
} from "@/lib/admin-auth"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { deleteOtherAdminSessions, getAdminByEmail, updateAdminPasswordHash } from "@/lib/db"
import { parseModuleFromRequest } from "@/lib/modules/server"
import { hashPassword, verifyPassword } from "@/lib/password"
import { clearMustChangePassword } from "@/lib/staff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Enter a valid new password." },
      { status: 400 }
    )
  }

  try {
    const admin = await requireAdmin(request)
    const stored = await getAdminByEmail(admin.email)
    if (!stored || !(await verifyPassword(parsed.data.currentPassword, stored.passwordHash))) {
      return NextResponse.json({ error: "Your current password is incorrect." }, { status: 401 })
    }

    await updateAdminPasswordHash(admin.id, await hashPassword(parsed.data.newPassword))
    await clearMustChangePassword(admin.id)

    const token = parseAdminSessionToken(request)
    if (token) {
      await deleteOtherAdminSessions(admin.id, hashAdminSessionToken(token))
    }

    await writeAudit({
      adminId: admin.id,
      module: parseModuleFromRequest(request),
      action: "staff.password_changed_self",
      entityType: "admin_user",
      entityId: admin.id,
      after: { forcedChangeCompleted: true },
    })

    return NextResponse.json({ admin: { ...admin, mustChangePassword: false } })
  } catch (error) {
    return apiErrorResponse(error, "Could not change your password.")
  }
}
