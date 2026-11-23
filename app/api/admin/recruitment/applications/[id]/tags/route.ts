import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { getApplicationById, getApplicationTags, setApplicationTags } from "@/lib/careers-applications"
import { assertApplicationAccess } from "@/lib/careers-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({ tags: z.array(z.string().trim().min(1).max(40)).max(20) })

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const { id } = await params
    const application = await getApplicationById(id)
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    await assertApplicationAccess(admin, application)
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid tags." }, { status: 400 })
    await setApplicationTags(id, parsed.data.tags)
    return NextResponse.json({ tags: await getApplicationTags(id) })
  } catch (error) {
    return apiErrorResponse(error, "Could not save tags.")
  }
}