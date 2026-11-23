import { NextResponse } from "next/server"
import { listPublicJobs } from "@/lib/careers-jobs"
import type { JobModule } from "@/lib/careers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const module = url.searchParams.get("module")
    const jobs = await listPublicJobs({
      module: (module as JobModule | "all") || "all",
      department: url.searchParams.get("department") || undefined,
      search: url.searchParams.get("search") || undefined,
      location: url.searchParams.get("location") || undefined,
      employmentType: url.searchParams.get("employmentType") || undefined,
      workMode: url.searchParams.get("workMode") || undefined,
    })
    return NextResponse.json({ jobs })
  } catch {
    return NextResponse.json({ error: "Could not load open positions." }, { status: 500 })
  }
}