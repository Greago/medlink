import { NextResponse } from "next/server"
import { apiErrorResponse } from "@/lib/api-auth"
import { getBlogPosts } from "@/lib/blog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const posts = await getBlogPosts({
      publishedOnly: true,
      categorySlug: url.searchParams.get("category") || undefined,
      search: url.searchParams.get("search") || undefined,
    })

    return NextResponse.json({
      posts: posts.map(({ content: _content, ...summary }) => summary),
    })
  } catch (error) {
    return apiErrorResponse(error, "Could not load articles.")
  }
}
