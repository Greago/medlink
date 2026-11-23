import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { listAgents, saveAgent } from "@/lib/agents"
import { isAppModule } from "@/lib/modules/types"
import { parseModuleFromRequest } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const createSchema = z.object({
  adminUserId: z.string().uuid().nullable().optional(),
  module: z.enum(["medical", "pharmacy"]),
  type: z.enum(["shop", "field"]).default("field"),
  branchId: z.string().uuid().nullable().optional(),
  territory: z.string().trim().max(180).default(""),
  status: z.enum(["active", "inactive"]).default("active"),
  commissionBasis: z.enum(["sales", "profit", "flat"]).default("sales"),
  commissionValue: z.number().min(0).max(1000000).default(0),
  monthlyTarget: z.number().min(0).max(100000000).default(0),
  targetBonus: z.number().min(0).max(100000000).default(0),
  photoUrl: z.string().trim().max(500).default(""),
  phone: z.string().trim().max(50).default(""),
  email: z.string().trim().email().or(z.literal("")).default(""),
  idNumber: z.string().trim().max(80).default(""),
})

export async function GET(request: Request) {
  try {
    await requireAdmin(request, {
      permissions: ["agents.manage", "sales.read.all", "commission.manage"],
      scopeModule: true,
    })
    const requested = new URL(request.url).searchParams.get("module")
    const module = isAppModule(requested) ? requested : parseModuleFromRequest(request)
    const agents = await listAgents({ module })
    return NextResponse.json({ agents })
  } catch (error) {
    return apiErrorResponse(error, "Could not load agents.")
  }
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid agent details." },
      { status: 400 }
    )
  }

  try {
    const admin = await requireAdmin(request, { module: parsed.data.module, permission: "agents.manage" })
    const agent = await saveAgent(parsed.data)
    await writeAudit({
      adminId: admin.id,
      module: agent.module,
      action: "agent.create",
      entityType: "agent",
      entityId: agent.id,
      after: { type: agent.type, territory: agent.territory, adminUserId: agent.adminUserId },
    })
    return NextResponse.json({ agent }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not save the agent.")
  }
}
