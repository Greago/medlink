import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api-auth"
import { getApplicationById } from "@/lib/careers-applications"
import { getApplicationFile, verifyFileAccessToken } from "@/lib/careers-files"
import { assertApplicationAccess } from "@/lib/careers-access"
import { writeAudit } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Secure CV/document access. Requires either an authenticated admin with
 * access to the application, or a short-lived HMAC-signed token. Every
 * successful view/download is audit-logged. Never publicly readable.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const token = url.searchParams.get("token") || ""
    const expires = Number(url.searchParams.get("expires") || 0)
    const tokenAdmin = url.searchParams.get("admin") || ""
    const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline"

    const file = await getApplicationFile(id)
    if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 })

    let adminId: string | null = null
    let viaToken = false
    if (token && verifyFileAccessToken(id, token, expires, tokenAdmin)) {
      viaToken = true
      adminId = tokenAdmin || null
    } else {
      const admin = await requireAdmin(request, { permission: "recruitment.read" })
      const application = await getApplicationById(file.applicationId)
      if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 })
      await assertApplicationAccess(admin, application)
      adminId = admin.id
    }

    await writeAudit({
      adminId,
      action: disposition === "attachment" ? "recruitment.file.download" : "recruitment.file.view",
      entityType: "application_file",
      entityId: id,
      after: { applicationId: file.applicationId, filename: file.filename, viaToken },
    })

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `${disposition}; filename="${file.filename.replace(/"/g, "")}"`,
        "Content-Length": String(file.sizeBytes),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "You are not allowed to view this file." }, { status: 403 })
  }
}