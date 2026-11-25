import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { apiErrorResponse } from "@/lib/api-auth"
import { getBlogClapState, getBlogComments, getBlogPost, getRelatedPosts } from "@/lib/blog"
import { CUSTOMER_COOKIE } from "@/lib/customer"
import { sanitizeRichText } from "@/lib/rich-text"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params
    const post = await getBlogPost(id, true)
    if (!post) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 })
    }

    const cookieStore = await cookies()
    const customerId = cookieStore.get(CUSTOMER_COOKIE)?.value || null
    const [comments, related, claps] = await Promise.all([
      getBlogComments(post.id, true),
      getRelatedPosts(post, 3),
      getBlogClapState(post.id, customerId),
    ])

    return NextResponse.json({
      post: { ...post, content: sanitizeRichText(post.content) },
      comments: comments.map(({ email: _email, ...comment }) => comment),
      related: related.map(({ content: _content, ...summary }) => summary),
      claps,
    })
  } catch (error) {
    return apiErrorResponse(error, "Could not load the article.")
  }
}
