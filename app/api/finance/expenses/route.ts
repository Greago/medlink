import { NextResponse } from "next/server"
import { z } from "zod"
import { apiErrorResponse, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { createExpense, listExpenses } from "@/lib/finance"
import { isAppModule } from "@/lib/modules/types"
import { parseModuleFromRequest } from "@/lib/modules/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  module: z.enum(["medical", "pharmacy"]).optional(),
  category: z.string().trim().min(1).max(120).default("general"),
  description: z.string().trim().max(500).default(""),
  amount: z.number().positive().max(100000000),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplierId: z.string().uuid().nullable().optional(),
  reference: z.string().trim().max(120).default(""),
  receiptUrl: z.string().trim().max(500).default(""),
  paidFrom: z.enum(["cash", "mpesa", "bank", "card"]).default("cash"),
})

export async function GET(request: Request) {
  try {
    await requireAdmin(request, { permissions: ["finance.read", "finance.manage"] })
    const requested = new URL(request.url).searchParams.get("module")
    const module = isAppModule(requested) ? requested : parseModuleFromRequest(request)
    const expenses = await listExpenses({ module })
    return NextResponse.json({ expenses })
  } catch (error) {
    return apiErrorResponse(error, "Could not load expenses.")
  }
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid expense details." },
      { status: 400 }
    )
  }

  try {
    const module = parsed.data.module || parseModuleFromRequest(request)
    const admin = await requireAdmin(request, { module, permission: "finance.manage" })
    const expense = await createExpense({ ...parsed.data, module, adminId: admin.id })
    await writeAudit({
      adminId: admin.id,
      module,
      action: "expense.create",
      entityType: "expense",
      entityId: expense.id,
      after: { amount: expense.amount, category: expense.category, paidFrom: parsed.data.paidFrom },
    })
    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    return apiErrorResponse(error, "Could not record the expense.")
  }
}
