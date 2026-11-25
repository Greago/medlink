import { NextResponse } from "next/server"
import { apiErrorResponse } from "@/lib/api-auth"
import { getBlogPost, toggleBlogClap } from "@/lib/blog"
import { getOrCreateCustomerId } from "@/lib/customer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: Context) {
  try {
    const { id } = await params
    const post = await getBlogPost(id, true)
    if (!post) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 })
    }

    const customerId = await getOrCreateCustomerId()
    const claps = await toggleBlogClap(post.id, customerId)
    return NextResponse.json(claps)
  } catch (error) {
    return apiErrorResponse(error, "Could not save your clap.")
  }
}
