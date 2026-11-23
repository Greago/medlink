import { NextResponse } from "next/server"
import { consumeMagicLink } from "@/lib/careers-applications"
import { getCandidateStatus } from "@/lib/careers-public"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") || ""
    if (!token || token.length < 32) {
      return NextResponse.json({ error: "This link is invalid or has expired. Request a new one below." }, { status: 401 })
    }
    const application = await consumeMagicLink(token)
    if (!application) {
      return NextResponse.json({ error: "This link is invalid or has expired. Request a new one below." }, { status: 401 })
    }
    const status = await getCandidateStatus(application.id)
    return NextResponse.json({ status })
  } catch {
    return NextResponse.json({ error: "Could not load your application status." }, { status: 500 })
  }
}