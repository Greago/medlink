import { NextResponse } from "next/server"
import { z } from "zod"
import { setModuleCookie } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  module: z.enum(["medical", "pharmacy"]),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Please choose a valid module." }, { status: 400 })
  }

  const response = NextResponse.json({ module: parsed.data.module })
  setModuleCookie(response, parsed.data.module)
  return response
}
