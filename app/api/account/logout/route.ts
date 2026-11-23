import { NextResponse } from "next/server"
import { clearSessionCookie, clearUserSession } from "@/lib/account-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    await clearUserSession(request)
    const response = NextResponse.json({ ok: true })
    clearSessionCookie(response)
    return response
  } catch (error) {
    console.error("Account logout failed:", error)
    return NextResponse.json({ error: "Could not sign out." }, { status: 500 })
  }
}
