import { NextResponse } from "next/server"
import { z } from "zod"
import { getJobById, getJobBySlug, getJobRecruiter, getScreeningQuestions } from "@/lib/careers-jobs"
import {
  countRecentApplications,
  createApplication,
  findDuplicateApplication,
  hashIp,
} from "@/lib/careers-applications"
import { sendApplicationEmail } from "@/lib/careers-emails"
import { checkRateLimit } from "@/lib/careers-public"
import { jobIsLive } from "@/lib/careers"
import { MAX_APPLICATION_FILE_BYTES } from "@/lib/careers-files"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  jobId: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(7).max(24),
  currentLocation: z.string().trim().min(2).max(120),
  yearsExperience: z.coerce.number().min(0).max(60),
  currentEmployer: z.string().trim().max(160).optional().default(""),
  expectedSalary: z.coerce.number().min(0).max(100_000_000).optional().nullable(),
  noticePeriod: z.string().trim().max(80).optional().default(""),
  portfolioUrl: z.string().trim().url().max(300).optional().or(z.literal("")).default(""),
  coverLetter: z.string().max(20_000).optional().default(""),
  heardAbout: z.string().trim().max(120).optional().default(""),
  consent: z.literal("true"),
  idempotencyKey: z.string().min(8).max(80),
  website: z.string().max(0).optional().default(""), // honeypot
  answers: z.string().optional().default("[]"),
  captchaToken: z.string().optional().default(""),
})

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const raw: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") raw[key] = value
    }
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return NextResponse.json({ error: `Please check the form: ${issue?.message || "invalid fields"}.` }, { status: 400 })
    }
    const input = parsed.data

    // Honeypot: bots fill the hidden field; pretend success without saving.
    if (input.website) {
      return NextResponse.json({ ok: true, referenceNumber: "" })
    }

    const ip = clientIp(request)
    const ipHash = hashIp(ip)
    if (!(await checkRateLimit(`apply-ip:${ipHash}`, 6, 3600))) {
      return NextResponse.json({ error: "Too many applications from this connection. Please try again later." }, { status: 429 })
    }

    // Optional captcha, only enforced when configured.
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
    if (turnstileSecret) {
      if (!input.captchaToken) {
        return NextResponse.json({ error: "Please complete the captcha challenge." }, { status: 400 })
      }
      const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: turnstileSecret, response: input.captchaToken }),
      }).then((response) => response.json() as Promise<{ success?: boolean }>).catch(() => ({ success: false }))
      if (!verify.success) {
        return NextResponse.json({ error: "Captcha verification failed. Please try again." }, { status: 400 })
      }
    }

    const job = input.jobId ? await getJobById(input.jobId) : input.slug ? await getJobBySlug(input.slug) : null
    if (!job) return NextResponse.json({ error: "This job could not be found." }, { status: 404 })
    // Authoritative server-side expiry check at submit time.
    if (!jobIsLive(job)) {
      return NextResponse.json({ error: "This position is no longer accepting applications." }, { status: 410 })
    }

    const recent = await countRecentApplications(ipHash, input.email)
    if (recent.byEmail >= 3) {
      return NextResponse.json({ error: "Too many applications for this email address. Please try again later." }, { status: 429 })
    }

    const duplicate = await findDuplicateApplication(job.id, input.email)
    if (duplicate) {
      return NextResponse.json(
        { error: `You have already applied for this role (${duplicate.referenceNumber}). Check your email for updates or visit the status page.` },
        { status: 409 }
      )
    }

    // Idempotent retries (double-click / network retry) return the original reference.
    const { query } = await import("@/lib/db")
    const prior = await query<{ reference_number: string }>(
      "SELECT reference_number FROM applications WHERE idempotency_key = $1",
      [input.idempotencyKey]
    )
    if (prior.rows[0]) {
      return NextResponse.json({ ok: true, referenceNumber: prior.rows[0].reference_number })
    }

    // Files: CV required, extras optional; magic-byte validation happens in saveApplicationFile.
    const files: { kind: "cv" | "extra"; filename: string; buffer: Buffer }[] = []
    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File) || value.size === 0) continue
      if (key !== "cv" && key !== "extra") continue
      if (value.size > MAX_APPLICATION_FILE_BYTES) {
        return NextResponse.json({ error: `"${value.name}" is larger than 5 MB. Please upload a smaller file.` }, { status: 400 })
      }
      files.push({ kind: key === "cv" ? "cv" : "extra", filename: value.name, buffer: Buffer.from(await value.arrayBuffer()) })
    }
    if (!files.some((file) => file.kind === "cv")) {
      return NextResponse.json({ error: "Please attach your CV (PDF, DOC or DOCX, max 5 MB)." }, { status: 400 })
    }

    let answers: { questionId: string; answer: string }[] = []
    try {
      const parsedAnswers = JSON.parse(input.answers) as { questionId: string; answer: string }[]
      if (Array.isArray(parsedAnswers)) answers = parsedAnswers.filter((item) => item && typeof item.questionId === "string")
    } catch {
      return NextResponse.json({ error: "Screening answers could not be read. Please refresh and try again." }, { status: 400 })
    }
    const questions = await getScreeningQuestions(job.id)
    for (const question of questions) {
      if (!question.required) continue
      const answer = answers.find((item) => item.questionId === question.id)
      if (!answer || !String(answer.answer).trim()) {
        return NextResponse.json({ error: `Please answer the required question: "${question.prompt}"` }, { status: 400 })
      }
    }

    const application = await createApplication({
      jobId: job.id,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      currentLocation: input.currentLocation,
      yearsExperience: input.yearsExperience,
      currentEmployer: input.currentEmployer,
      expectedSalary: input.expectedSalary ?? null,
      noticePeriod: input.noticePeriod,
      portfolioUrl: input.portfolioUrl,
      coverLetter: input.coverLetter,
      heardAbout: input.heardAbout,
      consent: true,
      idempotencyKey: input.idempotencyKey,
      ipHash,
      answers,
      files,
    })

    // Acknowledgement email: queued once, never blocks the application.
    try {
      const recruiter = await getJobRecruiter(job)
      await sendApplicationEmail({
        application,
        job,
        stage: "application_received",
        admin: recruiter,
        idempotencySuffix: "ack",
      })
      // Notify hiring manager of the new application.
      const { enqueueEmail } = await import("@/lib/email-outbox")
      const { buildEmailWrapper } = await import("@/lib/careers-emails")
      const { siteUrl } = await import("@/lib/careers")
      const notice = buildEmailWrapper({
        module: job.module,
        title: `New application: ${job.title}`,
        bodyHtml: `<p><strong>${application.fullName.replace(/[<>&]/g, "")}</strong> applied for <strong>${job.title.replace(/[<>&]/g, "")}</strong> (${application.referenceNumber}).</p><p><a href="${siteUrl()}/admin/recruitment/applicants/${application.id}">Review the application</a></p>`,
      })
      await enqueueEmail({
        module: job.module === "pharmacy" ? "pharmacy" : "medical",
        kind: "career_new_application",
        recipient: recruiter.email,
        subject: `New application — ${job.title} (${application.referenceNumber})`,
        from: process.env.ACCOUNT_FROM_EMAIL || "Medlink Expedite <careers@medlinkexpedite.co.ke>",
        html: notice.html,
        text: notice.text,
        idempotencyKey: `career-new-app:${application.id}`,
        referenceType: "application",
        referenceId: application.id,
      })
    } catch {
      // Email failure must never fail the application.
    }

    return NextResponse.json({ ok: true, referenceNumber: application.referenceNumber }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit your application."
    const status = /already|unique/i.test(message) ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}