import { formatPrice } from "@/lib/catalogue"
import type { AppModule } from "@/lib/modules/types"

export type EmailKind =
  | "sale_thank_you"
  | "agent_invite"
  | "commission_statement"
  | "customer_statement"
  | "overdue_reminder"
  | "quote_sent"
  | "invoice_sent"
  | "refund_credit_note"
  | "shift_summary"
  | "daily_summary"
  | "weekly_summary"
  | "low_stock_digest"
  | "test"

export interface EmailTemplateInput {
  kind: EmailKind
  module: AppModule
  businessName: string
  title: string
  greeting?: string
  intro: string
  lines?: string[]
  total?: number
  ctaLabel?: string
  ctaUrl?: string
  footerNote?: string
  supportEmail?: string
  supportPhone?: string
  whatsappNumber?: string
}

const ACCENT = "#18bcaa"
const BRAND = "#0c1f1d"

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }
    return entities[character]
  })
}

export function renderEmail(input: EmailTemplateInput): { html: string; text: string } {
  const lines = input.lines || []
  const greeting = input.greeting || "Hello,"
  const total = typeof input.total === "number" ? formatPrice(input.total) : ""
  const supportEmail = input.supportEmail || "info@medlinkexpedite.co.ke"
  const supportPhone = input.supportPhone || "+254 743 325 746"
  const whatsapp = (input.whatsappNumber || supportPhone).replace(/[^\d]/g, "")
  const whatsappUrl = `https://wa.me/${whatsapp}`
  const footerNote = input.footerNote || "Thank you for choosing Medlink Expedite."

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
          <tr><td style="background:${BRAND};padding:28px 32px;">
            <p style="margin:0;color:${ACCENT};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${escapeHtml(input.module)} division</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;line-height:1.25;">${escapeHtml(input.title)}</h1>
          </td></tr>
          <tr><td style="padding:28px 32px;">
            <p style="margin:0 0 16px;font-size:15px;">${escapeHtml(greeting)}</p>
            <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">${escapeHtml(input.intro)}</p>
            ${
              lines.length
                ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;margin-bottom:18px;">
                    ${lines
                      .map(
                        (line) =>
                          `<tr><td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:14px;">${escapeHtml(
                            line
                          )}</td></tr>`
                      )
                      .join("")}
                   </table>`
                : ""
            }
            ${
              total
                ? `<p style="margin:0 0 18px;font-size:18px;font-weight:700;color:${BRAND};">Total: ${escapeHtml(
                    total
                  )}</p>`
                : ""
            }
            ${
              input.ctaUrl
                ? `<p style="margin:0 0 24px;"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">${escapeHtml(
                    input.ctaLabel || "View details"
                  )}</a></p>`
                : ""
            }
            <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">${escapeHtml(footerNote)}</p>
          </td></tr>
          <tr><td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
              ${escapeHtml(input.businessName)}<br />
              Support: <a href="mailto:${escapeHtml(supportEmail)}" style="color:${BRAND};">${escapeHtml(supportEmail)}</a>
              &nbsp;·&nbsp; ${escapeHtml(supportPhone)}<br />
              <a href="${whatsappUrl}" style="color:${BRAND};">Chat with us on WhatsApp</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  const text = [
    `${input.title} — ${input.businessName}`,
    "",
    greeting,
    "",
    input.intro,
    "",
    ...lines,
    ...(total ? [`Total: ${total}`] : []),
    ...(input.ctaUrl ? [`${input.ctaLabel || "View details"}: ${input.ctaUrl}`] : []),
    "",
    footerNote,
    "",
    `Support: ${supportEmail} | ${supportPhone}`,
  ].join("\n")

  return { html, text }
}
