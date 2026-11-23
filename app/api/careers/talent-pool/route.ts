import { NextResponse } from "next/server"
import { z } from "zod"
import { createTalentPoolEntry, checkRateLimit } from "@/lib/careers-public"
import { hashIp } from "@/lib/careers-applications"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(24).optional().default(""),
  interest: z.string().trim().max(200).optional().default(""),
  consent: z.literal("true"),
  website: z.string().max(0).optional().default(""),
})

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const raw: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") raw[key] = value
    }
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Please provide your name, a valid email and consent." }, { status: 400 })
    }
    if (parsed.data.website) return NextResponse.json({ ok: true })

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const ipHash = hashIp(ip)
    if (!(await checkRateLimit(`talent:${ipHash}`, 5, 3600))) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }

    let cv: { filename: string; buffer: Buffer } | null = null
    const file = formData.get("cv")
    if (file instanceof File && file.size > 0) {
      cv = { filename: file.name, buffer: Buffer.from(await file.arrayBuffer()) }
    }

    await createTalentPoolEntry({
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      interest: parsed.data.interest,
      consent: true,
      ipHash,
      cv,
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not join the talent pool." }, { status: 400 })
  }
}