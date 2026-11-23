import { randomUUID } from "crypto"
import { ensureSchema, query, withTransaction } from "@/lib/db"
import { sanitizeRichText } from "@/lib/rich-text"
import {
  type Job,
  type JobModule,
  type JobStatus,
  type ScreeningQuestion,
  type CareersSettings,
  jobIsLive,
  slugify,
} from "@/lib/careers"

interface JobRow {
  id: string
  slug: string
  title: string
  department: string
  module: string
  employment_type: string
  work_mode: string
  location: string
  openings: number
  salary_min: string | null
  salary_max: string | null
  salary_visible: boolean
  purpose_statement: string
  description: string
  responsibilities: string
  qualifications_required: string
  qualifications_preferred: string
  benefits: string
  how_to_apply: string
  status: string
  published_at: Date | null
  scheduled_publish_at: Date | null
  expires_at: Date | null
  created_by: string | null
  created_at: Date
  updated_at: Date
  applicant_count?: number
}

const JOB_SELECT = `
  SELECT j.*, (SELECT COUNT(*)::int FROM applications a WHERE a.job_id = j.id) AS applicant_count
  FROM jobs j
`

function iso(value: Date | null): string | null {
  return value ? new Date(value).toISOString() : null
}

function mapJob(row: JobRow): Job {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    department: row.department,
    module: (row.module as JobModule) || "company-wide",
    employmentType: (row.employment_type as Job["employmentType"]) || "Full-time",
    workMode: (row.work_mode as Job["workMode"]) || "On-site",
    location: row.location,
    openings: row.openings,
    salaryMin: row.salary_min === null ? null : Number(row.salary_min),
    salaryMax: row.salary_max === null ? null : Number(row.salary_max),
    salaryVisible: row.salary_visible,
    purposeStatement: row.purpose_statement,
    description: row.description,
    responsibilities: row.responsibilities,
    qualificationsRequired: row.qualifications_required,
    qualificationsPreferred: row.qualifications_preferred,
    benefits: row.benefits,
    howToApply: row.how_to_apply,
    status: (row.status as JobStatus) || "draft",
    publishedAt: iso(row.published_at),
    scheduledPublishAt: iso(row.scheduled_publish_at),
    expiresAt: iso(row.expires_at),
    createdBy: row.created_by,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    applicantCount: row.applicant_count ?? 0,
  }
}

export interface JobInput {
  title: string
  slug?: string
  department: string
  module: JobModule
  employmentType: Job["employmentType"]
  workMode: Job["workMode"]
  location: string
  openings: number
  salaryMin: number | null
  salaryMax: number | null
  salaryVisible: boolean
  purposeStatement: string
  description: string
  responsibilities: string
  qualificationsRequired: string
  qualificationsPreferred: string
  benefits: string
  howToApply: string
  status?: JobStatus
  publishedAt?: string | null
  scheduledPublishAt?: string | null
  expiresAt?: string | null
}

const RICH_FIELDS = [
  "purposeStatement",
  "description",
  "responsibilities",
  "qualificationsRequired",
  "qualificationsPreferred",
  "benefits",
  "howToApply",
] as const

function cleanInput(input: JobInput) {
  const cleaned = { ...input }
  for (const field of RICH_FIELDS) {
    cleaned[field] = sanitizeRichText(cleaned[field] || "")
  }
  cleaned.title = cleaned.title.trim()
  cleaned.department = cleaned.department.trim()
  cleaned.location = cleaned.location.trim()
  return cleaned
}

export async function listJobs(options: {
  module?: JobModule | "all"
  status?: JobStatus | "all"
  search?: string
  page?: number
  pageSize?: number
} = {}): Promise<{ jobs: Job[]; total: number }> {
  await ensureSchema()
  const where: string[] = []
  const params: unknown[] = []
  if (options.module && options.module !== "all") {
    params.push(options.module)
    where.push(`j.module = $${params.length}`)
  }
  if (options.status && options.status !== "all") {
    params.push(options.status)
    where.push(`j.status = $${params.length}`)
  }
  if (options.search?.trim()) {
    params.push(`%${options.search.trim().toLowerCase()}%`)
    where.push(`(LOWER(j.title) LIKE $${params.length} OR LOWER(j.department) LIKE $${params.length} OR LOWER(j.location) LIKE $${params.length})`)
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : ""
  const count = await query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM jobs j ${clause}`, params)
  const pageSize = Math.min(Math.max(options.pageSize || 20, 1), 100)
  const page = Math.max(options.page || 1, 1)
  params.push(pageSize, (page - 1) * pageSize)
  const result = await query<JobRow>(
    `${JOB_SELECT} ${clause} ORDER BY j.updated_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )
  return { jobs: result.rows.map(mapJob), total: count.rows[0]?.count || 0 }
}

/** Public list: only published and not expired, enforced in SQL. */
export async function listPublicJobs(filters: {
  module?: JobModule | "all"
  department?: string
  search?: string
  location?: string
  employmentType?: string
  workMode?: string
} = {}): Promise<Job[]> {
  await ensureSchema()
  const where = [
    `j.status = 'published'`,
    `(j.expires_at IS NULL OR j.expires_at > NOW())`,
  ]
  const params: unknown[] = []
  if (filters.module && filters.module !== "all") {
    params.push(filters.module)
    where.push(`j.module = $${params.length}`)
  }
  if (filters.department) {
    params.push(filters.department)
    where.push(`j.department = $${params.length}`)
  }
  if (filters.location) {
    params.push(filters.location)
    where.push(`j.location = $${params.length}`)
  }
  if (filters.employmentType) {
    params.push(filters.employmentType)
    where.push(`j.employment_type = $${params.length}`)
  }
  if (filters.workMode) {
    params.push(filters.workMode)
    where.push(`j.work_mode = $${params.length}`)
  }
  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`)
    where.push(`(LOWER(j.title) LIKE $${params.length} OR LOWER(j.department) LIKE $${params.length} OR LOWER(j.purpose_statement) LIKE $${params.length})`)
  }
  const result = await query<JobRow>(
    `${JOB_SELECT} WHERE ${where.join(" AND ")} ORDER BY COALESCE(j.published_at, j.created_at) DESC LIMIT 100`,
    params
  )
  return result.rows.map(mapJob).filter(jobIsLive)
}

export async function getJobById(id: string): Promise<Job | null> {
  await ensureSchema()
  const result = await query<JobRow>(`${JOB_SELECT} WHERE j.id = $1`, [id])
  return result.rows[0] ? mapJob(result.rows[0]) : null
}

export async function getJobBySlug(slug: string): Promise<Job | null> {
  await ensureSchema()
  const result = await query<JobRow>(`${JOB_SELECT} WHERE j.slug = $1`, [slug])
  return result.rows[0] ? mapJob(result.rows[0]) : null
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = slugify(base)
  let candidate = slug
  let suffix = 2
  for (;;) {
    const result = await query<{ id: string }>("SELECT id FROM jobs WHERE slug = $1", [candidate])
    const clash = result.rows[0]
    if (!clash || clash.id === excludeId) return candidate
    candidate = `${slug}-${suffix++}`
  }
}

export async function createJob(input: JobInput, adminId: string | null): Promise<Job> {
  await ensureSchema()
  const cleaned = cleanInput(input)
  const id = randomUUID()
  const slug = await uniqueSlug(cleaned.slug || cleaned.title)
  const status = cleaned.status || "draft"
  const publishedAt = status === "published" ? new Date().toISOString() : cleaned.publishedAt || null
  await query(
    `INSERT INTO jobs (
       id, slug, title, department, module, employment_type, work_mode, location, openings,
       salary_min, salary_max, salary_visible, purpose_statement, description, responsibilities,
       qualifications_required, qualifications_preferred, benefits, how_to_apply, status,
       published_at, scheduled_publish_at, expires_at, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
    [
      id, slug, cleaned.title, cleaned.department, cleaned.module, cleaned.employmentType, cleaned.workMode,
      cleaned.location, cleaned.openings, cleaned.salaryMin, cleaned.salaryMax, cleaned.salaryVisible,
      cleaned.purposeStatement, cleaned.description, cleaned.responsibilities, cleaned.qualificationsRequired,
      cleaned.qualificationsPreferred, cleaned.benefits, cleaned.howToApply, status,
      publishedAt, cleaned.scheduledPublishAt || null, cleaned.expiresAt || null, adminId,
    ]
  )
  const job = await getJobById(id)
  if (!job) throw new Error("Job could not be created.")
  return job
}

export async function updateJob(id: string, input: Partial<JobInput>, adminId: string | null): Promise<Job | null> {
  await ensureSchema()
  const existing = await getJobById(id)
  if (!existing) return null
  const merged = cleanInput({ ...existing, ...input } as JobInput)
  const slug = input.slug ? await uniqueSlug(input.slug, id) : existing.slug
  let status = input.status ?? existing.status
  let publishedAt = existing.publishedAt
  if (input.status === "published" && existing.status !== "published") {
    publishedAt = new Date().toISOString()
  }
  if (input.publishedAt !== undefined) publishedAt = input.publishedAt
  await query(
    `UPDATE jobs SET
       slug=$2, title=$3, department=$4, module=$5, employment_type=$6, work_mode=$7, location=$8,
       openings=$9, salary_min=$10, salary_max=$11, salary_visible=$12, purpose_statement=$13,
       description=$14, responsibilities=$15, qualifications_required=$16, qualifications_preferred=$17,
       benefits=$18, how_to_apply=$19, status=$20, published_at=$21, scheduled_publish_at=$22,
       expires_at=$23, updated_at=NOW()
     WHERE id=$1`,
    [
      id, slug, merged.title, merged.department, merged.module, merged.employmentType, merged.workMode,
      merged.location, merged.openings, merged.salaryMin, merged.salaryMax, merged.salaryVisible,
      merged.purposeStatement, merged.description, merged.responsibilities, merged.qualificationsRequired,
      merged.qualificationsPreferred, merged.benefits, merged.howToApply, status,
      publishedAt, input.scheduledPublishAt !== undefined ? input.scheduledPublishAt : existing.scheduledPublishAt,
      input.expiresAt !== undefined ? input.expiresAt : existing.expiresAt,
    ]
  )
  void adminId
  return getJobById(id)
}

export async function duplicateJob(id: string, adminId: string | null): Promise<Job | null> {
  const existing = await getJobById(id)
  if (!existing) return null
  return createJob(
    {
      ...existing,
      title: `${existing.title} (copy)`,
      slug: `${existing.slug}-copy`,
      status: "draft",
      publishedAt: null,
      scheduledPublishAt: null,
    },
    adminId
  )
}

export async function getScreeningQuestions(jobId: string): Promise<ScreeningQuestion[]> {
  await ensureSchema()
  const result = await query<{
    id: string; job_id: string; prompt: string; type: string; options: unknown; required: boolean; position: number
  }>("SELECT * FROM job_screening_questions WHERE job_id = $1 ORDER BY position ASC", [jobId])
  return result.rows.map((row) => ({
    id: row.id,
    jobId: row.job_id,
    prompt: row.prompt,
    type: (row.type as ScreeningQuestion["type"]) || "text",
    options: Array.isArray(row.options) ? row.options.map(String) : [],
    required: row.required,
    position: row.position,
  }))
}

export async function saveScreeningQuestions(jobId: string, questions: Omit<ScreeningQuestion, "id" | "jobId" | "position">[]): Promise<void> {
  await ensureSchema()
  await withTransaction(async (client) => {
    await client.query("DELETE FROM job_screening_questions WHERE job_id = $1", [jobId])
    for (const [index, question] of questions.entries()) {
      await client.query(
        `INSERT INTO job_screening_questions (id, job_id, prompt, type, options, required, position)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)`,
        [randomUUID(), jobId, question.prompt.trim(), question.type, JSON.stringify(question.options || []), question.required, index]
      )
    }
  })
}

export async function getJobReviewers(jobId: string): Promise<{ adminId: string; name: string; email: string; canEmail: boolean }[]> {
  await ensureSchema()
  const result = await query<{ admin_id: string; name: string; email: string; can_email: boolean }>(
    `SELECT r.admin_id, a.name, a.email, r.can_email
     FROM job_reviewers r JOIN admin_users a ON a.id = r.admin_id
     WHERE r.job_id = $1 ORDER BY a.name`,
    [jobId]
  )
  return result.rows.map((row) => ({ adminId: row.admin_id, name: row.name, email: row.email, canEmail: row.can_email }))
}

export async function setJobReviewers(jobId: string, reviewers: { adminId: string; canEmail?: boolean }[]): Promise<void> {
  await ensureSchema()
  await withTransaction(async (client) => {
    await client.query("DELETE FROM job_reviewers WHERE job_id = $1", [jobId])
    for (const reviewer of reviewers) {
      await client.query(
        `INSERT INTO job_reviewers (job_id, admin_id, can_email) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [jobId, reviewer.adminId, reviewer.canEmail || false]
      )
    }
  })
}

/** Jobs visible to a reviewer: assigned jobs only. */
export async function getReviewerJobIds(adminId: string): Promise<string[]> {
  await ensureSchema()
  const result = await query<{ job_id: string }>("SELECT job_id FROM job_reviewers WHERE admin_id = $1", [adminId])
  return result.rows.map((row) => row.job_id)
}

/** Recruiter identity for a job: creator first, then any active owner. */
export async function getJobRecruiter(job: Pick<Job, "createdBy">): Promise<{ id: string; name: string; email: string; phone: string }> {
  await ensureSchema()
  if (job.createdBy) {
    const result = await query<{ id: string; name: string; email: string; phone: string }>(
      "SELECT id, name, email, phone FROM admin_users WHERE id = $1 AND status = 'active'",
      [job.createdBy]
    )
    if (result.rows[0]) return result.rows[0]
  }
  const fallback = await query<{ id: string; name: string; email: string; phone: string }>(
    "SELECT id, name, email, phone FROM admin_users WHERE role = 'owner' AND status = 'active' ORDER BY created_at ASC LIMIT 1"
  )
  return fallback.rows[0] || { id: "", name: "Medlink Expedite Recruitment", email: process.env.ACCOUNT_FROM_EMAIL || "careers@medlinkexpedite.co.ke", phone: "" }
}

export async function getCareersSettings(): Promise<CareersSettings> {
  await ensureSchema()
  const result = await query<{
    hero_title: string; hero_body: string; why_join_us: string; perks: unknown; collage: unknown
    privacy_text: string; retention_months: number; auto_send: unknown; digest_enabled: boolean
  }>("SELECT * FROM careers_settings WHERE id = 1")
  const row = result.rows[0]
  return {
    heroTitle: row?.hero_title || "Careers & opportunities",
    heroBody: row?.hero_body || "",
    whyJoinUs: row?.why_join_us || "",
    perks: Array.isArray(row?.perks) ? (row.perks as CareersSettings["perks"]) : [],
    collage: Array.isArray(row?.collage) ? (row.collage as CareersSettings["collage"]) : [],
    privacyText: row?.privacy_text || "",
    retentionMonths: row?.retention_months || 0,
    autoSend: (row?.auto_send as CareersSettings["autoSend"]) || {},
    digestEnabled: Boolean(row?.digest_enabled),
  }
}

export async function saveCareersSettings(input: Partial<CareersSettings>): Promise<CareersSettings> {
  await ensureSchema()
  const current = await getCareersSettings()
  const next = { ...current, ...input }
  next.whyJoinUs = sanitizeRichText(next.whyJoinUs)
  next.heroBody = sanitizeRichText(next.heroBody)
  await query(
    `UPDATE careers_settings SET
       hero_title=$1, hero_body=$2, why_join_us=$3, perks=$4::jsonb, collage=$5::jsonb,
       privacy_text=$6, retention_months=$7, auto_send=$8::jsonb, digest_enabled=$9, updated_at=NOW()
     WHERE id=1`,
    [
      next.heroTitle.trim(), next.heroBody, next.whyJoinUs, JSON.stringify(next.perks), JSON.stringify(next.collage),
      next.privacyText, next.retentionMonths, JSON.stringify(next.autoSend), next.digestEnabled,
    ]
  )
  return getCareersSettings()
}
