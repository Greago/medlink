import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { listLedgerEntries } from "@/lib/finance"
import { isAppModule } from "@/lib/modules/types"
import { parseModuleFromRequest } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permissions: ["finance.read", "reports.read"] })
    const params = new URL(request.url).searchParams
    const requested = params.get("module")
    const module = isAppModule(requested) ? requested : parseModuleFromRequest(request)
    const entries = await listLedgerEntries({
      module,
      accountCode: params.get("account") || undefined,
      from: params.get("from") || undefined,
      to: params.get("to") || undefined,
      limit: Number(params.get("limit") || 300),
    })
    return NextResponse.json({ entries })
  } catch (error) {
    return apiErrorResponse(error, "Could not load the ledger.")
  }
}
