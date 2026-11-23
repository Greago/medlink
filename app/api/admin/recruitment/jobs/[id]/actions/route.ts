import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { duplicateJob, getJobById, getJobRecruiter, updateJob } from "@/lib/careers-jobs"
import { assertJobAccess } from "@/lib/careers-access"
import { writeAudit } from "@/lib/audit"
import { enqueueEmail } from "@/lib/email-outbox"
import { buildEmailWrapper } from "@/lib/careers-emails"
import { siteUrl } from "@/lib/careers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  action: z.enum(["publish", "close", "reopen", "extend", "archive", "no-expiry", "duplicate"]),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const { id } = await params
    const job = await getJobById(id)
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 })
    await assertJobAccess(admin, job)
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid action." }, { status: 400 })
    const { action, expiresAt } = parsed.data
    const module = job.module === "pharmacy" ? "pharmacy" : "medical"

    if (action === "duplicate") {
      const copy = await duplicateJob(id, admin.id)
      await writeAudit({ adminId: admin.id, module, action: "recruitment.job.duplicate", entityType: "job", entityId: id, after: { copyId: copy?.id } })
      return NextResponse.json({ job: copy })
    }

    let updated = job
    if (action === "publish") {
      if (job.expiresAt && new Date(job.expiresAt).getTime() <= Date.now()) {
        return NextResponse.json({ error: "This job's expiry is in the past. Extend the expiry before publishing." }, { status: 400 })
      }
      updated = (await updateJob(id, { status: "published" }, admin.id))!
    } else if (action === "close") {
      updated = (await updateJob(id, { status: "closed" }, admin.id))!
    } else if (action === "reopen") {
      if (job.expiresAt && new Date(job.expiresAt).getTime() <= Date.now()) {
        return NextResponse.json({ error: "The expiry has passed. Extend it first, then reopen." }, { status: 400 })
      }
      updated = (await updateJob(id, { status: "published" }, admin.id))!
    } else if (action === "extend") {
      if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
        return NextResponse.json({ error: "Choose a future expiry date and time." }, { status: 400 })
      }
      const nextStatus = job.status === "expired" ? "published" : job.status
      updated = (await updateJob(id, { expiresAt, status: nextStatus }, admin.id))!
    } else if (action === "no-expiry") {
      updated = (await updateJob(id, { expiresAt: null }, admin.id))!
    } else if (action === "archive") {
      updated = (await updateJob(id, { status: "archived" }, admin.id))!
    }

    await writeAudit({
      adminId: admin.id,
      module,
      action: `recruitment.job.${action}`,
      entityType: "job",
      entityId: id,
      before: { status: job.status, expiresAt: job.expiresAt },
      after: { status: updated.status, expiresAt: updated.expiresAt },
    })

    // Notify hiring manager when a job is closed early or archived.
    if (action === "close" || action === "archive") {
      try {
        const recruiter = await getJobRecruiter(job)
        const notice = buildEmailWrapper({
          module: job.module,
          title: `Job ${action === "close" ? "closed" : "archived"}: ${job.title}`,
          bodyHtml: `<p>The job <strong>${job.title.replace(/[<>&]/g, "")}</strong> was ${action === "close" ? "closed early" : "archived"} by ${admin.name.replace(/[<>&]/g, "")}.</p><p><a href="${siteUrl()}/admin/recruitment/jobs">Manage jobs</a></p>`,
        })
        await enqueueEmail({
          module,
          kind: `career_job_${action}`,
          recipient: recruiter.email,
          subject: `Job ${action === "close" ? "closed" : "archived"} — ${job.title}`,
          from: process.env.ACCOUNT_FROM_EMAIL || "Medlink Expedite <careers@medlinkexpedite.co.ke>",
          html: notice.html,
          text: notice.text,
          idempotencyKey: `career-job-${action}:${id}:${Date.now()}`,
          referenceType: "job",
          referenceId: id,
        })
      } catch { /* never block the action */ }
    }
    return NextResponse.json({ job: updated })
  } catch (error) {
    return apiErrorResponse(error, "Could not perform that action.")
  }
}