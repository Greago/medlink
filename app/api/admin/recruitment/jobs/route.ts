import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { createJob, listJobs } from "@/lib/careers-jobs"
import { visibleJobIds } from "@/lib/careers-access"
import { writeAudit } from "@/lib/audit"
import { JOB_MODULES, JOB_STATUSES, EMPLOYMENT_TYPES, WORK_MODES, type Job, type JobModule, type JobStatus } from "@/lib/careers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const jobSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).default(""),
  module: z.enum(JOB_MODULES as [JobModule, ...JobModule[]]).default("company-wide"),
  employmentType: z.enum(EMPLOYMENT_TYPES as [string, ...string[]]).default("Full-time"),
  workMode: z.enum(WORK_MODES as [string, ...string[]]).default("On-site"),
  location: z.string().trim().max(160).default(""),
  openings: z.coerce.number().int().min(1).max(999).default(1),
  salaryMin: z.coerce.number().min(0).nullable().optional().default(null),
  salaryMax: z.coerce.number().min(0).nullable().optional().default(null),
  salaryVisible: z.boolean().default(false),
  purposeStatement: z.string().max(50_000).default(""),
  description: z.string().max(100_000).default(""),
  responsibilities: z.string().max(100_000).default(""),
  qualificationsRequired: z.string().max(100_000).default(""),
  qualificationsPreferred: z.string().max(100_000).default(""),
  benefits: z.string().max(100_000).default(""),
  howToApply: z.string().max(50_000).default(""),
  status: z.enum(JOB_STATUSES as [JobStatus, ...JobStatus[]]).default("draft"),
  scheduledPublishAt: z.string().datetime({ offset: true }).nullable().optional().default(null),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional().default(null),
})

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.read" })
    const url = new URL(request.url)
    const { jobs, total } = await listJobs({
      module: (url.searchParams.get("module") as JobModule | "all") || "all",
      status: (url.searchParams.get("status") as JobStatus | "all") || "all",
      search: url.searchParams.get("search") || undefined,
      page: Number(url.searchParams.get("page") || 1),
      pageSize: Number(url.searchParams.get("pageSize") || 20),
    })
    const jobIds = await visibleJobIds(admin)
    const visible = jobIds ? jobs.filter((job) => jobIds.includes(job.id)) : jobs
    return NextResponse.json({ jobs: visible, total: jobIds ? visible.length : total })
  } catch (error) {
    return apiErrorResponse(error, "Could not load jobs.")
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const parsed = jobSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid job data." }, { status: 400 })
    }
    const input = parsed.data
    if (input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Expiry must be in the future." }, { status: 400 })
    }
    if (input.expiresAt && input.scheduledPublishAt && new Date(input.expiresAt) <= new Date(input.scheduledPublishAt)) {
      return NextResponse.json({ error: "Expiry must be after the scheduled publish date." }, { status: 400 })
    }
    const job = await createJob(
      {
        ...input,
        employmentType: input.employmentType as Job["employmentType"],
        workMode: input.workMode as Job["workMode"],
        salaryMin: input.salaryMin ?? null,
        salaryMax: input.salaryMax ?? null,
      },
      admin.id
    )
    await writeAudit({
      adminId: admin.id,
      module: job.module === "pharmacy" ? "pharmacy" : "medical",
      action: "recruitment.job.create",
      entityType: "job",
      entityId: job.id,
      after: { title: job.title, status: job.status },
    })
    return NextResponse.json({ job }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not create the job.")
  }
}