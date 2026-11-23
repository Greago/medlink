"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Plus, Receipt, Truck, Wallet } from "lucide-react"
import { Badge, Button } from "@/components/design-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

interface Supplier {
  id: string
  module: string
  name: string
  phone: string
  email: string
  address: string
  kra_pin: string
  created_at: string
}

interface PurchaseItem {
  productId?: string
  name?: string
  quantity: number
  unitCost: number
}

interface Purchase {
  id: string
  module: string
  supplierId: string | null
  supplierName?: string
  reference: string
  items: PurchaseItem[]
  total: number
  amountPaid: number
  purchaseDate: string
  createdAt: string
}

interface SupplierPayment {
  id: string
  module: string
  supplier_id: string | null
  supplierName?: string
  supplier_name?: string
  purchase_id: string | null
  amount: number
  method: string
  reference: string
  paid_at: string
  created_at: string
}

interface PurchaseLine {
  key: string
  productId: string
  name: string
  quantity: string
  unitCost: string
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function makeKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function PurchasesPage() {
  const activeModule = useStore((state) => state.activeModule)
  const products = useStore((state) => state.products)
  const moduleInfo = getModule(activeModule)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [payments, setPayments] = useState<SupplierPayment[]>([])

  const [supplierName, setSupplierName] = useState("")
  const [supplierPhone, setSupplierPhone] = useState("")
  const [supplierEmail, setSupplierEmail] = useState("")
  const [supplierAddress, setSupplierAddress] = useState("")
  const [supplierPin, setSupplierPin] = useState("")

  const [purchaseSupplierId, setPurchaseSupplierId] = useState("")
  const [purchaseReference, setPurchaseReference] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(today())
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([
    { key: makeKey(), productId: "", name: "", quantity: "1", unitCost: "0" },
  ])
  const [amountPaid, setAmountPaid] = useState("0")

  const [paymentSupplierId, setPaymentSupplierId] = useState("")
  const [paymentPurchaseId, setPaymentPurchaseId] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("bank")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentDate, setPaymentDate] = useState(today())

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const moduleProducts = useMemo(
    () => products.filter((product) => product.module === activeModule),
    [products, activeModule]
  )

  const purchaseTotal = purchaseLines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitCost) || 0),
    0
  )
  const purchaseBalance = Math.max(0, purchaseTotal - (Number(amountPaid) || 0))

  const load = useCallback(async () => {
    try {
      const [suppliersResponse, purchasesResponse, paymentsResponse] = await Promise.all([
        fetch(`/api/finance/suppliers?module=${activeModule}`, { cache: "no-store" }),
        fetch(`/api/finance/purchases?module=${activeModule}`, { cache: "no-store" }),
        fetch(`/api/finance/supplier-payments?module=${activeModule}`, { cache: "no-store" }),
      ])
      if (!suppliersResponse.ok || !purchasesResponse.ok || !paymentsResponse.ok) {
        throw new Error("Could not load supplier records.")
      }
      const [suppliersData, purchasesData, paymentsData] = await Promise.all([
        suppliersResponse.json() as Promise<{ suppliers: Supplier[] }>,
        purchasesResponse.json() as Promise<{ purchases: Purchase[] }>,
        paymentsResponse.json() as Promise<{ payments: SupplierPayment[] }>,
      ])
      setSuppliers(suppliersData.suppliers)
      setPurchases(purchasesData.purchases)
      setPayments(paymentsData.payments)
      if (!purchaseSupplierId && suppliersData.suppliers.length) {
        setPurchaseSupplierId(suppliersData.suppliers[0].id)
      }
      if (!paymentSupplierId && suppliersData.suppliers.length) {
        setPaymentSupplierId(suppliersData.suppliers[0].id)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load supplier records.")
    }
  }, [activeModule, purchaseSupplierId, paymentSupplierId])

  useEffect(() => {
    void load()
  }, [load])

  const saveSupplier = async () => {
    if (!supplierName.trim()) {
      setError("Enter the supplier name.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/finance/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: activeModule,
          name: supplierName,
          phone: supplierPhone,
          email: supplierEmail,
          address: supplierAddress,
          kraPin: supplierPin,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not save the supplier.")
      toast.success("Supplier saved.")
      setSupplierName("")
      setSupplierPhone("")
      setSupplierEmail("")
      setSupplierAddress("")
      setSupplierPin("")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the supplier.")
    } finally {
      setBusy(false)
    }
  }

  const updateLine = (key: string, updates: Partial<PurchaseLine>) => {
    setPurchaseLines((current) => current.map((line) => (line.key === key ? { ...line, ...updates } : line)))
  }

  const setLineProduct = (line: PurchaseLine, productId: string) => {
    const product = moduleProducts.find((item) => item.id === productId)
    updateLine(line.key, {
      productId,
      name: product?.name || line.name,
      unitCost: product ? String(Number(product.price) || 0) : line.unitCost,
    })
  }

  const savePurchase = async () => {
    const items = purchaseLines
      .filter((line) => line.name.trim() || line.productId)
      .map((line) => ({
        productId: line.productId || undefined,
        name: line.name.trim() || undefined,
        quantity: Number(line.quantity) || 0,
        unitCost: Number(line.unitCost) || 0,
      }))
    if (!items.length || purchaseTotal <= 0) {
      setError("Add at least one purchase item with a quantity and cost.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/finance/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: activeModule,
          supplierId: purchaseSupplierId || null,
          reference: purchaseReference,
          purchaseDate,
          items,
          total: purchaseTotal,
          amountPaid: Number(amountPaid) || 0,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not record the purchase.")
      toast.success("Purchase recorded and posted to the ledger.")
      setPurchaseReference("")
      setPurchaseLines([{ key: makeKey(), productId: "", name: "", quantity: "1", unitCost: "0" }])
      setAmountPaid("0")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record the purchase.")
    } finally {
      setBusy(false)
    }
  }

  const savePayment = async () => {
    if (!paymentSupplierId || !paymentPurchaseId) {
      setError("Choose a supplier and a purchase for this payment.")
      return
    }
    if ((Number(paymentAmount) || 0) <= 0) {
      setError("Enter a payment amount greater than zero.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/finance/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: activeModule,
          supplierId: paymentSupplierId,
          purchaseId: paymentPurchaseId,
          amount: Number(paymentAmount),
          method: paymentMethod,
          reference: paymentReference,
          paidAt: paymentDate,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not record the supplier payment.")
      toast.success("Supplier payment recorded.")
      setPaymentAmount("")
      setPaymentReference("")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record the supplier payment.")
    } finally {
      setBusy(false)
    }
  }

  const supplierPurchases = purchases.filter(
    (purchase) => !paymentSupplierId || purchase.supplierId === paymentSupplierId
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Finance</p>
          <h1 className="text-3xl font-bold">Suppliers &amp; purchases · {moduleInfo.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record suppliers, stock purchases and supplier payments. Entries post automatically to the ledger.
          </p>
        </div>
        <Button variant="outlineSoft" asChild>
          <Link href="/admin/finance">
            <ArrowLeft size={17} /> Back to finance
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck size={18} /> Add supplier
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Name">
            <input
              value={supplierName}
              onChange={(event) => setSupplierName(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Phone">
            <input
              value={supplierPhone}
              onChange={(event) => setSupplierPhone(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={supplierEmail}
              onChange={(event) => setSupplierEmail(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Address">
            <input
              value={supplierAddress}
              onChange={(event) => setSupplierAddress(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="KRA PIN">
            <input
              value={supplierPin}
              onChange={(event) => setSupplierPin(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <div className="flex items-end lg:col-span-5">
            <Button onClick={saveSupplier} disabled={busy}>
              {busy ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />} Save supplier
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suppliers</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {suppliers.length === 0 ? (
            <Empty text="No suppliers recorded yet." />
          ) : (
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Name</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">KRA PIN</th>
                  <th className="py-2">Address</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 font-semibold">{supplier.name}</td>
                    <td className="py-2">{supplier.phone || "—"}</td>
                    <td className="py-2">{supplier.email || "—"}</td>
                    <td className="py-2">{supplier.kra_pin || "—"}</td>
                    <td className="py-2">{supplier.address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt size={18} /> Record purchase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Supplier">
              <select
                value={purchaseSupplierId}
                onChange={(event) => setPurchaseSupplierId(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">No supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reference">
              <input
                value={purchaseReference}
                onChange={(event) => setPurchaseReference(event.target.value)}
                placeholder="e.g. PO-001"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Purchase date">
              <input
                type="date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </Field>
          </div>

          <div className="space-y-2">
            {purchaseLines.map((line, index) => (
              <div key={line.key} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-5">
                <Field label={`Item ${index + 1}`}>
                  <select
                    value={line.productId}
                    onChange={(event) => setLineProduct(line, event.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Custom item</option>
                    {moduleProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Description">
                  <input
                    value={line.name}
                    onChange={(event) => updateLine(line.key, { name: event.target.value })}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </Field>
                <Field label="Quantity">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={line.quantity}
                    onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </Field>
                <Field label="Unit cost (KSh)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitCost}
                    onChange={(event) => updateLine(line.key, { unitCost: event.target.value })}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </Field>
                <div className="flex items-end justify-between gap-2">
                  <span className="pb-2 text-sm font-semibold">
                    {formatPrice((Number(line.quantity) || 0) * (Number(line.unitCost) || 0))}
                  </span>
                  {purchaseLines.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPurchaseLines((current) => current.filter((row) => row.key !== line.key))}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Button
              size="sm"
              variant="outlineSoft"
              onClick={() =>
                setPurchaseLines((current) => [
                  ...current,
                  { key: makeKey(), productId: "", name: "", quantity: "1", unitCost: "0" },
                ])
              }
            >
              <Plus size={15} /> Add line
            </Button>
            <Field label="Amount paid now (KSh)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(event) => setAmountPaid(event.target.value)}
                className="h-10 w-40 rounded-lg border border-border bg-background px-3 text-sm"
              />
            </Field>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Total / balance</p>
              <p className="text-lg font-bold text-primary">
                {formatPrice(purchaseTotal)} <span className="text-sm text-muted-foreground">/ {formatPrice(purchaseBalance)}</span>
              </p>
            </div>
            <Button onClick={savePurchase} disabled={busy}>
              {busy ? <Loader2 size={17} className="animate-spin" /> : <Receipt size={17} />} Record purchase
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase register</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {purchases.length === 0 ? (
            <Empty text="No supplier purchases recorded yet." />
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Reference</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Supplier</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 text-right">Paid</th>
                  <th className="py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 font-semibold">{purchase.reference || "—"}</td>
                    <td className="py-2">{purchase.purchaseDate}</td>
                    <td className="py-2">{purchase.supplierName || "—"}</td>
                    <td className="py-2 text-right">{formatPrice(purchase.total)}</td>
                    <td className="py-2 text-right">{formatPrice(purchase.amountPaid)}</td>
                    <td className="py-2 text-right font-semibold">
                      {formatPrice(Math.max(0, purchase.total - purchase.amountPaid))}
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
          <CardTitle className="flex items-center gap-2">
            <Wallet size={18} /> Record supplier payment
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Supplier">
            <select
              value={paymentSupplierId}
              onChange={(event) => {
                setPaymentSupplierId(event.target.value)
                setPaymentPurchaseId("")
              }}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">Choose supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Purchase">
            <select
              value={paymentPurchaseId}
              onChange={(event) => setPaymentPurchaseId(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">Choose purchase</option>
              {supplierPurchases.map((purchase) => (
                <option key={purchase.id} value={purchase.id}>
                  {purchase.reference || purchase.purchaseDate} · {formatPrice(purchase.total)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (KSh)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Method">
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="card">Card</option>
            </select>
          </Field>
          <Field label="Reference">
            <input
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Paid date">
            <input
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <div className="flex items-end lg:col-span-2">
            <Button onClick={savePayment} disabled={busy}>
              {busy ? <Loader2 size={17} className="animate-spin" /> : <Wallet size={17} />} Record payment
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supplier payments</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {payments.length === 0 ? (
            <Empty text="No supplier payments recorded yet." />
          ) : (
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Date</th>
                  <th className="py-2">Supplier</th>
                  <th className="py-2">Method</th>
                  <th className="py-2">Reference</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2">{payment.paid_at?.slice(0, 10)}</td>
                    <td className="py-2 font-semibold">{payment.supplierName || payment.supplier_name || "—"}</td>
                    <td className="py-2 capitalize">{payment.method}</td>
                    <td className="py-2">{payment.reference || "—"}</td>
                    <td className="py-2 text-right font-semibold">{formatPrice(payment.amount)}</td>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{text}</p>
}
