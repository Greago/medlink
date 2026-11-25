import { NextResponse } from "next/server"
import { apiErrorResponse } from "@/lib/api-auth"
import { addBlogComment, getBlogComments, getBlogPost } from "@/lib/blog"
import { validateBlogComment } from "@/lib/blog-helpers"
import { getOrCreateCustomerId } from "@/lib/customer"

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
    const comments = await getBlogComments(post.id, true)
    return NextResponse.json({ comments: comments.map(({ email: _email, ...comment }) => comment) })
  } catch (error) {
    return apiErrorResponse(error, "Could not load comments.")
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const post = await getBlogPost(id, true)
    if (!post) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 })
    }

    const payload = await request.json().catch(() => null)
    const commentInput = validateBlogComment(payload || {})
    const customerId = await getOrCreateCustomerId()
    const comment = await addBlogComment(post.id, customerId, commentInput)
    return NextResponse.json(
      { comment: { id: comment.id, postId: comment.postId, name: comment.name, body: comment.body, createdAt: comment.createdAt } },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && /name|email|comment/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return apiErrorResponse(error, "Could not post your comment.")
  }
}
