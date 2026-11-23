import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { deleteHeldSale, getHeldSale } from "@/lib/held-sales"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const heldSale = await getHeldSale(id)
    if (!heldSale) return NextResponse.json({ error: "Held sale not found." }, { status: 404 })
    const admin = await requireAdmin(request, { module: heldSale.module, permission: "pos.access" })
    if (["cashier", "field_agent"].includes(admin.role) && heldSale.cashierId !== admin.id) {
      return NextResponse.json({ error: "Held sale not found." }, { status: 404 })
    }
    return NextResponse.json({ heldSale })
  } catch (error) {
    return apiErrorResponse(error, "Could not load the held sale.")
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const heldSale = await getHeldSale(id)
    if (!heldSale) return NextResponse.json({ error: "Held sale not found." }, { status: 404 })
    const admin = await requireAdmin(request, { module: heldSale.module, permission: "pos.access" })
    if (["cashier", "field_agent"].includes(admin.role) && heldSale.cashierId !== admin.id) {
      return NextResponse.json({ error: "Held sale not found." }, { status: 404 })
    }
    await deleteHeldSale(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not remove the held sale.")
  }
}
