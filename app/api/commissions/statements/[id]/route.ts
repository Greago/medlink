import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, assertModuleAccess, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { getStatement, updateStatementStatus } from "@/lib/commissions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  action: z.enum(["approve", "pay"]),
})

interface Context {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Context) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid statement action." }, { status: 400 })
  }

  try {
    const { id } = await params
    const admin = await requireAdmin(request, {
      permission: parsed.data.action === "approve" ? "commission.manage" : "finance.manage",
    })
    const existing = await getStatement(id)
    if (!existing) return NextResponse.json({ error: "Statement not found." }, { status: 404 })
    assertModuleAccess(admin, existing.module)

    const statement = await updateStatementStatus(
      id,
      parsed.data.action === "approve" ? "approved" : "paid",
      admin.id
    )
    await writeAudit({
      adminId: admin.id,
      module: existing.module,
      action: parsed.data.action === "approve" ? "commission.approve" : "commission.pay",
      entityType: "commission_statement",
      entityId: id,
      after: { status: statement?.status },
    })
    return NextResponse.json({ statement })
  } catch (error) {
    return apiErrorResponse(error, "Could not update the statement.")
  }
}
