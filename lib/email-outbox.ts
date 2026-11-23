import { randomUUID } from "crypto"
import { ensureSchema, query } from "@/lib/db"
import type { AppModule } from "@/lib/modules/types"

export interface EmailAttachment {
  filename: string
  contentBase64: string
}

export interface EnqueueEmailInput {
  module: AppModule
  kind: string
  recipient: string
  subject: string
  from?: string
  html: string
  text: string
  idempotencyKey: string
  referenceType?: string
  referenceId?: string
  attachments?: EmailAttachment[]
  /** ISO timestamp; the message stays queued until this time. */
  scheduledFor?: string | null
  replyTo?: string
  cc?: string
  bcc?: string
}

export interface OutboxRow {
  id: string
  module: AppModule
  kind: string
  recipient: string
  subject: string
  from_address: string
  reply_to: string
  cc: string
  bcc: string
  html: string
  text: string
  attachments: unknown
  idempotency_key: string
  reference_type: string
  reference_id: string
  status: string
  attempts: number
  last_error: string
}

export interface OutboxSummary {
  processed: number
  sent: number
  failed: number
  notConfigured?: boolean
}

function senderFor(row: OutboxRow): string | null {
  return row.from_address || process.env.ACCOUNT_FROM_EMAIL || null
}

export async function enqueueEmail(input: EnqueueEmailInput): Promise<boolean> {
  await ensureSchema()
  const result = await query(
    `INSERT INTO email_outbox (
       id, module, kind, recipient, subject, from_address, reply_to, cc, bcc,
       html, text, attachments, idempotency_key,
       reference_type, reference_id, status, attempts, next_attempt_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,'pending',0,$16)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING id`,
    [
      randomUUID(),
      input.module,
      input.kind,
      input.recipient.trim().toLowerCase(),
      input.subject,
      input.from || "",
      input.replyTo || "",
      input.cc || "",
      input.bcc || "",
      input.html,
      input.text,
      JSON.stringify(input.attachments || []),
      input.idempotencyKey,
      input.referenceType || "",
      input.referenceId || "",
      input.scheduledFor ? new Date(input.scheduledFor).toISOString() : new Date().toISOString(),
    ]
  )
  return (result.rowCount ?? 0) > 0
}

async function sendViaResend(row: OutboxRow, from: string, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const attachments = Array.isArray(row.attachments) ? row.attachments : []
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      from,
      to: [row.recipient],
      ...(row.reply_to ? { reply_to: row.reply_to } : {}),
      ...(row.cc ? { cc: row.cc.split(",").map((item) => item.trim()).filter(Boolean) } : {}),
      ...(row.bcc ? { bcc: row.bcc.split(",").map((item) => item.trim()).filter(Boolean) } : {}),
      subject: row.subject,
      html: row.html,
      text: row.text,
      attachments: attachments.map((item) => {
        const attachment = item as EmailAttachment
        return { filename: attachment.filename, content: attachment.contentBase64 }
      }),
    }),
  })
  if (!response.ok) {
    return { ok: false, error: `Resend rejected the message (${response.status}).` }
  }
  return { ok: true }
}

/** Sends a bounded batch of due outbox messages. Safe to call repeatedly. */
export async function processOutbox(limit = 10): Promise<OutboxSummary> {
  await ensureSchema()
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { processed: 0, sent: 0, failed: 0, notConfigured: true }

  const claimed = await query<OutboxRow>(
    `UPDATE email_outbox
     SET status = 'processing', next_attempt_at = NOW() + INTERVAL '10 minutes', updated_at = NOW()
     WHERE id IN (
       SELECT id FROM email_outbox
       WHERE status IN ('pending', 'retrying', 'processing')
         AND next_attempt_at <= NOW()
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [Math.min(Math.max(limit, 1), 50)]
  )

  const summary: OutboxSummary = { processed: claimed.rows.length, sent: 0, failed: 0 }
  for (const row of claimed.rows) {
    // Route-specific from addresses are stored in settings and passed by the
    // enqueuing code through the subject prefix fallback below.
    const from = senderFor(row)
    if (!from) {
      await query(
        `UPDATE email_outbox
         SET status = 'failed', attempts = attempts + 1, last_error = $2, updated_at = NOW()
         WHERE id = $1`,
        [row.id, "No sender address is configured for this email."]
      )
      summary.failed += 1
      continue
    }

    try {
      const result = await sendViaResend(row, from, apiKey)
      if (result.ok) {
        await query(
          `UPDATE email_outbox SET status = 'sent', sent_at = NOW(), last_error = '', updated_at = NOW() WHERE id = $1`,
          [row.id]
        )
        summary.sent += 1
      } else {
        const attempts = row.attempts + 1
        const backoffMinutes = Math.min(5 * 2 ** Math.max(attempts - 1, 0), 60)
        await query(
          `UPDATE email_outbox
           SET status = $2, attempts = $3, last_error = $4,
               next_attempt_at = NOW() + ($5::int * INTERVAL '1 minute'), updated_at = NOW()
           WHERE id = $1`,
          [row.id, attempts >= 5 ? "failed" : "retrying", attempts, result.error || "Delivery failed.", backoffMinutes]
        )
        summary.failed += 1
      }
    } catch (error) {
      const attempts = row.attempts + 1
      await query(
        `UPDATE email_outbox
         SET status = $2, attempts = $3, last_error = $4,
             next_attempt_at = NOW() + INTERVAL '15 minutes', updated_at = NOW()
         WHERE id = $1`,
        [row.id, attempts >= 5 ? "failed" : "retrying", attempts, error instanceof Error ? error.message : "Delivery failed."]
      )
      summary.failed += 1
    }
  }

  return summary
}

export async function retryOutboxEmail(id: string): Promise<boolean> {
  await ensureSchema()
  const result = await query(
    `UPDATE email_outbox
     SET status = 'pending', attempts = 0, last_error = '', next_attempt_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [id]
  )
  return (result.rowCount ?? 0) > 0
}

export interface OutboxListRow extends OutboxRow {
  created_at: string
  sent_at: string | null
  updated_at: string
}

export async function listOutbox(limit = 100): Promise<OutboxListRow[]> {
  await ensureSchema()
  const result = await query<OutboxListRow>(
    `SELECT * FROM email_outbox ORDER BY created_at DESC LIMIT $1`,
    [Math.min(Math.max(limit, 1), 200)]
  )
  return result.rows
}

export async function emailStatusFor(referenceType: string, referenceId: string) {
  await ensureSchema()
  const result = await query<{ status: string; attempts: number; last_error: string; sent_at: string | null }>(
    `SELECT status, attempts, last_error, sent_at FROM email_outbox
     WHERE reference_type = $1 AND reference_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [referenceType, referenceId]
  )
  return result.rows[0] || null
}
