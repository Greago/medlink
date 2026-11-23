import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { getApplicationById } from "@/lib/careers-applications"
import { getJobById } from "@/lib/careers-jobs"
import { getCommunicationTimeline, hasSentStageEmail, sendApplicationEmail } from "@/lib/careers-emails"
import { assertApplicationAccess } from "@/lib/careers-access"
import { detectApplicationFile } from "@/lib/careers-files"
import { query } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.read" })
    const { id } = await params
    const application = await getApplicationById(id)
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    await assertApplicationAccess(admin, application)
    return NextResponse.json({ timeline: await getCommunicationTimeline(id) })
  } catch (error) {
    return apiErrorResponse(error, "Could not load the communication timeline.")
  }
}

const attachmentSchema = z.object({
  filename: z.string().min(1).max(160),
  contentBase64: z.string().min(1),
})

const sendSchema = z.object({
  stage: z.string().min(1).max(60),
  templateId: z.string().uuid().nullable().optional(),
  subject: z.string().max(300).optional(),
  body: z.string().max(200_000).optional(),
  cc: z.string().max(500).optional().default(""),
  bcc: z.string().max(500).optional().default(""),
  scheduledFor: z.string().datetime({ offset: true }).nullable().optional(),
  visibleToCandidate: z.boolean().optional().default(true),
  forceResend: z.boolean().optional().default(false),
  testTo: z.string().email().optional(),
  context: z.record(z.string(), z.string()).optional().default({}),
  attachments: z.array(attachmentSchema).max(5).optional().default([]),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.email" })
    const { id } = await params
    const application = await getApplicationById(id)
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    await assertApplicationAccess(admin, application)
    const job = await getJobById(application.jobId)
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 })
    const parsed = sendSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid email." }, { status: 400 })
    }
    const input = parsed.data

    // Type-check attachments by magic bytes (offer letters etc.), max 5 MB each.
    const attachments = []
    for (const attachment of input.attachments) {
      const buffer = Buffer.from(attachment.contentBase64, "base64")
      const detected = detectApplicationFile(buffer, attachment.filename)
      if ("error" in detected) {
        return NextResponse.json({ error: `Attachment "${attachment.filename}": ${detected.error}` }, { status: 400 })
      }
      attachments.push({ filename: attachment.filename, contentBase64: attachment.contentBase64 })
    }

    const recruiterPhone = await query<{ phone: string }>("SELECT phone FROM admin_users WHERE id = $1", [admin.id])

    // Test send goes to the recruiter, never the candidate.
    if (input.testTo) {
      const result = await sendApplicationEmail({
        application: { ...application, email: input.testTo },
        job,
        stage: input.stage,
        templateId: input.templateId || undefined,
        subject: input.subject ? `[TEST] ${input.subject}` : undefined,
        body: input.body,
        admin: { id: admin.id, name: admin.name, email: admin.email, phone: recruiterPhone.rows[0]?.phone || "" },
        context: input.context,
        attachments,
        idempotencySuffix: `test:${Date.now()}`,
        forceResend: true,
        visibleToCandidate: false,
      })
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    if (!application.email) {
      return NextResponse.json({ error: "This candidate has no email address." }, { status: 400 })
    }

    // Duplicate-send warning surfaced to the UI before an explicit resend.
    if (!input.forceResend && await hasSentStageEmail(application.id, input.stage)) {
      return NextResponse.json(
        { error: "already_sent", message: "This stage email was already sent to this candidate. Confirm resend to send it again." },
        { status: 409 }
      )
    }

    const result = await sendApplicationEmail({
      application,
      job,
      stage: input.stage,
      templateId: input.templateId || undefined,
      subject: input.subject,
      body: input.body,
      admin: { id: admin.id, name: admin.name, email: admin.email, phone: recruiterPhone.rows[0]?.phone || "" },
      context: input.context,
      attachments,
      scheduledFor: input.scheduledFor || null,
      visibleToCandidate: input.visibleToCandidate,
      cc: input.cc,
      bcc: input.bcc,
      forceResend: input.forceResend,
      idempotencySuffix: input.forceResend ? `resend:${Date.now()}` : `stage-entry:${input.stage}`,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  } catch (error) {
    return apiErrorResponse(error, "Could not send the email.")
  }
}