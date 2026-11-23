import { NextResponse } from "next/server"
import { apiErrorResponse, assertModuleAccess, requireAdmin } from "@/lib/api-auth"
import { getSettings } from "@/lib/db"
import { buildDocumentPdf, documentPdfFilename } from "@/lib/document-pdf"
import { hasPermission } from "@/lib/roles"
import { buildSaleDocumentData, saleVerificationUrl } from "@/lib/sale-documents"
import { getSaleDetail } from "@/lib/sales"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const admin = await requireAdmin(request, {
      permissions: ["sales.read.all", "sales.read.own"],
    })
    const detail = await getSaleDetail(id)
    if (!detail) return NextResponse.json({ error: "Sale not found." }, { status: 404 })
    assertModuleAccess(admin, detail.sale.module)

    if (!hasPermission(admin, "sales.read.all")) {
      const { query } = await import("@/lib/db")
      const owned = await query<{ id: string }>(
        "SELECT id FROM sales WHERE id = $1 AND cashier_id = $2",
        [id, admin.id]
      )
      if (!owned.rows[0]) return NextResponse.json({ error: "Sale not found." }, { status: 404 })
    }

    const paramsUrl = new URL(request.url).searchParams
    const paper = paramsUrl.get("paper") === "80mm" ? "80mm" : "a4"
    const duplicate = paramsUrl.get("duplicate") === "1" || paramsUrl.get("duplicate") === "true"
    const settings = await getSettings()
    const data = buildSaleDocumentData(detail, settings, saleVerificationUrl(request, detail.sale.saleNumber), {
      duplicate,
    })
    const pdf = await buildDocumentPdf(data, paper)
    const filename = documentPdfFilename(data.title, detail.sale.saleNumber, paper)

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return apiErrorResponse(error, "Could not generate the PDF.")
  }
}
