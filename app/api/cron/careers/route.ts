import { NextResponse } from "next/server"
import { ensureSchema, query } from "@/lib/db"
import { getCareersSettings, getJobRecruiter, updateJob } from "@/lib/careers-jobs"
import { runRetention } from "@/lib/careers-applications"
import { buildEmailWrapper } from "@/lib/careers-emails"
import { enqueueEmail, processOutbox } from "@/lib/email-outbox"
import { formatEatDateTime, siteUrl, type JobModule } from "@/lib/careers"
import { writeAudit } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Careers maintenance cron (protect with CRON_SECRET, e.g. Vercel Cron or an
 * external scheduler hitting this endpoint with `Authorization: Bearer <secret>`).
 *
 * - Expires overdue published jobs (server-authoritative) and notifies the recruiter once.
 * - Publishes jobs whose scheduled publish time has arrived.
 * - Sends an expiring-soon digest (≤3 days) once per job per day when enabled.
 * - Runs the retention policy when configured (off by default).
 * - Flushes the email outbox (including scheduled stage emails).
 */
async function run(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "Cron is not configured (CRON_SECRET missing)." }, { status: 503 })
  }
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-cron-secret") ||
    ""
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  await ensureSchema()
  const summary = { expired: 0, published: 0, expiringNotices: 0, retentionAnonymised: 0, outbox: { sent: 0, failed: 0 } }

  // 1. Expire overdue jobs.
  const overdue = await query<{ id: string; title: string; module: string; created_by: string | null }>(
    "SELECT id, title, module, created_by FROM jobs WHERE status = 'published' AND expires_at IS NOT NULL AND expires_at <= NOW()"
  )
  for (const job of overdue.rows) {
    await updateJob(job.id, { status: "expired" }, null)
    summary.expired += 1
    await writeAudit({ action: "recruitment.job.expire", entityType: "job", entityId: job.id, after: { status: "expired" } })
    await notifyOnce(`expire:${job.id}`, job, "Job expired", 
      `<p>The job <strong>${escapeHtml(job.title)}</strong> reached its closing date and is no longer accepting applications.</p><p><a href="${siteUrl()}/admin/recruitment/jobs">Manage jobs</a> — you can extend the expiry and reopen it.</p>`)
  }

  // 2. Publish scheduled jobs whose time has arrived (skip ones already past expiry).
  const scheduled = await query<{ id: string; title: string }>(
    `SELECT id, title FROM jobs
     WHERE status = 'draft' AND scheduled_publish_at IS NOT NULL AND scheduled_publish_at <= NOW()
       AND (expires_at IS NULL OR expires_at > NOW())`
  )
  for (const job of scheduled.rows) {
    await updateJob(job.id, { status: "published", scheduledPublishAt: null }, null)
    summary.published += 1
    await writeAudit({ action: "recruitment.job.auto_publish", entityType: "job", entityId: job.id, after: { status: "published" } })
  }

  // 3. Expiring-soon digest (≤3 days), once per job per EAT day, when enabled.
  const settings = await getCareersSettings()
  if (settings.digestEnabled) {
    const expiring = await query<{ id: string; title: string; module: string; created_by: string | null; expires_at: Date }>(
      `SELECT id, title, module, created_by, expires_at FROM jobs
       WHERE status = 'published' AND expires_at IS NOT NULL
         AND expires_at > NOW() AND expires_at < NOW() + INTERVAL '3 days'`
    )
    const eatDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
    for (const job of expiring.rows) {
      const sent = await notifyOnce(
        `expiring:${job.id}:${eatDay}`,
        job,
        "Job closing soon",
        `<p>The job <strong>${escapeHtml(job.title)}</strong> closes on <strong>${formatEatDateTime(job.expires_at)} (EAT)</strong>.</p><p><a href="${siteUrl()}/admin/recruitment/jobs">Extend or close the job</a>.</p>`
      )
      if (sent) summary.expiringNotices += 1
    }
  }

  // 4. Retention (anonymise old rejected/withdrawn applications) — off by default.
  summary.retentionAnonymised = await runRetention(settings.retentionMonths)

  // 5. Flush queued/scheduled emails.
  const outbox = await processOutbox(20)
  summary.outbox = { sent: outbox.sent, failed: outbox.failed }

  return NextResponse.json({ ok: true, summary })
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char))
}

/** Insert a cron-run marker; only email when the marker is new (idempotent). */
async function notifyOnce(
  key: string,
  job: { id: string; title: string; module: string; created_by: string | null },
  title: string,
  bodyHtml: string
): Promise<boolean> {
  const marker = await query(
    "INSERT INTO career_cron_runs (key) VALUES ($1) ON CONFLICT (key) DO NOTHING",
    [key]
  )
  if (!marker.rowCount) return false
  try {
    const recruiter = await getJobRecruiter({ createdBy: job.created_by })
    const wrapped = buildEmailWrapper({ module: job.module as JobModule, title: `${title}: ${job.title}`, bodyHtml })
    await enqueueEmail({
      module: job.module === "pharmacy" ? "pharmacy" : "medical",
      kind: `career_cron_${key.split(":")[0]}`,
      recipient: recruiter.email,
      subject: `${title} — ${job.title}`,
      from: process.env.ACCOUNT_FROM_EMAIL || "Medlink Expedite <careers@medlinkexpedite.co.ke>",
      html: wrapped.html,
      text: wrapped.text,
      idempotencyKey: `career-cron:${key}`,
      referenceType: "job",
      referenceId: job.id,
    })
    return true
  } catch {
    // Never let email problems break the cron run.
    return false
  }
}

export async function GET(request: Request) {
  try {
    return await run(request)
  } catch {
    return NextResponse.json({ error: "Cron run failed." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}