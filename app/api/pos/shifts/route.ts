import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { isAppModule } from "@/lib/modules/types"
import { parseModuleFromRequest } from "@/lib/modules/server"
import { listShifts, getCurrentShift, openShift } from "@/lib/shifts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const openSchema = z.object({
  module: z.enum(["medical", "pharmacy"]).optional(),
  branchId: z.string().uuid().nullable().optional(),
  openingFloat: z.number().min(0).max(1000000),
  notes: z.string().trim().max(500).default(""),
})

export async function GET(request: Request) {
  try {
    const requested = new URL(request.url).searchParams.get("module")
    const module = isAppModule(requested) ? requested : parseModuleFromRequest(request)
    const admin = await requireAdmin(request, {
      module,
      permissions: ["pos.shift.manage", "pos.access"],
    })

    const [current, shifts] = await Promise.all([
      getCurrentShift(module, admin.id),
      listShifts({
        module,
        cashierId: admin.role === "cashier" || admin.role === "field_agent" ? admin.id : undefined,
        limit: 100,
      }),
    ])

    return NextResponse.json({ current, shifts })
  } catch (error) {
    return apiErrorResponse(error, "Could not load shifts.")
  }
}

export async function POST(request: Request) {
  const parsed = openSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid shift details." },
      { status: 400 }
    )
  }

  try {
    const module = parsed.data.module || parseModuleFromRequest(request)
    const admin = await requireAdmin(request, { module, permission: "pos.shift.manage" })
    const shift = await openShift({
      module,
      cashierId: admin.id,
      branchId: parsed.data.branchId || admin.branchId || null,
      openingFloat: parsed.data.openingFloat,
      notes: parsed.data.notes,
    })

    await writeAudit({
      adminId: admin.id,
      module,
      action: "shift.open",
      entityType: "shift",
      entityId: shift.id,
      after: { shiftNumber: shift.shiftNumber, openingFloat: shift.openingFloat },
    })

    return NextResponse.json({ shift }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not open the shift.")
  }
}
