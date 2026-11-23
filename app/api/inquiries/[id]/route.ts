import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { deleteInquiry, updateInquiryStatus } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  status: z.enum(["New", "Quoted", "Pending", "Completed"]),
})

interface Context {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 })
  }

  try {
    await requireAdmin(request, { permission: "customers.manage", scopeModule: true })
    await updateInquiryStatus(id, parsed.data.status)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not update the inquiry.")
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { id } = await params

  try {
    await requireAdmin(request, { permission: "customers.manage", scopeModule: true })
    await deleteInquiry(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not delete the inquiry.")
  }
}
