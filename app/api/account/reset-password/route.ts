import { NextResponse } from "next/server"
import { z } from "zod"
import { clearSessionCookie, hashPasswordResetToken } from "@/lib/account-auth"
import { ensureSchema, resetUserPassword } from "@/lib/db"
import { hashPassword } from "@/lib/password"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const requestSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(8).max(128),
})

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX = 10
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(key: string) {
  const now = Date.now()

  for (const [storedKey, value] of rateLimits) {
    if (value.resetAt <= now) rateLimits.delete(storedKey)
  }

  const current = rateLimits.get(key)
  if (!current) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  current.count += 1
  return current.count > RATE_LIMIT_MAX
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid reset link and a password of at least 8 characters." },
      { status: 400 }
    )
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  if (isRateLimited(clientIp)) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 })
  }

  try {
    await ensureSchema()

    const user = await resetUserPassword(
      hashPasswordResetToken(parsed.data.token),
      await hashPassword(parsed.data.password)
    )

    if (!user) {
      return NextResponse.json(
        { error: "This password reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      )
    }

    const response = NextResponse.json({ ok: true, email: user.email })
    clearSessionCookie(response)
    return response
  } catch (error) {
    console.error("Password reset failed:", error)
    return NextResponse.json({ error: "Could not reset your password. Please try again." }, { status: 500 })
  }
}
