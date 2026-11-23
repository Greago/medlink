import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { ensureSchema, query } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    await requireAdmin(request, {
      module: "pharmacy",
      permissions: ["sales.read.all", "sales.read.own", "customers.manage"],
    })
    await ensureSchema()
    const result = await query(
      `SELECT d.*,
              p.name AS product_name, p.strength, p.dosage_form,
              pr.prescriber_name, pr.prescriber_reg_no, pr.reference_number, pr.verified,
              a.name AS dispensed_by_name,
              s.sale_number
       FROM dispensing_register d
       LEFT JOIN products p ON p.id = d.product_id
       LEFT JOIN prescriptions pr ON pr.id = d.prescription_id
       LEFT JOIN admin_users a ON a.id = d.dispensed_by
       LEFT JOIN sale_items si ON si.id = d.sale_item_id
       LEFT JOIN sales s ON s.id = si.sale_id
       WHERE d.module = 'pharmacy'
       ORDER BY d.created_at DESC
       LIMIT 500`
    )
    return NextResponse.json({ entries: result.rows })
  } catch (error) {
    return apiErrorResponse(error, "Could not load the dispensing register.")
  }
}
