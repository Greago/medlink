import { NextResponse } from "next/server"
import { jsPDF } from "jspdf"
import { apiErrorResponse, assertModuleAccess, requireAdmin } from "@/lib/api-auth"
import { formatPrice } from "@/lib/catalogue"
import { getSettings } from "@/lib/db"
import { getStatement } from "@/lib/commissions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const admin = await requireAdmin(request, { permissions: ["commission.manage", "finance.read", "reports.read"] })
    const statement = await getStatement(id)
    if (!statement) return NextResponse.json({ error: "Statement not found." }, { status: 404 })
    assertModuleAccess(admin, statement.module)

    const settings = await getSettings()
    const doc = new jsPDF()
    const brand: [number, number, number] = [12, 31, 29]
    const accent: [number, number, number] = [24, 188, 170]
    doc.setFillColor(...brand)
    doc.rect(0, 0, 210, 34, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(17)
    doc.text(settings.businessName, 16, 18)
    doc.setFontSize(10)
    doc.text("Commission statement", 16, 26)

    doc.setTextColor(...accent)
    doc.setFontSize(11)
    doc.text(`${statement.agentName || "Agent"} · ${statement.periodStart} to ${statement.periodEnd}`, 16, 46)

    const rows: [string, string][] = [
      ["Sales total", formatPrice(statement.salesTotal)],
      ["Gross profit", formatPrice(statement.grossProfit)],
      ["Commission", formatPrice(statement.commissionAmount)],
      ["Target bonus", formatPrice(statement.bonusAmount)],
      ["Total payable", formatPrice(statement.commissionAmount + statement.bonusAmount)],
      ["Status", statement.status],
    ]
    let y = 62
    for (const [label, value] of rows) {
      doc.setFont("helvetica", label === "Total payable" ? "bold" : "normal")
      doc.setFontSize(11)
      doc.setTextColor(30, 41, 59)
      doc.text(label, 16, y)
      doc.text(value, 194, y, { align: "right" })
      y += 10
    }
    doc.setDrawColor(...accent)
    doc.line(16, y - 6, 194, y - 6)
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text(`Generated ${new Date().toLocaleString("en-KE")} · ${settings.companyEmail}`, 16, y + 8)

    const pdf = Buffer.from(doc.output("arraybuffer"))
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="commission-${statement.periodStart}-${statement.periodEnd}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return apiErrorResponse(error, "Could not generate the commission PDF.")
  }
}
