import { NextResponse } from "next/server"
import { getOrCreateCustomerId } from "@/lib/customer"
import {
  DEFAULT_SETTINGS,
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
  const [module, moduleChosen] = await Promise.all([getActiveModule(), hasChosenModule()])

  try {
    await ensureSchema()
    const customerId = await getOrCreateCustomerId()

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
    // Keep the storefront usable with seed data when Postgres is unavailable.
    return NextResponse.json({
      module,
      moduleChosen,
      products: [],
      cart: [],
      likes: [],
      inquiries: [],
      quotes: [],
      profilePages: [],
      settings: DEFAULT_SETTINGS,
    })
  }
}
