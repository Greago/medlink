import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { listOutbox, processOutbox, retryOutboxEmail } from "@/lib/email-outbox"
import { enqueueMissingSaleEmails } from "@/lib/sale-documents"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("process"), limit: z.number().int().min(1).max(50).default(10) }),
  z.object({ action: z.literal("retry"), id: z.string().uuid() }),
])

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permission: "settings.manage" })
    await enqueueMissingSaleEmails(20)
    const messages = await listOutbox()
    return NextResponse.json({ messages })
  } catch (error) {
    return apiErrorResponse(error, "Could not load the email outbox.")
  }
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid outbox action." }, { status: 400 })
  }

  try {
    const admin = await requireAdmin(request, { permission: "settings.manage" })
    if (parsed.data.action === "process") {
      const result = await processOutbox(parsed.data.limit)
      return NextResponse.json({ result })
    }

    const updated = await retryOutboxEmail(parsed.data.id)
    if (!updated) return NextResponse.json({ error: "Email not found." }, { status: 404 })
    await writeAudit({
      adminId: admin.id,
      action: "email.retry",
      entityType: "email_outbox",
      entityId: parsed.data.id,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not update the email outbox.")
  }
}
