import { randomUUID } from "crypto"
import { formatPrice } from "@/lib/catalogue"
import { getSettings, query, type CompanySettings } from "@/lib/db"
import { buildDocumentPdf, documentPdfFilename, type DocumentPdfData } from "@/lib/document-pdf"
import { enqueueEmail } from "@/lib/email-outbox"
import { renderEmail } from "@/lib/email-templates"
import { getSaleDetail, type SaleDetail } from "@/lib/sales"

export function saleVerificationUrlFromBase(base: string, saleNumber: string): string {
  return `${base.replace(/\/$/, "")}/verify/${encodeURIComponent(saleNumber)}`
}

export function saleVerificationUrl(request: Request, saleNumber: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const base = configured || new URL(request.url).origin
  return saleVerificationUrlFromBase(base, saleNumber)
}

function documentTitle(documentType: string): string {
  if (documentType === "invoice") return "Invoice"
  if (documentType === "quote") return "Quote"
  return "Receipt"
}

export function buildSaleDocumentData(
  detail: SaleDetail,
  settings: CompanySettings,
  verificationUrl: string,
  options: { duplicate?: boolean; creditNoteNumber?: string } = {}
): DocumentPdfData {
  const { sale, items, payments } = detail
  const title = options.creditNoteNumber ? "Credit Note" : documentTitle(sale.documentType)
  const extras: { label: string; amount: number }[] = []
  if (sale.deliveryFee > 0) extras.push({ label: "Delivery", amount: sale.deliveryFee })
  if (sale.installationFee > 0) extras.push({ label: "Installation", amount: sale.installationFee })

  return {
    title,
    documentNumber: options.creditNoteNumber || sale.saleNumber,
    module: sale.module,
    createdAt: sale.createdAt,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    customerEmail: sale.customerEmail,
    cashierName: sale.cashierName,
    agentName: sale.agentName,
    items,
    payments,
    subtotal: sale.subtotal,
    discount: sale.discountAmount,
    tax: sale.taxAmount,
    total: sale.total,
    extraLines: extras,
    change: payments.reduce((sum, payment) => sum + payment.changeAmount, 0),
    settings,
    duplicate: options.duplicate,
    verificationUrl,
    warrantyLines: items.filter((item) => item.warranty).map((item) => `${item.productName}: ${item.warranty}`),
    notes: sale.notes,
  }
}

export interface SaleEmailResult {
  queued: boolean
  skipped?: "no_recipient" | "not_completed" | "duplicate"
}

export async function enqueueSaleThankYou(
  detail: SaleDetail,
  settings: CompanySettings,
  verificationUrl: string,
  options: { recipient?: string; manual?: boolean } = {}
): Promise<SaleEmailResult> {
  if (detail.sale.isVoid || (detail.sale.status !== "completed" && detail.sale.status !== "paid")) {
    return { queued: false, skipped: "not_completed" }
  }
  const recipient = (options.recipient || detail.sale.customerEmail).trim().toLowerCase()
  if (!recipient) return { queued: false, skipped: "no_recipient" }

  const title = `${documentTitle(detail.sale.documentType)} from ${settings.businessName}`
  const documentData = buildSaleDocumentData(detail, settings, verificationUrl)
  const pdf = await buildDocumentPdf(documentData, "a4")
  const attachment = {
    filename: documentPdfFilename(documentData.title, detail.sale.saleNumber, "a4"),
    contentBase64: Buffer.from(pdf).toString("base64"),
  }
  const rendered = renderEmail({
    kind: "sale_thank_you",
    module: detail.sale.module,
    businessName: settings.businessName,
    title: `Your ${documentData.title.toLowerCase()} from ${settings.businessName}`,
    greeting: `Hi ${detail.sale.customerName || "there"},`,
    intro: `Thank you for your purchase. Your ${documentData.title.toLowerCase()} is attached to this email.`,
    lines: [
      `Document: ${detail.sale.saleNumber}`,
      ...detail.items.map(
        (item) => `${item.quantity} × ${item.productName} — ${formatPrice(item.lineTotal)}`
      ),
      `Payment: ${detail.payments.map((payment) => payment.method.toUpperCase()).join(", ") || "Recorded"}`,
    ],
    total: detail.sale.total,
    ctaLabel: "Verify this document",
    ctaUrl: verificationUrl,
    footerNote: settings.receiptFooter,
    supportEmail: settings.companyEmail,
    supportPhone: settings.companyPhone,
    whatsappNumber: settings.whatsappNumber,
  })

  const key = options.manual
    ? `sale-thank-you:${detail.sale.id}:manual:${randomUUID()}`
    : `sale-thank-you:${detail.sale.id}`
  const queued = await enqueueEmail({
    module: detail.sale.module,
    kind: "sale_thank_you",
    recipient,
    subject: title,
    from: settings.receiptsFromEmail,
    html: rendered.html,
    text: rendered.text,
    idempotencyKey: key,
    referenceType: "sale",
    referenceId: detail.sale.id,
    attachments: [attachment],
  })

  return { queued, skipped: queued ? undefined : "duplicate" }
}

export async function enqueueCreditNoteEmail(
  detail: SaleDetail,
  settings: CompanySettings,
  creditNote: { number: string; total: number; reason: string },
  recipient?: string
): Promise<SaleEmailResult> {
  const to = (recipient || detail.sale.customerEmail).trim().toLowerCase()
  if (!to) return { queued: false, skipped: "no_recipient" }

  const rendered = renderEmail({
    kind: "refund_credit_note",
    module: detail.sale.module,
    businessName: settings.businessName,
    title: "Credit note issued",
    greeting: `Hi ${detail.sale.customerName || "there"},`,
    intro: `A credit note has been issued against ${detail.sale.saleNumber}.`,
    lines: [
      `Credit note: ${creditNote.number}`,
      `Reason: ${creditNote.reason}`,
      `Original document: ${detail.sale.saleNumber}`,
    ],
    total: creditNote.total,
    footerNote: settings.receiptReturnPolicy,
    supportEmail: settings.companyEmail,
    supportPhone: settings.companyPhone,
    whatsappNumber: settings.whatsappNumber,
  })

  const queued = await enqueueEmail({
    module: detail.sale.module,
    kind: "refund_credit_note",
    recipient: to,
    subject: `Credit note ${creditNote.number} from ${settings.businessName}`,
    from: settings.receiptsFromEmail,
    html: rendered.html,
    text: rendered.text,
    idempotencyKey: `credit-note:${creditNote.number}`,
    referenceType: "return",
    referenceId: creditNote.number,
  })

  return { queued, skipped: queued ? undefined : "duplicate" }
}

/**
 * Reconciles completed sales that never received a thank-you email. The fixed
 * idempotency key in enqueueSaleThankYou prevents duplicates even if this is
 * called repeatedly.
 */
export async function enqueueMissingSaleEmails(limit = 10): Promise<number> {
  const rows = await query<{ id: string }>(
    `SELECT s.id
     FROM sales s
     LEFT JOIN email_outbox e
       ON e.reference_type = 'sale' AND e.reference_id = s.id::text AND e.kind = 'sale_thank_you'
     WHERE e.id IS NULL
       AND s.is_void = FALSE
       AND s.status IN ('completed', 'paid')
       AND s.customer_email <> ''
     ORDER BY s.created_at ASC
     LIMIT $1`,
    [Math.min(Math.max(limit, 1), 50)]
  )
  if (!rows.rows.length) return 0

  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://medlinkexpedite.co.ke"
  const settings = await getSettings()
  let queued = 0
  for (const row of rows.rows) {
    const detail = await getSaleDetail(row.id)
    if (!detail) continue
    const result = await enqueueSaleThankYou(
      detail,
      settings,
      saleVerificationUrlFromBase(base, detail.sale.saleNumber)
    )
    if (result.queued) queued += 1
  }
  return queued
}
