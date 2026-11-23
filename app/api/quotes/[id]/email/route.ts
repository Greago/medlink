import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { formatPrice } from "@/lib/catalogue"
import { getQuote, updateInquiryStatus, updateQuoteStatus } from "@/lib/db"
import { buildQuotePdf } from "@/lib/quote-pdf"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  email: z.string().trim().email().max(254).optional(),
})

interface Context {
  params: Promise<{ id: string }>
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }
    return entities[character]
  })
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const [{ readFile }, { join }] = await Promise.all([import("fs/promises"), import("path")])
    const logo = await readFile(join(process.cwd(), "public", "teallogo.png"))
    return `data:image/png;base64,${logo.toString("base64")}`
  } catch (error) {
    console.error("Could not load quote logo:", error)
    return null
  }
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body ?? {})
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 })
  }

  try {
    await requireAdmin(request, { permission: "customers.manage", scopeModule: true })
    const quote = await getQuote(id)
    if (!quote) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 })
    }

    const recipient = parsed.data.email || quote.clientEmail
    if (!recipient) {
      return NextResponse.json({ error: "This quote has no recipient email address." }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Email delivery is not configured on the server." }, { status: 500 })
    }

    const pdf = await buildQuotePdf(quote, await loadLogoDataUrl())
    const pdfBase64 = Buffer.from(pdf).toString("base64")
    const from =
      process.env.QUOTE_FROM_EMAIL || process.env.CATALOGUE_FROM_EMAIL || "Medlink Expedites <quotes@medlinkexpedite.co.ke>"

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: `Your quotation ${quote.quoteNumber} - Medlink Expedites`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #0f2b2e; max-width: 620px;">
            <h1 style="color: #0c1f1d;">Your quotation is ready</h1>
            <p>Hello ${escapeHtml(quote.clientName)},</p>
            <p>Please find attached quotation <strong>${escapeHtml(quote.quoteNumber)}</strong> for ${escapeHtml(quote.clientCompany)}.</p>
            <p><strong>Total:</strong> ${formatPrice(quote.totalPrice)}<br />
            <strong>Valid until:</strong> ${new Date(quote.validUntil).toLocaleDateString("en-KE")}</p>
            <p>If you have any questions or would like to confirm the order, simply reply to this email.</p>
            <p style="color: #5f7a7d; margin-top: 32px;">
              Medlink Expedites<br />Medical Equipment Supply<br />info@medlinkexpedite.co.ke
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `Quote-${quote.quoteNumber}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    })

    if (!emailResponse.ok) {
      const details = await emailResponse.text()
      console.error("Resend quote email failed:", details)
      return NextResponse.json({ error: "The quote could not be emailed. Please try again." }, { status: 502 })
    }

    const updated = (await updateQuoteStatus(id, "Sent")) || quote

    if (quote.inquiryId) {
      try {
        await updateInquiryStatus(quote.inquiryId, "Quoted")
      } catch (error) {
        console.error("Could not update inquiry status after quote email:", error)
      }
    }

    return NextResponse.json({ quote: updated, emailSent: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not send the quote. Please try again.")
  }
}
