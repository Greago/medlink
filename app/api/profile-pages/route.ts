import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { saveProfilePages } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  pages: z
    .array(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        highlight: z.string().default(""),
      })
    )
    .max(100),
})

export async function PUT(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile pages." }, { status: 400 })
  }

  try {
    await requireAdmin(request, { permission: "settings.manage" })
    const pages = await saveProfilePages(parsed.data.pages)
    return NextResponse.json({ pages })
  } catch (error) {
    return apiErrorResponse(error, "Could not save profile pages.")
  }
}
