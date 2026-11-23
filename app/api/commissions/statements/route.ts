import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { generateStatement, listStatements } from "@/lib/commissions"
import { isAppModule } from "@/lib/modules/types"
import { parseModuleFromRequest } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const generateSchema = z.object({
  agentId: z.string().uuid(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permissions: ["commission.manage", "finance.read", "reports.read"] })
    const requested = new URL(request.url).searchParams.get("module")
    const module = isAppModule(requested) ? requested : parseModuleFromRequest(request)
    const statements = await listStatements({ module })
    return NextResponse.json({ statements })
  } catch (error) {
    return apiErrorResponse(error, "Could not load commission statements.")
  }
}

export async function POST(request: Request) {
  const parsed = generateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid statement period." },
      { status: 400 }
    )
  }

  try {
    const admin = await requireAdmin(request, { permission: "commission.manage" })
    if (parsed.data.periodEnd < parsed.data.periodStart) {
      return NextResponse.json({ error: "End date must be after the start date." }, { status: 400 })
    }
    const statement = await generateStatement(parsed.data)
    await writeAudit({
      adminId: admin.id,
      module: statement.module,
      action: "commission.generate",
      entityType: "commission_statement",
      entityId: statement.id,
      after: {
        agentId: statement.agentId,
        periodStart: statement.periodStart,
        periodEnd: statement.periodEnd,
        commissionAmount: statement.commissionAmount,
      },
    })
    return NextResponse.json({ statement }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not generate the commission statement.")
  }
}
