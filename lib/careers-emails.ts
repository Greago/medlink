import { createHash, randomUUID } from "crypto"
import { ensureSchema, query } from "@/lib/db"
import { enqueueEmail, processOutbox, type EmailAttachment } from "@/lib/email-outbox"
import { sanitizeRichText, richTextToEmailHtml, richTextToPlainText } from "@/lib/rich-text"
import { writeAudit } from "@/lib/audit"
import {
  type Application,
  type ApplicationStage,
  type Job,
  appModuleForJob,
  formatEatDate,
  formatEatDateTime,
  jobTheme,
  siteUrl,
} from "@/lib/careers"

export const EMAIL_VARIABLES = [
  "candidate_name", "first_name", "job_title", "reference_number", "company_name", "module_name",
  "stage", "interview_date", "interview_time", "interview_location_or_link", "interviewers",
  "closing_date", "status_page_link", "recruiter_name", "recruiter_email", "recruiter_phone",
  "salary_offer", "start_date",
] as const
export type EmailVariable = (typeof EMAIL_VARIABLES)[number]

export interface TemplateContext {
  candidate_name?: string
  first_name?: string
  job_title?: string
  reference_number?: string
  company_name?: string
  module_name?: string
  stage?: string
  interview_date?: string
  interview_time?: string
  interview_location_or_link?: string
  interviewers?: string
  closing_date?: string
  status_page_link?: string
  recruiter_name?: string
  recruiter_email?: string
  recruiter_phone?: string
  salary_offer?: string
  start_date?: string
}

export interface RenderResult {
  output: string
  missing: string[]
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** Replace {{tokens}}; unknown/missing variables are reported so sends can be blocked. */
export function renderTemplate(template: string, context: TemplateContext, html = false): RenderResult {
  const missing: string[] = []
  const output = template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, token: string) => {
    const key = token.toLowerCase() as EmailVariable
    if (!(EMAIL_VARIABLES as readonly string[]).includes(key)) {
      missing.push(token)
      return ""
    }
    const value = context[key]
    if (value === undefined || value === null || value === "") {
      missing.push(token)
      return ""
    }
    return html ? escapeHtml(String(value)) : String(value)
  })
  return { output, missing: [...new Set(missing)] }
}

export interface DefaultTemplate {
  stage: string
  subject: string
  body: string
  autoSend: boolean
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    stage: "application_received",
    subject: "We received your application — {{reference_number}}",
    body: "<p>Dear {{candidate_name}},</p><p>Thank you for applying for <strong>{{job_title}}</strong> at {{company_name}}. Your reference number is <strong>{{reference_number}}</strong>.</p><p>You can track your application at any time: <a href=\"{{status_page_link}}\">{{status_page_link}}</a></p><p>Kind regards,<br/>{{recruiter_name}}<br/>{{company_name}}</p>",
    autoSend: true,
  },
  {
    stage: "screening",
    subject: "Your application is under review — {{job_title}}",
    body: "<p>Dear {{candidate_name}},</p><p>Your application for <strong>{{job_title}}</strong> ({{reference_number}}) is now under review. We will be in touch with the next steps.</p><p>Track your status: <a href=\"{{status_page_link}}\">{{status_page_link}}</a></p><p>Kind regards,<br/>{{recruiter_name}}</p>",
    autoSend: false,
  },
  {
    stage: "shortlisted",
    subject: "You have been shortlisted — {{job_title}}",
    body: "<p>Dear {{candidate_name}},</p><p>Good news — you have been shortlisted for <strong>{{job_title}}</strong>. Our team will contact you about the next stage.</p><p>Track your status: <a href=\"{{status_page_link}}\">{{status_page_link}}</a></p><p>Kind regards,<br/>{{recruiter_name}}</p>",
    autoSend: false,
  },
  {
    stage: "interview_invite",
    subject: "Interview invitation — {{job_title}}",
    body: "<p>Dear {{candidate_name}},</p><p>We would like to invite you to an interview for <strong>{{job_title}}</strong>.</p><p><strong>Date:</strong> {{interview_date}}<br/><strong>Time:</strong> {{interview_time}} (EAT)<br/><strong>Location / link:</strong> {{interview_location_or_link}}<br/><strong>Interviewers:</strong> {{interviewers}}</p><p>A calendar invitation is attached. Please reply to confirm.</p><p>Kind regards,<br/>{{recruiter_name}}</p>",
    autoSend: false,
  },
  {
    stage: "interview_reschedule",
    subject: "Interview rescheduled — {{job_title}}",
    body: "<p>Dear {{candidate_name}},</p><p>Your interview for <strong>{{job_title}}</strong> has been rescheduled to {{interview_date}} at {{interview_time}} (EAT). Location / link: {{interview_location_or_link}}.</p><p>An updated calendar invitation is attached.</p><p>Kind regards,<br/>{{recruiter_name}}</p>",
    autoSend: false,
  },
  {
    stage: "interview_cancel",
    subject: "Interview cancelled — {{job_title}}",
    body: "<p>Dear {{candidate_name}},</p><p>Your interview for <strong>{{job_title}}</strong> scheduled for {{interview_date}} has been cancelled. We will contact you to arrange a new time.</p><p>Kind regards,<br/>{{recruiter_name}}</p>",
    autoSend: false,
  },
  {
    stage: "offer",
    subject: "Offer of employment — {{job_title}}",
    body: "<p>Dear {{candidate_name}},</p><p>We are pleased to offer you the role of <strong>{{job_title}}</strong> at {{company_name}}.</p><p>Please review the attached offer letter and reply to confirm your acceptance.</p><p>Kind regards,<br/>{{recruiter_name}}</p>",
    autoSend: false,
  },
  {
    stage: "hired",
    subject: "Welcome to {{company_name}}",
    body: "<p>Dear {{candidate_name}},</p><p>Welcome aboard! We are delighted to confirm your appointment as <strong>{{job_title}}</strong>.</p><p>Your start date is {{start_date}}. Our team will share onboarding details shortly.</p><p>Kind regards,<br/>{{recruiter_name}}</p>",
    autoSend: false,
  },
  {
    stage: "rejection",
    subject: "Update on your application — {{job_title}}",
    body: "<p>Dear {{candidate_name}},</p><p>Thank you for your interest in <strong>{{job_title}}</strong>. After careful consideration we will not be progressing your application on this occasion.</p><p>We wish you every success in your search.</p><p>Kind regards,<br/>{{recruiter_name}}</p>",
    autoSend: false,
  },
  {
    stage: "rejection_kind",
    subject: "Update on your application — {{job_title}}",
    body: "<p>Dear {{candidate_name}},</p><p>Thank you for applying for <strong>{{job_title}}</strong>. While we are not moving forward this time, we were impressed by your profile and would like to keep your CV on file for future opportunities.</p><p>You may request deletion of your data at any time by replying to this email.</p><p>Kind regards,<br/>{{recruiter_name}}</p>",
    autoSend: false,
  },
  {
    stage: "talent_pool",
    subject: "You have joined our talent pool",
    body: "<p>Dear {{candidate_name}},</p><p>We have added your profile to the {{company_name}} talent pool and will contact you when a suitable role opens.</p><p>You may request deletion of your data at any time by replying to this email.</p><p>Kind regards,<br/>{{recruiter_name}}</p>",
    autoSend: false,
  },
]

export interface EmailTemplate {
  id: string
  stage: string
  subject: string
  body: string
  enabled: boolean
  autoSend: boolean
  jobId: string | null
  version: number
}

function templateId(stage: string, jobId?: string | null): string {
  // Deterministic UUID so defaults are idempotent.
  return createHash("md5").update(`careers-template:${jobId || "default"}:${stage}`).digest("hex")
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5")
}

export async function ensureDefaultTemplates(): Promise<void> {
  await ensureSchema()
  for (const template of DEFAULT_TEMPLATES) {
    await query(
      `INSERT INTO email_templates (id, stage, subject, body, enabled, auto_send, version)
       VALUES ($1,$2,$3,$4,TRUE,$5,1) ON CONFLICT (id) DO NOTHING`,
      [templateId(template.stage), template.stage, template.subject, template.body, template.autoSend]
    )
  }
}

export async function listEmailTemplates(jobId?: string | null): Promise<EmailTemplate[]> {
  await ensureDefaultTemplates()
  const result = await query<{
    id: string; stage: string; subject: string; body: string; enabled: boolean; auto_send: boolean; job_id: string | null; version: number
  }>(
    jobId
      ? "SELECT * FROM email_templates WHERE job_id = $1 OR job_id IS NULL ORDER BY stage"
      : "SELECT * FROM email_templates WHERE job_id IS NULL ORDER BY stage",
    jobId ? [jobId] : []
  )
  return result.rows.map((row) => ({
    id: row.id, stage: row.stage, subject: row.subject, body: row.body,
    enabled: row.enabled, autoSend: row.auto_send, jobId: row.job_id, version: row.version,
  }))
}

export async function getTemplateForStage(stage: string, jobId?: string | null): Promise<EmailTemplate | null> {
  await ensureDefaultTemplates()
  if (jobId) {
    const override = await query<{ id: string }>("SELECT id FROM email_templates WHERE stage = $1 AND job_id = $2", [stage, jobId])
    if (override.rows[0]) {
      const result = await query<EmailTemplate & { auto_send: boolean; job_id: string | null }>(
        "SELECT * FROM email_templates WHERE id = $1", [override.rows[0].id]
      )
      const row = result.rows[0]
      if (row) return { id: row.id, stage: row.stage, subject: row.subject, body: row.body, enabled: row.enabled, autoSend: (row as unknown as { auto_send: boolean }).auto_send, jobId: (row as unknown as { job_id: string | null }).job_id, version: row.version }
    }
  }
  const result = await query<{ id: string; stage: string; subject: string; body: string; enabled: boolean; auto_send: boolean; job_id: string | null; version: number }>(
    "SELECT * FROM email_templates WHERE stage = $1 AND job_id IS NULL", [stage]
  )
  const row = result.rows[0]
  return row ? { id: row.id, stage: row.stage, subject: row.subject, body: row.body, enabled: row.enabled, autoSend: row.auto_send, jobId: row.job_id, version: row.version } : null
}

export async function updateEmailTemplate(id: string, input: { subject?: string; body?: string; enabled?: boolean; autoSend?: boolean }, adminId: string | null): Promise<void> {
  await ensureSchema()
  const existing = await query<{ subject: string; body: string; version: number }>("SELECT subject, body, version FROM email_templates WHERE id = $1", [id])
  const row = existing.rows[0]
  if (!row) throw new Error("Template not found.")
  const subject = input.subject !== undefined ? input.subject : row.subject
  const body = input.body !== undefined ? sanitizeRichText(input.body) : row.body
  await query(
    `INSERT INTO email_template_versions (id, template_id, version, subject, body, updated_by) VALUES ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), id, row.version, row.subject, row.body, adminId]
  )
  await query(
    `UPDATE email_templates SET subject=$2, body=$3, enabled=COALESCE($4,enabled), auto_send=COALESCE($5,auto_send), version=version+1, updated_by=$6, updated_at=NOW() WHERE id=$1`,
    [id, subject, body, input.enabled ?? null, input.autoSend ?? null, adminId]
  )
}

export async function resetEmailTemplate(id: string, adminId: string | null): Promise<void> {
  const result = await query<{ stage: string }>("SELECT stage FROM email_templates WHERE id = $1", [id])
  const stage = result.rows[0]?.stage
  const def = DEFAULT_TEMPLATES.find((item) => item.stage === stage)
  if (!def) throw new Error("No default for this template.")
  await updateEmailTemplate(id, { subject: def.subject, body: def.body, enabled: true, autoSend: def.autoSend }, adminId)
}

export async function listTemplateVersions(id: string) {
  await ensureSchema()
  const result = await query<{ id: string; version: number; subject: string; body: string; created_at: Date }>(
    "SELECT * FROM email_template_versions WHERE template_id = $1 ORDER BY version DESC LIMIT 20", [id]
  )
  return result.rows.map((row) => ({ id: row.id, version: row.version, subject: row.subject, body: row.body, createdAt: new Date(row.created_at).toISOString() }))
}

function careersSender(): string {
  return process.env.ACCOUNT_FROM_EMAIL || "Medlink Expedite <careers@medlinkexpedite.co.ke>"
}

export function buildEmailWrapper(options: {
  module: Job["module"]
  title: string
  bodyHtml: string
  candidateName?: string
}): { html: string; text: string } {
  const theme = jobTheme(options.module)
  const url = siteUrl()
  const body = richTextToEmailHtml(options.bodyHtml)
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f6f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f6;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8e7;">
<tr><td style="background:${theme.primary};padding:20px 28px;">
<img src="${url}/logo.png" alt="Medlink Expedite" width="150" height="60" style="display:block;border:0;max-width:150px;height:auto;" />
</td></tr>
<tr><td style="padding:28px;">
<h1 style="font-size:20px;line-height:1.3;margin:0 0 16px;color:${theme.primary};">${escapeHtml(options.title)}</h1>
${body}
</td></tr>
<tr><td style="background:${theme.soft};padding:20px 28px;font-size:12px;line-height:1.6;color:#5f6b6a;">
<p style="margin:0 0 8px;"><strong>Medlink Expedite</strong> · Nairobi, Kenya · <a href="${url}" style="color:${theme.accent};">${url.replace(/^https?:\/\//, "")}</a></p>
<p style="margin:0 0 8px;">You received this email because you applied for a role with us. We process your information under the Kenya Data Protection Act, 2019. To request access or deletion of your data, reply to this email.</p>
<p style="margin:0;"><a href="${url}/careers/status" style="color:${theme.accent};">Check application status</a> · <a href="${url}/privacy" style="color:${theme.accent};">Privacy</a></p>
</td></tr>
</table>
</td></tr></table></body></html>`
  const text = `${options.title}\n\n${richTextToPlainText(options.bodyHtml)}\n\n---\nMedlink Expedite · Nairobi, Kenya · ${url}\nYou received this email because you applied for a role with us. We process your information under the Kenya Data Protection Act, 2019. Reply to request access or deletion of your data.\nCheck status: ${url}/careers/status`
  return { html, text }
}

export function buildIcs(input: {
  uid: string
  start: string
  end: string | null
  summary: string
  description: string
  location: string
  url?: string
}): string {
  const format = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const end = input.end || new Date(new Date(input.start).getTime() + 60 * 60_000).toISOString()
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Medlink Expedite//Recruitment//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${format(new Date().toISOString())}`,
    `DTSTART:${format(input.start)}`,
    `DTEND:${format(end)}`,
    `SUMMARY:${input.summary.replace(/[\n,;]/g, " ")}`,
    `DESCRIPTION:${input.description.replace(/[\n,;]/g, " ")}`,
    `LOCATION:${input.location.replace(/[\n,;]/g, " ")}`,
    input.url ? `URL:${input.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean)
  return lines.join("\r\n")
}

export interface SendApplicationEmailInput {
  application: Application
  job: Job
  stage: string
  subject?: string
  body?: string
  templateId?: string | null
  admin: { id: string; name: string; email: string; phone?: string }
  context?: TemplateContext
  attachments?: EmailAttachment[]
  scheduledFor?: string | null
  visibleToCandidate?: boolean
  cc?: string
  bcc?: string
  /** Bypass duplicate-send protection for an explicit resend. */
  forceResend?: boolean
  /** Stable key part; defaults to a unique value for manual sends. */
  idempotencySuffix?: string
}

export async function hasSentStageEmail(applicationId: string, stage: string): Promise<boolean> {
  await ensureSchema()
  const result = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM application_emails WHERE application_id = $1 AND stage = $2 AND status <> 'failed'",
    [applicationId, stage]
  )
  return (result.rows[0]?.count || 0) > 0
}

export async function sendApplicationEmail(input: SendApplicationEmailInput): Promise<{ ok: boolean; error?: string; emailId?: string }> {
  await ensureSchema()
  const template = input.templateId
    ? (await query<{ id: string; stage: string; subject: string; body: string }>("SELECT * FROM email_templates WHERE id = $1", [input.templateId])).rows[0]
    : await getTemplateForStage(input.stage, input.job.id)

  const rawSubject = input.subject ?? template?.subject ?? `Update on your application — ${input.job.title}`
  const rawBody = input.body ?? template?.body ?? "<p>Dear {{candidate_name}},</p><p>Thank you for your application.</p>"

  const context: TemplateContext = {
    candidate_name: input.application.fullName,
    first_name: input.application.fullName.split(/\s+/)[0] || input.application.fullName,
    job_title: input.job.title,
    reference_number: input.application.referenceNumber,
    company_name: "Medlink Expedite",
    module_name: jobTheme(input.job.module).label,
    stage: input.stage,
    closing_date: input.job.expiresAt ? formatEatDate(input.job.expiresAt) : "",
    status_page_link: `${siteUrl()}/careers/status`,
    recruiter_name: input.admin.name,
    recruiter_email: input.admin.email,
    recruiter_phone: input.admin.phone || "",
    ...input.context,
  }

  const subjectResult = renderTemplate(rawSubject, context, false)
  const bodyResult = renderTemplate(rawBody, context, true)
  const missing = [...new Set([...subjectResult.missing, ...bodyResult.missing])]
  if (missing.length > 0) {
    return { ok: false, error: `Missing or unknown variables: ${missing.join(", ")}. Fill them before sending.` }
  }

  const idempotencySuffix = input.idempotencySuffix || randomUUID()
  const idempotencyKey = `career-email:${input.application.id}:${input.stage}:${idempotencySuffix}`

  if (!input.forceResend && input.idempotencySuffix && await hasSentStageEmail(input.application.id, input.stage)) {
    return { ok: false, error: "This stage email was already sent. Choose resend to send it again." }
  }

  const wrapped = buildEmailWrapper({
    module: input.job.module,
    title: subjectResult.output,
    bodyHtml: sanitizeRichText(bodyResult.output),
    candidateName: input.application.fullName,
  })

  const enqueued = await enqueueEmail({
    module: appModuleForJob(input.job.module),
    kind: `career_${input.stage}`,
    recipient: input.application.email,
    subject: subjectResult.output,
    from: careersSender(),
    replyTo: input.admin.email,
    cc: input.cc,
    bcc: input.bcc,
    html: wrapped.html,
    text: wrapped.text,
    attachments: input.attachments,
    idempotencyKey,
    referenceType: "application",
    referenceId: input.application.id,
    scheduledFor: input.scheduledFor || null,
  })

  const outbox = await query<{ id: string }>("SELECT id FROM email_outbox WHERE idempotency_key = $1", [idempotencyKey])
  const emailId = randomUUID()
  await query(
    `INSERT INTO application_emails (id, application_id, outbox_id, template_id, stage, subject, html, sent_by, status, scheduled_for, visible_to_candidate)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      emailId, input.application.id, outbox.rows[0]?.id || null, template?.id || null, input.stage,
      subjectResult.output, wrapped.html, input.admin.id, enqueued ? "queued" : "duplicate",
      input.scheduledFor || null, input.visibleToCandidate ?? true,
    ]
  )

  await writeAudit({
    adminId: input.admin.id,
    module: appModuleForJob(input.job.module),
    action: "recruitment.email.send",
    entityType: "application",
    entityId: input.application.id,
    after: { stage: input.stage, subject: subjectResult.output, enqueued },
  })

  // Never block the caller if delivery fails or Resend is unconfigured.
  try { await processOutbox(2) } catch { /* outbox retries later */ }

  return { ok: true, emailId }
}

/** Latest successfully queued/sent stage email per application, for table/Kanban badges. */
export async function getLastEmailBadges(applicationIds: string[]): Promise<Record<string, { stage: string; createdAt: string }>> {
  await ensureSchema()
  if (applicationIds.length === 0) return {}
  const result = await query<{ application_id: string; stage: string; created_at: Date }>(
    `SELECT DISTINCT ON (e.application_id) e.application_id, e.stage, e.created_at
     FROM application_emails e
     LEFT JOIN email_outbox o ON o.id = e.outbox_id
     WHERE e.application_id = ANY($1::uuid[]) AND (o.status IS NULL OR o.status <> 'failed')
     ORDER BY e.application_id, e.created_at DESC`,
    [applicationIds]
  )
  const map: Record<string, { stage: string; createdAt: string }> = {}
  for (const row of result.rows) {
    map[row.application_id] = { stage: row.stage, createdAt: new Date(row.created_at).toISOString() }
  }
  return map
}

export async function getCommunicationTimeline(applicationId: string) {
  await ensureSchema()
  const result = await query<{
    id: string; stage: string; subject: string; html: string; status: string; scheduled_for: Date | null
    visible_to_candidate: boolean; created_at: Date; sent_by: string | null; sender_name: string | null
    outbox_status: string | null; outbox_error: string | null; sent_at: Date | null; outbox_id: string | null
  }>(
    `SELECT e.*, a.name AS sender_name, o.status AS outbox_status, o.last_error AS outbox_error, o.sent_at, o.id AS outbox_id
     FROM application_emails e
     LEFT JOIN admin_users a ON a.id = e.sent_by
     LEFT JOIN email_outbox o ON o.id = e.outbox_id
     WHERE e.application_id = $1 ORDER BY e.created_at DESC`,
    [applicationId]
  )
  return result.rows.map((row) => ({
    id: row.id,
    stage: row.stage,
    subject: row.subject,
    html: row.html,
    status: row.outbox_status || row.status,
    scheduledFor: row.scheduled_for ? new Date(row.scheduled_for).toISOString() : null,
    visibleToCandidate: row.visible_to_candidate,
    createdAt: new Date(row.created_at).toISOString(),
    sentBy: row.sent_by,
    senderName: row.sender_name,
    error: row.outbox_error,
    sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : null,
    outboxId: row.outbox_id,
  }))
}

export async function getCandidateVisibleMessages(applicationId: string) {
  await ensureSchema()
  const result = await query<{ subject: string; html: string; created_at: Date }>(
    `SELECT subject, html, created_at FROM application_emails
     WHERE application_id = $1 AND visible_to_candidate = TRUE AND status IN ('queued','sent')
     ORDER BY created_at DESC LIMIT 20`,
    [applicationId]
  )
  return result.rows.map((row) => ({ subject: row.subject, html: row.html, createdAt: new Date(row.created_at).toISOString() }))
}

export { formatEatDateTime }
