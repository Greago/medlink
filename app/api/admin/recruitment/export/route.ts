import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { getApplicationTagsForMany, listApplications } from "@/lib/careers-applications"
import { canSeeSalary, redactSalary, visibleJobIds } from "@/lib/careers-access"
import { writeAudit } from "@/lib/audit"
import { formatEatDateTime, STAGE_LABELS, type ApplicationStage } from "@/lib/careers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_ROWS = 5000

/**
 * Formula-injection-safe CSV cell: values starting with =, +, -, @, tab or CR
 * are prefixed with a single quote so spreadsheet apps treat them as text.
 */
export function csvSafe(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value)
  const escaped = text.replace(/"/g, '""')
  if (/^[=+\-@\t\r]/.test(text)) return `"'${escaped}"`
  return `"${escaped}"`
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.read" })
    const url = new URL(request.url)
    const jobIds = await visibleJobIds(admin)
    const jobId = url.searchParams.get("jobId") || undefined
    if (jobIds && jobId && !jobIds.includes(jobId)) {
      return new NextResponse("reference\r\n", { headers: csvHeaders() })
    }
    const filters = {
      jobId,
      jobIds: jobIds || undefined,
      stage: (url.searchParams.get("stage") as ApplicationStage | "all") || "all",
      search: url.searchParams.get("search") || undefined,
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
    }
    // listApplications caps pages at 200 rows; page through up to MAX_ROWS.
    const applications: Awaited<ReturnType<typeof listApplications>>["applications"] = []
    let page = 1
    for (;;) {
      const batch = await listApplications({ ...filters, page, pageSize: 200 })
      applications.push(...batch.applications)
      if (applications.length >= batch.total || applications.length >= MAX_ROWS || batch.applications.length === 0) break
      page += 1
    }
    const rows = applications.slice(0, MAX_ROWS)
    const tagsMap = await getApplicationTagsForMany(rows.map((item) => item.id))
    const showSalary = canSeeSalary(admin)

    const header = [
      "Reference", "Full name", "Email", "Phone", "Job title", "Division", "Stage",
      "Location", "Years of experience", ...(showSalary ? ["Expected salary (KSh)"] : []),
      "Notice period", "Heard about via", "Tags", "Applied (EAT)",
    ]
    const lines = [header.map(csvSafe).join(",")]
    for (const raw of rows) {
      const application = redactSalary(admin, raw)
      lines.push([
        application.referenceNumber,
        application.fullName,
        application.email,
        application.phone,
        application.jobTitle || "",
        application.jobModule || "",
        STAGE_LABELS[application.stage] || application.stage,
        application.currentLocation,
        application.yearsExperience,
        ...(showSalary ? [application.expectedSalary ?? ""] : []),
        application.noticePeriod,
        application.heardAbout,
        (tagsMap[application.id] || []).join("; "),
        formatEatDateTime(application.createdAt),
      ].map(csvSafe).join(","))
    }

    await writeAudit({
      adminId: admin.id,
      action: "recruitment.export",
      entityType: "application",
      after: { rows: rows.length, jobId: jobId || null },
    })

    // UTF-8 BOM so Excel renders names/accents correctly.
    return new NextResponse(`\uFEFF${lines.join("\r\n")}\r\n`, { headers: csvHeaders() })
  } catch (error) {
    return apiErrorResponse(error, "Could not export applications.")
  }
}

function csvHeaders(): Record<string, string> {
  const stamp = new Date().toISOString().slice(0, 10)
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="applications-${stamp}.csv"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  }
}