import { NextResponse } from "next/server"
import { getBlogCategories } from "@/lib/blog"
import { apiErrorResponse } from "@/lib/api-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const categories = await getBlogCategories(true)
    return NextResponse.json({ categories })
  } catch (error) {
    return apiErrorResponse(error, "Could not load blog categories.")
  }
}
