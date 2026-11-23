import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, assertModuleAccess, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { closeShift } from "@/lib/shifts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  countedCash: z.number().min(0).max(100000000),
  notes: z.string().trim().max(500).default(""),
})

interface Context {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Context) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Enter the counted cash." },
      { status: 400 }
    )
  }

  try {
    const { id } = await params
    const admin = await requireAdmin(request, { permission: "pos.shift.manage" })
    const shift = await closeShift({
      shiftId: id,
      adminId: admin.id,
      countedCash: parsed.data.countedCash,
      notes: parsed.data.notes,
    })
    assertModuleAccess(admin, shift.module)

    await writeAudit({
      adminId: admin.id,
      module: shift.module,
      action: "shift.close",
      entityType: "shift",
      entityId: shift.id,
      after: {
        shiftNumber: shift.shiftNumber,
        expectedCash: shift.expectedCash,
        countedCash: shift.countedCash,
        variance: shift.variance,
      },
    })

    return NextResponse.json({ shift })
  } catch (error) {
    return apiErrorResponse(error, "Could not close the shift.")
  }
}
