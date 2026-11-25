import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { deleteBlogCategory, getBlogCategories, updateBlogCategory } from "@/lib/blog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(60),
  description: z.string().trim().max(240).default(""),
})

function isDuplicate(error: unknown): boolean {
  return error instanceof Error && /unique|duplicate/i.test(error.message)
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin(request, { permission: "blog.manage" })
    const { id } = await params
    const parsed = categorySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid category." }, { status: 400 })
    }

    const before = (await getBlogCategories(false)).find((category) => category.id === id) || null
    const category = await updateBlogCategory(id, parsed.data.name, parsed.data.description)
    if (!category) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 })
    }
    await writeAudit({
      adminId: admin.id,
      module: "medical",
      action: "blog.category.update",
      entityType: "blog_category",
      entityId: category.id,
      before,
      after: category,
    })
    return NextResponse.json({ category })
  } catch (error) {
    if (isDuplicate(error)) {
      return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 })
    }
    return apiErrorResponse(error, "Could not update the category.")
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin(request, { permission: "blog.manage" })
    const { id } = await params
    const before = (await getBlogCategories(false)).find((category) => category.id === id) || null
    const removed = await deleteBlogCategory(id)
    if (!removed) {
      return NextResponse.json(
        { error: "Move or delete the articles in this category before removing it." },
        { status: 409 }
      )
    }
    await writeAudit({
      adminId: admin.id,
      module: "medical",
      action: "blog.category.delete",
      entityType: "blog_category",
      entityId: id,
      before,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not delete the category.")
  }
}
