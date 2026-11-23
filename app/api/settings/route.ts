import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { getSettings, saveSettings } from "@/lib/db"
import { parseModuleFromRequest } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  whatsappNumber: z.string().min(1).max(50),
  companyEmail: z.string().min(1).max(200),
  companyPhone: z.string().min(1).max(100),
  companyAddress: z.string().max(500),
  deliveryThreshold: z.number().min(0).max(100000000).default(0),
  ppbRegistrationNumber: z.string().max(100).default(""),
  businessName: z.string().min(1).max(180).default("Medlink Expedite Ventures Limited"),
  kraPin: z.string().max(50).default(""),
  vatRegistered: z.boolean().default(false),
  vatRate: z.number().min(0).max(100).default(16),
  vatInclusive: z.boolean().default(true),
  receiptFooter: z.string().max(500).default("Thank you for shopping with us."),
  receiptReturnPolicy: z.string().max(1000).default("Returns accepted within 7 days with proof of purchase."),
  receiptWarrantyNote: z.string().max(1000).default("Warranty terms are shown on the receipt where applicable."),
  medicalPrefix: z.string().trim().min(1).max(10).default("MED"),
  pharmacyPrefix: z.string().trim().min(1).max(10).default("PHA"),
  invoicePrefix: z.string().trim().min(1).max(10).default("INV"),
  quotePrefix: z.string().trim().min(1).max(10).default("QUO"),
  creditNotePrefix: z.string().trim().min(1).max(10).default("CN"),
  etimsEnabled: z.boolean().default(false),
  salesFromEmail: z.string().max(200).default("sales@medlinkexpedite.co.ke"),
  receiptsFromEmail: z.string().max(200).default("receipts@medlinkexpedite.co.ke"),
})

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin(request, { permission: "settings.manage" })
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid settings." }, { status: 400 })
    }

    const before = await getSettings()
    const settings = await saveSettings(parsed.data)
    await writeAudit({
      adminId: admin.id,
      module: parseModuleFromRequest(request),
      action: "settings.update",
      entityType: "settings",
      entityId: "1",
      before,
      after: settings,
    })
    return NextResponse.json({ settings })
  } catch (error) {
    return apiErrorResponse(error, "Could not save settings.")
  }
}
