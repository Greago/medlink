import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { getRecruitmentStats, listApplications } from "@/lib/careers-applications"
import { listJobs } from "@/lib/careers-jobs"
import { canManageRecruitment, visibleJobIds } from "@/lib/careers-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.read" })
    if (canManageRecruitment(admin) || admin.role === "owner") {
      const stats = await getRecruitmentStats()
      return NextResponse.json({ restricted: false, stats })
    }
    // Interviewer: only assigned jobs and their applicants.
    const jobIds = (await visibleJobIds(admin)) || []
    const [{ jobs }, { applications, total }] = await Promise.all([
      listJobs({ pageSize: 100 }),
      listApplications({ jobIds, pageSize: 200 }),
    ])
    const assignedJobs = jobs.filter((job) => jobIds.includes(job.id))
    return NextResponse.json({
      restricted: true,
      jobs: assignedJobs,
      applications,
      total,
    })
  } catch (error) {
    return apiErrorResponse(error, "Could not load recruitment stats.")
  }
}