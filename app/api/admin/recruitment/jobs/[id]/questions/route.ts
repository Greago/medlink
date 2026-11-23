import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { getJobById, getScreeningQuestions, saveScreeningQuestions } from "@/lib/careers-jobs"
import { assertJobAccess } from "@/lib/careers-access"
import { writeAudit } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  questions: z.array(z.object({
    prompt: z.string().trim().min(3).max(500),
    type: z.enum(["text", "yes-no", "choice"]),
    options: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
    required: z.boolean().default(false),
  })).max(20),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.read" })
    const { id } = await params
    const job = await getJobById(id)
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 })
    await assertJobAccess(admin, job)
    return NextResponse.json({ questions: await getScreeningQuestions(id) })
  } catch (error) {
    return apiErrorResponse(error, "Could not load screening questions.")
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const { id } = await params
    const job = await getJobById(id)
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 })
    await assertJobAccess(admin, job)
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid questions." }, { status: 400 })
    for (const question of parsed.data.questions) {
      if (question.type === "choice" && question.options.length < 2) {
        return NextResponse.json({ error: "Choice questions need at least two options." }, { status: 400 })
      }
    }
    await saveScreeningQuestions(id, parsed.data.questions)
    await writeAudit({
      adminId: admin.id,
      module: job.module === "pharmacy" ? "pharmacy" : "medical",
      action: "recruitment.job.questions",
      entityType: "job",
      entityId: id,
      after: { count: parsed.data.questions.length },
    })
    return NextResponse.json({ questions: await getScreeningQuestions(id) })
  } catch (error) {
    return apiErrorResponse(error, "Could not save screening questions.")
  }
}