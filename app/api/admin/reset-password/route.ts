import { NextResponse } from "next/server"
import { z } from "zod"
import { hashPasswordResetToken } from "@/lib/account-auth"
import { writeAudit } from "@/lib/audit"
import { updateAdminPasswordHash } from "@/lib/db"
import { parseModuleFromRequest } from "@/lib/modules/server"
import { hashPassword } from "@/lib/password"
import {
  clearMustChangePassword,
  consumeAdminPasswordResetToken,
  deleteAdminPasswordResetTokens,
  deleteAllAdminSessions,
} from "@/lib/staff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid reset link and a password of at least 8 characters." },
      { status: 400 }
    )
  }

  try {
    const admin = await consumeAdminPasswordResetToken(hashPasswordResetToken(parsed.data.token))
    if (!admin) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      )
    }

    await updateAdminPasswordHash(admin.id, await hashPassword(parsed.data.password))
    await clearMustChangePassword(admin.id)
    await deleteAllAdminSessions(admin.id)
    await deleteAdminPasswordResetTokens(admin.id)
    await writeAudit({
      adminId: admin.id,
      module: parseModuleFromRequest(request),
      action: "staff.password_reset_self",
      entityType: "admin_user",
      entityId: admin.id,
      after: { viaEmailLink: true },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Could not reset your password. Please try again." }, { status: 500 })
  }
}
