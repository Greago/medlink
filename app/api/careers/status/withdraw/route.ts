import { NextResponse } from "next/server"
import { z } from "zod"
import { getApplicationByReference, changeApplicationStage } from "@/lib/careers-applications"
import { getJobById, getJobRecruiter } from "@/lib/careers-jobs"
import { checkRateLimit } from "@/lib/careers-public"
import { hashIp } from "@/lib/careers-applications"
import { enqueueEmail } from "@/lib/email-outbox"
import { buildEmailWrapper } from "@/lib/careers-emails"
import { siteUrl } from "@/lib/careers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  reference: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(160),
})

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Please provide your reference number and email." }, { status: 400 })
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (!(await checkRateLimit(`withdraw:${hashIp(ip)}`, 10, 3600))) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }
    const application = await getApplicationByReference(parsed.data.reference, parsed.data.email)
    if (!application) {
      return NextResponse.json({ error: "No matching application was found." }, { status: 404 })
    }
    if (application.stage === "withdrawn") {
      return NextResponse.json({ ok: true, alreadyWithdrawn: true })
    }
    await changeApplicationStage(application.id, "withdrawn", null, "Candidate withdrew via status page")

    // Notify the recruiter; never blocks the withdrawal.
    try {
      const job = await getJobById(application.jobId)
      if (job) {
        const recruiter = await getJobRecruiter(job)
        const notice = buildEmailWrapper({
          module: job.module,
          title: "Application withdrawn",
          bodyHtml: `<p><strong>${application.fullName.replace(/[<>&]/g, "")}</strong> withdrew their application for <strong>${job.title.replace(/[<>&]/g, "")}</strong> (${application.referenceNumber}).</p><p><a href="${siteUrl()}/admin/recruitment/applicants/${application.id}">View the application</a></p>`,
        })
        await enqueueEmail({
          module: job.module === "pharmacy" ? "pharmacy" : "medical",
          kind: "career_withdrawn",
          recipient: recruiter.email,
          subject: `Application withdrawn — ${application.referenceNumber}`,
          from: process.env.ACCOUNT_FROM_EMAIL || "Medlink Expedite <careers@medlinkexpedite.co.ke>",
          html: notice.html,
          text: notice.text,
          idempotencyKey: `career-withdrawn:${application.id}`,
          referenceType: "application",
          referenceId: application.id,
        })
      }
    } catch {
      // ignore email failures
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Could not withdraw the application." }, { status: 500 })
  }
}