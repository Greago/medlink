import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { addApplicationNote, getApplicationById, listApplicationNotes } from "@/lib/careers-applications"
import { assertApplicationAccess } from "@/lib/careers-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({ body: z.string().min(1).max(50_000) })

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.read" })
    const { id } = await params
    const application = await getApplicationById(id)
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 })
    await assertApplicationAccess(admin, application)
    return NextResponse.json({ notes: await listApplicationNotes(id) })
  } catch (error) {
    return apiErrorResponse(error, "Could not load notes.")
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
    if (!parsed.success) return NextResponse.json({ error: "Note cannot be empty." }, { status: 400 })
    const noteId = await addApplicationNote(id, admin.id, parsed.data.body)
    return NextResponse.json({ ok: true, noteId }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not save the note.")
  }
}