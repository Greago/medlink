import { NextResponse } from "next/server"
import { getOrCreateCustomerId } from "@/lib/customer"
import {
  ensureSchema,
  getCart,
  getInquiries,
  getLikes,
  getProducts,
  getProfilePages,
  getQuotes,
  getSettings,
} from "@/lib/db"
import { getActiveModule, hasChosenModule } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await ensureSchema()
    const [customerId, module, moduleChosen] = await Promise.all([
      getOrCreateCustomerId(),
      getActiveModule(),
      hasChosenModule(),
    ])

    const [products, cart, likes, inquiries, quotes, profilePages, settings] = await Promise.all([
      getProducts(module),
      getCart(customerId, module),
      getLikes(customerId, module),
      getInquiries(),
      getQuotes(),
      getProfilePages(),
      getSettings(),
    ])

    return NextResponse.json({
      module,
      moduleChosen,
      products,
      cart,
      likes,
      inquiries,
      quotes,
      profilePages,
      settings,
    })
  } catch (error) {
    console.error("Failed to load app state:", error)
    return NextResponse.json({ error: "Could not load application data." }, { status: 500 })
  }
}
