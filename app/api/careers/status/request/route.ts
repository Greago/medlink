import { NextResponse } from "next/server"
import { z } from "zod"
import { requestStatusLink } from "@/lib/careers-public"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  reference: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(160),
})

export async function POST(request: Request) {
  // Generic response: never reveal whether the reference/email exists.
  try {
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (parsed.success) {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
      await requestStatusLink(parsed.data.reference, parsed.data.email, ip)
    }
  } catch {
    // swallow: response stays generic
  }
  return NextResponse.json({ ok: true, message: "If that reference and email match an application, a secure link has been sent. It expires in 30 minutes." })
}