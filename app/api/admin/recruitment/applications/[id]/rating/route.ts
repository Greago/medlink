import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { getApplicationById, listApplicationRatings, saveApplicationRating } from "@/lib/careers-applications"
import { assertApplicationAccess } from "@/lib/careers-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  scorecard: z.record(z.string(), z.coerce.number().min(0).max(5)).optional().default({}),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.read" })
    const { id } = await params
    const application = await getApplicationById(id)
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    await assertApplicationAccess(admin, application)
    return NextResponse.json({ ratings: await listApplicationRatings(id) })
  } catch (error) {
    return apiErrorResponse(error, "Could not load ratings.")
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.read" })
    const { id } = await params
    const application = await getApplicationById(id)
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    await assertApplicationAccess(admin, application)
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 })
    const ratingId = await saveApplicationRating(id, admin.id, parsed.data.rating, parsed.data.scorecard)
    return NextResponse.json({ ok: true, ratingId }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not save the rating.")
  }
}