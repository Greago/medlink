import { randomUUID } from "crypto"
import { ensureSchema, query, withTransaction } from "@/lib/db"
import type { AppModule } from "@/lib/modules/types"
import type { PoolClient } from "pg"

function num(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const CASH_ACCOUNTS = new Set(["cash", "mpesa", "bank", "card"])

async function postEntry(
  client: PoolClient,
  entry: {
    module: AppModule
    accountCode: string
    description: string
    reference: string
    debit?: number
    credit?: number
    adminId: string
    expenseId?: string
    supplierPaymentId?: string
  }
): Promise<void> {
  await client.query(
    `INSERT INTO ledger_entries
       (id, module, account_code, description, reference, debit, credit, expense_id,
        supplier_payment_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      randomUUID(),
      entry.module,
      entry.accountCode,
      entry.description,
      entry.reference,
      entry.debit || 0,
      entry.credit || 0,
      entry.expenseId || null,
      entry.supplierPaymentId || null,
      entry.adminId,
    ]
  )
}

export interface Expense {
  id: string
  module: AppModule
  category: string
  description: string
  amount: number
  expenseDate: string
  supplierId: string | null
  supplierName?: string
  reference: string
  receiptUrl: string
  isVoid: boolean
  createdAt: string
}

interface ExpenseRow {
  id: string
  module: AppModule
  category: string
  description: string
  amount: string | number
  expense_date: string
  supplier_id: string | null
  supplier_name?: string
  reference: string
  receipt_url: string
  is_void: boolean
  created_at: string
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    module: row.module,
    category: row.category,
    description: row.description,
    amount: num(row.amount),
    expenseDate: String(row.expense_date).slice(0, 10),
    supplierId: row.supplier_id,
    supplierName: row.supplier_name || undefined,
    reference: row.reference || "",
    receiptUrl: row.receipt_url || "",
    isVoid: Boolean(row.is_void),
    createdAt: row.created_at,
  }
}

export async function listExpenses(filters: { module: AppModule; limit?: number }): Promise<Expense[]> {
  await ensureSchema()
  const result = await query<ExpenseRow>(
    `SELECT e.*, s.name AS supplier_name
     FROM expenses e LEFT JOIN suppliers s ON s.id = e.supplier_id
     WHERE e.module = $1
     ORDER BY e.expense_date DESC, e.created_at DESC
     LIMIT $2`,
    [filters.module, Math.min(Math.max(filters.limit || 200, 1), 500)]
  )
  return result.rows.map(mapExpense)
}

export async function createExpense(input: {
  module: AppModule
  category: string
  description: string
  amount: number
  expenseDate: string
  supplierId?: string | null
  reference?: string
  receiptUrl?: string
  paidFrom: string
  adminId: string
}): Promise<Expense> {
  await ensureSchema()
  return withTransaction(async (client) => {
    const amount = num(input.amount)
    if (amount <= 0) throw new Error("Enter an expense amount greater than zero.")
    const id = randomUUID()
    const result = await client.query<ExpenseRow>(
      `INSERT INTO expenses
         (id, module, category, description, amount, expense_date, supplier_id, reference,
          receipt_url, paid_from_account, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        id,
        input.module,
        input.category || "general",
        input.description || "",
        amount,
        input.expenseDate,
        input.supplierId || null,
        input.reference || "",
        input.receiptUrl || "",
        CASH_ACCOUNTS.has(input.paidFrom) ? input.paidFrom : "cash",
        input.adminId,
      ]
    )
    const account = CASH_ACCOUNTS.has(input.paidFrom) ? input.paidFrom : "cash"
    await postEntry(client, {
      module: input.module,
      accountCode: "expenses",
      description: input.description || input.category,
      reference: input.reference || id,
      debit: amount,
      adminId: input.adminId,
      expenseId: id,
    })
    await postEntry(client, {
      module: input.module,
      accountCode: account,
      description: `Payment for ${input.category}`,
      reference: input.reference || id,
      credit: amount,
      adminId: input.adminId,
      expenseId: id,
    })
    return mapExpense(result.rows[0])
  })
}

export async function voidExpense(id: string, adminId: string): Promise<boolean> {
  await ensureSchema()
  return withTransaction(async (client) => {
    const result = await client.query<ExpenseRow>("SELECT * FROM expenses WHERE id = $1 FOR UPDATE OF expenses", [id])
    const expense = result.rows[0]
    if (!expense || expense.is_void) return false
    const entries = await client.query<{ account_code: string; debit: string | number; credit: string | number }>(
      "SELECT account_code, debit, credit FROM ledger_entries WHERE expense_id = $1",
      [id]
    )
    for (const entry of entries.rows) {
      await postEntry(client, {
        module: expense.module,
        accountCode: entry.account_code,
        description: `Reversal: ${expense.description || expense.category}`,
        reference: `VOID-${expense.id}`,
        debit: num(entry.credit),
        credit: num(entry.debit),
        adminId,
        expenseId: id,
      })
    }
    await client.query("UPDATE expenses SET is_void = TRUE WHERE id = $1", [id])
    return true
  })
}

export interface Supplier {
  id: string
  module: AppModule
  name: string
  phone: string
  email: string
  address: string
  kraPin: string
  createdAt: string
}

export async function listSuppliers(module: AppModule): Promise<Supplier[]> {
  await ensureSchema()
  const result = await query<Supplier>(
    "SELECT * FROM suppliers WHERE module = $1 ORDER BY name ASC LIMIT 300",
    [module]
  )
  return result.rows
}

export async function createSupplier(input: {
  module: AppModule
  name: string
  phone?: string
  email?: string
  address?: string
  kraPin?: string
}): Promise<Supplier> {
  await ensureSchema()
  if (!input.name.trim()) throw new Error("Enter the supplier name.")
  const result = await query<Supplier>(
    `INSERT INTO suppliers (id, module, name, phone, email, address, kra_pin)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [randomUUID(), input.module, input.name.trim(), input.phone || "", input.email || "", input.address || "", input.kraPin || ""]
  )
  return result.rows[0]
}

export interface Purchase {
  id: string
  module: AppModule
  supplierId: string | null
  supplierName?: string
  reference: string
  items: unknown
  total: number
  amountPaid: number
  purchaseDate: string
  createdAt: string
}

interface PurchaseRow {
  id: string
  module: AppModule
  supplier_id: string | null
  supplier_name?: string
  reference: string
  items: unknown
  total: string | number
  amount_paid: string | number
  purchase_date: string
  created_at: string
}

function mapPurchase(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    module: row.module,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name || undefined,
    reference: row.reference || "",
    items: row.items,
    total: num(row.total),
    amountPaid: num(row.amount_paid),
    purchaseDate: String(row.purchase_date).slice(0, 10),
    createdAt: row.created_at,
  }
}

export async function listPurchases(module: AppModule): Promise<Purchase[]> {
  await ensureSchema()
  const result = await query<PurchaseRow>(
    `SELECT sp.*, s.name AS supplier_name
     FROM supplier_purchases sp LEFT JOIN suppliers s ON s.id = sp.supplier_id
     WHERE sp.module = $1 ORDER BY sp.purchase_date DESC, sp.created_at DESC LIMIT 300`,
    [module]
  )
  return result.rows.map(mapPurchase)
}

export async function createPurchase(input: {
  module: AppModule
  supplierId?: string | null
  reference?: string
  items: { productId?: string; name?: string; quantity?: number; unitCost?: number }[]
  total: number
  amountPaid?: number
  purchaseDate: string
  adminId: string
}): Promise<Purchase> {
  await ensureSchema()
  return withTransaction(async (client) => {
    const total = num(input.total)
    const amountPaid = Math.min(Math.max(num(input.amountPaid), 0), total)
    if (total <= 0) throw new Error("Enter a purchase total greater than zero.")
    const id = randomUUID()
    const result = await client.query<PurchaseRow>(
      `INSERT INTO supplier_purchases
         (id, module, supplier_id, reference, items, total, amount_paid, purchase_date, created_by)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9)
       RETURNING *`,
      [
        id,
        input.module,
        input.supplierId || null,
        input.reference || "",
        JSON.stringify(input.items || []),
        total,
        amountPaid,
        input.purchaseDate,
        input.adminId,
      ]
    )
    await postEntry(client, {
      module: input.module,
      accountCode: "inventory",
      description: `Stock purchase ${input.reference || id}`,
      reference: input.reference || id,
      debit: total,
      adminId: input.adminId,
    })
    await postEntry(client, {
      module: input.module,
      accountCode: "accounts_payable",
      description: `Stock purchase ${input.reference || id}`,
      reference: input.reference || id,
      credit: total,
      adminId: input.adminId,
    })
    if (amountPaid > 0) {
      await postEntry(client, {
        module: input.module,
        accountCode: "accounts_payable",
        description: `Deposit on ${input.reference || id}`,
        reference: input.reference || id,
        debit: amountPaid,
        adminId: input.adminId,
      })
      await postEntry(client, {
        module: input.module,
        accountCode: "bank",
        description: `Deposit on ${input.reference || id}`,
        reference: input.reference || id,
        credit: amountPaid,
        adminId: input.adminId,
      })
    }
    const purchase = mapPurchase(result.rows[0])
    const withName = await query<PurchaseRow>(
      `SELECT sp.*, s.name AS supplier_name
       FROM supplier_purchases sp LEFT JOIN suppliers s ON s.id = sp.supplier_id
       WHERE sp.id = $1`,
      [id]
    )
    return withName.rows[0] ? mapPurchase(withName.rows[0]) : purchase
  })
}

export interface SupplierPayment {
  id: string
  module: AppModule
  supplierId: string | null
  supplierName?: string
  purchaseId: string | null
  amount: number
  method: string
  reference: string
  paidAt: string
  createdAt: string
}

export async function listSupplierPayments(module: AppModule): Promise<SupplierPayment[]> {
  await ensureSchema()
  const result = await query<SupplierPayment>(
    `SELECT sp.*, s.name AS supplier_name
     FROM supplier_payments sp LEFT JOIN suppliers s ON s.id = sp.supplier_id
     WHERE sp.module = $1 ORDER BY sp.paid_at DESC, sp.created_at DESC LIMIT 300`,
    [module]
  )
  return result.rows.map((row) => ({ ...row, supplierName: (row as { supplier_name?: string }).supplier_name }))
}

export async function recordSupplierPayment(input: {
  module: AppModule
  supplierId?: string | null
  purchaseId?: string | null
  amount: number
  method: string
  reference?: string
  paidAt: string
  adminId: string
}): Promise<SupplierPayment> {
  await ensureSchema()
  return withTransaction(async (client) => {
    const amount = num(input.amount)
    if (amount <= 0) throw new Error("Enter a payment amount greater than zero.")
    const id = randomUUID()
    const result = await client.query<SupplierPayment>(
      `INSERT INTO supplier_payments
         (id, module, supplier_id, purchase_id, amount, method, reference, paid_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        id,
        input.module,
        input.supplierId || null,
        input.purchaseId || null,
        amount,
        input.method || "bank",
        input.reference || "",
        input.paidAt,
        input.adminId,
      ]
    )
    const account = CASH_ACCOUNTS.has(input.method) ? input.method : "bank"
    await postEntry(client, {
      module: input.module,
      accountCode: "accounts_payable",
      description: `Supplier payment ${input.reference || id}`,
      reference: input.reference || id,
      debit: amount,
      adminId: input.adminId,
      supplierPaymentId: id,
    })
    await postEntry(client, {
      module: input.module,
      accountCode: account,
      description: `Supplier payment ${input.reference || id}`,
      reference: input.reference || id,
      credit: amount,
      adminId: input.adminId,
      supplierPaymentId: id,
    })
    if (input.purchaseId) {
      await client.query(
        `UPDATE supplier_purchases SET amount_paid = amount_paid + $2 WHERE id = $1`,
        [input.purchaseId, amount]
      )
    }
    return result.rows[0]
  })
}

export interface LedgerEntry {
  id: string
  module: AppModule
  accountCode: string
  accountName: string
  description: string
  reference: string
  debit: number
  credit: number
  createdAt: string
}

export async function listLedgerEntries(filters: {
  module: AppModule
  accountCode?: string
  from?: string
  to?: string
  limit?: number
}): Promise<LedgerEntry[]> {
  await ensureSchema()
  const clauses = ["le.module = $1"]
  const params: unknown[] = [filters.module]
  if (filters.accountCode) {
    params.push(filters.accountCode)
    clauses.push(`le.account_code = $${params.length}`)
  }
  if (filters.from) {
    params.push(filters.from)
    clauses.push(`le.created_at::date >= $${params.length}::date`)
  }
  if (filters.to) {
    params.push(filters.to)
    clauses.push(`le.created_at::date <= $${params.length}::date`)
  }
  params.push(Math.min(Math.max(filters.limit || 300, 1), 1000))
  const result = await query<LedgerEntry & { account_name: string }>(
    `SELECT le.*, la.name AS account_name
     FROM ledger_entries le JOIN ledger_accounts la ON la.code = le.account_code
     WHERE ${clauses.join(" AND ")}
     ORDER BY le.created_at DESC LIMIT $${params.length}`,
    params
  )
  return result.rows.map((row) => ({ ...row, accountName: row.account_name, debit: num(row.debit), credit: num(row.credit) }))
}

export interface FinanceSummary {
  salesTotal: number
  refundTotal: number
  expenseTotal: number
  purchaseTotal: number
  supplierPaymentsTotal: number
  commissionTotal: number
  cashTotal: number
  vatPayable: number
  grossProfit: number
  accounts: { code: string; name: string; type: string; debit: number; credit: number; balance: number }[]
}

export async function getFinanceSummary(filters: {
  module: AppModule
  from?: string
  to?: string
}): Promise<FinanceSummary> {
  await ensureSchema()
  const clauses = ["module = $1"]
  const params: unknown[] = [filters.module]
  if (filters.from) {
    params.push(filters.from)
    clauses.push(`created_at::date >= $${params.length}::date`)
  }
  if (filters.to) {
    params.push(filters.to)
    clauses.push(`created_at::date <= $${params.length}::date`)
  }
  const where = clauses.join(" AND ")
  const entryClauses = clauses.map((clause) => `le.${clause}`).join(" AND ")
  const [accounts, sales, refunds, ledger] = await Promise.all([
    query<{ code: string; name: string; type: string; debit: string | number; credit: string | number }>(
      `SELECT la.code, la.name, la.type,
              COALESCE(SUM(le.debit), 0) AS debit,
              COALESCE(SUM(le.credit), 0) AS credit
       FROM ledger_accounts la
       LEFT JOIN ledger_entries le ON le.account_code = la.code AND ${entryClauses}
       GROUP BY la.code, la.name, la.type
       ORDER BY la.type, la.code`,
      params
    ),
    query<{ total: string | number; profit: string | number }>(
      `SELECT COALESCE(SUM(total),0) AS total, COALESCE(SUM(profit),0) AS profit
       FROM sales WHERE module = $1 AND is_void = FALSE AND status IN ('completed','paid')
         AND ($2::date IS NULL OR created_at::date >= $2::date)
         AND ($3::date IS NULL OR created_at::date <= $3::date)`,
      [filters.module, filters.from || null, filters.to || null]
    ),
    query<{ total: string | number }>(
      `SELECT COALESCE(SUM(total),0) AS total FROM returns
       WHERE module = $1 AND ($2::date IS NULL OR created_at::date >= $2::date)
         AND ($3::date IS NULL OR created_at::date <= $3::date)`,
      [filters.module, filters.from || null, filters.to || null]
    ),
    query<{ code: string; total: string | number }>(
      `SELECT account_code AS code, SUM(debit - credit) AS total
       FROM ledger_entries WHERE ${where}
       GROUP BY account_code`,
      params
    ),
  ])

  const accountTotals = new Map(ledger.rows.map((row) => [row.code, num(row.total)]))
  const mapped = accounts.rows.map((row) => {
    const debit = num(row.debit)
    const credit = num(row.credit)
    const balance = accountTotals.get(row.code) ?? debit - credit
    return { code: row.code, name: row.name, type: row.type, debit, credit, balance }
  })
  const totalFor = (code: string) => mapped.find((row) => row.code === code)?.balance || 0

  return {
    salesTotal: num(sales.rows[0]?.total),
    refundTotal: num(refunds.rows[0]?.total),
    expenseTotal: totalFor("expenses"),
    purchaseTotal: accountTotals.get("inventory") || 0,
    supplierPaymentsTotal: accountTotals.get("accounts_payable") || 0,
    commissionTotal: accountTotals.get("commission_expense") || 0,
    cashTotal: totalFor("cash") + totalFor("mpesa") + totalFor("bank") + totalFor("card"),
    vatPayable: totalFor("vat_payable"),
    grossProfit: num(sales.rows[0]?.profit),
    accounts: mapped,
  }
}
