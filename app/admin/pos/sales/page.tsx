"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, FileText, Loader2, Mail, Printer, RotateCcw, Search, ShieldAlert } from "lucide-react"
import { Badge, Button } from "@/components/design-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

interface SaleRow {
  id: string
  saleNumber: string
  module: string
  documentType: string
  channel: string
  status: string
  total: number
  customerName: string
  createdAt: string
  cashierName?: string
  agentName?: string
  isVoid?: boolean
}

interface SaleItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  serialNumber: string
  batchNumber: string
}

interface SaleDetail {
  sale: SaleRow & {
    customerEmail: string
    customerPhone: string
    subtotal: number
    discountAmount: number
    taxAmount: number
    taxRate: number
    voidReason: string
    notes: string
    deliveryFee: number
    installationFee: number
    costTotal: number
    profit: number
  }
  items: SaleItem[]
  payments: { id: string; method: string; amount: number; reference: string }[]
  emailStatus: { status: string; attempts: number; last_error: string; sent_at: string | null } | null
}

interface RefundLine {
  saleItemId: string
  quantity: number
  amount: number
  name: string
  max: number
}

export default function SalesPage() {
  const activeModule = useStore((state) => state.activeModule)
  const moduleInfo = getModule(activeModule)
  const [sales, setSales] = useState<SaleRow[]>([])
  const [query, setQuery] = useState("")
  const [detail, setDetail] = useState<SaleDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [voidReason, setVoidReason] = useState("")
  const [refundLines, setRefundLines] = useState<RefundLine[]>([])
  const [refundReason, setRefundReason] = useState("")
  const [refundMethod, setRefundMethod] = useState("cash")
  const [refundReference, setRefundReference] = useState("")
  const [restock, setRestock] = useState(true)
  const [storeCredit, setStoreCredit] = useState("0")
  const [emailRecipient, setEmailRecipient] = useState("")
  const [panel, setPanel] = useState<"detail" | "void" | "refund" | "email" | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/pos/sales?module=${activeModule}&limit=300`, { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load sales.")
      const data = (await response.json()) as { sales: SaleRow[] }
      setSales(data.sales)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load sales.")
    }
  }, [activeModule])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sales
    return sales.filter(
      (sale) =>
        sale.saleNumber.toLowerCase().includes(needle) ||
        sale.customerName.toLowerCase().includes(needle) ||
        (sale.cashierName || "").toLowerCase().includes(needle)
    )
  }, [sales, query])

  const openDetail = async (id: string) => {
    setBusy(true)
    setError("")
    setPanel(null)
    try {
      const response = await fetch(`/api/pos/sales/${id}`, { cache: "no-store" })
      const data = (await response.json().catch(() => ({}))) as SaleDetail & { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not load the sale.")
      setDetail(data)
      setEmailRecipient(data.sale.customerEmail || "")
      setPanel("detail")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the sale.")
    } finally {
      setBusy(false)
    }
  }

  const voidSale = async () => {
    if (!detail) return
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/pos/sales/${detail.sale.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReason }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not void the sale.")
      toast.success("Sale voided and stock restored.")
      setPanel(null)
      setVoidReason("")
      await openDetail(detail.sale.id)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not void the sale.")
    } finally {
      setBusy(false)
    }
  }

  const refundTotal = refundLines.reduce((sum, line) => sum + line.amount, 0)

  const setRefundQuantity = (line: RefundLine, quantity: number) => {
    const qty = Math.max(0, Math.min(line.max, quantity))
    setRefundLines((current) =>
      current.map((item) =>
        item.saleItemId === line.saleItemId
          ? { ...item, quantity: qty, amount: Number(((line.amount / line.max) * qty).toFixed(2)) }
          : item
      )
    )
  }

  const issueRefund = async () => {
    if (!detail) return
    const selected = refundLines.filter((line) => line.quantity > 0)
    if (!selected.length) {
      setError("Select at least one item to refund.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/pos/sales/${detail.sale.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selected.map((line) => ({ saleItemId: line.saleItemId, quantity: line.quantity })),
          reason: refundReason,
          restock,
          refundMethod,
          refundReference,
          storeCredit: Number(storeCredit) || 0,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        creditNote?: { creditNoteNumber: string }
        error?: string
      }
      if (!response.ok) throw new Error(data.error || "Could not issue the credit note.")
      toast.success(`Credit note ${data.creditNote?.creditNoteNumber} issued.`)
      setPanel(null)
      setRefundLines([])
      setRefundReason("")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not issue the credit note.")
    } finally {
      setBusy(false)
    }
  }

  const resendEmail = async () => {
    if (!detail) return
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/pos/sales/${detail.sale.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: emailRecipient }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        queued?: boolean
        skipped?: string
        error?: string
      }
      if (!response.ok) throw new Error(data.error || "Could not queue the email.")
      toast.success(data.queued ? "Email queued for delivery." : `Email not queued (${data.skipped}).`)
      const refreshed = await fetch(`/api/pos/sales/${detail.sale.id}`, { cache: "no-store" })
      if (refreshed.ok) setDetail((await refreshed.json()) as SaleDetail)
      setPanel("detail")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not queue the email.")
    } finally {
      setBusy(false)
    }
  }

  const startRefund = () => {
    if (!detail) return
    setRefundLines(
      detail.items.map((item) => ({
        saleItemId: item.id,
        quantity: 0,
        amount: 0,
        name: item.productName,
        max: item.quantity,
      }))
    )
    setPanel("refund")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Point of sale</p>
          <h1 className="text-3xl font-bold">Sales &amp; documents · {moduleInfo.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review receipts, invoices and quotes. Void sales, issue credit notes and resend emails.
          </p>
        </div>
        <Button variant="outlineSoft" asChild>
          <Link href="/admin/pos">
            <ArrowLeft size={17} /> Back to POS
          </Link>
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
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Recent sales</CardTitle>
          <label className="flex items-center gap-2 text-sm">
            <Search size={16} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search number, customer or cashier"
              className="h-10 w-64 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No sales found for this division.
            </p>
          ) : (
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Document</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Channel</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => (
                  <tr key={sale.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 font-semibold">{sale.saleNumber}</td>
                    <td className="py-3">{new Date(sale.createdAt).toLocaleString("en-KE")}</td>
                    <td className="py-3">{sale.customerName}</td>
                    <td className="py-3 capitalize">{sale.documentType}</td>
                    <td className="py-3 capitalize">{(sale.channel || "").replace("_", " ")}</td>
                    <td className="py-3 text-right font-semibold">{formatPrice(sale.total)}</td>
                    <td className="py-3">
                      <Badge variant={sale.isVoid || sale.status === "voided" ? "danger" : "success"}>
                        {sale.isVoid || sale.status === "voided" ? "voided" : sale.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="outlineSoft" onClick={() => openDetail(sale.id)} disabled={busy}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {detail && panel === "detail" && (
        <ModalShell title={detail.sale.saleNumber} onClose={() => setDetail(null)} wide>
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="soft" className="capitalize">
                {detail.sale.documentType}
              </Badge>
              <Badge variant={detail.sale.isVoid ? "danger" : "success"}>
                {detail.sale.isVoid ? "Voided" : detail.sale.status}
              </Badge>
              <span className="text-muted-foreground">
                {new Date(detail.sale.createdAt).toLocaleString("en-KE")}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Customer" value={detail.sale.customerName} />
              <Info label="Phone" value={detail.sale.customerPhone || "—"} />
              <Info label="Email" value={detail.sale.customerEmail || "—"} />
              <Info label="Cashier" value={detail.sale.cashierName || "—"} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item) => (
                    <tr key={item.id} className="border-t border-border/60">
                      <td className="px-3 py-2">
                        {item.productName}
                        {item.serialNumber && (
                          <span className="block text-xs text-muted-foreground">SN: {item.serialNumber}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatPrice(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatPrice(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(detail.sale.total)}</span>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email status</p>
              <p className="mt-1">
                {detail.emailStatus
                  ? `${detail.emailStatus.status} · ${detail.emailStatus.attempts} attempt(s)`
                  : "No email queued"}
              </p>
              {detail.emailStatus?.last_error && (
                <p className="mt-1 text-xs text-danger">{detail.emailStatus.last_error}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={`/api/pos/sales/${detail.sale.id}/pdf?paper=a4`} target="_blank" rel="noreferrer">
                  <FileText size={16} /> A4 PDF
                </a>
              </Button>
              <Button variant="outlineSoft" asChild>
                <a href={`/api/pos/sales/${detail.sale.id}/pdf?paper=80mm`} target="_blank" rel="noreferrer">
                  <Printer size={16} /> Receipt
                </a>
              </Button>
              <Button variant="outlineSoft" asChild>
                <a href={`/verify/${detail.sale.saleNumber}`} target="_blank" rel="noreferrer">
                  Verify
                </a>
              </Button>
              <Button variant="outlineSoft" onClick={() => setPanel("email")}>
                <Mail size={16} /> Resend email
              </Button>
              {!detail.sale.isVoid && (
                <>
                  <Button variant="outlineSoft" onClick={startRefund}>
                    <RotateCcw size={16} /> Refund
                  </Button>
                  <Button variant="destructive" onClick={() => setPanel("void")}>
                    <ShieldAlert size={16} /> Void
                  </Button>
                </>
              )}
            </div>
          </div>
        </ModalShell>
      )}

      {detail && panel === "void" && (
        <ModalShell title={`Void ${detail.sale.saleNumber}`} onClose={() => setPanel("detail")}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Voiding restores stock and marks the document as void. This cannot be undone.
            </p>
            <label className="block text-xs">
              <span className="mb-1 block font-semibold text-muted-foreground">Reason</span>
              <textarea
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPanel("detail")}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={voidSale} disabled={busy || voidReason.trim().length < 3}>
                {busy ? <Loader2 size={17} className="animate-spin" /> : null} Void sale
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {detail && panel === "refund" && (
        <ModalShell title={`Refund ${detail.sale.saleNumber}`} onClose={() => setPanel("detail")} wide>
          <div className="space-y-4">
            <div className="space-y-2">
              {refundLines.map((line) => (
                <div key={line.saleItemId} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{line.name}</p>
                    <p className="text-xs text-muted-foreground">Purchased {line.max}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-muted-foreground">Return qty</span>
                    <input
                      type="number"
                      min="0"
                      max={line.max}
                      value={line.quantity}
                      onChange={(event) => setRefundQuantity(line, Number(event.target.value) || 0)}
                      className="h-10 w-20 rounded-lg border border-border bg-background px-2 text-sm"
                    />
                  </label>
                  <span className="w-24 text-right font-semibold">{formatPrice(line.amount)}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">Refund method</span>
                <select
                  value={refundMethod}
                  onChange={(event) => setRefundMethod(event.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank</option>
                  <option value="credit">Credit note</option>
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">Reference</span>
                <input
                  value={refundReference}
                  onChange={(event) => setRefundReference(event.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
              <label className="text-xs sm:col-span-2">
                <span className="mb-1 block font-semibold text-muted-foreground">Reason</span>
                <input
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">Store credit (KSh)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={storeCredit}
                  onChange={(event) => setStoreCredit(event.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
              <label className="flex items-end gap-2 pb-2 text-xs">
                <input
                  type="checkbox"
                  checked={restock}
                  onChange={(event) => setRestock(event.target.checked)}
                />
                <span className="font-semibold text-muted-foreground">Return items to stock</span>
              </label>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 font-bold">
              <span>Refund total</span>
              <span className="text-primary">{formatPrice(refundTotal)}</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPanel("detail")}>
                Cancel
              </Button>
              <Button onClick={issueRefund} disabled={busy || refundReason.trim().length < 3}>
                {busy ? <Loader2 size={17} className="animate-spin" /> : null} Issue credit note
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {detail && panel === "email" && (
        <ModalShell title={`Resend document · ${detail.sale.saleNumber}`} onClose={() => setPanel("detail")}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Queue a fresh copy of the document with its PDF attached. The queue prevents duplicate sends.
            </p>
            <label className="block text-xs">
              <span className="mb-1 block font-semibold text-muted-foreground">Recipient email</span>
              <input
                type="email"
                value={emailRecipient}
                onChange={(event) => setEmailRecipient(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPanel("detail")}>
                Cancel
              </Button>
              <Button onClick={resendEmail} disabled={busy || !emailRecipient}>
                {busy ? <Loader2 size={17} className="animate-spin" /> : null} Queue email
              </Button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}

function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-card p-6 shadow-xl ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-sm font-semibold text-muted-foreground">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
