import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { listEmailTemplates } from "@/lib/careers-emails"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permission: "recruitment.read" })
    const url = new URL(request.url)
    const jobId = url.searchParams.get("jobId")
    return NextResponse.json({ templates: await listEmailTemplates(jobId || undefined) })
  } catch (error) {
    return apiErrorResponse(error, "Could not load email templates.")
  }
}