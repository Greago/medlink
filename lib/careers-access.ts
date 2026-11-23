import { hasPermission } from "@/lib/roles"
import type { AuthenticatedAdmin } from "@/lib/api-auth"
import { ApiAuthError } from "@/lib/api-auth"
import { canAccessJobModule, type Application, type Job } from "@/lib/careers"
import { getReviewerJobIds } from "@/lib/careers-jobs"

export function canManageRecruitment(admin: AuthenticatedAdmin): boolean {
  return hasPermission(admin, "recruitment.manage")
}

export function canEmailCandidates(admin: AuthenticatedAdmin): boolean {
  return hasPermission(admin, "recruitment.email")
}

export function canSeeSalary(admin: AuthenticatedAdmin): boolean {
  return hasPermission(admin, "recruitment.salary")
}

/** Owners and HR managers see everything in their modules; interviewers only assigned jobs. */
export async function assertJobAccess(admin: AuthenticatedAdmin, job: Pick<Job, "id" | "module">): Promise<void> {
  if (admin.role === "owner") return
  if (canManageRecruitment(admin)) {
    if (!canAccessJobModule(admin, job.module)) {
      throw new ApiAuthError("You do not have access to this division's jobs.", 403)
    }
    return
  }
  const assigned = await getReviewerJobIds(admin.id)
  if (!assigned.includes(job.id)) {
    throw new ApiAuthError("You can only view applications for jobs you are assigned to review.", 403)
  }
}

export async function assertApplicationAccess(admin: AuthenticatedAdmin, application: Pick<Application, "jobId" | "jobModule">): Promise<void> {
  await assertJobAccess(admin, { id: application.jobId, module: application.jobModule || "company-wide" })
}

/** Job ids visible to this admin; null means unrestricted. */
export async function visibleJobIds(admin: AuthenticatedAdmin): Promise<string[] | null> {
  if (admin.role === "owner" || canManageRecruitment(admin)) return null
  return getReviewerJobIds(admin.id)
}

/** Strip salary expectations unless the admin is allowed to see them. */
export function redactSalary<T extends { expectedSalary: number | null }>(admin: AuthenticatedAdmin, application: T): T {
  if (canSeeSalary(admin)) return application
  return { ...application, expectedSalary: null }
}