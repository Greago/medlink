import { NextResponse } from "next/server"
import { z } from "zod"
import { createInquiry } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  id: z.string().min(1),
  companyName: z.string().min(1),
  contactPerson: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  products: z.array(z.string()).default([]),
  quantity: z.number().int().min(1).default(1),
  additionalNotes: z.string().default(""),
  status: z.enum(["New", "Quoted", "Pending", "Completed"]).default("New"),
  createdAt: z.string(),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid inquiry." }, { status: 400 })
  }

  try {
    const inquiry = await createInquiry(parsed.data)
    return NextResponse.json({ inquiry })
  } catch (error) {
    console.error("Inquiry create failed:", error)
    return NextResponse.json({ error: "Could not save the inquiry." }, { status: 500 })
  }
}
