import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import {
  changeApplicationStage,
  getApplicationById,
  listApplications,
  setApplicationTags,
  getApplicationTags,
} from "@/lib/careers-applications"
import { getJobById } from "@/lib/careers-jobs"
import { getLastEmailBadges, sendApplicationEmail } from "@/lib/careers-emails"
import { assertApplicationAccess, canEmailCandidates, redactSalary, visibleJobIds } from "@/lib/careers-access"
import { writeAudit } from "@/lib/audit"
import { APPLICATION_STAGES, type ApplicationStage } from "@/lib/careers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.read" })
    const url = new URL(request.url)
    const jobIds = await visibleJobIds(admin)
    const jobId = url.searchParams.get("jobId") || undefined
    if (jobIds && jobId && !jobIds.includes(jobId)) {
      return NextResponse.json({ applications: [], total: 0 })
    }
    const { applications, total } = await listApplications({
      jobId,
      jobIds: jobIds || undefined,
      stage: (url.searchParams.get("stage") as ApplicationStage | "all") || "all",
      search: url.searchParams.get("search") || undefined,
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      location: url.searchParams.get("location") || undefined,
      minExperience: url.searchParams.get("minExperience") ? Number(url.searchParams.get("minExperience")) : undefined,
      minRating: url.searchParams.get("minRating") ? Number(url.searchParams.get("minRating")) : undefined,
      page: Number(url.searchParams.get("page") || 1),
      pageSize: Number(url.searchParams.get("pageSize") || 25),
    })
    const [badges, tagsMap] = await Promise.all([
      getLastEmailBadges(applications.map((item) => item.id)),
      (async () => {
        const { getApplicationTagsForMany } = await import("@/lib/careers-applications")
        return getApplicationTagsForMany(applications.map((item) => item.id))
      })(),
    ])
    return NextResponse.json({
      applications: applications.map((item) => ({
        ...redactSalary(admin, item),
        emailBadge: badges[item.id] || null,
        tags: tagsMap[item.id] || [],
      })),
      total,
    })
  } catch (error) {
    return apiErrorResponse(error, "Could not load applications.")
  }
}

const bulkSchema = z.object({
  action: z.enum(["stage", "tag", "email"]),
  ids: z.array(z.string().uuid()).min(1).max(200),
  stage: z.enum(APPLICATION_STAGES).optional(),
  reason: z.string().max(1000).optional().default(""),
  notify: z.boolean().optional().default(false),
  templateId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  subject: z.string().max(300).optional(),
  body: z.string().max(100_000).optional(),
})

/** Bulk stage moves, tagging and personalised emails with a per-candidate report. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const parsed = bulkSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid bulk action." }, { status: 400 })
    const input = parsed.data
    if ((input.action === "email" || input.notify) && !canEmailCandidates(admin)) {
      return NextResponse.json({ error: "You do not have permission to email candidates." }, { status: 403 })
    }

    const results: { id: string; name: string; ok: boolean; skipped?: boolean; error?: string }[] = []
    for (const id of input.ids) {
      const application = await getApplicationById(id)
      if (!application) {
        results.push({ id, name: "", ok: false, error: "Not found" })
        continue
      }
      try {
        await assertApplicationAccess(admin, application)
      } catch {
        results.push({ id, name: application.fullName, ok: false, error: "No access" })
        continue
      }
      const job = await getJobById(application.jobId)
      if (!job) {
        results.push({ id, name: application.fullName, ok: false, error: "Job missing" })
        continue
      }

      if (input.action === "tag") {
        const existing = await getApplicationTags(id)
        const merged = [...new Set([...existing, ...(input.tags || [])])]
        await setApplicationTags(id, merged)
        results.push({ id, name: application.fullName, ok: true })
        continue
      }

      if (input.action === "stage" && input.stage) {
        await changeApplicationStage(id, input.stage, admin.id, input.reason)
        await writeAudit({
          adminId: admin.id,
          module: job.module === "pharmacy" ? "pharmacy" : "medical",
          action: "recruitment.stage.bulk",
          entityType: "application",
          entityId: id,
          after: { stage: input.stage },
        })
        if (!input.notify) {
          results.push({ id, name: application.fullName, ok: true })
          continue
        }
      }

      // Email path (bulk email action, or stage move with notify).
      if (!application.email) {
        results.push({ id, name: application.fullName, ok: false, skipped: true, error: "No email address" })
        continue
      }
      const stage = input.action === "stage" && input.stage ? input.stage : "custom"
      const sent = await sendApplicationEmail({
        application,
        job,
        stage,
        templateId: input.templateId || undefined,
        subject: input.subject,
        body: input.body,
        admin: { id: admin.id, name: admin.name, email: admin.email },
        idempotencySuffix: input.action === "stage" ? `stage-entry:${input.stage}` : undefined,
      })
      results.push({ id, name: application.fullName, ok: sent.ok, error: sent.error })
    }

    await writeAudit({
      adminId: admin.id,
      action: `recruitment.bulk.${input.action}`,
      entityType: "application",
      after: { count: input.ids.length, stage: input.stage },
    })
    return NextResponse.json({ results })
  } catch (error) {
    return apiErrorResponse(error, "Bulk action failed.")
  }
}