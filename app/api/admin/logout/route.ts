import { NextResponse } from "next/server"
import { clearAdminSessionCookie, clearAdminUserSession } from "@/lib/admin-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    await clearAdminUserSession(request)
    const response = NextResponse.json({ ok: true })
    clearAdminSessionCookie(response)
    return response
  } catch (error) {
    console.error("Admin logout failed:", error)
    return NextResponse.json({ error: "Could not sign out." }, { status: 500 })
  }
}
