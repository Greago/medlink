import { NextResponse } from "next/server"
import { z } from "zod"
import {
  createPasswordResetTokenValue,
  hashPasswordResetToken,
  PASSWORD_RESET_MAX_AGE_SECONDS,
} from "@/lib/account-auth"
import {
  createPasswordResetToken,
  deletePasswordResetTokensForUser,
  ensureSchema,
  getUserByEmail,
} from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const requestSchema = z.object({
  email: z.string().trim().email().max(254),
})

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX = 5
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }
    return entities[character]
  })
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 })
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: "Too many reset requests. Please try again in a few minutes." },
      { status: 429 }
    )
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Password reset email is not configured yet." }, { status: 503 })
  }

  try {
    await ensureSchema()

    const user = await getUserByEmail(parsed.data.email.toLowerCase())
    if (!user) {
      // Return the same response whether or not the account exists.
      return NextResponse.json({ ok: true })
    }

    const token = createPasswordResetTokenValue()
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_MAX_AGE_SECONDS * 1000)
    await createPasswordResetToken(user.id, hashPasswordResetToken(token), expiresAt)

    const origin = new URL(request.url).origin
    const resetUrl = `${origin}/account/reset-password?token=${encodeURIComponent(token)}`
    const from =
      process.env.ACCOUNT_FROM_EMAIL ||
      process.env.CATALOGUE_FROM_EMAIL ||
      "Medlink Expedites <catalogue@medlinkexpedite.co.ke>"

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: "Reset your Medlink Expedites password",
        html: `
          <div style="font-family: Arial, sans-serif; color: #0f2b2e; max-width: 600px;">
            <h1 style="color: #0c1f1d;">Reset your password</h1>
            <p>Hello ${escapeHtml(user.name)},</p>
            <p>We received a request to reset your Medlink Expedites account password.</p>
            <p style="margin: 28px 0;">
              <a href="${escapeHtml(resetUrl)}"
                 style="display: inline-block; background: #0c1f1d; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold;">
                Reset Password
              </a>
            </p>
            <p>This link expires in 1 hour and can only be used once.</p>
            <p>If you did not request a password reset, you can ignore this email. Your current password will keep working.</p>
            <p style="color: #5f7a7d; margin-top: 32px;">
              Medlink Expedites<br />Medical Equipment Supply<br />info@medlinkexpedite.co.ke
            </p>
          </div>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const details = await emailResponse.text()
      console.error("Resend password reset email failed:", details)
      await deletePasswordResetTokensForUser(user.id)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Password reset request failed:", error)
    return NextResponse.json({ error: "Could not start a password reset. Please try again." }, { status: 500 })
  }
}
