import { formatPrice } from "@/lib/catalogue"
import type { Quote } from "@/lib/store"

/**
 * Builds a quotation PDF that can be used by both the browser download
 * and the server-side email attachment.
 */
export async function buildQuotePdf(quote: Quote, logoDataUrl?: string | null): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf")

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let y = 20
  const headerRgb = [0, 77, 62] as const
  const accentRgb = [14, 110, 92] as const
  const bodyRgb = [40, 40, 40] as const

  const addPageIfNeeded = (spaceNeeded: number) => {
    if (y + spaceNeeded > pageHeight - margin) {
      doc.addPage()
      y = margin
      return true
    }
    return false
  }

  const addTableHeader = () => {
    doc.setFillColor(...headerRgb)
    doc.rect(margin, y, pageWidth - margin * 2, 10, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("ITEM", margin + 3, y + 7)
    doc.text("QTY", 110, y + 7)
    doc.text("UNIT PRICE", 130, y + 7)
    doc.text("TOTAL", pageWidth - margin - 3, y + 7, { align: "right" })
  }

  // Header
  doc.setFillColor(...headerRgb)
  doc.rect(0, 0, pageWidth, 48, "F")

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", margin, 12, 40, 22)
  }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.setFont("helvetica", "bold")
  const headerX = margin + 58
  let headerY = 18
  doc.text("MEDLINK EXPEDITE VENTURES LIMITED", headerX, headerY)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  headerY += 8
  doc.text("Email: info@medlinkexpedite.co.ke", headerX, headerY)
  headerY += 6
  doc.text("Tel: +254 743 325 746", headerX, headerY)
  headerY += 6
  doc.text("Nairobi, Kenya", headerX, headerY)
  headerY += 6
  doc.text("Reliable Medical Equipment and Supplies", headerX, headerY)

  // Quote title
  y = 60
  doc.setTextColor(...accentRgb)
  doc.setFontSize(28)
  doc.setFont("helvetica", "bold")
  doc.text("QUOTATION", pageWidth - margin, y, { align: "right" })

  // Quote details
  y = 75
  doc.setTextColor(...bodyRgb)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Quote #: ${quote.quoteNumber}`, pageWidth - margin, y, { align: "right" })
  doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, pageWidth - margin, y + 6, {
    align: "right",
  })
  doc.text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, pageWidth - margin, y + 12, {
    align: "right",
  })

  // Client info
  y = 75
  doc.setTextColor(...accentRgb)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("BILL TO:", margin, y)
  doc.setTextColor(...bodyRgb)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(quote.clientName, margin, y + 8)
  doc.text(quote.clientCompany, margin, y + 14)
  doc.text(quote.clientEmail, margin, y + 20)
  doc.text(quote.clientPhone, margin, y + 26)
  if (quote.clientAddress) {
    const addressLines = doc.splitTextToSize(quote.clientAddress, 80) as string[]
    doc.text(addressLines, margin, y + 32)
  }

  // Table header
  y = 120
  addTableHeader()

  // Table rows
  y += 15
  doc.setFont("helvetica", "normal")
  quote.items.forEach((item, index) => {
    if (addPageIfNeeded(40)) {
      addTableHeader()
      y += 15
    }

    const shade = index % 2 === 0 ? 255 : 250
    doc.setFillColor(shade, shade, shade)
    doc.rect(margin, y - 5, pageWidth - margin * 2, 10, "F")

    doc.setTextColor(50, 50, 50)
    const productName = doc.splitTextToSize(item.productName, 70) as string[]
    doc.text(productName[0], margin + 3, y + 2)
    doc.text(item.quantity.toString(), 110, y + 2)
    doc.text(formatPrice(item.unitPrice), 130, y + 2)
    doc.text(formatPrice(item.total), pageWidth - margin - 3, y + 2, { align: "right" })
    y += 12
  })

  if (addPageIfNeeded(80)) {
    // Leave enough room for totals and summary.
  }

  y += 10
  doc.setDrawColor(...accentRgb)
  doc.line(120, y, pageWidth - margin, y)
  y += 8

  doc.setTextColor(...bodyRgb)
  doc.setFont("helvetica", "normal")
  doc.text("Subtotal:", 130, y)
  doc.text(formatPrice(quote.subtotal), pageWidth - margin - 3, y, { align: "right" })

  y += 8
  doc.text(`Tax (${quote.taxRate}%):`, 130, y)
  doc.text(formatPrice(quote.taxAmount), pageWidth - margin - 3, y, { align: "right" })

  y += 10
  doc.setFillColor(...headerRgb)
  doc.rect(120, y - 5, pageWidth - margin - 120, 12, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("TOTAL:", 130, y + 3)
  doc.text(formatPrice(quote.totalPrice), pageWidth - margin - 3, y + 3, { align: "right" })

  const terms = [
    "1. This quotation is valid for thirty (30) days from the date of issue unless otherwise stated.",
    "2. Prices quoted are in Kenya Shillings (KSh) and are inclusive of applicable VAT.",
    "3. Delivery timelines shall be communicated upon confirmation of the order.",
  ]
  const estimatedTermsHeight = terms.reduce((height, term) => {
    const termLines = doc.splitTextToSize(term, pageWidth - margin * 2) as string[]
    return height + termLines.length * 6 + 10
  }, 0)

  if (addPageIfNeeded(estimatedTermsHeight + 80)) {
    // Start terms on a fresh page if needed.
  }

  y += 25
  doc.setTextColor(...accentRgb)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("TERMS AND CONDITIONS", margin, y)
  y += 6
  doc.setTextColor(...bodyRgb)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")

  const lineSpacing = 4
  terms.forEach((term) => {
    const termLines = doc.splitTextToSize(term, pageWidth - margin * 2) as string[]
    y += 2
    doc.text(termLines, margin, y)
    y += termLines.length * lineSpacing
  })

  y += 10
  doc.setTextColor(...accentRgb)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("PAYMENT DETAILS", margin, y)
  y += 6
  doc.setTextColor(...bodyRgb)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("Paybill Number: 400200", margin, y)
  y += 6
  doc.text("Account Number: 01102787392001", margin, y)
  y += 8
  doc.setFont("helvetica", "bold")
  doc.text("Bank Transfer Details", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.text("Account Name: Medlink Expedite Ventures Ltd", margin, y)
  y += 6
  doc.text("Account Number: 01102787392001", margin, y)
  y += 6
  doc.text("Bank: Co-operative Bank of Kenya", margin, y)
  y += 8
  doc.setFont("helvetica", "italic")
  doc.text("Kindly use the quotation number as the payment reference and share proof of payment for processing.", margin, y, {
    maxWidth: pageWidth - margin * 2,
  })

  if (quote.notes) {
    if (addPageIfNeeded(40)) {
      // Start notes on a fresh page if there isn't enough space.
    }
    y += 14
    doc.setFont("helvetica", "bold")
    doc.text("NOTES:", margin, y)
    doc.setFont("helvetica", "normal")
    const noteLines = doc.splitTextToSize(quote.notes, pageWidth - margin * 2) as string[]
    doc.text(noteLines, margin, y + 6)
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setDrawColor(...accentRgb)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10)
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(
    "Medlink Expediate Ventures Limited | info@medlinkexpedite.co.ke | +254 743 325 746",
    pageWidth / 2,
    footerY,
    { align: "center" }
  )

  return new Uint8Array(doc.output("arraybuffer"))
}
