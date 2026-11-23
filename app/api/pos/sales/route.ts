import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, assertModuleAccess, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { getSettings } from "@/lib/db"
import { processOutbox } from "@/lib/email-outbox"
import { isAppModule } from "@/lib/modules/types"
import { parseModuleFromRequest } from "@/lib/modules/server"
import { canApplyDiscount, hasPermission } from "@/lib/roles"
import { enqueueMissingSaleEmails, enqueueSaleThankYou, saleVerificationUrl } from "@/lib/sale-documents"
import {
  createSale,
  getSaleByIdempotencyKey,
  getSaleDetail,
  listSales,
  type CreateSaleResult,
} from "@/lib/sales"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const emptyString = z.string().trim().max(500).default("")

const saleSchema = z
  .object({
    module: z.enum(["medical", "pharmacy"]),
    channel: z.enum(["in_shop", "field", "online"]).default("in_shop"),
    documentType: z.enum(["receipt", "invoice", "quote"]).default("receipt"),
    branchId: z.string().uuid().nullable().optional(),
    shiftId: z.string().uuid().nullable().optional(),
    agentId: z.string().uuid().nullable().optional(),
    onlineOrderId: z.string().max(120).nullable().optional(),
    idempotencyKey: z.string().trim().min(1).max(200).optional(),
    customer: z.object({
      id: z.string().uuid().nullable().optional(),
      name: z.string().trim().min(1).max(180).default("Walk-in customer"),
      phone: z.string().trim().max(50).default(""),
      email: z.union([z.string().trim().email().max(254), z.literal("")]).default(""),
      address: z.string().trim().max(300).default(""),
      idNumber: z.string().trim().max(80).default(""),
    }),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().positive().max(10000),
          unitPrice: z.number().min(0).optional(),
          discountAmount: z.number().min(0).default(0),
          serialNumber: z.string().trim().max(120).optional(),
          prescriptionId: z.string().uuid().nullable().optional(),
          notes: z.string().trim().max(500).optional(),
        })
      )
      .min(1)
      .max(100),
    payments: z
      .array(
        z.object({
          method: z.enum(["cash", "mpesa", "card", "bank", "credit"]),
          amount: z.number().min(0),
          reference: z.string().trim().max(120).default(""),
          amountTendered: z.number().min(0).optional(),
          changeAmount: z.number().min(0).default(0),
        })
      )
      .max(10)
      .default([]),
    notes: emptyString,
    deliveryFee: z.number().min(0).max(1000000).default(0),
    installationFee: z.number().min(0).max(1000000).default(0),
    prescription: z
      .object({
        patientName: z.string().trim().min(1).max(180),
        prescriberName: z.string().trim().min(1).max(180),
        prescriberRegNo: z.string().trim().max(80).default(""),
        referenceNumber: z.string().trim().max(120).default(""),
        imageUrl: z.string().trim().max(500).default(""),
      })
      .nullable()
      .optional(),
  })
  .refine((data) => data.documentType === "quote" || data.payments.length > 0, {
    message: "At least one payment is required for a completed sale.",
    path: ["payments"],
  })

async function processDueEmails() {
  try {
    await enqueueMissingSaleEmails(5)
    await processOutbox(2)
  } catch (error) {
    console.error("Outbox processing failed:", error instanceof Error ? error.message : "Unknown error")
  }
}

export async function POST(request: Request) {
  const parsed = saleSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid sale." },
      { status: 400 }
    )
  }

  try {
    const admin = await requireAdmin(request, {
      module: parsed.data.module,
      permission: "pos.sell",
    })

    const declaredSubtotal = parsed.data.items.reduce(
      (sum, item) => sum + (item.unitPrice || 0) * item.quantity,
      0
    )
    const declaredDiscount = parsed.data.items.reduce((sum, item) => sum + item.discountAmount, 0)
    const discountPercent = declaredSubtotal > 0 ? (declaredDiscount / declaredSubtotal) * 100 : declaredDiscount > 0 ? 100 : 0
    if (discountPercent > 0 && !canApplyDiscount(admin, discountPercent)) {
      return NextResponse.json({ error: "This discount exceeds your allowed limit." }, { status: 403 })
    }

    const idempotencyKey =
      parsed.data.idempotencyKey || request.headers.get("idempotency-key")?.trim() || randomUUID()
    const replay = await getSaleByIdempotencyKey(idempotencyKey)
    if (replay) return NextResponse.json({ ...replay, replayed: true })

    let result: CreateSaleResult
    try {
      result = await createSale({
        ...parsed.data,
        cashierId: admin.id,
        customer: { ...parsed.data.customer, email: parsed.data.customer.email || "" },
        idempotencyKey,
      })
    } catch (error) {
      const existing = await getSaleByIdempotencyKey(idempotencyKey)
      if (existing) return NextResponse.json({ ...existing, replayed: true })
      throw error
    }

    const detail = await getSaleDetail(result.sale.id)
    if (!detail) throw new Error("The sale could not be reloaded.")

    const settings = await getSettings()
    let emailQueued = false
    try {
      const email = await enqueueSaleThankYou(
        detail,
        settings,
        saleVerificationUrl(request, detail.sale.saleNumber)
      )
      emailQueued = email.queued
    } catch (error) {
      console.error("Sale email queueing failed:", error instanceof Error ? error.message : "Unknown error")
    }
    await processDueEmails()

    const fresh = await getSaleDetail(result.sale.id)
    await writeAudit({
      adminId: admin.id,
      module: detail.sale.module,
      action: "sale.create",
      entityType: "sale",
      entityId: detail.sale.id,
      after: { saleNumber: detail.sale.saleNumber, total: detail.sale.total, channel: detail.sale.channel },
    })

    return NextResponse.json(
      {
        ...(fresh || detail),
        warnings: result.warnings,
        emailQueued,
      },
      { status: 201 }
    )
  } catch (error) {
    return apiErrorResponse(error, "Could not record the sale.")
  }
}

export async function GET(request: Request) {
  try {
    const requestedModule = new URL(request.url).searchParams.get("module")
    const module = isAppModule(requestedModule) ? requestedModule : parseModuleFromRequest(request)
    const admin = await requireAdmin(request, {
      module,
      permissions: ["sales.read.all", "sales.read.own"],
    })
    assertModuleAccess(admin, module)

    const params = new URL(request.url).searchParams
    const filters: Parameters<typeof listSales>[0] = {
      module,
      limit: Number(params.get("limit") || 200),
    }
    const channel = params.get("channel")
    if (channel === "in_shop" || channel === "field" || channel === "online") filters.channel = channel
    if (params.get("from")) filters.from = params.get("from") || undefined
    if (params.get("to")) filters.to = params.get("to") || undefined
    if (params.get("agentId")) filters.agentId = params.get("agentId") || undefined
    if (params.get("customerId")) filters.customerId = params.get("customerId") || undefined
    if (!hasPermission(admin, "sales.read.all")) filters.cashierId = admin.id

    const sales = await listSales(filters)
    return NextResponse.json({ sales })
  } catch (error) {
    return apiErrorResponse(error, "Could not load sales.")
  }
}
