import { createHash, randomBytes } from "crypto"
import type { NextResponse } from "next/server"
import {
  createAdminSession,
  deleteAdminSession,
  ensureSchema,
  getAdminSessionUser,
} from "@/lib/db"
import type { AdminUser } from "@/lib/store"

export const ADMIN_SESSION_COOKIE = "medlink_admin_session"
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function hashAdminSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function parseAdminSessionToken(request: Request): string | null {
  const header = request.headers.get("cookie")
  if (!header) return null

  for (const part of header.split(";")) {
    const [name, ...valueParts] = part.trim().split("=")
    if (name === ADMIN_SESSION_COOKIE) {
      try {
        return decodeURIComponent(valueParts.join("="))
      } catch {
        return null
      }
    }
  }

  return null
}

export async function getCurrentAdmin(request: Request): Promise<AdminUser | null> {
  await ensureSchema()

  const token = parseAdminSessionToken(request)
  if (!token) return null

  return getAdminSessionUser(hashAdminSessionToken(token))
}

export async function createAdminUserSession(adminId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000)
  await createAdminSession(adminId, hashAdminSessionToken(token), expiresAt)
  return token
}

export function setAdminSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  })
}

export async function clearAdminUserSession(request: Request): Promise<void> {
  const token = parseAdminSessionToken(request)
  if (token) {
    await deleteAdminSession(hashAdminSessionToken(token))
  }
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.delete(ADMIN_SESSION_COOKIE)
}
