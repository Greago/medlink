import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { getCareersSettings, saveCareersSettings } from "@/lib/careers-jobs"
import { writeAudit } from "@/lib/audit"
import { APPLICATION_STAGES } from "@/lib/careers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permission: "recruitment.read" })
    return NextResponse.json({ settings: await getCareersSettings() })
  } catch (error) {
    return apiErrorResponse(error, "Could not load careers settings.")
  }
}

const settingsSchema = z.object({
  heroTitle: z.string().trim().min(1).max(160).optional(),
  heroBody: z.string().max(50_000).optional(),
  whyJoinUs: z.string().max(50_000).optional(),
  perks: z.array(z.object({
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500).default(""),
    icon: z.string().max(40).optional(),
  })).max(12).optional(),
  // Collage images must come from the authenticated upload store, never arbitrary URLs.
  collage: z.array(z.object({
    url: z.string().regex(/^\/api\/images\/[0-9a-f-]{36}$/i, "Collage images must be uploaded via the media library."),
    alt: z.string().trim().max(160).default(""),
  })).max(8).optional(),
  privacyText: z.string().max(100_000).optional(),
  retentionMonths: z.coerce.number().int().min(0).max(120).optional(),
  autoSend: z.record(z.enum(APPLICATION_STAGES), z.boolean()).optional(),
  digestEnabled: z.boolean().optional(),
})

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin(request, { permission: "recruitment.manage" })
    const parsed = settingsSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid settings." }, { status: 400 })
    }
    const before = await getCareersSettings()
    const settings = await saveCareersSettings(parsed.data)
    await writeAudit({
      adminId: admin.id,
      action: "recruitment.settings.update",
      entityType: "careers_settings",
      entityId: "1",
      before: { retentionMonths: before.retentionMonths, digestEnabled: before.digestEnabled },
      after: { retentionMonths: settings.retentionMonths, digestEnabled: settings.digestEnabled },
    })
    return NextResponse.json({ settings })
  } catch (error) {
    return apiErrorResponse(error, "Could not save careers settings.")
  }
}