import { NextResponse } from "next/server"
import { getCurrentAdmin } from "@/lib/admin-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin(request)
    return NextResponse.json({ admin })
  } catch (error) {
    console.error("Could not load admin:", error)
    return NextResponse.json({ error: "Could not load your profile." }, { status: 500 })
  }
}
