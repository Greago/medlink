import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { BLOG_STATUSES } from "@/lib/blog-helpers"
import { getBlogPosts, saveBlogPost } from "@/lib/blog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permission: "blog.manage" })
    const url = new URL(request.url)
    const status = url.searchParams.get("status")
    let posts = await getBlogPosts({
      publishedOnly: false,
      categoryId: url.searchParams.get("categoryId") || undefined,
      search: url.searchParams.get("search") || undefined,
    })
    if (status && BLOG_STATUSES.includes(status as (typeof BLOG_STATUSES)[number])) {
      posts = posts.filter((post) => post.status === status)
    }
    return NextResponse.json({ posts })
  } catch (error) {
    return apiErrorResponse(error, "Could not load articles.")
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request, { permission: "blog.manage" })
    const parsed = postSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid article." }, { status: 400 })
    }

    const post = await saveBlogPost({
      ...parsed.data,
      categoryId: parsed.data.categoryId || null,
    })
    await writeAudit({
      adminId: admin.id,
      module: "medical",
      action: "blog.post.create",
      entityType: "blog_post",
      entityId: post.id,
      after: { title: post.title, status: post.status, publishAt: post.publishAt },
    })
    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && /title|publish date/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return apiErrorResponse(error, "Could not create the article.")
  }
}
