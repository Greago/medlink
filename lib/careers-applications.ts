import { createHash, randomUUID } from "crypto"
import { ensureSchema, query, withTransaction } from "@/lib/db"
import { sanitizeRichText } from "@/lib/rich-text"
import {
  type Application,
  type ApplicationStage,
  type Interview,
  APPLICATION_STAGES,
} from "@/lib/careers"
import { saveApplicationFile, type ApplicationFileMeta } from "@/lib/careers-files"

interface ApplicationRow {
  id: string
  job_id: string
  reference_number: string
  full_name: string
  email: string
  phone: string
  current_location: string
  years_experience: string | number
  current_employer: string
  expected_salary: string | null
  notice_period: string
  portfolio_url: string
  cover_letter: string
  heard_about: string
  consent: boolean
  consent_at: Date | null
  stage: string
  source: string
  created_at: Date
  updated_at: Date
  job_title?: string
  job_slug?: string
  job_module?: string
}

const APPLICATION_SELECT = `
  SELECT a.*, j.title AS job_title, j.slug AS job_slug, j.module AS job_module
  FROM applications a JOIN jobs j ON j.id = a.job_id
`

function mapApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    jobId: row.job_id,
    referenceNumber: row.reference_number,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    currentLocation: row.current_location,
    yearsExperience: Number(row.years_experience || 0),
    currentEmployer: row.current_employer,
    expectedSalary: row.expected_salary === null ? null : Number(row.expected_salary),
    noticePeriod: row.notice_period,
    portfolioUrl: row.portfolio_url,
    coverLetter: row.cover_letter,
    heardAbout: row.heard_about,
    consent: row.consent,
    consentAt: row.consent_at ? new Date(row.consent_at).toISOString() : null,
    stage: (row.stage as ApplicationStage) || "applied",
    source: row.source,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    jobTitle: row.job_title,
    jobSlug: row.job_slug,
    jobModule: (row.job_module as Application["jobModule"]) || undefined,
  }
}

export function hashIp(ip: string): string {
  const day = new Date().toISOString().slice(0, 10)
  return createHash("sha256").update(`${ip}:${day}`).digest("hex")
}

export interface CreateApplicationInput {
  jobId: string
  fullName: string
  email: string
  phone: string
  currentLocation: string
  yearsExperience: number
  currentEmployer: string
  expectedSalary: number | null
  noticePeriod: string
  portfolioUrl: string
  coverLetter: string
  heardAbout: string
  consent: boolean
  idempotencyKey: string
  ipHash: string
  answers: { questionId: string; answer: string }[]
  files: { kind: "cv" | "extra"; filename: string; buffer: Buffer }[]
}

export async function nextApplicationReference(): Promise<string> {
  const year = new Date().getFullYear()
  const key = `application-${year}`
  return withTransaction(async (client) => {
    const result = await client.query<{ next_value: number }>(
      `INSERT INTO career_counters (key, next_value) VALUES ($1, 2)
       ON CONFLICT (key) DO UPDATE SET next_value = career_counters.next_value + 1
       RETURNING next_value - 1 AS next_value`,
      [key]
    )
    const value = result.rows[0]?.next_value || 1
    return `APP-${year}-${String(value).padStart(6, "0")}`
  })
}

export async function findDuplicateApplication(jobId: string, email: string): Promise<Application | null> {
  await ensureSchema()
  const result = await query<ApplicationRow>(
    `${APPLICATION_SELECT} WHERE a.job_id = $1 AND LOWER(a.email) = LOWER($2) AND a.stage <> 'withdrawn' LIMIT 1`,
    [jobId, email.trim()]
  )
  return result.rows[0] ? mapApplication(result.rows[0]) : null
}

export async function countRecentApplications(ipHash: string, email: string): Promise<{ byIp: number; byEmail: number }> {
  await ensureSchema()
  const [byIp, byEmail] = await Promise.all([
    query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM applications WHERE ip_hash = $1 AND created_at > NOW() - INTERVAL '1 hour'",
      [ipHash]
    ),
    query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM applications WHERE LOWER(email) = LOWER($1) AND created_at > NOW() - INTERVAL '1 hour'",
      [email]
    ),
  ])
  return { byIp: byIp.rows[0]?.count || 0, byEmail: byEmail.rows[0]?.count || 0 }
}

/** Creates the application, answers and files atomically. */
export async function createApplication(input: CreateApplicationInput): Promise<Application> {
  await ensureSchema()
  const id = randomUUID()
  const reference = await nextApplicationReference()
  const cv = input.files.find((file) => file.kind === "cv")
  if (!cv) throw new Error("A CV is required.")

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO applications (
         id, job_id, reference_number, full_name, email, phone, current_location, years_experience,
         current_employer, expected_salary, notice_period, portfolio_url, cover_letter, heard_about,
         consent, consent_at, stage, source, ip_hash, idempotency_key
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),'applied','careers',$16,$17)`,
      [
        id, input.jobId, reference, input.fullName.trim(), input.email.trim().toLowerCase(), input.phone.trim(),
        input.currentLocation.trim(), input.yearsExperience, input.currentEmployer.trim(), input.expectedSalary,
        input.noticePeriod.trim(), input.portfolioUrl.trim(), sanitizeRichText(input.coverLetter),
        input.heardAbout.trim(), input.consent, input.ipHash, input.idempotencyKey,
      ]
    )
    for (const answer of input.answers) {
      await client.query(
        `INSERT INTO application_answers (id, application_id, question_id, answer) VALUES ($1,$2,$3,$4)`,
        [randomUUID(), id, answer.questionId, answer.answer.slice(0, 4000)]
      )
    }
  })

  // Files are validated by magic bytes before storage.
  for (const file of input.files) {
    await saveApplicationFile({ applicationId: id, kind: file.kind, filename: file.filename, buffer: file.buffer })
  }

  const application = await getApplicationById(id)
  if (!application) throw new Error("Application could not be saved.")
  return application
}

export async function getApplicationById(id: string): Promise<Application | null> {
  await ensureSchema()
  const result = await query<ApplicationRow>(`${APPLICATION_SELECT} WHERE a.id = $1`, [id])
  return result.rows[0] ? mapApplication(result.rows[0]) : null
}

export async function getApplicationByReference(reference: string, email: string): Promise<Application | null> {
  await ensureSchema()
  const result = await query<ApplicationRow>(
    `${APPLICATION_SELECT} WHERE a.reference_number = $1 AND LOWER(a.email) = LOWER($2)`,
    [reference.trim().toUpperCase(), email.trim()]
  )
  return result.rows[0] ? mapApplication(result.rows[0]) : null
}

export interface ApplicationFilters {
  jobId?: string
  jobIds?: string[]
  stage?: ApplicationStage | "all"
  search?: string
  from?: string
  to?: string
  minRating?: number
  minExperience?: number
  location?: string
  page?: number
  pageSize?: number
}

export async function listApplications(filters: ApplicationFilters = {}): Promise<{ applications: Application[]; total: number }> {
  await ensureSchema()
  const where: string[] = []
  const params: unknown[] = []
  if (filters.jobId) {
    params.push(filters.jobId)
    where.push(`a.job_id = $${params.length}`)
  }
  if (filters.jobIds) {
    if (filters.jobIds.length === 0) return { applications: [], total: 0 }
    params.push(filters.jobIds)
    where.push(`a.job_id = ANY($${params.length}::uuid[])`)
  }
  if (filters.stage && filters.stage !== "all") {
    params.push(filters.stage)
    where.push(`a.stage = $${params.length}`)
  }
  if (filters.from) {
    params.push(filters.from)
    where.push(`a.created_at >= $${params.length}`)
  }
  if (filters.to) {
    params.push(filters.to)
    where.push(`a.created_at <= $${params.length}`)
  }
  if (filters.minExperience !== undefined) {
    params.push(filters.minExperience)
    where.push(`a.years_experience >= $${params.length}`)
  }
  if (filters.location) {
    params.push(`%${filters.location.toLowerCase()}%`)
    where.push(`LOWER(a.current_location) LIKE $${params.length}`)
  }
  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`)
    where.push(`(LOWER(a.full_name) LIKE $${params.length} OR LOWER(a.email) LIKE $${params.length} OR a.phone LIKE $${params.length} OR LOWER(a.reference_number) LIKE $${params.length} OR LOWER(a.cover_letter) LIKE $${params.length})`)
  }
  if (filters.minRating !== undefined) {
    params.push(filters.minRating)
    where.push(`EXISTS (SELECT 1 FROM application_ratings r WHERE r.application_id = a.id AND r.rating >= $${params.length})`)
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : ""
  const count = await query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM applications a ${clause}`, params)
  const pageSize = Math.min(Math.max(filters.pageSize || 25, 1), 200)
  const page = Math.max(filters.page || 1, 1)
  params.push(pageSize, (page - 1) * pageSize)
  const result = await query<ApplicationRow>(
    `${APPLICATION_SELECT} ${clause} ORDER BY a.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )
  return { applications: result.rows.map(mapApplication), total: count.rows[0]?.count || 0 }
}

export async function changeApplicationStage(id: string, toStage: ApplicationStage, adminId: string | null, reason = ""): Promise<Application | null> {
  await ensureSchema()
  const existing = await getApplicationById(id)
  if (!existing) return null
  if (!APPLICATION_STAGES.includes(toStage)) throw new Error("Unknown stage.")
  await withTransaction(async (client) => {
    await client.query("UPDATE applications SET stage = $2, updated_at = NOW() WHERE id = $1", [id, toStage])
    await client.query(
      `INSERT INTO application_status_history (id, application_id, from_stage, to_stage, admin_id, reason)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [randomUUID(), id, existing.stage, toStage, adminId, reason.slice(0, 1000)]
    )
    if (toStage === "talent_pool") {
      await client.query(
        `INSERT INTO talent_pool (application_id, added_by) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [id, adminId]
      )
    }
  })
  return getApplicationById(id)
}

export async function getApplicationHistory(applicationId: string) {
  await ensureSchema()
  const result = await query<{
    id: string; from_stage: string; to_stage: string; admin_id: string | null; reason: string; created_at: Date; admin_name: string | null
  }>(
    `SELECT h.*, a.name AS admin_name FROM application_status_history h
     LEFT JOIN admin_users a ON a.id = h.admin_id
     WHERE h.application_id = $1 ORDER BY h.created_at ASC`,
    [applicationId]
  )
  return result.rows.map((row) => ({
    id: row.id,
    fromStage: row.from_stage,
    toStage: row.to_stage,
    adminId: row.admin_id,
    adminName: row.admin_name,
    reason: row.reason,
    createdAt: new Date(row.created_at).toISOString(),
  }))
}

export async function addApplicationNote(applicationId: string, adminId: string | null, body: string) {
  await ensureSchema()
  const id = randomUUID()
  await query(
    "INSERT INTO application_notes (id, application_id, admin_id, body) VALUES ($1,$2,$3,$4)",
    [id, applicationId, adminId, sanitizeRichText(body)]
  )
  return id
}

export async function listApplicationNotes(applicationId: string) {
  await ensureSchema()
  const result = await query<{ id: string; admin_id: string | null; body: string; created_at: Date; admin_name: string | null }>(
    `SELECT n.*, a.name AS admin_name FROM application_notes n
     LEFT JOIN admin_users a ON a.id = n.admin_id
     WHERE n.application_id = $1 ORDER BY n.created_at DESC`,
    [applicationId]
  )
  return result.rows.map((row) => ({
    id: row.id,
    adminId: row.admin_id,
    adminName: row.admin_name,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
  }))
}

export async function saveApplicationRating(applicationId: string, adminId: string | null, rating: number, scorecard: Record<string, number>) {
  await ensureSchema()
  const id = randomUUID()
  await query(
    "INSERT INTO application_ratings (id, application_id, admin_id, rating, scorecard) VALUES ($1,$2,$3,$4,$5::jsonb)",
    [id, applicationId, adminId, Math.min(Math.max(Math.round(rating), 1), 5), JSON.stringify(scorecard || {})]
  )
  return id
}

export async function listApplicationRatings(applicationId: string) {
  await ensureSchema()
  const result = await query<{ id: string; admin_id: string | null; rating: number; scorecard: unknown; created_at: Date; admin_name: string | null }>(
    `SELECT r.*, a.name AS admin_name FROM application_ratings r
     LEFT JOIN admin_users a ON a.id = r.admin_id
     WHERE r.application_id = $1 ORDER BY r.created_at DESC`,
    [applicationId]
  )
  return result.rows.map((row) => ({
    id: row.id,
    adminId: row.admin_id,
    adminName: row.admin_name,
    rating: row.rating,
    scorecard: (row.scorecard as Record<string, number>) || {},
    createdAt: new Date(row.created_at).toISOString(),
  }))
}

export async function setApplicationTags(applicationId: string, tags: string[]) {
  await ensureSchema()
  await withTransaction(async (client) => {
    await client.query("DELETE FROM application_tags WHERE application_id = $1", [applicationId])
    for (const tag of tags.map((item) => item.trim().toLowerCase()).filter(Boolean).slice(0, 20)) {
      await client.query(
        "INSERT INTO application_tags (application_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [applicationId, tag]
      )
    }
  })
}

export async function getApplicationTags(applicationId: string): Promise<string[]> {
  await ensureSchema()
  const result = await query<{ tag: string }>("SELECT tag FROM application_tags WHERE application_id = $1 ORDER BY tag", [applicationId])
  return result.rows.map((row) => row.tag)
}

export async function getApplicationTagsForMany(applicationIds: string[]): Promise<Record<string, string[]>> {
  await ensureSchema()
  if (applicationIds.length === 0) return {}
  const result = await query<{ application_id: string; tag: string }>(
    "SELECT application_id, tag FROM application_tags WHERE application_id = ANY($1::uuid[])",
    [applicationIds]
  )
  const map: Record<string, string[]> = {}
  for (const row of result.rows) {
    map[row.application_id] = [...(map[row.application_id] || []), row.tag]
  }
  return map
}

export async function getApplicationAnswers(applicationId: string) {
  await ensureSchema()
  const result = await query<{ id: string; question_id: string; answer: string; prompt: string; type: string }>(
    `SELECT ans.id, ans.question_id, ans.answer, q.prompt, q.type
     FROM application_answers ans JOIN job_screening_questions q ON q.id = ans.question_id
     WHERE ans.application_id = $1 ORDER BY q.position ASC`,
    [applicationId]
  )
  return result.rows.map((row) => ({ id: row.id, questionId: row.question_id, answer: row.answer, prompt: row.prompt, type: row.type }))
}

export async function createInterview(input: {
  applicationId: string
  type: string
  startsAt: string
  endsAt: string | null
  location: string
  meetingLink: string
  interviewers: string[]
  createdBy: string | null
}): Promise<Interview> {
  await ensureSchema()
  const id = randomUUID()
  await query(
    `INSERT INTO interviews (id, application_id, type, starts_at, ends_at, location, meeting_link, interviewers, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'scheduled',$9)`,
    [id, input.applicationId, input.type, input.startsAt, input.endsAt, input.location, input.meetingLink, input.interviewers, input.createdBy]
  )
  const interview = await getInterview(id)
  if (!interview) throw new Error("Interview could not be saved.")
  return interview
}

function mapInterview(row: {
  id: string; application_id: string; type: string; starts_at: Date; ends_at: Date | null
  location: string; meeting_link: string; interviewers: string[] | string; status: string; feedback: string
  created_by: string | null; created_at: Date
}): Interview {
  const interviewers = Array.isArray(row.interviewers)
    ? row.interviewers
    : String(row.interviewers || "").replace(/[{}]/g, "").split(",").map((item) => item.trim()).filter(Boolean)
  return {
    id: row.id,
    applicationId: row.application_id,
    type: row.type,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: row.ends_at ? new Date(row.ends_at).toISOString() : null,
    location: row.location,
    meetingLink: row.meeting_link,
    interviewers,
    status: row.status,
    feedback: row.feedback,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export async function getInterview(id: string): Promise<Interview | null> {
  await ensureSchema()
  const result = await query<Parameters<typeof mapInterview>[0]>("SELECT * FROM interviews WHERE id = $1", [id])
  return result.rows[0] ? mapInterview(result.rows[0]) : null
}

export async function listInterviews(applicationId?: string): Promise<Interview[]> {
  await ensureSchema()
  const result = applicationId
    ? await query<Parameters<typeof mapInterview>[0]>("SELECT * FROM interviews WHERE application_id = $1 ORDER BY starts_at ASC", [applicationId])
    : await query<Parameters<typeof mapInterview>[0]>("SELECT * FROM interviews ORDER BY starts_at ASC LIMIT 200")
  return result.rows.map(mapInterview)
}

export async function updateInterview(id: string, input: Partial<{
  type: string; startsAt: string; endsAt: string | null; location: string; meetingLink: string
  interviewers: string[]; status: string; feedback: string
}>): Promise<Interview | null> {
  await ensureSchema()
  const existing = await getInterview(id)
  if (!existing) return null
  await query(
    `UPDATE interviews SET type=$2, starts_at=$3, ends_at=$4, location=$5, meeting_link=$6,
       interviewers=$7, status=$8, feedback=$9, updated_at=NOW() WHERE id=$1`,
    [
      id,
      input.type ?? existing.type,
      input.startsAt ?? existing.startsAt,
      input.endsAt !== undefined ? input.endsAt : existing.endsAt,
      input.location ?? existing.location,
      input.meetingLink ?? existing.meetingLink,
      input.interviewers ?? existing.interviewers,
      input.status ?? existing.status,
      input.feedback !== undefined ? sanitizeRichText(input.feedback) : existing.feedback,
    ]
  )
  return getInterview(id)
}

export async function getRecruitmentStats() {
  await ensureSchema()
  const [openJobs, stageCounts, newThisWeek, interviewsToday, byDepartment, timeline, expiringSoon, recentActivity] = await Promise.all([
    query<{ count: number }>("SELECT COUNT(*)::int AS count FROM jobs WHERE status = 'published' AND (expires_at IS NULL OR expires_at > NOW())"),
    query<{ stage: string; count: number }>("SELECT stage, COUNT(*)::int AS count FROM applications GROUP BY stage"),
    query<{ count: number }>("SELECT COUNT(*)::int AS count FROM applications WHERE created_at > NOW() - INTERVAL '7 days'"),
    query<{ count: number }>("SELECT COUNT(*)::int AS count FROM interviews WHERE starts_at >= date_trunc('day', NOW() AT TIME ZONE 'Africa/Nairobi') AT TIME ZONE 'Africa/Nairobi' AND starts_at < (date_trunc('day', NOW() AT TIME ZONE 'Africa/Nairobi') + INTERVAL '1 day') AT TIME ZONE 'Africa/Nairobi' AND status = 'scheduled'"),
    query<{ department: string; count: number }>(
      `SELECT COALESCE(NULLIF(j.department,''),'General') AS department, COUNT(a.id)::int AS count
       FROM applications a JOIN jobs j ON j.id = a.job_id GROUP BY 1 ORDER BY count DESC LIMIT 8`
    ),
    query<{ day: string; count: number }>(
      `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'Africa/Nairobi'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
       FROM applications WHERE created_at > NOW() - INTERVAL '14 days' GROUP BY 1 ORDER BY 1`
    ),
    query<{ id: string; title: string; slug: string; expires_at: Date }>(
      "SELECT id, title, slug, expires_at FROM jobs WHERE status = 'published' AND expires_at IS NOT NULL AND expires_at > NOW() AND expires_at < NOW() + INTERVAL '3 days' ORDER BY expires_at ASC LIMIT 10"
    ),
    query<{ id: string; kind: string; label: string; created_at: Date }>(
      `(SELECT h.id, 'stage' AS kind, a.full_name || ' → ' || h.to_stage AS label, h.created_at
        FROM application_status_history h JOIN applications a ON a.id = h.application_id
        ORDER BY h.created_at DESC LIMIT 8)
       UNION ALL
       (SELECT a.id, 'application' AS kind, a.full_name || ' applied' AS label, a.created_at
        FROM applications a ORDER BY a.created_at DESC LIMIT 8)
       ORDER BY created_at DESC LIMIT 12`
    ),
  ])
  const stages: Record<string, number> = {}
  for (const stage of APPLICATION_STAGES) stages[stage] = 0
  for (const row of stageCounts.rows) stages[row.stage] = row.count
  return {
    openJobs: openJobs.rows[0]?.count || 0,
    totalApplicants: Object.values(stages).reduce((sum, value) => sum + value, 0),
    newThisWeek: newThisWeek.rows[0]?.count || 0,
    interviewsToday: interviewsToday.rows[0]?.count || 0,
    stages,
    byDepartment: byDepartment.rows,
    timeline: timeline.rows,
    expiringSoon: expiringSoon.rows.map((row) => ({ id: row.id, title: row.title, slug: row.slug, expiresAt: new Date(row.expires_at).toISOString() })),
    recentActivity: recentActivity.rows.map((row) => ({ id: row.id, kind: row.kind, label: row.label, createdAt: new Date(row.created_at).toISOString() })),
  }
}

/** Magic-link tokens for the candidate status page. */
export async function createMagicLink(applicationId: string): Promise<string> {
  await ensureSchema()
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  await query(
    "INSERT INTO application_magic_links (token_hash, application_id, expires_at) VALUES ($1,$2,NOW() + INTERVAL '30 minutes')",
    [tokenHash, applicationId]
  )
  return token
}

export async function consumeMagicLink(token: string): Promise<Application | null> {
  await ensureSchema()
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const result = await query<{ application_id: string }>(
    `UPDATE application_magic_links SET consumed_at = NOW()
     WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > NOW()
     RETURNING application_id`,
    [tokenHash]
  )
  const applicationId = result.rows[0]?.application_id
  return applicationId ? getApplicationById(applicationId) : null
}

export async function getApplicationFiles(applicationId: string): Promise<ApplicationFileMeta[]> {
  const { listApplicationFiles } = await import("@/lib/careers-files")
  return listApplicationFiles(applicationId)
}

/** Retention: anonymise rejected applications older than N months (0 = off). */
export async function runRetention(retentionMonths: number): Promise<number> {
  await ensureSchema()
  if (!retentionMonths || retentionMonths <= 0) return 0
  const result = await query<{ id: string }>(
    `SELECT id FROM applications
     WHERE stage IN ('rejected','withdrawn')
       AND created_at < NOW() - ($1 || ' months')::interval`,
    [retentionMonths]
  )
  for (const row of result.rows) {
    await withTransaction(async (client) => {
      await client.query("DELETE FROM application_files WHERE application_id = $1", [row.id])
      await client.query(
        `UPDATE applications SET full_name='Anonymised', email='', phone='', current_location='',
           current_employer='', portfolio_url='', cover_letter='', expected_salary=NULL, updated_at=NOW()
         WHERE id=$1`,
        [row.id]
      )
    })
  }
  return result.rows.length
}

export async function deleteApplicationData(id: string): Promise<void> {
  await ensureSchema()
  await query("DELETE FROM applications WHERE id = $1", [id])
}
