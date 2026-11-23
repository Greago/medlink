import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { deleteProduct, updateProduct } from "@/lib/db"
import { getActiveModule } from "@/lib/modules/server"
import { productSchema } from "@/lib/product-schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params
  const parsed = productSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid product." }, { status: 400 })
  }

  try {
    await requireAdmin(request, { permission: "products.manage", scopeModule: true })
    const module = await getActiveModule()
    const product = await updateProduct(id, { id, module, ...parsed.data })
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 })
    return NextResponse.json({ product })
  } catch (error) {
    return apiErrorResponse(error, "Could not update the product.")
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params

  try {
    await requireAdmin(request, { permission: "products.manage", scopeModule: true })
    const module = await getActiveModule()
    await deleteProduct(id, module)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not delete the product.")
  }
}
