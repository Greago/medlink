import { NextResponse } from "next/server"
import { ensureSchema, getSettings } from "@/lib/db"
import { getSaleByNumber } from "@/lib/sales"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const number = new URL(request.url).searchParams.get("number")?.trim()
    if (!number) return NextResponse.json({ error: "Document number is required." }, { status: 400 })

    await ensureSchema()
    const detail = await getSaleByNumber(number)
    if (!detail) return NextResponse.json({ error: "Document not found." }, { status: 404 })

    const settings = await getSettings()
    return NextResponse.json({
      valid: true,
      businessName: settings.businessName,
      module: detail.sale.module,
      documentType: detail.sale.documentType,
      saleNumber: detail.sale.saleNumber,
      status: detail.sale.isVoid ? "voided" : detail.sale.status,
      createdAt: detail.sale.createdAt,
      total: detail.sale.total,
      items: detail.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
    })
  } catch (error) {
    console.error("Document verification failed:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Could not verify this document." }, { status: 500 })
  }
}
