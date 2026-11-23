import { NextResponse } from "next/server"
import { z } from "zod"
import { buildCataloguePdf } from "@/lib/catalogue-pdf"
import { ensureSchema, getProducts, logCatalogueRequest } from "@/lib/db"
import { getModule } from "@/lib/modules/registry"
import { getActiveModule } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const requestSchema = z.object({
  email: z.string().trim().email().max(254),
})

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 5
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(key: string) {
  const now = Date.now()

  for (const [storedKey, value] of rateLimits) {
    if (value.resetAt <= now) rateLimits.delete(storedKey)
  }

  const current = rateLimits.get(key)
  if (!current) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  current.count += 1
  return current.count > RATE_LIMIT_MAX
}

export async function POST(request: Request) {
  let payload: z.infer<typeof requestSchema>

  try {
    payload = requestSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 })
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  if (isRateLimited(clientIp)) {
    return NextResponse.json({ error: "Too many requests. Please try again in a few minutes." }, { status: 429 })
  }

  try {
    await ensureSchema()
    const module = await getActiveModule()
    const moduleInfo = getModule(module)
    const products = await getProducts(module)
    const origin = new URL(request.url).origin
    const pdf = await buildCataloguePdf(products, origin, module)
    const pdfBase64 = Buffer.from(pdf).toString("base64")

    let emailSent = false
    let warning: string | undefined

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      warning = "Email delivery is not configured on the server."
    } else {
      const from = process.env.CATALOGUE_FROM_EMAIL || "Medlink Expedites <catalogue@medlinkexpedite.co.ke>"

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [payload.email],
          subject: `Medlink Expedites - ${moduleInfo.label} Catalogue`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #0f2b2e; max-width: 600px;">
              <h1 style="color: #0c1f1d;">Your ${moduleInfo.label} catalogue is ready</h1>
              <p>Hello,</p>
              <p>Thank you for requesting our ${moduleInfo.label.toLowerCase()} catalogue. The PDF is attached to this email.</p>
              <p>It contains ${products.length} ${moduleInfo.itemLabel} across our current ${moduleInfo.label.toLowerCase()} range.</p>
              <p>If you have any questions or would like a formal quote, reply to this email or contact us at info@medlinkexpedite.co.ke.</p>
              <p style="color: #5f7a7d; margin-top: 32px;">Medlink Expedites<br />${moduleInfo.footerDescriptor}</p>
            </div>
          `,
          attachments: [
            {
              filename: `medlink-${module}-catalogue.pdf`,
              content: pdfBase64,
            },
          ],
        }),
      })

      if (emailResponse.ok) {
        emailSent = true
      } else {
        const details = await emailResponse.text()
        console.error("Resend catalogue email failed:", details)
        warning = "The catalogue was generated, but the email could not be delivered."
      }
    }

    try {
      await logCatalogueRequest(payload.email, products.length, module)
    } catch (error) {
      console.error("Could not log catalogue request:", error)
    }

    return NextResponse.json({ pdfBase64, emailSent, count: products.length, warning })
  } catch (error) {
    console.error("Catalogue generation failed:", error)
    return NextResponse.json({ error: "Could not generate the catalogue. Please try again." }, { status: 500 })
  }
}
