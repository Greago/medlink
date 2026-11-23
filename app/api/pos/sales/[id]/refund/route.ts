import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, assertModuleAccess, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { getSettings } from "@/lib/db"
import { processOutbox } from "@/lib/email-outbox"
import { enqueueCreditNoteEmail } from "@/lib/sale-documents"
import { createReturn, getSaleDetail } from "@/lib/sales"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  items: z
    .array(
      z.object({
        saleItemId: z.string().uuid(),
        quantity: z.number().positive().max(10000),
      })
    )
    .min(1)
    .max(100),
  reason: z.string().trim().min(3).max(500),
  restock: z.boolean().default(true),
  refundMethod: z.enum(["cash", "mpesa", "card", "bank", "credit"]).default("cash"),
  refundReference: z.string().trim().max(120).default(""),
  storeCredit: z.number().min(0).default(0),
  recipient: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
})

interface Context {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Context) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid refund request." },
      { status: 400 }
    )
  }

  try {
    const { id } = await params
    const admin = await requireAdmin(request, { permission: "pos.refund" })
    const detail = await getSaleDetail(id)
    if (!detail) return NextResponse.json({ error: "Sale not found." }, { status: 404 })
    assertModuleAccess(admin, detail.sale.module)

    const creditNote = await createReturn({
      saleId: id,
      items: parsed.data.items,
      reason: parsed.data.reason,
      restock: parsed.data.restock,
      refundMethod: parsed.data.refundMethod,
      refundReference: parsed.data.refundReference,
      storeCredit: parsed.data.storeCredit,
      createdBy: admin.id,
    })

    try {
      const settings = await getSettings()
      await enqueueCreditNoteEmail(
        detail,
        settings,
        {
          number: creditNote.creditNoteNumber,
          total: creditNote.total,
          reason: parsed.data.reason,
        },
        parsed.data.recipient || undefined
      )
      await processOutbox(2)
    } catch (error) {
      console.error("Credit-note email failed:", error instanceof Error ? error.message : "Unknown error")
    }

    await writeAudit({
      adminId: admin.id,
      module: detail.sale.module,
      action: "sale.refund",
      entityType: "return",
      entityId: creditNote.id,
      after: {
        saleId: id,
        creditNoteNumber: creditNote.creditNoteNumber,
        total: creditNote.total,
        reason: parsed.data.reason,
      },
    })

    return NextResponse.json({ creditNote }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not issue the credit note.")
  }
}
