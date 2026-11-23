import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { query } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params

  try {
    await requireAdmin(request, { permission: "customers.manage", scopeModule: true })
    await query("DELETE FROM quotes WHERE id = $1", [id])
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not delete the quote.")
  }
}
