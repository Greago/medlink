"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, CreditCard, FileBarChart, Loader2, LockKeyhole, UnlockKeyhole } from "lucide-react"
import { Badge, Button } from "@/components/design-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

interface Shift {
  id: string
  module: string
  shiftNumber: string
  openingFloat: number
  expectedCash: number
  countedCash: number | null
  variance: number | null
  notes: string
  status: "open" | "closed"
  openedAt: string
  closedAt: string | null
  cashierName?: string
}

interface ShiftReport {
  shift: Shift
  salesCount: number
  voidedCount: number
  refundTotal: number
  paymentBreakdown: { method: string; total: number }[]
  expectedCash: number
  variance: number | null
}

export default function ShiftsPage() {
  const activeModule = useStore((state) => state.activeModule)
  const moduleInfo = getModule(activeModule)
  const [current, setCurrent] = useState<Shift | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [report, setReport] = useState<ShiftReport | null>(null)
  const [showOpen, setShowOpen] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const [openingFloat, setOpeningFloat] = useState("0")
  const [countedCash, setCountedCash] = useState("")
  const [closeNotes, setCloseNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/pos/shifts?module=${activeModule}`, { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load shifts.")
      const data = (await response.json()) as { current: Shift | null; shifts: Shift[] }
      setCurrent(data.current)
      setShifts(data.shifts)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load shifts.")
    }
  }, [activeModule])

  useEffect(() => {
    void load()
  }, [load])

  const openTill = async () => {
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/pos/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: activeModule, openingFloat: Number(openingFloat) || 0 }),
      })
      const data = (await response.json().catch(() => ({}))) as { shift?: Shift; error?: string }
      if (!response.ok) throw new Error(data.error || "Could not open the till.")
      setShowOpen(false)
      setOpeningFloat("0")
      toast.success(`${data.shift?.shiftNumber} opened.`)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open the till.")
    } finally {
      setBusy(false)
    }
  }

  const closeTill = async () => {
    if (!current) return
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/pos/shifts/${current.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countedCash: Number(countedCash) || 0,
          notes: closeNotes,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { shift?: Shift; error?: string }
      if (!response.ok) throw new Error(data.error || "Could not close the till.")
      const closed = data.shift!
      setShowClose(false)
      setCountedCash("")
      setCloseNotes("")
      toast.success(`${closed.shiftNumber} closed.`)
      await load()
      await viewReport(closed.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not close the till.")
    } finally {
      setBusy(false)
    }
  }

  const viewReport = async (id: string) => {
    try {
      const response = await fetch(`/api/pos/shifts/${id}/report`, { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load the Z-report.")
      const data = (await response.json()) as { report: ShiftReport }
      setReport(data.report)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the Z-report.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Point of sale</p>
          <h1 className="text-3xl font-bold">Tills &amp; shifts · {moduleInfo.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a till at the start of a shift and reconcile cash with a Z-report at close.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outlineSoft" asChild>
            <Link href="/admin/pos">
              <ArrowLeft size={17} /> Back to POS
            </Link>
          </Button>
          <Button onClick={() => setShowOpen(true)} disabled={Boolean(current)}>
            <UnlockKeyhole size={17} /> Open till
          </Button>
        </div>
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
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={18} /> Current shift
          </CardTitle>
          {current ? (
            <Badge variant="success">Open</Badge>
          ) : (
            <Badge variant="warning">No till open</Badge>
          )}
        </CardHeader>
        <CardContent>
          {!current ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              You have no open till for this division. Open one to start selling.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shift</p>
                <p className="mt-1 text-lg font-bold">{current.shiftNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opened</p>
                <p className="mt-1 text-sm font-semibold">
                  {new Date(current.openedAt).toLocaleString("en-KE")}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opening float</p>
                <p className="mt-1 text-lg font-bold text-primary">{formatPrice(current.openingFloat)}</p>
              </div>
              <div className="flex items-end justify-end">
                <Button variant="destructive" onClick={() => setShowClose(true)}>
                  <LockKeyhole size={17} /> Close till
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shift history</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {shifts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No shifts recorded yet.
            </p>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Shift</th>
                  <th className="py-2">Opened</th>
                  <th className="py-2">Cashier</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Expected</th>
                  <th className="py-2 text-right">Counted</th>
                  <th className="py-2 text-right">Variance</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 font-semibold">{shift.shiftNumber}</td>
                    <td className="py-3">{new Date(shift.openedAt).toLocaleString("en-KE")}</td>
                    <td className="py-3">{shift.cashierName || "—"}</td>
                    <td className="py-3">
                      <Badge variant={shift.status === "open" ? "success" : "secondary"}>
                        {shift.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">{formatPrice(shift.expectedCash)}</td>
                    <td className="py-3 text-right">
                      {shift.countedCash == null ? "—" : formatPrice(shift.countedCash)}
                    </td>
                    <td className={`py-3 text-right font-semibold ${shift.variance && shift.variance < 0 ? "text-danger" : ""}`}>
                      {shift.variance == null ? "—" : formatPrice(shift.variance)}
                    </td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="outlineSoft" onClick={() => viewReport(shift.id)}>
                        <FileBarChart size={15} /> Report
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {showOpen && (
        <ModalShell title="Open a till" onClose={() => setShowOpen(false)}>
          <div className="space-y-4">
            <label className="block text-xs">
              <span className="mb-1 block font-semibold text-muted-foreground">Opening float (KSh)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingFloat}
                onChange={(event) => setOpeningFloat(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowOpen(false)}>
                Cancel
              </Button>
              <Button onClick={openTill} disabled={busy}>
                {busy ? <Loader2 size={17} className="animate-spin" /> : null} Open till
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {showClose && current && (
        <ModalShell title={`Close ${current.shiftNumber}`} onClose={() => setShowClose(false)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Count the cash in the drawer and enter the total. The system will compare it against recorded cash
              sales and show the variance.
            </p>
            <label className="block text-xs">
              <span className="mb-1 block font-semibold text-muted-foreground">Counted cash (KSh)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={countedCash}
                onChange={(event) => setCountedCash(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
                autoFocus
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-semibold text-muted-foreground">Notes</span>
              <textarea
                value={closeNotes}
                onChange={(event) => setCloseNotes(event.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowClose(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={closeTill} disabled={busy}>
                {busy ? <Loader2 size={17} className="animate-spin" /> : null} Close &amp; reconcile
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {report && (
        <ModalShell title={`Z-report · ${report.shift.shiftNumber}`} onClose={() => setReport(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Sales</p>
                <p className="text-lg font-bold">{report.salesCount}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Voided</p>
                <p className="text-lg font-bold">{report.voidedCount}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Refunds</p>
                <p className="text-lg font-bold">{formatPrice(report.refundTotal)}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Expected cash</p>
                <p className="text-lg font-bold text-primary">{formatPrice(report.expectedCash)}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 font-semibold">Payments by method</p>
              <div className="divide-y divide-border rounded-xl border border-border">
                {report.paymentBreakdown.length === 0 ? (
                  <p className="px-3 py-3 text-muted-foreground">No payments recorded.</p>
                ) : (
                  report.paymentBreakdown.map((row) => (
                    <div key={row.method} className="flex justify-between px-3 py-2 capitalize">
                      <span>{row.method}</span>
                      <span className="font-semibold">{formatPrice(row.total)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            {report.variance != null && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-xs text-muted-foreground">Cash variance</p>
                <p className={`text-xl font-bold ${report.variance < 0 ? "text-danger" : "text-primary"}`}>
                  {formatPrice(report.variance)}
                </p>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outlineSoft" onClick={() => setReport(null)}>
                Close
              </Button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl">
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
