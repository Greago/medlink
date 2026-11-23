"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Loader2, Pill, Plus } from "lucide-react"
import { Badge, Button } from "@/components/design-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/catalogue"
import { useStore } from "@/lib/store"

interface Batch {
  id: string
  batch_number: string
  product_id: string
  product_name: string
  strength: string | null
  expiry_date: string | null
  quantity_on_hand: number
  unit_cost: number
  created_at: string
}

export default function PharmacyBatchesPage() {
  const products = useStore((state) => state.products)
  const [batches, setBatches] = useState<Batch[]>([])
  const [productId, setProductId] = useState("")
  const [batchNumber, setBatchNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [quantity, setQuantity] = useState("0")
  const [unitCost, setUnitCost] = useState("0")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)

  const pharmacyProducts = products.filter((product) => product.module === "pharmacy")

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/pharmacy/batches", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load batches.")
      const data = (await response.json()) as { batches: Batch[] }
      setBatches(data.batches)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load batches.")
    }
  }, [])

  useEffect(() => {
    void load()
    if (!productId && pharmacyProducts.length) setProductId(pharmacyProducts[0].id)
  }, [load, pharmacyProducts.length, productId])

  const save = async () => {
    if (!productId || !batchNumber.trim()) {
      setError("Choose a product and enter a batch number.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/pharmacy/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          batchNumber: batchNumber.trim(),
          expiryDate: expiryDate || null,
          quantityOnHand: Number(quantity) || 0,
          unitCost: Number(unitCost) || 0,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not save the batch.")
      toast.success("Batch saved.")
      setBatchNumber("")
      setExpiryDate("")
      setQuantity("0")
      setUnitCost("0")
      setShowForm(false)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the batch.")
    } finally {
      setBusy(false)
    }
  }

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false
    const days = (new Date(date).getTime() - Date.now()) / 86400000
    return days >= 0 && days <= 90
  }

  const isExpired = (date: string | null) => Boolean(date && new Date(date) < new Date())

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Pharmacy</p>
          <h1 className="text-3xl font-bold">Batches &amp; FEFO</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record supplier batches and expiry dates. Sales consume the earliest-expiring stock first.
          </p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          <Plus size={17} /> {showForm ? "Hide form" : "Add batch"}
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

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New batch</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-muted-foreground">Product</span>
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                {pharmacyProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-muted-foreground">Batch number</span>
              <input
                value={batchNumber}
                onChange={(event) => setBatchNumber(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-muted-foreground">Expiry</span>
              <input
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-muted-foreground">Quantity</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-muted-foreground">Unit cost</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
            <div className="flex items-end sm:col-span-2 lg:col-span-5">
              <Button onClick={save} disabled={busy}>
                {busy ? <Loader2 size={17} className="animate-spin" /> : <Pill size={17} />} Save batch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Batch register</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {batches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No pharmacy batches recorded yet.
            </p>
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Product</th>
                  <th className="py-2">Batch</th>
                  <th className="py-2">Expiry</th>
                  <th className="py-2 text-right">On hand</th>
                  <th className="py-2 text-right">Cost</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 font-semibold">
                      {batch.product_name}
                      {batch.strength && (
                        <span className="block text-xs text-muted-foreground">{batch.strength}</span>
                      )}
                    </td>
                    <td className="py-3">{batch.batch_number}</td>
                    <td className="py-3">{batch.expiry_date ? batch.expiry_date.slice(0, 10) : "—"}</td>
                    <td className="py-3 text-right font-semibold">{batch.quantity_on_hand}</td>
                    <td className="py-3 text-right">{formatPrice(batch.unit_cost)}</td>
                    <td className="py-3">
                      {isExpired(batch.expiry_date) ? (
                        <Badge variant="danger">Expired</Badge>
                      ) : isExpiringSoon(batch.expiry_date) ? (
                        <Badge variant="warning">
                          <AlertTriangle size={12} /> Expiring soon
                        </Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
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
