import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminUserSession, setAdminSessionCookie } from "@/lib/admin-auth"
import { ensureSchema, getAdminByEmail } from "@/lib/db"
import { verifyPassword } from "@/lib/password"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 })
  }

  try {
    await ensureSchema()

    const admin = await getAdminByEmail(parsed.data.email.toLowerCase())
    if (!admin || !(await verifyPassword(parsed.data.password, admin.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
    }
    if (admin.status === "inactive") {
      return NextResponse.json({ error: "This account has been deactivated." }, { status: 403 })
    }

    const token = await createAdminUserSession(admin.id)
    const response = NextResponse.json({
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        modules: admin.modules,
        branchId: admin.branchId,
        maxDiscountPercent: admin.maxDiscountPercent,
        permissions: admin.permissions,
        mustChangePassword: admin.mustChangePassword,
        status: admin.status,
      },
    })
    setAdminSessionCookie(response, token)
    return response
  } catch (error) {
    console.error("Admin login failed:", error)
    return NextResponse.json({ error: "Could not sign in. Please try again." }, { status: 500 })
  }
}
