import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { ensureSchema, query } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    await requireAdmin(request, {
      module: "medical",
      permissions: ["sales.read.all", "sales.read.own", "products.read"],
    })
    await ensureSchema()
    const result = await query(
      `SELECT ms.*, p.name AS product_name, p.model,
              si.serial_number AS item_serial, si.warranty AS item_warranty,
              s.sale_number, s.created_at AS sale_date, s.customer_name
       FROM medical_serials ms
       LEFT JOIN products p ON p.id = ms.product_id
       LEFT JOIN sale_items si ON si.id = ms.sale_item_id
       LEFT JOIN sales s ON s.id = si.sale_id
       WHERE ms.module = 'medical'
       ORDER BY ms.created_at DESC
       LIMIT 500`
    )
    return NextResponse.json({ serials: result.rows })
  } catch (error) {
    return apiErrorResponse(error, "Could not load serials and warranties.")
  }
}
