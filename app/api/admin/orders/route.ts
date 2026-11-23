import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { getAllOrders, updateOrderStatus } from "@/lib/db"
import { getActiveModule, parseModuleFromRequest } from "@/lib/modules/server"
import type { Order } from "@/lib/store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  id: z.string().min(1),
  status: z.enum(["Pending", "Confirmed", "Completed", "Cancelled"]),
})

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permission: "orders.manage", scopeModule: true })
    const module = await getActiveModule()
    const orders = await getAllOrders(module)
    return NextResponse.json({ orders })
  } catch (error) {
    return apiErrorResponse(error, "Could not load orders.")
  }
}

export async function PATCH(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order update." }, { status: 400 })
  }

  try {
    const admin = await requireAdmin(request, { permission: "orders.manage" })
    const updated = await updateOrderStatus(parsed.data.id, parsed.data.status as Order["status"])
    if (!updated) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }
    await writeAudit({
      adminId: admin.id,
      module: parseModuleFromRequest(request),
      action: "order.status.update",
      entityType: "order",
      entityId: updated.id,
      after: { status: updated.status },
    })
    return NextResponse.json({ order: updated })
  } catch (error) {
    return apiErrorResponse(error, "Could not update the order.")
  }
}
