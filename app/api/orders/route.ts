import { NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/account-auth"
import { getOrCreateCustomerId } from "@/lib/customer"
import { createOrderFromCart, getOrdersForUser } from "@/lib/db"
import { getActiveModule } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  notes: z.string().trim().max(2000).default(""),
})

export async function GET(request: Request) {
  try {
    const [user, module] = await Promise.all([getCurrentUser(request), getActiveModule()])
    if (!user) {
      return NextResponse.json({ error: "Please sign in to view your orders." }, { status: 401 })
    }

    const orders = await getOrdersForUser(user.id, module)
    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Could not load orders:", error)
    return NextResponse.json({ error: "Could not load your orders." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const [user, module] = await Promise.all([getCurrentUser(request), getActiveModule()])
    if (!user) {
      return NextResponse.json({ error: "Please sign in before placing an order." }, { status: 401 })
    }

    const parsed = schema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid order details." }, { status: 400 })
    }

    const customerId = await getOrCreateCustomerId()
    const order = await createOrderFromCart({
      userId: user.id,
      customerId,
      customerName: user.name,
      customerEmail: user.email,
      notes: parsed.data.notes,
      module,
    })

    if (!order) {
      return NextResponse.json({ error: `Your ${module === "pharmacy" ? "pharmacy" : "equipment"} cart is empty.` }, { status: 400 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error("Order creation failed:", error)
    return NextResponse.json({ error: "Could not place the order. Please try again." }, { status: 500 })
  }
}
