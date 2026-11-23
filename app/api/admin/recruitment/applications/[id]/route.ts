import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import {
  changeApplicationStage,
  deleteApplicationData,
  getApplicationAnswers,
  getApplicationById,
  getApplicationHistory,
  getApplicationTags,
  listApplicationNotes,
  listApplicationRatings,
  listInterviews,
} from "@/lib/careers-applications"
import { listApplicationFiles, createFileAccessToken } from "@/lib/careers-files"
import { getJobById } from "@/lib/careers-jobs"
import { getCommunicationTimeline } from "@/lib/careers-emails"
import { assertApplicationAccess, canEmailCandidates, canManageRecruitment, canSeeSalary, redactSalary } from "@/lib/careers-access"
import { writeAudit } from "@/lib/audit"
import { query } from "@/lib/db"
import { APPLICATION_STAGES } from "@/lib/careers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.read" })
    const { id } = await params
    const application = await getApplicationById(id)
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    await assertApplicationAccess(admin, application)
    const job = await getJobById(application.jobId)

    const [files, answers, notes, ratings, history, tags, interviews, timeline] = await Promise.all([
      listApplicationFiles(id),
      getApplicationAnswers(id),
      listApplicationNotes(id),
      listApplicationRatings(id),
      getApplicationHistory(id),
      getApplicationTags(id),
      listInterviews(id),
      getCommunicationTimeline(id),
    ])

    // Short-lived signed URLs for secure file access.
    const filesWithTokens = files.map((file) => {
      const { token, expires } = createFileAccessToken(file.id, 300, admin.id)
      return { ...file, accessUrl: `/api/admin/recruitment/files/${file.id}?token=${token}&expires=${expires}&admin=${admin.id}` }
    })

    // Duplicate-candidate warning: other applications from the same email.
    const duplicates = await query<{ id: string; reference_number: string; job_title: string; stage: string }>(
      `SELECT a.id, a.reference_number, j.title AS job_title, a.stage
       FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE LOWER(a.email) = LOWER($1) AND a.id <> $2 LIMIT 10`,
      [application.email, id]
    )

    return NextResponse.json({
      application: redactSalary(admin, application),
      job,
      files: filesWithTokens,
      answers,
      notes,
      ratings,
      history,
      tags,
      interviews,
      timeline,
      duplicates: duplicates.rows,
      capabilities: {
        canManage: canManageRecruitment(admin) || admin.role === "owner",
        canEmail: canEmailCandidates(admin),
        canSeeSalary: canSeeSalary(admin),
      },
    })
  } catch (error) {
    return apiErrorResponse(error, "Could not load the application.")
  }
}

const patchSchema = z.object({
  stage: z.enum(APPLICATION_STAGES),
  reason: z.string().max(1000).optional().default(""),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const { id } = await params
    const application = await getApplicationById(id)
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    await assertApplicationAccess(admin, application)
    const parsed = patchSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid stage." }, { status: 400 })
    const updated = await changeApplicationStage(id, parsed.data.stage, admin.id, parsed.data.reason)
    await writeAudit({
      adminId: admin.id,
      module: application.jobModule === "pharmacy" ? "pharmacy" : "medical",
      action: "recruitment.stage.change",
      entityType: "application",
      entityId: id,
      before: { stage: application.stage },
      after: { stage: parsed.data.stage, reason: parsed.data.reason },
    })
    return NextResponse.json({ application: updated ? redactSalary(admin, updated) : null })
  } catch (error) {
    return apiErrorResponse(error, "Could not change the stage.")
  }
}

/** Data-subject deletion request: removes the application and all related data. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const { id } = await params
    const application = await getApplicationById(id)
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    await assertApplicationAccess(admin, application)
    await deleteApplicationData(id)
    await writeAudit({
      adminId: admin.id,
      module: application.jobModule === "pharmacy" ? "pharmacy" : "medical",
      action: "recruitment.application.delete",
      entityType: "application",
      entityId: id,
      before: { referenceNumber: application.referenceNumber },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not delete applicant data.")
  }
}