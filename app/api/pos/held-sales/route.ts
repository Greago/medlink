import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { listHeldSales, saveHeldSale } from "@/lib/held-sales"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  id: z.string().uuid().optional(),
  module: z.enum(["medical", "pharmacy"]),
  branchId: z.string().uuid().nullable().optional(),
  customer: z.unknown().default({}),
  cart: z.unknown().default([]),
  notes: z.string().trim().max(1000).default(""),
})

export async function GET(request: Request) {
  try {
    const moduleParam = new URL(request.url).searchParams.get("module")
    const module = moduleParam === "pharmacy" || moduleParam === "medical" ? moduleParam : "medical"
    const admin = await requireAdmin(request, { module, permission: "pos.access" })
    const onlyMine = admin.role === "cashier" || admin.role === "field_agent"
    const heldSales = await listHeldSales({ module, cashierId: onlyMine ? admin.id : undefined })
    return NextResponse.json({ heldSales })
  } catch (error) {
    return apiErrorResponse(error, "Could not load held sales.")
  }
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid held sale." }, { status: 400 })
  }

  try {
    const admin = await requireAdmin(request, {
      module: parsed.data.module,
      permission: "pos.access",
    })
    if (parsed.data.id && !["owner", "manager"].includes(admin.role)) {
      const existing = await listHeldSales({ module: parsed.data.module, cashierId: admin.id })
      if (!existing.some((sale) => sale.id === parsed.data.id)) {
        return NextResponse.json({ error: "Held sale not found." }, { status: 404 })
      }
    }
    const heldSale = await saveHeldSale({
      ...parsed.data,
      customer: parsed.data.customer ?? {},
      cart: parsed.data.cart ?? [],
      cashierId: admin.id,
    })
    return NextResponse.json({ heldSale }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not hold the sale.")
  }
}
