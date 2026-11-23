import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, assertModuleAccess, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { getSaleDetail, voidSale } from "@/lib/sales"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  reason: z.string().trim().min(3).max(500),
})

interface Context {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Context) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "A reason of at least 3 characters is required." }, { status: 400 })
  }

  try {
    const { id } = await params
    const admin = await requireAdmin(request, { permission: "pos.void" })
    const before = await getSaleDetail(id)
    if (!before) return NextResponse.json({ error: "Sale not found." }, { status: 404 })
    assertModuleAccess(admin, before.sale.module)

    await voidSale(id, parsed.data.reason, admin.id)
    await writeAudit({
      adminId: admin.id,
      module: before.sale.module,
      action: "sale.void",
      entityType: "sale",
      entityId: id,
      before: { status: before.sale.status, isVoid: before.sale.isVoid },
      after: { status: "voided", isVoid: true, reason: parsed.data.reason },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not void the sale.")
  }
}
