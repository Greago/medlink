import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, assertModuleAccess, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { deleteAgent, getAgent, saveAgent } from "@/lib/agents"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const updateSchema = z.object({
  adminUserId: z.string().uuid().nullable().optional(),
  module: z.enum(["medical", "pharmacy"]).optional(),
  type: z.enum(["shop", "field"]).optional(),
  branchId: z.string().uuid().nullable().optional(),
  territory: z.string().trim().max(180).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  commissionBasis: z.enum(["sales", "profit", "flat"]).optional(),
  commissionValue: z.number().min(0).max(1000000).optional(),
  monthlyTarget: z.number().min(0).max(100000000).optional(),
  targetBonus: z.number().min(0).max(100000000).optional(),
  photoUrl: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(50).optional(),
  email: z.string().trim().email().or(z.literal("")).optional(),
  idNumber: z.string().trim().max(80).optional(),
})

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params
    await requireAdmin(request, { permissions: ["agents.manage", "commission.manage"] })
    const agent = await getAgent(id)
    if (!agent) return NextResponse.json({ error: "Agent not found." }, { status: 404 })
    return NextResponse.json({ agent })
  } catch (error) {
    return apiErrorResponse(error, "Could not load the agent.")
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid agent details." },
      { status: 400 }
    )
  }

  try {
    const { id } = await params
    const admin = await requireAdmin(request, { permission: "agents.manage" })
    const existing = await getAgent(id)
    if (!existing) return NextResponse.json({ error: "Agent not found." }, { status: 404 })
    assertModuleAccess(admin, existing.module)

    const agent = await saveAgent({
      ...existing,
      ...parsed.data,
      id,
      module: parsed.data.module || existing.module,
      type: parsed.data.type || existing.type,
      status: parsed.data.status || existing.status,
      commissionBasis: parsed.data.commissionBasis || existing.commissionBasis,
    })
    await writeAudit({
      adminId: admin.id,
      module: agent.module,
      action: "agent.update",
      entityType: "agent",
      entityId: agent.id,
      after: parsed.data,
    })
    return NextResponse.json({ agent })
  } catch (error) {
    return apiErrorResponse(error, "Could not update the agent.")
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const admin = await requireAdmin(request, { permission: "agents.manage" })
    const existing = await getAgent(id)
    if (!existing) return NextResponse.json({ error: "Agent not found." }, { status: 404 })
    assertModuleAccess(admin, existing.module)
    await deleteAgent(id)
    await writeAudit({
      adminId: admin.id,
      module: existing.module,
      action: "agent.delete",
      entityType: "agent",
      entityId: id,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not delete the agent.")
  }
}
