import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { getFinanceSummary } from "@/lib/finance"
import { isAppModule } from "@/lib/modules/types"
import { parseModuleFromRequest } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permissions: ["finance.read", "reports.read", "profit.read"] })
    const params = new URL(request.url).searchParams
    const requested = params.get("module")
    const module = isAppModule(requested) ? requested : parseModuleFromRequest(request)
    const summary = await getFinanceSummary({
      module,
      from: params.get("from") || undefined,
      to: params.get("to") || undefined,
    })
    return NextResponse.json({ summary })
  } catch (error) {
    return apiErrorResponse(error, "Could not load the finance summary.")
  }
}
