import { NextResponse } from "next/server"
import { z } from "zod"
import { getOrCreateCustomerId } from "@/lib/customer"
import { toggleLike } from "@/lib/db"
import { getActiveModule } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({ productId: z.string().min(1) })

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid like request." }, { status: 400 })
  }

  try {
    const [customerId, module] = await Promise.all([getOrCreateCustomerId(), getActiveModule()])
    const likes = await toggleLike(customerId, parsed.data.productId, module)
    return NextResponse.json({ likes })
  } catch (error) {
    console.error("Like toggle failed:", error)
    return NextResponse.json({ error: "Could not update saved items." }, { status: 500 })
  }
}
