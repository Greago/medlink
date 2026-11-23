import { NextResponse } from "next/server"
import { apiErrorResponse, assertModuleAccess, requireAdmin } from "@/lib/api-auth"
import { getShiftReport } from "@/lib/shifts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const admin = await requireAdmin(request, {
      permissions: ["pos.shift.manage", "reports.read", "sales.read.all"],
    })
    const report = await getShiftReport(id)
    if (!report) return NextResponse.json({ error: "Shift not found." }, { status: 404 })
    assertModuleAccess(admin, report.shift.module)
    return NextResponse.json({ report })
  } catch (error) {
    return apiErrorResponse(error, "Could not load the shift report.")
  }
}
