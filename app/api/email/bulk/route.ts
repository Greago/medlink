import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { buildCataloguePdf } from "@/lib/catalogue-pdf"
import { ensureSchema, getBulkEmails, getProducts, logBulkEmail } from "@/lib/db"
import { getModule } from "@/lib/modules/registry"
import { getActiveModule } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_RECIPIENTS = 100
const CONCURRENCY = 5

const schema = z.object({
  recipients: z.array(z.string().trim().email().max(254)).min(1).max(MAX_RECIPIENTS),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(10000),
  attachCatalogue: z.boolean().default(false),
})

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

function formatMessage(message: string): string {
  return escapeHtml(message).replace(/\r?\n/g, "<br />")
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request, {
      permissions: ["settings.manage", "customers.manage"],
      scopeModule: true,
    })
    await ensureSchema()
    const sends = await getBulkEmails()
    return NextResponse.json({ sends })
  } catch (error) {
    return apiErrorResponse(error, "Could not load bulk email history.")
  }
}

async function sendOne(
  apiKey: string,
  from: string,
  recipient: string,
  subject: string,
  html: string,
  attachment?: { filename: string; content: string }
): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject,
        html,
        ...(attachment ? { attachments: [attachment] } : {}),
      }),
    })

    if (!response.ok) {
      const details = await response.text()
      console.error(`Bulk email failed for ${recipient}:`, details)
      return false
    }

    return true
  } catch (error) {
    console.error(`Bulk email failed for ${recipient}:`, error)
    return false
  }
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide at least one valid recipient, a subject, and a message (max 100 recipients)." },
      { status: 400 }
    )
  }

  const recipients = Array.from(
    new Map(parsed.data.recipients.map((email) => [email.toLowerCase(), email])).values()
  )
  if (recipients.length > MAX_RECIPIENTS) {
    return NextResponse.json({ error: `A maximum of ${MAX_RECIPIENTS} unique recipients is allowed.` }, { status: 400 })
  }

  try {
    await requireAdmin(request, {
      permissions: ["settings.manage", "customers.manage"],
      scopeModule: true,
    })
    await ensureSchema()
    const module = await getActiveModule()
    const moduleInfo = getModule(module)

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Email delivery is not configured on the server." }, { status: 500 })
    }

    const from =
      process.env.BULK_FROM_EMAIL ||
      process.env.CATALOGUE_FROM_EMAIL ||
      "Medlink Expedites <bulk@medlinkexpedite.co.ke>"

    let attachment: { filename: string; content: string } | undefined
    if (parsed.data.attachCatalogue) {
      const products = await getProducts(module)
      const pdf = await buildCataloguePdf(products, undefined, module)
      attachment = {
        filename: `medlink-${module}-catalogue.pdf`,
        content: Buffer.from(pdf).toString("base64"),
      }
    }

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0f2b2e; max-width: 620px;">
        <h1 style="color: #0c1f1d;">${escapeHtml(parsed.data.subject)}</h1>
        <div style="font-size: 15px; line-height: 1.6;">${formatMessage(parsed.data.message)}</div>
        <p style="color: #5f7a7d; margin-top: 32px;">
          Medlink Expedites<br />${moduleInfo.footerDescriptor}<br />info@medlinkexpedite.co.ke
        </p>
      </div>
    `

    const results: boolean[] = []
    for (let index = 0; index < recipients.length; index += CONCURRENCY) {
      const batch = recipients.slice(index, index + CONCURRENCY)
      const settled = await Promise.all(
        batch.map((recipient) => sendOne(apiKey, from, recipient, parsed.data.subject, html, attachment))
      )
      results.push(...settled)
    }

    const sentCount = results.filter(Boolean).length
    const failedCount = results.length - sentCount

    await logBulkEmail({
      subject: parsed.data.subject,
      body: parsed.data.message,
      recipientCount: recipients.length,
      sentCount,
      failedCount,
      attachedCatalogue: parsed.data.attachCatalogue,
    })

    if (sentCount === 0) {
      return NextResponse.json(
        { error: "No emails were delivered. Check the sender domain and recipient addresses." },
        { status: 502 }
      )
    }

    return NextResponse.json({
      total: recipients.length,
      sentCount,
      failedCount,
      attachCatalogue: parsed.data.attachCatalogue,
    })
  } catch (error) {
    return apiErrorResponse(error, "Could not send bulk email. Please try again.")
  }
}
