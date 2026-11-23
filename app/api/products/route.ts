import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { createProduct } from "@/lib/db"
import { getActiveModule } from "@/lib/modules/server"
import { productSchema } from "@/lib/product-schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const parsed = productSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 })
  }

  try {
    await requireAdmin(request, { permission: "products.manage", scopeModule: true })
    const module = await getActiveModule()
    const id = parsed.data.id || `${module}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const product = await createProduct({ ...parsed.data, id, module })
    return NextResponse.json({ product })
  } catch (error) {
    return apiErrorResponse(error, "Could not save the product.")
  }
}
