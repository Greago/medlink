import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { listSupplierPayments, recordSupplierPayment } from "@/lib/finance"
import { isAppModule } from "@/lib/modules/types"
import { parseModuleFromRequest } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  module: z.enum(["medical", "pharmacy"]).optional(),
  supplierId: z.string().uuid().nullable().optional(),
  purchaseId: z.string().uuid().nullable().optional(),
  amount: z.number().positive().max(100000000),
  method: z.enum(["cash", "mpesa", "card", "bank"]).default("bank"),
  reference: z.string().trim().max(120).default(""),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permissions: ["finance.read", "finance.manage"] })
    const requested = new URL(request.url).searchParams.get("module")
    const module = isAppModule(requested) ? requested : parseModuleFromRequest(request)
    const payments = await listSupplierPayments(module)
    return NextResponse.json({ payments })
  } catch (error) {
    return apiErrorResponse(error, "Could not load supplier payments.")
  }
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payment details." },
      { status: 400 }
    )
  }

  try {
    const module = parsed.data.module || parseModuleFromRequest(request)
    const admin = await requireAdmin(request, { module, permission: "finance.manage" })
    const payment = await recordSupplierPayment({ ...parsed.data, module, adminId: admin.id })
    await writeAudit({
      adminId: admin.id,
      module,
      action: "supplier_payment.create",
      entityType: "supplier_payment",
      entityId: payment.id,
      after: { amount: payment.amount, method: payment.method, supplierId: payment.supplierId },
    })
    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not record the supplier payment.")
  }
}
