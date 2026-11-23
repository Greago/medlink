import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { ensureSchema, query } from "@/lib/db"
import { writeAudit } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Talent pool entries (job-less signups). CV bytes are never returned here. */
export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permission: "recruitment.read" })
    await ensureSchema()
    const url = new URL(request.url)
    const search = (url.searchParams.get("search") || "").trim().toLowerCase()
    const page = Math.max(Number(url.searchParams.get("page") || 1), 1)
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") || 25), 1), 100)

    const where: string[] = []
    const params: unknown[] = []
    if (search) {
      params.push(`%${search}%`)
      where.push(`(LOWER(full_name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(interest) LIKE $${params.length})`)
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : ""
    const count = await query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM talent_pool_entries ${clause}`, params)
    params.push(pageSize, (page - 1) * pageSize)
    const result = await query<{
      id: string; full_name: string; email: string; phone: string; interest: string
      consent: boolean; consent_at: Date | null; cv_filename: string; cv_mime: string
      has_cv: boolean; created_at: Date
    }>(
      `SELECT id, full_name, email, phone, interest, consent, consent_at, cv_filename, cv_mime,
              (cv_data IS NOT NULL) AS has_cv, created_at
       FROM talent_pool_entries ${clause}
       ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )
    return NextResponse.json({
      entries: result.rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        interest: row.interest,
        consent: row.consent,
        consentAt: row.consent_at ? new Date(row.consent_at).toISOString() : null,
        cvFilename: row.cv_filename,
        hasCv: row.has_cv,
        createdAt: new Date(row.created_at).toISOString(),
      })),
      total: count.rows[0]?.count || 0,
    })
  } catch (error) {
    return apiErrorResponse(error, "Could not load the talent pool.")
  }
}

/** DELETE ?id=... — data-subject deletion of a talent pool entry (incl. CV bytes). */
export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const id = new URL(request.url).searchParams.get("id") || ""
    if (!id) return NextResponse.json({ error: "Missing entry id." }, { status: 400 })
    await ensureSchema()
    const existing = await query<{ full_name: string; email: string }>(
      "SELECT full_name, email FROM talent_pool_entries WHERE id = $1", [id]
    )
    if (!existing.rows[0]) return NextResponse.json({ error: "Entry not found." }, { status: 404 })
    await query("DELETE FROM talent_pool_entries WHERE id = $1", [id])
    await writeAudit({
      adminId: admin.id,
      action: "recruitment.talent_pool.delete",
      entityType: "talent_pool_entry",
      entityId: id,
      before: { email: existing.rows[0].email },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not delete the talent pool entry.")
  }
}