import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { createCategory, deleteCategory, getCategories, renameCategory } from "@/lib/db"
import { getActiveModule, parseModuleFromRequest } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const nameSchema = z.string().trim().min(1, "Category name is required.").max(60)

function isDuplicate(error: unknown): boolean {
  return error instanceof Error && /unique|duplicate/i.test(error.message)
}

export async function GET() {
  try {
    const module = await getActiveModule()
    const categories = await getCategories(module)
    return NextResponse.json({ categories })
  } catch (error) {
    return apiErrorResponse(error, "Could not load categories.")
  }
}

export async function POST(request: Request) {
  const parsed = z.object({ name: nameSchema }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Please provide a valid category name." },
      { status: 400 }
    )
  }

  try {
    const admin = await requireAdmin(request, { permission: "products.manage", scopeModule: true })
    const module = await getActiveModule()
    const category = await createCategory(parsed.data.name, module)
    await writeAudit({
      adminId: admin.id,
      module,
      action: "category.create",
      entityType: "category",
      entityId: category.id,
      after: category,
    })
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (isDuplicate(error)) {
      return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 })
    }
    return apiErrorResponse(error, "Could not create the category.")
  }
}

export async function PATCH(request: Request) {
  const parsed = z
    .object({ id: z.string().trim().min(1), name: nameSchema })
    .safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Please provide a valid category." },
      { status: 400 }
    )
  }

  try {
    const admin = await requireAdmin(request, { permission: "products.manage", scopeModule: true })
    const module = await getActiveModule()
    const before = (await getCategories(module)).find((category) => category.id === parsed.data.id) || null
    const category = await renameCategory(parsed.data.id, parsed.data.name, module)
    if (!category) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 })
    }
    await writeAudit({
      adminId: admin.id,
      module,
      action: "category.rename",
      entityType: "category",
      entityId: category.id,
      before,
      after: category,
    })
    return NextResponse.json({ category })
  } catch (error) {
    if (isDuplicate(error)) {
      return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 })
    }
    return apiErrorResponse(error, "Could not rename the category.")
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim()
  if (!id) {
    return NextResponse.json({ error: "Category id is required." }, { status: 400 })
  }

  try {
    const admin = await requireAdmin(request, { permission: "products.manage", scopeModule: true })
    const module = parseModuleFromRequest(request)
    const before = (await getCategories(module)).find((category) => category.id === id) || null
    const removed = await deleteCategory(id, module)
    if (!removed) {
      return NextResponse.json(
        { error: "This category is still used by products. Move those products first." },
        { status: 409 }
      )
    }
    await writeAudit({
      adminId: admin.id,
      module,
      action: "category.delete",
      entityType: "category",
      entityId: id,
      before,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not delete the category.")
  }
}
