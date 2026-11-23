import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, assertModuleAccess, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { getSettings } from "@/lib/db"
import { processOutbox } from "@/lib/email-outbox"
import { enqueueSaleThankYou, saleVerificationUrl } from "@/lib/sale-documents"
import { getSaleDetail } from "@/lib/sales"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  recipient: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
})

interface Context {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Context) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid recipient email." }, { status: 400 })
  }

  try {
    const { id } = await params
    const admin = await requireAdmin(request, {
      permissions: ["settings.manage", "finance.manage"],
    })
    const detail = await getSaleDetail(id)
    if (!detail) return NextResponse.json({ error: "Sale not found." }, { status: 404 })
    assertModuleAccess(admin, detail.sale.module)

    const settings = await getSettings()
    const result = await enqueueSaleThankYou(
      detail,
      settings,
      saleVerificationUrl(request, detail.sale.saleNumber),
      { recipient: parsed.data.recipient || undefined, manual: true }
    )
    await processOutbox(2)
    const emailStatus = (await getSaleDetail(id))?.emailStatus || null

    await writeAudit({
      adminId: admin.id,
      module: detail.sale.module,
      action: "sale.email.resend",
      entityType: "sale",
      entityId: id,
      after: { recipient: parsed.data.recipient || detail.sale.customerEmail, queued: result.queued },
    })

    return NextResponse.json({ ...result, emailStatus })
  } catch (error) {
    return apiErrorResponse(error, "Could not queue the email.")
  }
}
