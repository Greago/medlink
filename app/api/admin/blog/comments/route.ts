import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { getAllBlogComments } from "@/lib/blog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permission: "blog.manage" })
    const comments = await getAllBlogComments()
    return NextResponse.json({ comments })
  } catch (error) {
    return apiErrorResponse(error, "Could not load comments.")
  }
}
