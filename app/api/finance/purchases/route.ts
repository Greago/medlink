import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { createPurchase, listPurchases } from "@/lib/finance"
import { isAppModule } from "@/lib/modules/types"
import { parseModuleFromRequest } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  module: z.enum(["medical", "pharmacy"]).optional(),
  supplierId: z.string().uuid().nullable().optional(),
  reference: z.string().trim().max(120).default(""),
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        name: z.string().trim().max(180).optional(),
        quantity: z.number().min(0).default(1),
        unitCost: z.number().min(0).default(0),
      })
    )
    .max(200)
    .default([]),
  total: z.number().positive().max(100000000),
  amountPaid: z.number().min(0).max(100000000).default(0),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permissions: ["finance.read", "finance.manage", "stock.manage"] })
    const requested = new URL(request.url).searchParams.get("module")
    const module = isAppModule(requested) ? requested : parseModuleFromRequest(request)
    const purchases = await listPurchases(module)
    return NextResponse.json({ purchases })
  } catch (error) {
    return apiErrorResponse(error, "Could not load purchases.")
  }
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid purchase details." },
      { status: 400 }
    )
  }

  try {
    const module = parsed.data.module || parseModuleFromRequest(request)
    const admin = await requireAdmin(request, { module, permissions: ["finance.manage", "stock.manage"] })
    const purchase = await createPurchase({ ...parsed.data, module, adminId: admin.id })
    await writeAudit({
      adminId: admin.id,
      module,
      action: "purchase.create",
      entityType: "supplier_purchase",
      entityId: purchase.id,
      after: { reference: purchase.reference, total: purchase.total, amountPaid: purchase.amountPaid },
    })
    return NextResponse.json({ purchase }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not record the purchase.")
  }
}
