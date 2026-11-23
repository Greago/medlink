import { NextResponse } from "next/server"
import { z } from "zod"
import {
  hashAdminSessionToken,
  getCurrentAdmin,
  parseAdminSessionToken,
} from "@/lib/admin-auth"
import {
  deleteOtherAdminSessions,
  getAdminByEmail,
  updateAdminPasswordHash,
  updateAdminProfile,
} from "@/lib/db"
import { hashPassword, verifyPassword } from "@/lib/password"
import { clearMustChangePassword } from "@/lib/staff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().max(254).optional(),
    currentPassword: z.string().min(1).max(128).optional(),
    newPassword: z.string().min(8).max(128).optional(),
  })
  .refine((data) => data.name || data.email || data.newPassword, {
    message: "Provide at least one field to update.",
  })
  .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
    message: "Enter your current password to set a new one.",
    path: ["currentPassword"],
  })

export async function PUT(request: Request) {
  try {
    const admin = await getCurrentAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 })
    }

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.data ? "Invalid profile details." : "Provide at least one field to update." },
        { status: 400 }
      )
    }

    if (parsed.data.email) {
      const email = parsed.data.email.toLowerCase()
      const existing = await getAdminByEmail(email)
      if (existing && existing.id !== admin.id) {
        return NextResponse.json({ error: "That email address is already in use." }, { status: 409 })
      }
    }

    const stored = parsed.data.newPassword ? await getAdminByEmail(admin.email) : null
    if (parsed.data.newPassword && (!stored || !(await verifyPassword(parsed.data.currentPassword!, stored.passwordHash)))) {
      return NextResponse.json({ error: "Your current password is incorrect." }, { status: 401 })
    }

    let updatedAdmin = {
      id: admin.id,
      name: parsed.data.name || admin.name,
      email: parsed.data.email ? parsed.data.email.toLowerCase() : admin.email,
      role: admin.role,
      modules: admin.modules,
      branchId: admin.branchId,
      maxDiscountPercent: admin.maxDiscountPercent,
      permissions: admin.permissions,
      mustChangePassword: admin.mustChangePassword,
      status: admin.status,
    }

    if (parsed.data.name || parsed.data.email) {
      const saved = await updateAdminProfile(admin.id, {
        name: updatedAdmin.name,
        email: updatedAdmin.email,
      })
      if (saved) updatedAdmin = saved
    }

    if (parsed.data.newPassword) {
      await updateAdminPasswordHash(admin.id, await hashPassword(parsed.data.newPassword))
      await clearMustChangePassword(admin.id)
      updatedAdmin = { ...updatedAdmin, mustChangePassword: false }

      const token = parseAdminSessionToken(request)
      if (token) {
        await deleteOtherAdminSessions(admin.id, hashAdminSessionToken(token))
      }
    }

    return NextResponse.json({ admin: updatedAdmin })
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "That email address is already in use." }, { status: 409 })
    }
    console.error("Admin profile update failed:", error)
    return NextResponse.json({ error: "Could not update your profile." }, { status: 500 })
  }
}
