import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { createBlogCategory, getBlogCategories } from "@/lib/blog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(60),
  description: z.string().trim().max(240).default(""),
})

function isDuplicate(error: unknown): boolean {
  return error instanceof Error && /unique|duplicate/i.test(error.message)
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permission: "blog.manage" })
    const categories = await getBlogCategories(false)
    return NextResponse.json({ categories })
  } catch (error) {
    return apiErrorResponse(error, "Could not load blog categories.")
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request, { permission: "blog.manage" })
    const parsed = categorySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid category." }, { status: 400 })
    }

    const category = await createBlogCategory(parsed.data.name, parsed.data.description)
    await writeAudit({
      adminId: admin.id,
      module: "medical",
      action: "blog.category.create",
      entityType: "blog_category",
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
