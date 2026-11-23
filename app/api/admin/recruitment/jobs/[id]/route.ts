import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { getJobById, getJobReviewers, getScreeningQuestions, updateJob } from "@/lib/careers-jobs"
import { assertJobAccess } from "@/lib/careers-access"
import { writeAudit } from "@/lib/audit"
import { JOB_MODULES, JOB_STATUSES, EMPLOYMENT_TYPES, WORK_MODES, type Job, type JobModule, type JobStatus } from "@/lib/careers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const patchSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  slug: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  module: z.enum(JOB_MODULES as [JobModule, ...JobModule[]]).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES as [string, ...string[]]).optional(),
  workMode: z.enum(WORK_MODES as [string, ...string[]]).optional(),
  location: z.string().trim().max(160).optional(),
  openings: z.coerce.number().int().min(1).max(999).optional(),
  salaryMin: z.coerce.number().min(0).nullable().optional(),
  salaryMax: z.coerce.number().min(0).nullable().optional(),
  salaryVisible: z.boolean().optional(),
  purposeStatement: z.string().max(50_000).optional(),
  description: z.string().max(100_000).optional(),
  responsibilities: z.string().max(100_000).optional(),
  qualificationsRequired: z.string().max(100_000).optional(),
  qualificationsPreferred: z.string().max(100_000).optional(),
  benefits: z.string().max(100_000).optional(),
  howToApply: z.string().max(50_000).optional(),
  status: z.enum(JOB_STATUSES as [JobStatus, ...JobStatus[]]).optional(),
  scheduledPublishAt: z.string().datetime({ offset: true }).nullable().optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.read" })
    const { id } = await params
    const job = await getJobById(id)
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 })
    await assertJobAccess(admin, job)
    const [questions, reviewers] = await Promise.all([getScreeningQuestions(id), getJobReviewers(id)])
    return NextResponse.json({ job, questions, reviewers })
  } catch (error) {
    return apiErrorResponse(error, "Could not load the job.")
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const { id } = await params
    const job = await getJobById(id)
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 })
    await assertJobAccess(admin, job)
    const parsed = patchSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid job data." }, { status: 400 })
    }
    const input = parsed.data
    const expiresAt = input.expiresAt !== undefined ? input.expiresAt : job.expiresAt
    if (expiresAt && job.status !== "published" && new Date(expiresAt).getTime() <= Date.now() && input.expiresAt !== undefined && input.expiresAt !== null) {
      return NextResponse.json({ error: "Expiry must be in the future." }, { status: 400 })
    }
    const publishAt = input.scheduledPublishAt !== undefined ? input.scheduledPublishAt : job.scheduledPublishAt
    if (expiresAt && publishAt && new Date(expiresAt) <= new Date(publishAt)) {
      return NextResponse.json({ error: "Expiry must be after the scheduled publish date." }, { status: 400 })
    }
    const updated = await updateJob(
      id,
      {
        ...input,
        employmentType: input.employmentType as Job["employmentType"] | undefined,
        workMode: input.workMode as Job["workMode"] | undefined,
      },
      admin.id
    )
    await writeAudit({
      adminId: admin.id,
      module: job.module === "pharmacy" ? "pharmacy" : "medical",
      action: "recruitment.job.update",
      entityType: "job",
      entityId: id,
      before: { status: job.status, expiresAt: job.expiresAt },
      after: { status: updated?.status, expiresAt: updated?.expiresAt },
    })
    return NextResponse.json({ job: updated })
  } catch (error) {
    return apiErrorResponse(error, "Could not update the job.")
  }
}

/** DELETE archives the job (never hard-deletes data with applications). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const { id } = await params
    const job = await getJobById(id)
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 })
    await assertJobAccess(admin, job)
    const updated = await updateJob(id, { status: "archived" }, admin.id)
    await writeAudit({
      adminId: admin.id,
      module: job.module === "pharmacy" ? "pharmacy" : "medical",
      action: "recruitment.job.archive",
      entityType: "job",
      entityId: id,
      before: { status: job.status },
    })
    return NextResponse.json({ job: updated })
  } catch (error) {
    return apiErrorResponse(error, "Could not archive the job.")
  }
}