import { createHash, randomBytes } from "crypto"
import type { NextResponse } from "next/server"
import { createSession, deleteSession, ensureSchema, getSessionUser } from "@/lib/db"
import { hashPassword, verifyPassword } from "@/lib/password"
import type { AccountUser } from "@/lib/store"

export { hashPassword, verifyPassword } from "@/lib/password"

export const USER_SESSION_COOKIE = "medlink_user_session"
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
export const PASSWORD_RESET_MAX_AGE_SECONDS = 60 * 60

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function createPasswordResetTokenValue(): string {
  return randomBytes(32).toString("base64url")
}

export function parseSessionToken(request: Request): string | null {
  const header = request.headers.get("cookie")
  if (!header) return null

  for (const part of header.split(";")) {
    const [name, ...valueParts] = part.trim().split("=")
    if (name === USER_SESSION_COOKIE) {
      try {
        return decodeURIComponent(valueParts.join("="))
      } catch {
        return null
      }
    }
  }

  return null
}

export async function getCurrentUser(request: Request): Promise<AccountUser | null> {
  await ensureSchema()

  const token = parseSessionToken(request)
  if (!token) return null

  return getSessionUser(hashSessionToken(token))
}

export async function createUserSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
  await createSession(userId, hashSessionToken(token), expiresAt)
  return token
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function clearUserSession(request: Request): Promise<void> {
  const token = parseSessionToken(request)
  if (token) {
    await deleteSession(hashSessionToken(token))
  }
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(USER_SESSION_COOKIE)
}
