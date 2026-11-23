import type { AppModule } from "@/lib/modules/types"
import type { AdminRole, Permission } from "@/lib/roles"
import { hasPermission } from "@/lib/roles"

export type JobModule = "medical" | "pharmacy" | "company-wide"
export type JobStatus = "draft" | "published" | "closed" | "expired" | "archived"
export type EmploymentType = "Full-time" | "Part-time" | "Contract" | "Internship" | "Casual"
export type WorkMode = "On-site" | "Hybrid" | "Remote"

export const JOB_MODULES: JobModule[] = ["medical", "pharmacy", "company-wide"]
export const JOB_STATUSES: JobStatus[] = ["draft", "published", "closed", "expired", "archived"]
export const EMPLOYMENT_TYPES: EmploymentType[] = ["Full-time", "Part-time", "Contract", "Internship", "Casual"]
export const WORK_MODES: WorkMode[] = ["On-site", "Hybrid", "Remote"]

export const APPLICATION_STAGES = [
  "applied",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
  "talent_pool",
] as const
export type ApplicationStage = (typeof APPLICATION_STAGES)[number]

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  applied: "Applied",
  screening: "Screening",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  talent_pool: "Talent Pool",
}

/** Candidate-facing progress tracker (internal stages mapped to public steps). */
export const PUBLIC_STAGES = ["applied", "screening", "shortlisted", "interview", "decision"] as const
export const PUBLIC_STAGE_LABELS: Record<(typeof PUBLIC_STAGES)[number], string> = {
  applied: "Applied",
  screening: "Under review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  decision: "Decision",
}

export interface Job {
  id: string
  slug: string
  title: string
  department: string
  module: JobModule
  employmentType: EmploymentType
  workMode: WorkMode
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
  status: JobStatus
  publishedAt: string | null
  scheduledPublishAt: string | null
  expiresAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  applicantCount?: number
}

export interface Application {
  id: string
  jobId: string
  referenceNumber: string
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
  consentAt: string | null
  stage: ApplicationStage
  source: string
  createdAt: string
  updatedAt: string
  jobTitle?: string
  jobSlug?: string
  jobModule?: JobModule
}

export interface CareersSettings {
  heroTitle: string
  heroBody: string
  whyJoinUs: string
  perks: { title: string; description: string; icon?: string }[]
  collage: { url: string; alt: string }[]
  privacyText: string
  retentionMonths: number
  autoSend: Partial<Record<ApplicationStage, boolean>>
  digestEnabled: boolean
}

export interface ScreeningQuestion {
  id: string
  jobId: string
  prompt: string
  type: "text" | "yes-no" | "choice"
  options: string[]
  required: boolean
  position: number
}

export interface Interview {
  id: string
  applicationId: string
  type: string
  startsAt: string
  endsAt: string | null
  location: string
  meetingLink: string
  interviewers: string[]
  status: string
  feedback: string
  createdBy: string | null
  createdAt: string
}

/** EAT is UTC+3 with no daylight saving. */
export const EAT_OFFSET_MINUTES = 180

export function formatEat(date: string | Date | null | undefined, options: Intl.DateTimeFormatOptions = {}): string {
  if (!date) return "—"
  const value = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(value.getTime())) return "—"
  return new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", ...options }).format(value)
}

export function formatEatDate(date: string | Date | null | undefined): string {
  return formatEat(date, { day: "numeric", month: "short", year: "numeric" })
}

export function formatEatDateTime(date: string | Date | null | undefined): string {
  return formatEat(date, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/** Convert an admin datetime-local value (interpreted as EAT) to an ISO UTC string. */
export function eatLocalToUtc(local: string): string | null {
  if (!local) return null
  const match = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) return null
  const [, y, m, d, h, min] = match
  const utc = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), Number(min)) - EAT_OFFSET_MINUTES * 60_000)
  return utc.toISOString()
}

/** Convert a stored UTC instant to an EAT datetime-local input value. */
export function utcToEatLocal(date: string | null | undefined): string {
  if (!date) return ""
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return ""
  const shifted = new Date(value.getTime() + EAT_OFFSET_MINUTES * 60_000)
  return shifted.toISOString().slice(0, 16)
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return null
  return Math.ceil((value.getTime() - Date.now()) / 86_400_000)
}

export function jobIsLive(job: Pick<Job, "status" | "expiresAt">): boolean {
  if (job.status !== "published") return false
  if (!job.expiresAt) return true
  return new Date(job.expiresAt).getTime() > Date.now()
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || `job-${Date.now()}`
}

export function formatKshRange(min: number | null, max: number | null): string {
  const format = (value: number) => `KSh ${value.toLocaleString("en-KE")}`
  if (min !== null && max !== null && min !== max) return `${format(min)} – ${format(max)}`
  if (max !== null) return format(max)
  if (min !== null) return format(min)
  return "Competitive"
}

/** Module theme used on careers pages only; global theme is unchanged. */
export function jobTheme(module: JobModule): { name: string; primary: string; accent: string; soft: string; label: string } {
  if (module === "pharmacy") {
    return { name: "pharmacy", primary: "#0c1f1d", accent: "#18bcaa", soft: "#edf7f5", label: "Pharmacy" }
  }
  if (module === "medical") {
    return { name: "medical", primary: "#12263f", accent: "#3f7fbf", soft: "#eef3f9", label: "Medical Equipment" }
  }
  return { name: "company", primary: "#0c1f1d", accent: "#6b7280", soft: "#f5f6f7", label: "Company-wide" }
}

export function appModuleForJob(module: JobModule): AppModule {
  return module === "pharmacy" ? "pharmacy" : "medical"
}

export function canAccessJobModule(subject: { role: AdminRole; modules?: AppModule[] | string[] | null; permissions?: Permission[] | null } | null | undefined, module: JobModule): boolean {
  if (!subject) return false
  if (module === "company-wide" || subject.role === "owner") return true
  const modules = subject.modules || []
  return modules.includes(module)
}

export function canSendRecruitmentEmail(subject: { role: AdminRole; modules?: AppModule[] | string[] | null; permissions?: Permission[] | null } | null | undefined): boolean {
  return hasPermission(subject, "recruitment.email")
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://medlinkexpedite.co.ke").replace(/\/$/, "")
}
