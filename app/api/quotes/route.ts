import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { createQuote } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  id: z.string().min(1),
  quoteNumber: z.string().min(1),
  inquiryId: z.string().optional(),
  clientName: z.string().min(1),
  clientCompany: z.string().min(1),
  clientEmail: z.string().min(1),
  clientPhone: z.string().min(1),
  clientAddress: z.string().default(""),
  items: z
    .array(
      z.object({
        productName: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        total: z.number(),
      })
    )
    .default([]),
  subtotal: z.number().default(0),
  taxRate: z.number().default(0),
  taxAmount: z.number().default(0),
  totalPrice: z.number().default(0),
  validUntil: z.string().min(1),
  paymentTerms: z.string().default(""),
  notes: z.string().default(""),
  status: z.enum(["Draft", "Sent", "Accepted", "Rejected", "Expired"]).default("Draft"),
  createdAt: z.string(),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quote." }, { status: 400 })
  }

  try {
    await requireAdmin(request, { permission: "customers.manage", scopeModule: true })
    const quote = await createQuote(parsed.data)
    return NextResponse.json({ quote })
  } catch (error) {
    return apiErrorResponse(error, "Could not save the quote.")
  }
}
