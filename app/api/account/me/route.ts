import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/account-auth"
import { getOrdersForUser } from "@/lib/db"
import { getActiveModule } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const [user, module] = await Promise.all([getCurrentUser(request), getActiveModule()])
    const orders = user ? await getOrdersForUser(user.id, module) : []
    return NextResponse.json({ user, orders })
  } catch (error) {
    console.error("Could not load account:", error)
    return NextResponse.json({ error: "Could not load your account." }, { status: 500 })
  }
}
