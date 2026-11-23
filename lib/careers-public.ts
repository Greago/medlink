import { randomUUID } from "crypto"
import { ensureSchema, query } from "@/lib/db"
import { enqueueEmail } from "@/lib/email-outbox"
import { detectApplicationFile, sanitizeFilename } from "@/lib/careers-files"
import { createMagicLink, getApplicationByReference, hashIp } from "@/lib/careers-applications"
import { getCandidateVisibleMessages } from "@/lib/careers-emails"
import { buildEmailWrapper } from "@/lib/careers-emails"
import { listInterviews } from "@/lib/careers-applications"
import { formatEatDate, formatEatDateTime, siteUrl, STAGE_LABELS, PUBLIC_STAGES, PUBLIC_STAGE_LABELS, type ApplicationStage } from "@/lib/careers"

/** Simple fixed-window rate limiter backed by PostgreSQL. Returns true when allowed. */
export async function checkRateLimit(key: string, maxHits: number, windowSeconds: number): Promise<boolean> {
  await ensureSchema()
  const result = await query<{ hits: number; expired: boolean }>(
    `INSERT INTO career_rate_limits (key, hits, window_start) VALUES ($1, 1, NOW())
     ON CONFLICT (key) DO UPDATE SET
       hits = CASE WHEN career_rate_limits.window_start < NOW() - ($2 || ' seconds')::interval THEN 1 ELSE career_rate_limits.hits + 1 END,
       window_start = CASE WHEN career_rate_limits.window_start < NOW() - ($2 || ' seconds')::interval THEN NOW() ELSE career_rate_limits.window_start END
     RETURNING hits, (hits > $3) AS expired`,
    [key, String(windowSeconds), maxHits]
  )
  return !result.rows[0]?.expired
}

export async function createTalentPoolEntry(input: {
  fullName: string
  email: string
  phone: string
  interest: string
  consent: boolean
  ipHash: string
  cv?: { filename: string; buffer: Buffer } | null
}): Promise<{ id: string }> {
  await ensureSchema()
  let cvFilename = ""
  let cvMime = ""
  let cvData: Buffer | null = null
  if (input.cv) {
    const detected = detectApplicationFile(input.cv.buffer, input.cv.filename)
    if ("error" in detected) throw new Error(detected.error)
    cvFilename = sanitizeFilename(input.cv.filename)
    cvMime = detected.mime
    cvData = input.cv.buffer
  }
  const id = randomUUID()
  await query(
    `INSERT INTO talent_pool_entries (id, full_name, email, phone, interest, consent, consent_at, cv_filename, cv_mime, cv_data, ip_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      id, input.fullName.trim(), input.email.trim().toLowerCase(), input.phone.trim(), input.interest.trim(),
      input.consent, input.consent ? new Date().toISOString() : null, cvFilename, cvMime, cvData, input.ipHash,
    ]
  )
  return { id }
}

/**
 * Magic-link request for the status page. Always returns the same generic
 * outcome so it never reveals whether an application exists.
 */
export async function requestStatusLink(reference: string, email: string, ip: string): Promise<void> {
  const ipHash = hashIp(ip)
  const allowed = await checkRateLimit(`status:${ipHash}`, 5, 3600)
  if (!allowed) return
  const application = await getApplicationByReference(reference, email)
  if (!application) return
  const token = await createMagicLink(application.id)
  const link = `${siteUrl()}/careers/status?token=${token}`
  const wrapped = buildEmailWrapper({
    module: application.jobModule || "company-wide",
    title: "Your application status link",
    bodyHtml: `<p>Dear ${application.fullName.replace(/[<>&]/g, "")},</p><p>Use the secure link below to view the status of your application <strong>${application.referenceNumber}</strong> for <strong>${(application.jobTitle || "").replace(/[<>&]/g, "")}</strong>.</p><p><a href="${link}">View my application status</a></p><p>The link expires in 30 minutes and can only be used once. If you did not request it, you can ignore this email.</p>`,
  })
  await enqueueEmail({
    module: application.jobModule === "pharmacy" ? "pharmacy" : "medical",
    kind: "career_status_link",
    recipient: application.email,
    subject: `Your application status link — ${application.referenceNumber}`,
    from: process.env.ACCOUNT_FROM_EMAIL || "Medlink Expedite <careers@medlinkexpedite.co.ke>",
    html: wrapped.html,
    text: wrapped.text,
    idempotencyKey: `career-status-link:${application.id}:${token.slice(0, 12)}`,
    referenceType: "application",
    referenceId: application.id,
  })
}

/** Safe candidate-facing payload. Never includes notes, ratings or other candidates. */
export async function getCandidateStatus(applicationId: string) {
  const { getApplicationById } = await import("@/lib/careers-applications")
  const application = await getApplicationById(applicationId)
  if (!application) return null
  const [messages, interviews] = await Promise.all([
    getCandidateVisibleMessages(application.id),
    listInterviews(application.id),
  ])
  const stage = application.stage as ApplicationStage
  const publicStep =
    stage === "applied" ? "applied"
    : stage === "screening" ? "screening"
    : stage === "shortlisted" ? "shortlisted"
    : stage === "interview" ? "interview"
    : "decision"
  const decisionLabel =
    stage === "hired" ? "Hired"
    : stage === "offer" ? "Offer"
    : stage === "rejected" ? "Not progressing"
    : stage === "withdrawn" ? "Withdrawn"
    : stage === "talent_pool" ? "Talent pool"
    : "Decision"
  return {
    referenceNumber: application.referenceNumber,
    jobTitle: application.jobTitle || "",
    jobSlug: application.jobSlug || "",
    stage,
    stageLabel: STAGE_LABELS[stage] || stage,
    submittedAt: application.createdAt,
    progress: PUBLIC_STAGES.map((step) => ({
      key: step,
      label: step === "decision" ? decisionLabel : PUBLIC_STAGE_LABELS[step],
      done: PUBLIC_STAGES.indexOf(step) <= PUBLIC_STAGES.indexOf(publicStep),
      current: step === publicStep,
    })),
    interviews: interviews
      .filter((item) => item.status === "scheduled")
      .map((item) => ({
        type: item.type,
        startsAt: item.startsAt,
        when: formatEatDateTime(item.startsAt),
        location: item.location,
        meetingLink: item.meetingLink,
      })),
    messages: messages.map((message) => ({
      subject: message.subject,
      html: message.html,
      date: formatEatDate(message.createdAt),
      createdAt: message.createdAt,
    })),
  }
}