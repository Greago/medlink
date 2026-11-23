import { NextResponse } from "next/server"
import { z } from "zod"
import { subscribeToNewsletter } from "@/lib/db"
import { getActiveModule } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({ email: z.string().email().max(200) })

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  try {
    const module = await getActiveModule()
    await subscribeToNewsletter(parsed.data.email.toLowerCase(), module)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Newsletter signup failed:", error)
    return NextResponse.json({ error: "Could not save your subscription." }, { status: 500 })
  }
}
