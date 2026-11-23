import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { ensureSchema, query } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const createSchema = z.object({
  productId: z.string().min(1),
  batchNumber: z.string().trim().min(1).max(120),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  quantityOnHand: z.number().min(0).max(1000000),
  unitCost: z.number().min(0).max(1000000).default(0),
})

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { module: "pharmacy", permissions: ["stock.manage", "products.read"] })
    await ensureSchema()
    const result = await query(
      `SELECT pb.*, p.name AS product_name, p.strength, p.expiry_date AS product_expiry
       FROM pharmacy_batches pb
       JOIN products p ON p.id = pb.product_id
       WHERE pb.module = 'pharmacy'
       ORDER BY pb.expiry_date NULLS LAST, pb.batch_number ASC
       LIMIT 500`
    )
    return NextResponse.json({ batches: result.rows })
  } catch (error) {
    return apiErrorResponse(error, "Could not load pharmacy batches.")
  }
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid batch details." },
      { status: 400 }
    )
  }

  try {
    const admin = await requireAdmin(request, {
      module: "pharmacy",
      permission: "stock.manage",
    })
    const id = crypto.randomUUID()
    const result = await query(
      `INSERT INTO pharmacy_batches
         (id, module, product_id, batch_number, expiry_date, quantity_on_hand, unit_cost)
       VALUES ($1,'pharmacy',$2,$3,$4,$5,$6)
       ON CONFLICT (product_id, batch_number) DO UPDATE SET
         expiry_date = EXCLUDED.expiry_date,
         unit_cost = EXCLUDED.unit_cost,
         quantity_on_hand = pharmacy_batches.quantity_on_hand + EXCLUDED.quantity_on_hand
       RETURNING *`,
      [
        id,
        parsed.data.productId,
        parsed.data.batchNumber,
        parsed.data.expiryDate || null,
        parsed.data.quantityOnHand,
        parsed.data.unitCost,
      ]
    )
    await writeAudit({
      adminId: admin.id,
      module: "pharmacy",
      action: "batch.save",
      entityType: "pharmacy_batch",
      entityId: result.rows[0].id,
      after: {
        productId: parsed.data.productId,
        batchNumber: parsed.data.batchNumber,
        quantityOnHand: parsed.data.quantityOnHand,
      },
    })
    return NextResponse.json({ batch: result.rows[0] }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not save the batch.")
  }
}
