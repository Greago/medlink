import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { listTemplateVersions, resetEmailTemplate, updateEmailTemplate } from "@/lib/careers-emails"
import { writeAudit } from "@/lib/audit"
import { query } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const patchSchema = z.object({
  subject: z.string().max(300).optional(),
  body: z.string().max(200_000).optional(),
  enabled: z.boolean().optional(),
  autoSend: z.boolean().optional(),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request, { permission: "recruitment.read" })
    const { id } = await params
    return NextResponse.json({ versions: await listTemplateVersions(id) })
  } catch (error) {
    return apiErrorResponse(error, "Could not load template history.")
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const { id } = await params
    const parsed = patchSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid template data." }, { status: 400 })
    await updateEmailTemplate(id, parsed.data, admin.id)
    await writeAudit({
      adminId: admin.id,
      action: "recruitment.template.update",
      entityType: "email_template",
      entityId: id,
      after: { enabled: parsed.data.enabled, autoSend: parsed.data.autoSend },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not update the template.")
  }
}

const actionSchema = z.object({
  action: z.enum(["reset", "test"]),
  testTo: z.string().email().optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const { id } = await params
    const parsed = actionSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid action." }, { status: 400 })

    if (parsed.data.action === "reset") {
      await resetEmailTemplate(id, admin.id)
      await writeAudit({ adminId: admin.id, action: "recruitment.template.reset", entityType: "email_template", entityId: id })
      return NextResponse.json({ ok: true })
    }

    // Test send: render with sample context and deliver to the admin only.
    const template = (await query<{ stage: string; subject: string; body: string }>(
      "SELECT stage, subject, body FROM email_templates WHERE id = $1", [id]
    )).rows[0]
    if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 })
    const { renderTemplate, buildEmailWrapper } = await import("@/lib/careers-emails")
    const { enqueueEmail } = await import("@/lib/email-outbox")
    const sampleContext = {
      candidate_name: admin.name,
      first_name: admin.name.split(" ")[0],
      job_title: "Sample Job Title",
      reference_number: "APP-2026-000000",
      company_name: "Medlink Expedite",
      module_name: "Pharmacy",
      stage: template.stage,
      interview_date: "1 Jan 2027",
      interview_time: "10:00",
      interview_location_or_link: "Nairobi HQ / video link",
      interviewers: "Recruitment team",
      closing_date: "31 Jan 2027",
      status_page_link: "https://medlinkexpedite.co.ke/careers/status",
      recruiter_name: admin.name,
      recruiter_email: admin.email,
      recruiter_phone: "",
      salary_offer: "KSh 100,000",
      start_date: "1 Feb 2027",
    }
    const subject = renderTemplate(template.subject, sampleContext)
    const body = renderTemplate(template.body, sampleContext, true)
    if (subject.missing.length || body.missing.length) {
      return NextResponse.json({ error: `Missing variables: ${[...subject.missing, ...body.missing].join(", ")}` }, { status: 400 })
    }
    const wrapped = buildEmailWrapper({ module: "company-wide", title: `[TEST] ${subject.output}`, bodyHtml: body.output })
    await enqueueEmail({
      module: "medical",
      kind: "career_template_test",
      recipient: parsed.data.testTo || admin.email,
      subject: `[TEST] ${subject.output}`,
      from: process.env.ACCOUNT_FROM_EMAIL || "Medlink Expedite <careers@medlinkexpedite.co.ke>",
      html: wrapped.html,
      text: wrapped.text,
      idempotencyKey: `career-template-test:${id}:${Date.now()}`,
      referenceType: "email_template",
      referenceId: id,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not perform that action.")
  }
}