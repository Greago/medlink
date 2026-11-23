import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { createSupplier, listSuppliers } from "@/lib/finance"
import { isAppModule } from "@/lib/modules/types"
import { parseModuleFromRequest } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  module: z.enum(["medical", "pharmacy"]).optional(),
  name: z.string().trim().min(1).max(180),
  phone: z.string().trim().max(50).default(""),
  email: z.string().trim().email().or(z.literal("")).default(""),
  address: z.string().trim().max(300).default(""),
  kraPin: z.string().trim().max(80).default(""),
})

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permissions: ["finance.read", "finance.manage", "stock.manage"] })
    const requested = new URL(request.url).searchParams.get("module")
    const module = isAppModule(requested) ? requested : parseModuleFromRequest(request)
    const suppliers = await listSuppliers(module)
    return NextResponse.json({ suppliers })
  } catch (error) {
    return apiErrorResponse(error, "Could not load suppliers.")
  }
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid supplier details." },
      { status: 400 }
    )
  }

  try {
    const module = parsed.data.module || parseModuleFromRequest(request)
    const admin = await requireAdmin(request, { module, permission: "finance.manage" })
    const supplier = await createSupplier({ ...parsed.data, module })
    await writeAudit({
      adminId: admin.id,
      module,
      action: "supplier.create",
      entityType: "supplier",
      entityId: supplier.id,
      after: { name: supplier.name },
    })
    return NextResponse.json({ supplier }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not save the supplier.")
  }
}
