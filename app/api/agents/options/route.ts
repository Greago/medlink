import { NextResponse } from "next/server"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { listAgentAdminOptions } from "@/lib/agents"
import { isAppModule } from "@/lib/modules/types"
import { parseModuleFromRequest } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permissions: ["agents.manage", "pos.sell"] })
    const requested = new URL(request.url).searchParams.get("module")
    const module = isAppModule(requested) ? requested : parseModuleFromRequest(request)
    const admins = await listAgentAdminOptions(module)
    return NextResponse.json({ admins })
  } catch (error) {
    return apiErrorResponse(error, "Could not load staff options.")
  }
}
