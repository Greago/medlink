import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { getApplicationById, getInterview, updateInterview } from "@/lib/careers-applications"
import { getJobById } from "@/lib/careers-jobs"
import { buildIcs, sendApplicationEmail } from "@/lib/careers-emails"
import { assertApplicationAccess, canManageRecruitment } from "@/lib/careers-access"
import { writeAudit } from "@/lib/audit"
import { formatEat, formatEatDate } from "@/lib/careers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const patchSchema = z.object({
  type: z.enum(["video", "phone", "in-person"]).optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
  location: z.string().max(300).optional(),
  meetingLink: z.string().max(500).optional(),
  interviewers: z.array(z.string().trim().min(1).max(120)).max(10).optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no-show"]).optional(),
  feedback: z.string().max(100_000).optional(),
})

/** PATCH: reschedule/cancel/complete (manage) or feedback only (read + access). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.read" })
    const { id } = await params
    const interview = await getInterview(id)
    if (!interview) return NextResponse.json({ error: "Interview not found." }, { status: 404 })
    const application = await getApplicationById(interview.applicationId)
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    await assertApplicationAccess(admin, application)
    const parsed = patchSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid interview update." }, { status: 400 })
    const input = parsed.data
    const feedbackOnly = Object.keys(input).every((key) => key === "feedback")
    if (!feedbackOnly && !canManageRecruitment(admin) && admin.role !== "owner") {
      return NextResponse.json({ error: "You do not have permission to change interview details." }, { status: 403 })
    }
    const updated = await updateInterview(id, input)
    await writeAudit({
      adminId: admin.id,
      module: application.jobModule === "pharmacy" ? "pharmacy" : "medical",
      action: feedbackOnly ? "recruitment.interview.feedback" : "recruitment.interview.update",
      entityType: "interview",
      entityId: id,
      before: { status: interview.status, startsAt: interview.startsAt },
      after: { status: updated?.status, startsAt: updated?.startsAt },
    })
    return NextResponse.json({ interview: updated })
  } catch (error) {
    return apiErrorResponse(error, "Could not update the interview.")
  }
}

const actionSchema = z.object({ action: z.enum(["invite", "reschedule", "cancel"]) })

/** POST: send invite / reschedule / cancellation email with .ics where relevant. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.email" })
    const { id } = await params
    const interview = await getInterview(id)
    if (!interview) return NextResponse.json({ error: "Interview not found." }, { status: 404 })
    const application = await getApplicationById(interview.applicationId)
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    await assertApplicationAccess(admin, application)
    const job = await getJobById(application.jobId)
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 })
    const parsed = actionSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid action." }, { status: 400 })
    if (!application.email) return NextResponse.json({ error: "This candidate has no email address." }, { status: 400 })

    const stage = parsed.data.action === "invite" ? "interview_invite" : parsed.data.action === "reschedule" ? "interview_reschedule" : "interview_cancel"
    const attachments = parsed.data.action === "cancel" ? [] : [{
      filename: "interview-invite.ics",
      contentBase64: Buffer.from(buildIcs({
        uid: `interview-${interview.id}@medlinkexpedite.co.ke`,
        start: interview.startsAt,
        end: interview.endsAt,
        summary: `Interview: ${job.title} — Medlink Expedite`,
        description: `Interview for ${job.title}. Candidate: ${application.fullName}.`,
        location: interview.location || interview.meetingLink,
        url: interview.meetingLink || undefined,
      })).toString("base64"),
    }]

    const result = await sendApplicationEmail({
      application,
      job,
      stage,
      admin: { id: admin.id, name: admin.name, email: admin.email },
      context: {
        interview_date: formatEatDate(interview.startsAt),
        interview_time: formatEat(interview.startsAt, { hour: "2-digit", minute: "2-digit" }),
        interview_location_or_link: interview.location || interview.meetingLink || "To be confirmed",
        interviewers: interview.interviewers.join(", ") || "Recruitment team",
      },
      attachments,
      idempotencySuffix: `${parsed.data.action}:${interview.id}:${Date.now()}`,
      forceResend: true,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (error) {
    return apiErrorResponse(error, "Could not send the interview email.")
  }
}