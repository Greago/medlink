import { NextResponse } from "next/server"
import { z } from "zod"
import { createUserSession, hashPassword, setSessionCookie } from "@/lib/account-auth"
import { createUser, ensureSchema, getUserByEmail } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your name, a valid email, and a password of at least 8 characters." },
      { status: 400 }
    )
  }

  const email = parsed.data.email.toLowerCase()

  try {
    await ensureSchema()

    if (await getUserByEmail(email)) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 })
    }

    const passwordHash = await hashPassword(parsed.data.password)
    const user = await createUser(parsed.data.name, email, passwordHash)
    const token = await createUserSession(user.id)

    const response = NextResponse.json({ user })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 })
    }
    console.error("Account registration failed:", error)
    return NextResponse.json({ error: "Could not create the account. Please try again." }, { status: 500 })
  }
}
