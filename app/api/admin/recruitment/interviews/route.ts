import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { createInterview, getApplicationById, listInterviews } from "@/lib/careers-applications"
import { getJobById } from "@/lib/careers-jobs"
import { buildIcs, sendApplicationEmail } from "@/lib/careers-emails"
import { assertApplicationAccess, canEmailCandidates, visibleJobIds } from "@/lib/careers-access"
import { writeAudit } from "@/lib/audit"
import { formatEatDate, formatEat } from "@/lib/careers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.read" })
    const url = new URL(request.url)
    const applicationId = url.searchParams.get("applicationId") || undefined
    const interviews = await listInterviews(applicationId)
    const jobIds = await visibleJobIds(admin)

    const enriched = []
    for (const interview of interviews) {
      const application = await getApplicationById(interview.applicationId)
      if (!application) continue
      if (jobIds && !jobIds.includes(application.jobId)) continue
      enriched.push({
        ...interview,
        candidateName: application.fullName,
        referenceNumber: application.referenceNumber,
        jobTitle: application.jobTitle,
        jobId: application.jobId,
      })
    }
    return NextResponse.json({ interviews: enriched })
  } catch (error) {
    return apiErrorResponse(error, "Could not load interviews.")
  }
}

const createSchema = z.object({
  applicationId: z.string().uuid(),
  type: z.enum(["video", "phone", "in-person"]).default("video"),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).nullable().optional().default(null),
  location: z.string().max(300).optional().default(""),
  meetingLink: z.string().max(500).optional().default(""),
  interviewers: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
  sendInvite: z.boolean().optional().default(false),
})

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const parsed = createSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid interview." }, { status: 400 })
    const input = parsed.data
    if (new Date(input.startsAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Interview start must be in the future." }, { status: 400 })
    }
    const application = await getApplicationById(input.applicationId)
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    await assertApplicationAccess(admin, application)
    const job = await getJobById(application.jobId)
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 })

    const interview = await createInterview({ ...input, createdBy: admin.id })
    await writeAudit({
      adminId: admin.id,
      module: job.module === "pharmacy" ? "pharmacy" : "medical",
      action: "recruitment.interview.create",
      entityType: "interview",
      entityId: interview.id,
      after: { applicationId: input.applicationId, startsAt: input.startsAt },
    })

    let emailResult: { ok: boolean; error?: string } | null = null
    if (input.sendInvite) {
      if (!canEmailCandidates(admin)) {
        emailResult = { ok: false, error: "Interview saved, but you do not have permission to send the invite." }
      } else if (!application.email) {
        emailResult = { ok: false, error: "Interview saved, but the candidate has no email address." }
      } else {
        const ics = buildIcs({
          uid: `interview-${interview.id}@medlinkexpedite.co.ke`,
          start: interview.startsAt,
          end: interview.endsAt,
          summary: `Interview: ${job.title} — Medlink Expedite`,
          description: `Interview for ${job.title}. Candidate: ${application.fullName}.`,
          location: input.location || input.meetingLink,
          url: input.meetingLink || undefined,
        })
        emailResult = await sendApplicationEmail({
          application,
          job,
          stage: "interview_invite",
          admin: { id: admin.id, name: admin.name, email: admin.email },
          context: {
            interview_date: formatEatDate(interview.startsAt),
            interview_time: formatEat(interview.startsAt, { hour: "2-digit", minute: "2-digit" }),
            interview_location_or_link: input.location || input.meetingLink || "To be confirmed",
            interviewers: input.interviewers.join(", ") || "Recruitment team",
          },
          attachments: [{ filename: "interview-invite.ics", contentBase64: Buffer.from(ics).toString("base64") }],
          idempotencySuffix: `invite:${interview.id}`,
        })
      }
    }
    return NextResponse.json({ interview, email: emailResult }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not schedule the interview.")
  }
}