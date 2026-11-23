import type { CompanySettings } from "@/lib/db"
import { formatPrice } from "@/lib/catalogue"
import type { AppModule } from "@/lib/modules/types"
import type { StoredSaleItem, StoredSalePayment } from "@/lib/sales-types"

export interface DocumentPdfData {
  title: string
  documentNumber: string
  module: AppModule
  createdAt: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  cashierName?: string
  agentName?: string
  items: StoredSaleItem[]
  payments: StoredSalePayment[]
  subtotal: number
  discount: number
  tax: number
  total: number
  extraLines?: { label: string; amount: number }[]
  change?: number
  settings: CompanySettings
  duplicate?: boolean
  verificationUrl: string
  warrantyLines?: string[]
  notes?: string
}

const BRAND: [number, number, number] = [12, 31, 29]
const ACCENT: [number, number, number] = [24, 188, 170]
const MUTED: [number, number, number] = [107, 114, 128]
const DARK: [number, number, number] = [17, 24, 39]

async function loadLogo(): Promise<string | null> {
  try {
    const [{ readFile }, { join }] = await Promise.all([import("fs/promises"), import("path")])
    const logo = await readFile(join(process.cwd(), "public", "logo.png"))
    return `data:image/png;base64,${logo.toString("base64")}`
  } catch {
    return null
  }
}

async function loadQr(url: string): Promise<string | null> {
  try {
    const QRCode = (await import("qrcode")).default
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 240,
      color: { dark: "#0c1f1d", light: "#ffffff" },
    })
  } catch {
    return null
  }
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export async function buildDocumentPdf(
  data: DocumentPdfData,
  paper: "80mm" | "a4" = "a4"
): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf")
  const thermal = paper === "80mm"
  const pageWidth = thermal ? 80 : 210
  const pageHeight = thermal ? 200 : 297
  const margin = thermal ? 5 : 16
  const doc = new jsPDF({ unit: "mm", format: [pageWidth, pageHeight] })
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const text = (value: string, size = 9, color: [number, number, number] = DARK, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(value, contentWidth) as string[]
    doc.text(lines, margin, y)
    y += lines.length * (size * 0.42) + 1.5
  }

  const row = (left: string, right: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.setFontSize(thermal ? 8 : 9)
    doc.setTextColor(...(bold ? BRAND : DARK))
    doc.text(left, margin, y)
    doc.text(right, pageWidth - margin, y, { align: "right" })
    y += 5
  }

  const rule = () => {
    doc.setDrawColor(...BRAND)
    doc.setLineWidth(0.2)
    doc.line(margin, y, pageWidth - margin, y)
    y += 3
  }

  const logo = await loadLogo()
  if (logo) {
    const logoWidth = thermal ? 32 : 42
    try {
      doc.addImage(logo, "PNG", (pageWidth - logoWidth) / 2, y, logoWidth, thermal ? 13 : 17)
      y += thermal ? 15 : 19
    } catch {
      // A corrupt logo should never block receipt generation.
    }
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(thermal ? 12 : 16)
  doc.setTextColor(...BRAND)
  doc.text(data.settings.businessName, pageWidth / 2, y, { align: "center" })
  y += thermal ? 6 : 8

  text(`${data.module.toUpperCase()} DIVISION`, thermal ? 8 : 9, ACCENT, true)
  if (data.settings.companyAddress) text(data.settings.companyAddress, thermal ? 8 : 9, MUTED)
  if (data.settings.companyPhone) text(`${data.settings.companyPhone} · ${data.settings.companyEmail}`, thermal ? 8 : 9, MUTED)
  const businessIds = [data.settings.kraPin ? `KRA PIN ${data.settings.kraPin}` : "", data.settings.ppbRegistrationNumber ? `PPB ${data.settings.ppbRegistrationNumber}` : ""]
    .filter(Boolean)
    .join(" · ")
  if (businessIds) text(businessIds, thermal ? 8 : 9, MUTED)
  y += 1
  rule()

  doc.setFont("helvetica", "bold")
  doc.setFontSize(thermal ? 14 : 18)
  doc.setTextColor(...BRAND)
  doc.text(data.title.toUpperCase(), pageWidth / 2, y, { align: "center" })
  y += thermal ? 6 : 8
  if (data.duplicate) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(thermal ? 12 : 14)
    doc.setTextColor(180, 35, 24)
    doc.text("DUPLICATE", pageWidth / 2, y, { align: "center" })
    y += 6
  }
  text(data.documentNumber, thermal ? 10 : 12, BRAND, true)
  text(formatDate(data.createdAt), thermal ? 8 : 9, MUTED)
  if (data.cashierName) text(`Cashier: ${data.cashierName}`, thermal ? 8 : 9, MUTED)
  if (data.agentName) text(`Agent: ${data.agentName}`, thermal ? 8 : 9, MUTED)
  text(`Customer: ${data.customerName || "Walk-in customer"}`, thermal ? 8 : 9, MUTED)
  if (data.customerPhone) text(`Phone: ${data.customerPhone}`, thermal ? 8 : 9, MUTED)
  if (data.customerEmail) text(`Email: ${data.customerEmail}`, thermal ? 8 : 9, MUTED)
  y += 1
  rule()

  for (const item of data.items) {
    const name = `${item.quantity} x ${item.productName}`
    const amount = formatPrice(item.lineTotal)
    if (thermal) {
      text(name, 8, [17, 24, 39], true)
      text(`@ ${formatPrice(item.unitPrice)}${item.discountAmount ? `  less ${formatPrice(item.discountAmount)}` : ""}`, 8, MUTED)
      row("Amount", amount)
    } else {
      row(name, amount, true)
      text(`@ ${formatPrice(item.unitPrice)}${item.discountAmount ? ` · discount ${formatPrice(item.discountAmount)}` : ""}`, 8, MUTED)
    }
    if (item.serialNumber) text(`S/N: ${item.serialNumber}`, 8, MUTED)
    if (item.batchNumber) text(`Batch: ${item.batchNumber}${item.expiryDate ? ` · exp ${item.expiryDate}` : ""}`, 8, MUTED)
    if (item.warranty) text(`Warranty: ${item.warranty}`, 8, MUTED)
    y += thermal ? 1 : 2
  }
  rule()

  row("Subtotal", formatPrice(data.subtotal))
  if (data.discount) row("Discount", `- ${formatPrice(data.discount)}`)
  for (const extra of data.extraLines || []) row(extra.label, formatPrice(extra.amount))
  if (data.tax) row(`VAT (${data.settings.vatRegistered ? `${data.settings.vatRate}%` : "not registered"})`, formatPrice(data.tax))
  row("Total", formatPrice(data.total), true)
  y += 2
  if (data.payments.length) {
    text("Payments", thermal ? 9 : 10, BRAND, true)
    for (const payment of data.payments) {
      const label = `${payment.method.toUpperCase()}${payment.reference ? ` · ${payment.reference}` : ""}`
      row(label, formatPrice(payment.amount))
    }
    if (typeof data.change === "number" && data.change > 0) row("Change", formatPrice(data.change), true)
  }
  y += 2
  rule()

  if (data.notes) text(data.notes, thermal ? 8 : 9, MUTED)
  for (const line of data.warrantyLines || []) text(line, thermal ? 8 : 9, MUTED)
  text(data.settings.receiptReturnPolicy, thermal ? 8 : 9, MUTED)
  y += 2
  text(data.settings.receiptFooter, thermal ? 9 : 10, BRAND, true)

  if (!thermal) {
    const qr = await loadQr(data.verificationUrl)
    if (qr) {
      const size = 32
      const qrY = Math.min(y + 2, pageHeight - size - 12)
      try {
        doc.addImage(qr, "PNG", pageWidth - margin - size, qrY, size, size)
      } catch {
        // Ignore invalid QR data.
      }
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(...MUTED)
      doc.text("Scan to verify", pageWidth - margin - size / 2, qrY + size + 4, { align: "center" })
      doc.text(data.verificationUrl, pageWidth - margin, qrY + size + 8, { align: "right", maxWidth: contentWidth })
    }
  } else {
    text(`Verify: ${data.verificationUrl}`, 7, MUTED)
  }

  if (data.duplicate) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(thermal ? 16 : 24)
    doc.setTextColor(180, 35, 24)
    doc.text("DUPLICATE", pageWidth / 2, Math.min(y + 8, pageHeight - 10), { align: "center" })
  }

  return new Uint8Array(doc.output("arraybuffer"))
}

export function documentPdfFilename(title: string, number: string, paper: "80mm" | "a4"): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return `${slug}-${number}-${paper}.pdf`
}
