import { randomUUID } from "crypto"
import { cookies } from "next/headers"
import { ensureSchema, query } from "@/lib/db"

export const CUSTOMER_COOKIE = "medlink_customer_id"

export async function getOrCreateCustomerId(): Promise<string> {
  await ensureSchema()

  const cookieStore = await cookies()
  let customerId = cookieStore.get(CUSTOMER_COOKIE)?.value

  if (!customerId || !/^[0-9a-f-]{36}$/i.test(customerId)) {
    customerId = randomUUID()
    cookieStore.set(CUSTOMER_COOKIE, customerId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  await query("INSERT INTO customers (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [customerId])
  return customerId
}
