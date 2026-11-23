import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { ensureSchema, query } from "@/lib/db"
import { getJobById, getJobReviewers, setJobReviewers } from "@/lib/careers-jobs"
import { assertJobAccess } from "@/lib/careers-access"
import { writeAudit } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  reviewers: z.array(z.object({
    adminId: z.string().uuid(),
    canEmail: z.boolean().default(false),
  })).max(50),
})

/** GET returns current reviewers plus the assignable staff list. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const { id } = await params
    const job = await getJobById(id)
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 })
    await assertJobAccess(admin, job)
    await ensureSchema()
    const staff = await query<{ id: string; name: string; email: string; role: string }>(
      "SELECT id, name, email, role FROM admin_users WHERE status = 'active' ORDER BY name"
    )
    return NextResponse.json({ reviewers: await getJobReviewers(id), staff: staff.rows })
  } catch (error) {
    return apiErrorResponse(error, "Could not load reviewers.")
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
    if (!parsed.success) return NextResponse.json({ error: "Invalid reviewers." }, { status: 400 })
    await setJobReviewers(id, parsed.data.reviewers)
    await writeAudit({
      adminId: admin.id,
      module: job.module === "pharmacy" ? "pharmacy" : "medical",
      action: "recruitment.job.reviewers",
      entityType: "job",
      entityId: id,
      after: { reviewers: parsed.data.reviewers },
    })
    return NextResponse.json({ reviewers: await getJobReviewers(id) })
  } catch (error) {
    return apiErrorResponse(error, "Could not save reviewers.")
  }
}