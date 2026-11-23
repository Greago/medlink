import { NextResponse } from "next/server"
import { z } from "zod"
import { createUserSession, setSessionCookie, verifyPassword } from "@/lib/account-auth"
import { ensureSchema, getUserByEmail } from "@/lib/db"

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

    const user = await getUserByEmail(parsed.data.email.toLowerCase())
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
    }

    const token = await createUserSession(user.id)
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    console.error("Account login failed:", error)
    return NextResponse.json({ error: "Could not sign in. Please try again." }, { status: 500 })
  }
}
