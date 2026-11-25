import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { BLOG_STATUSES } from "@/lib/blog-helpers"
import { deleteBlogPost, getBlogComments, getBlogPost, saveBlogPost } from "@/lib/blog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

const postSchema = z.object({
  title: z.string().trim().min(3, "Article title is required.").max(180),
  slug: z.string().trim().max(120).optional(),
  excerpt: z.string().trim().max(500).default(""),
  content: z.string().max(200_000).default(""),
  coverImage: z.string().trim().max(1000).default(""),
  author: z.string().trim().max(120).default("Medlink Expedite"),
  categoryId: z.string().trim().min(1).nullable().optional().default(null),
  status: z.enum(BLOG_STATUSES).default("draft"),
  publishAt: z.string().datetime({ offset: true }).nullable().optional().default(null),
})

export async function GET(request: Request, { params }: Context) {
  try {
    await requireAdmin(request, { permission: "blog.manage" })
    const { id } = await params
    const post = await getBlogPost(id, false)
    if (!post) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 })
    }
    const comments = await getBlogComments(post.id, false)
    return NextResponse.json({ post, comments })
  } catch (error) {
    return apiErrorResponse(error, "Could not load the article.")
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin(request, { permission: "blog.manage" })
    const { id } = await params
    const parsed = postSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid article." }, { status: 400 })
    }

    const before = await getBlogPost(id, false)
    if (!before) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 })
    }
    const post = await saveBlogPost(
      { ...parsed.data, categoryId: parsed.data.categoryId || null },
      id
    )
    await writeAudit({
      adminId: admin.id,
      module: "medical",
      action: "blog.post.update",
      entityType: "blog_post",
      entityId: post.id,
      before: { title: before.title, status: before.status, publishAt: before.publishAt },
      after: { title: post.title, status: post.status, publishAt: post.publishAt },
    })
    return NextResponse.json({ post })
  } catch (error) {
    if (error instanceof Error && /title|publish date|not found/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes("not found") ? 404 : 400 })
    }
    return apiErrorResponse(error, "Could not update the article.")
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin(request, { permission: "blog.manage" })
    const { id } = await params
    const before = await getBlogPost(id, false)
    if (!before) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 })
    }
    const removed = await deleteBlogPost(id)
    if (!removed) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 })
    }
    await writeAudit({
      adminId: admin.id,
      module: "medical",
      action: "blog.post.delete",
      entityType: "blog_post",
      entityId: id,
      before: { title: before.title, status: before.status },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not delete the article.")
  }
}
