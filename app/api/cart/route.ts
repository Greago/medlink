import { NextResponse } from "next/server"
import { z } from "zod"
import { getOrCreateCustomerId } from "@/lib/customer"
import { clearCart, getCart, setCartQuantity } from "@/lib/db"
import { getActiveModule } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const addSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(999).default(1),
})

const updateSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0).max(999),
})

async function invalidRequest() {
  return NextResponse.json({ error: "Invalid cart request." }, { status: 400 })
}

export async function POST(request: Request) {
  const parsed = addSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return invalidRequest()

  try {
    const [customerId, module] = await Promise.all([getOrCreateCustomerId(), getActiveModule()])
    const current = await getCart(customerId, module)
    const existing = current.find((item) => item.product.id === parsed.data.productId)
    const quantity = (existing?.quantity || 0) + parsed.data.quantity
    const cart = await setCartQuantity(customerId, parsed.data.productId, quantity, module)
    return NextResponse.json({ cart })
  } catch (error) {
    console.error("Cart add failed:", error)
    return NextResponse.json({ error: "Could not update the cart." }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return invalidRequest()

  try {
    const [customerId, module] = await Promise.all([getOrCreateCustomerId(), getActiveModule()])
    const cart = await setCartQuantity(customerId, parsed.data.productId, parsed.data.quantity, module)
    return NextResponse.json({ cart })
  } catch (error) {
    console.error("Cart update failed:", error)
    return NextResponse.json({ error: "Could not update the cart." }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}))
  const productId = typeof body?.productId === "string" && body.productId ? body.productId : null

  try {
    const [customerId, module] = await Promise.all([getOrCreateCustomerId(), getActiveModule()])

    if (productId) {
      const cart = await setCartQuantity(customerId, productId, 0, module)
      return NextResponse.json({ cart })
    }

    await clearCart(customerId, module)
    return NextResponse.json({ cart: [] })
  } catch (error) {
    console.error("Cart delete failed:", error)
    return NextResponse.json({ error: "Could not update the cart." }, { status: 500 })
  }
}
