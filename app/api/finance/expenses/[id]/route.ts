import { NextResponse } from "next/server"
import { apiErrorResponse, assertModuleAccess, requireAdmin } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { listExpenses, voidExpense } from "@/lib/finance"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const admin = await requireAdmin(request, { permission: "finance.manage" })
    const expenses = await listExpenses({ module: "medical" })
    const all = [...expenses, ...(await listExpenses({ module: "pharmacy" }))]
    const expense = all.find((item) => item.id === id)
    if (!expense) return NextResponse.json({ error: "Expense not found." }, { status: 404 })
    assertModuleAccess(admin, expense.module)

    const updated = await voidExpense(id, admin.id)
    if (!updated) return NextResponse.json({ error: "This expense is already voided." }, { status: 400 })
    await writeAudit({
      adminId: admin.id,
      module: expense.module,
      action: "expense.void",
      entityType: "expense",
      entityId: id,
      after: { amount: expense.amount, category: expense.category },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiErrorResponse(error, "Could not void the expense.")
  }
}
