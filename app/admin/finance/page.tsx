"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { BadgeDollarSign, BookOpen, Loader2, Plus, Receipt, ShieldAlert } from "lucide-react"
import { Badge, Button } from "@/components/design-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

interface FinanceSummary {
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

interface LedgerEntry {
  id: string
  accountCode: string
  accountName: string
  description: string
  reference: string
  debit: number
  credit: number
  createdAt: string
}

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  expenseDate: string
  supplierName?: string
  reference: string
  isVoid: boolean
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

export default function FinancePage() {
  const activeModule = useStore((state) => state.activeModule)
  const moduleInfo = getModule(activeModule)
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [category, setCategory] = useState("general")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [expenseDate, setExpenseDate] = useState(today())
  const [reference, setReference] = useState("")
  const [paidFrom, setPaidFrom] = useState("cash")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const queryString = `module=${activeModule}&from=${from}&to=${to}`

  const load = useCallback(async () => {
    try {
      const [summaryResponse, ledgerResponse, expenseResponse] = await Promise.all([
        fetch(`/api/finance/summary?${queryString}`, { cache: "no-store" }),
        fetch(`/api/finance/ledger?${queryString}`, { cache: "no-store" }),
        fetch(`/api/finance/expenses?module=${activeModule}`, { cache: "no-store" }),
      ])
      if (!summaryResponse.ok || !ledgerResponse.ok || !expenseResponse.ok) {
        throw new Error("Could not load finance data.")
      }
      const [summaryData, ledgerData, expenseData] = await Promise.all([
        summaryResponse.json() as Promise<{ summary: FinanceSummary }>,
        ledgerResponse.json() as Promise<{ entries: LedgerEntry[] }>,
        expenseResponse.json() as Promise<{ expenses: Expense[] }>,
      ])
      setSummary(summaryData.summary)
      setEntries(ledgerData.entries)
      setExpenses(expenseData.expenses)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load finance data.")
    }
  }, [queryString, activeModule])

  useEffect(() => {
    void load()
  }, [load])

  const addExpense = async () => {
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: activeModule,
          category,
          description,
          amount: Number(amount) || 0,
          expenseDate,
          reference,
          paidFrom,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not record the expense.")
      toast.success("Expense recorded and posted to the ledger.")
      setDescription("")
      setAmount("")
      setReference("")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record the expense.")
    } finally {
      setBusy(false)
    }
  }

  const voidExpense = async (id: string) => {
    if (!window.confirm("Void this expense and post a reversing ledger entry?")) return
    setBusy(true)
    try {
      const response = await fetch(`/api/finance/expenses/${id}`, { method: "POST" })
      if (!response.ok) throw new Error("Could not void the expense.")
      toast.success("Expense voided.")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not void the expense.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Finance</p>
          <h1 className="text-3xl font-bold">Ledger &amp; expenses · {moduleInfo.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sales, refunds, purchases and expenses are posted automatically to the ledger.
          </p>
        </div>
        <Button variant="outlineSoft" asChild>
          <Link href="/admin/finance/purchases">Suppliers &amp; purchases</Link>
        </Button>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <p>{error}</p>
          <button type="button" onClick={() => setError("")} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-5">
          <label className="text-xs">
            <span className="mb-1 block font-semibold text-muted-foreground">From</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-semibold text-muted-foreground">To</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <Button size="sm" variant="outlineSoft" onClick={() => void load()}>
            Refresh
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Sales" value={formatPrice(summary?.salesTotal || 0)} icon={<Receipt size={18} />} />
        <StatCard title="Gross profit" value={formatPrice(summary?.grossProfit || 0)} icon={<BadgeDollarSign size={18} />} />
        <StatCard title="Expenses" value={formatPrice(summary?.expenseTotal || 0)} icon={<ShieldAlert size={18} />} />
        <StatCard title="Cash &amp; bank" value={formatPrice(summary?.cashTotal || 0)} icon={<BookOpen size={18} />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account balances</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Account</th>
                <th className="py-2">Type</th>
                <th className="py-2 text-right">Debit</th>
                <th className="py-2 text-right">Credit</th>
                <th className="py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.accounts || []).map((account) => (
                <tr key={account.code} className="border-b border-border/60 last:border-0">
                  <td className="py-2 font-semibold">{account.name}</td>
                  <td className="py-2 capitalize">{account.type}</td>
                  <td className="py-2 text-right">{formatPrice(account.debit)}</td>
                  <td className="py-2 text-right">{formatPrice(account.credit)}</td>
                  <td className={`py-2 text-right font-semibold ${account.balance < 0 ? "text-danger" : ""}`}>
                    {formatPrice(account.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Record expense</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Category">
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Description">
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Amount (KSh)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Reference">
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Paid from">
            <select
              value={paidFrom}
              onChange={(event) => setPaidFrom(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank</option>
              <option value="card">Card</option>
            </select>
          </Field>
          <div className="flex items-end lg:col-span-2">
            <Button onClick={addExpense} disabled={busy}>
              {busy ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />} Record expense
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {expenses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No expenses recorded.
            </p>
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Date</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Description</th>
                  <th className="py-2">Supplier</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2">{expense.expenseDate}</td>
                    <td className="py-2 font-semibold">{expense.category}</td>
                    <td className="py-2">{expense.description || "—"}</td>
                    <td className="py-2">{expense.supplierName || "—"}</td>
                    <td className="py-2 text-right font-semibold">{formatPrice(expense.amount)}</td>
                    <td className="py-2">
                      <Badge variant={expense.isVoid ? "danger" : "success"}>
                        {expense.isVoid ? "voided" : "posted"}
                      </Badge>
                    </td>
                    <td className="py-2 text-right">
                      {!expense.isVoid && (
                        <Button size="sm" variant="ghost" onClick={() => voidExpense(expense.id)} disabled={busy}>
                          Void
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ledger entries</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No ledger entries for this period.
            </p>
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Date</th>
                  <th className="py-2">Account</th>
                  <th className="py-2">Description</th>
                  <th className="py-2">Reference</th>
                  <th className="py-2 text-right">Debit</th>
                  <th className="py-2 text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2">{new Date(entry.createdAt).toLocaleString("en-KE")}</td>
                    <td className="py-2 font-semibold">{entry.accountName}</td>
                    <td className="py-2">{entry.description}</td>
                    <td className="py-2">{entry.reference}</td>
                    <td className="py-2 text-right">{entry.debit > 0 ? formatPrice(entry.debit) : "—"}</td>
                    <td className="py-2 text-right">{entry.credit > 0 ? formatPrice(entry.credit) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <span className="text-primary">{icon}</span>
        </div>
        <p className="mt-3 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
