"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  PauseCircle,
  Plus,
  Printer,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  WifiOff,
} from "lucide-react"
import { Badge, Button } from "@/components/design-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"
import type { AppModule } from "@/lib/modules/types"

type PaymentMethod = "cash" | "mpesa" | "card" | "bank" | "credit"
type DocumentType = "receipt" | "invoice" | "quote"
type Channel = "in_shop" | "field"

interface CartLine {
  key: string
  productId: string
  name: string
  price: number
  quantity: number
  discount: number
  serialNumber: string
  warranty: string
  model: string
  requiresPrescription: boolean
  controlledSubstance: boolean
}

interface PaymentRow {
  key: string
  method: PaymentMethod
  amount: string
  reference: string
}

interface CustomerForm {
  name: string
  phone: string
  email: string
  idNumber: string
  address: string
}

interface PrescriptionForm {
  patientName: string
  prescriberName: string
  prescriberRegNo: string
  referenceNumber: string
  imageUrl: string
}

interface HeldSale {
  id: string
  customer: CustomerForm
  cart: CartLine[]
  notes: string
  updatedAt: string
}

interface ShiftSummary {
  id: string
  shiftNumber: string
  status: string
  openedAt: string
}

interface AgentOption {
  id: string
  adminName?: string
  adminEmail?: string
  territory: string
  status: string
}

interface SaleResponse {
  sale: {
    id: string
    saleNumber: string
    documentType: string
    total: number
    status: string
    isVoid: boolean
  }
  warnings?: string[]
  emailQueued?: boolean
}

const emptyCustomer: CustomerForm = {
  name: "Walk-in customer",
  phone: "",
  email: "",
  idNumber: "",
  address: "",
}

const emptyPrescription: PrescriptionForm = {
  patientName: "",
  prescriberName: "",
  prescriberRegNo: "",
  referenceNumber: "",
  imageUrl: "",
}

function makeKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function round(value: number): number {
  return Number(value.toFixed(2))
}

export default function PosPage() {
  const products = useStore((state) => state.products)
  const activeModule = useStore((state) => state.activeModule)
  const adminBranchId = useStore((state) => state.adminBranchId)
  const vatRegistered = useStore((state) => state.vatRegistered)
  const vatRate = useStore((state) => state.vatRate)
  const vatInclusive = useStore((state) => state.vatInclusive)
  const maxDiscount = useStore((state) => state.adminMaxDiscountPercent)

  const moduleInfo = getModule(activeModule)

  const [query, setQuery] = useState("")
  const [cart, setCart] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer)
  const [prescription, setPrescription] = useState<PrescriptionForm>(emptyPrescription)
  const [documentType, setDocumentType] = useState<DocumentType>("receipt")
  const [channel, setChannel] = useState<Channel>("in_shop")
  const [payments, setPayments] = useState<PaymentRow[]>([
    { key: makeKey(), method: "cash", amount: "", reference: "" },
  ])
  const [notes, setNotes] = useState("")
  const [deliveryFee, setDeliveryFee] = useState("0")
  const [installationFee, setInstallationFee] = useState("0")
  const [shift, setShift] = useState<ShiftSummary | null>(null)
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [agentId, setAgentId] = useState("")
  const [heldSales, setHeldSales] = useState<HeldSale[]>([])
  const [showHeld, setShowHeld] = useState(false)
  const [online, setOnline] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<SaleResponse | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(() => makeKey())

  useEffect(() => {
    setOnline(navigator.onLine)
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/pos/shifts?module=${activeModule}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the open till.")
        return response.json() as Promise<{ current: ShiftSummary | null }>
      })
      .then((data) => {
        if (!cancelled) setShift(data.current)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your open till. Open a till before selling.")
      })
    return () => {
      cancelled = true
    }
  }, [activeModule])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/agents?module=${activeModule}`, { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : { agents: [] }))
      .then((data: { agents?: AgentOption[] }) => {
        if (!cancelled) setAgents((data.agents || []).filter((agent) => agent.status === "active"))
      })
      .catch(() => {
        if (!cancelled) setAgents([])
      })
    return () => {
      cancelled = true
    }
  }, [activeModule])

  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return products
      .filter((product) => product.module === activeModule)
      .filter(
        (product) =>
          !needle ||
          product.name.toLowerCase().includes(needle) ||
          product.category.toLowerCase().includes(needle) ||
          (product.brand || "").toLowerCase().includes(needle)
      )
      .slice(0, 60)
  }, [products, activeModule, query])

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0)
    const discount = cart.reduce((sum, line) => sum + Math.min(line.discount, line.price * line.quantity), 0)
    const fees = Math.max(0, Number(deliveryFee) || 0) + Math.max(0, Number(installationFee) || 0)
    const net = Math.max(0, subtotal - discount) + fees
    const rate = vatRegistered ? Number(vatRate) || 0 : 0
    const inclusive = vatRegistered && vatInclusive
    const tax = inclusive ? net - net / (1 + rate / 100) : (net * rate) / 100
    const total = inclusive ? net : net + tax
    return {
      subtotal: round(subtotal),
      discount: round(discount),
      tax: round(Math.max(0, tax)),
      total: round(total),
    }
  }, [cart, deliveryFee, installationFee, vatRegistered, vatRate, vatInclusive])

  const paid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
  const balance = round(totals.total - paid)
  const needsPrescription = cart.some((line) => line.requiresPrescription || line.controlledSubstance)

  const addToCart = (product: (typeof products)[number]) => {
    if (product.stockQuantity != null && product.stockQuantity <= 0) {
      toast.error(`${product.name} is out of stock.`)
      return
    }
    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id && !line.serialNumber)
      if (existing) {
        return current.map((line) =>
          line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line
        )
      }
      return [
        ...current,
        {
          key: makeKey(),
          productId: product.id,
          name: product.name,
          price: Number(product.price) || 0,
          quantity: 1,
          discount: 0,
          serialNumber: "",
          warranty: product.warranty || "",
          model: product.model || "",
          requiresPrescription: Boolean(product.requiresPrescription),
          controlledSubstance: Boolean(product.controlledSubstance),
        },
      ]
    })
    setResult(null)
  }

  const updateLine = (key: string, updates: Partial<CartLine>) => {
    setCart((current) => current.map((line) => (line.key === key ? { ...line, ...updates } : line)))
  }

  const removeLine = (key: string) => setCart((current) => current.filter((line) => line.key !== key))

  const updatePayment = (key: string, updates: Partial<PaymentRow>) => {
    setPayments((current) => current.map((row) => (row.key === key ? { ...row, ...updates } : row)))
  }

  const validate = (): string => {
    if (!cart.length) return "Add at least one product to the cart."
    if (!shift) return "Open a till from the Shifts page before recording a sale."
    if (documentType !== "quote") {
      if (payments.length === 0) return "Add a payment before completing the sale."
      if (Math.abs(balance) > 0.01) {
        return balance > 0
          ? `Payments are short by ${formatPrice(balance)}.`
          : `Payments exceed the total by ${formatPrice(Math.abs(balance))}.`
      }
    }
    const subtotal = totals.subtotal
    if (subtotal > 0 && (totals.discount / subtotal) * 100 > maxDiscount) {
      return "The discount exceeds your allowed limit."
    }
    if (needsPrescription && (!prescription.patientName || !prescription.prescriberName)) {
      return "Enter the patient and prescriber details for this prescription."
    }
    return ""
  }

  const buildPayload = () => ({
    module: activeModule,
    channel,
    documentType,
    branchId: adminBranchId || null,
    shiftId: shift?.id || null,
    agentId: channel === "field" && agentId ? agentId : null,
    idempotencyKey,
    customer: {
      name: customer.name || "Walk-in customer",
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      idNumber: customer.idNumber,
    },
    items: cart.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: line.price,
      discountAmount: line.discount,
      serialNumber: line.serialNumber,
    })),
    payments:
      documentType === "quote"
        ? []
        : payments
            .filter((payment) => Number(payment.amount) > 0)
            .map((payment) => ({
              method: payment.method,
              amount: Number(payment.amount),
              reference: payment.reference,
            })),
    notes,
    deliveryFee: Number(deliveryFee) || 0,
    installationFee: Number(installationFee) || 0,
    prescription: needsPrescription ? prescription : null,
  })

  const completeSale = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      toast.error(validationError)
      return
    }
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/pos/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      })
      const data = (await response.json().catch(() => ({}))) as SaleResponse & { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not record the sale.")
      setResult(data)
      toast.success(`${data.sale.saleNumber} recorded.`)
      setCart([])
      setCustomer(emptyCustomer)
      setPrescription(emptyPrescription)
      setPayments([{ key: makeKey(), method: "cash", amount: "", reference: "" }])
      setNotes("")
      setDeliveryFee("0")
      setInstallationFee("0")
      setIdempotencyKey(makeKey())
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not record the sale."
      setError(online ? message : `${message} You appear to be offline; your cart has been kept.`)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const loadHeldSales = async () => {
    setBusy(true)
    try {
      const response = await fetch(`/api/pos/held-sales?module=${activeModule}`, { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load held sales.")
      const data = (await response.json()) as { heldSales: HeldSale[] }
      setHeldSales(data.heldSales)
      setShowHeld(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load held sales.")
    } finally {
      setBusy(false)
    }
  }

  const holdSale = async () => {
    if (!cart.length) {
      setError("Add at least one product before holding the sale.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/pos/held-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: activeModule,
          branchId: adminBranchId || null,
          customer,
          cart,
          notes,
        }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || "Could not hold the sale.")
      }
      toast.success("Sale held. Your cart has been cleared.")
      setCart([])
      setCustomer(emptyCustomer)
      setNotes("")
      setIdempotencyKey(makeKey())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not hold the sale.")
    } finally {
      setBusy(false)
    }
  }

  const resumeHeldSale = (held: HeldSale) => {
    setCart(Array.isArray(held.cart) ? held.cart : [])
    setCustomer({ ...emptyCustomer, ...(held.customer || {}) })
    setNotes(held.notes || "")
    setShowHeld(false)
    setResult(null)
    setIdempotencyKey(makeKey())
    toast.success("Held sale restored.")
  }

  const deleteHeldSale = async (id: string) => {
    try {
      const response = await fetch(`/api/pos/held-sales/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Could not remove the held sale.")
      setHeldSales((current) => current.filter((sale) => sale.id !== id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove the held sale.")
    }
  }

  const uploadPrescription = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const response = await fetch("/api/uploads", { method: "POST", body: form })
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok || !data.url) throw new Error(data.error || "Could not upload the prescription.")
      setPrescription((current) => ({ ...current, imageUrl: data.url! }))
      toast.success("Prescription attached.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload the prescription.")
    } finally {
      setBusy(false)
    }
  }

  const clearSale = () => {
    setCart([])
    setCustomer(emptyCustomer)
    setPrescription(emptyPrescription)
    setPayments([{ key: makeKey(), method: "cash", amount: "", reference: "" }])
    setNotes("")
    setDeliveryFee("0")
    setInstallationFee("0")
    setResult(null)
    setError("")
    setIdempotencyKey(makeKey())
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Point of sale</p>
          <h1 className="text-3xl font-bold">New sale · {moduleInfo.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record in-shop and field sales, print receipts and issue invoices.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outlineSoft" asChild>
            <Link href="/admin/pos/sales">
              <ReceiptText size={17} /> Sales
            </Link>
          </Button>
          <Button variant="outlineSoft" asChild>
            <Link href="/admin/pos/shifts">
              <CreditCard size={17} /> Shifts
            </Link>
          </Button>
        </div>
      </div>

      {!online && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff size={18} className="shrink-0" />
          <p>
            You are offline. You can keep building this sale, but it cannot be recorded until the connection
            returns. Your cart and customer details stay on this page.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <p>{error}</p>
          <button type="button" onClick={() => setError("")} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {shift ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm">
          <CheckCircle2 size={18} className="text-primary" />
          <span className="font-semibold">Till open</span>
          <span className="text-muted-foreground">
            {shift.shiftNumber} · opened {new Date(shift.openedAt).toLocaleString("en-KE")}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>No till is open for your account. Open one before recording a sale.</p>
          <Button size="sm" asChild>
            <Link href="/admin/pos/shifts">Open a till</Link>
          </Button>
        </div>
      )}

      {result ? (
        <Card className="border-primary/20">
          <CardContent className="space-y-4 py-8 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 size={28} />
            </span>
            <h2 className="text-2xl font-bold">{result.sale.saleNumber} recorded</h2>
            <p className="text-muted-foreground">
              {result.sale.documentType === "quote" ? "Quote saved" : "Payment recorded"} ·{" "}
              {formatPrice(result.sale.total)}
            </p>
            {result.warnings?.length ? (
              <p className="text-sm text-amber-700">{result.warnings.join(" ")}</p>
            ) : null}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button asChild>
                <a href={`/api/pos/sales/${result.sale.id}/pdf?paper=a4`} target="_blank" rel="noreferrer">
                  <FileText size={17} /> A4 PDF
                </a>
              </Button>
              <Button variant="outlineSoft" asChild>
                <a href={`/api/pos/sales/${result.sale.id}/pdf?paper=80mm`} target="_blank" rel="noreferrer">
                  <Printer size={17} /> Receipt PDF
                </a>
              </Button>
              <Button variant="outlineSoft" asChild>
                <a href={`/verify/${result.sale.saleNumber}`} target="_blank" rel="noreferrer">
                  Verify document
                </a>
              </Button>
              <Button variant="ghost" onClick={clearSale}>
                <Plus size={17} /> New sale
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Search size={18} /> Products
                </CardTitle>
                <Badge variant="secondary">{visibleProducts.length} items</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, category or brand"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
                />
                {visibleProducts.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    No products found for this division. Add products first.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addToCart(product)}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{product.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatPrice(Number(product.price))}
                            {product.stockQuantity != null ? ` · ${product.stockQuantity} in stock` : ""}
                          </span>
                        </span>
                        <Plus size={16} className="shrink-0 text-primary" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart size={18} /> Cart
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    Your cart is empty.
                  </p>
                ) : (
                  cart.map((line) => (
                    <div key={line.key} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{line.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(line.price)} each</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          aria-label={`Remove ${line.name}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <label className="text-xs">
                          <span className="mb-1 block font-semibold text-muted-foreground">Quantity</span>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(line.key, {
                                quantity: Math.max(1, Number(event.target.value) || 1),
                              })
                            }
                            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                          />
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block font-semibold text-muted-foreground">
                            Discount (KSh)
                          </span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.discount}
                            onChange={(event) =>
                              updateLine(line.key, {
                                discount: Math.max(0, Number(event.target.value) || 0),
                              })
                            }
                            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                          />
                        </label>
                        <div className="flex items-end justify-end pb-1 text-sm font-semibold">
                          {formatPrice(line.price * line.quantity - line.discount)}
                        </div>
                      </div>
                      {(line.model || activeModule === "medical") && (
                        <label className="mt-3 block text-xs">
                          <span className="mb-1 block font-semibold text-muted-foreground">
                            Serial number {line.model ? "(required)" : "(optional)"}
                          </span>
                          <input
                            value={line.serialNumber}
                            onChange={(event) => updateLine(line.key, { serialNumber: event.target.value })}
                            placeholder="e.g. SN-000123"
                            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                          />
                        </label>
                      )}
                      {line.warranty && (
                        <p className="mt-2 text-xs text-muted-foreground">Warranty: {line.warranty}</p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {needsPrescription && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText size={18} /> Prescription details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs">
                    <span className="mb-1 block font-semibold text-muted-foreground">Patient name</span>
                    <input
                      value={prescription.patientName}
                      onChange={(event) =>
                        setPrescription((current) => ({ ...current, patientName: event.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block font-semibold text-muted-foreground">Prescriber name</span>
                    <input
                      value={prescription.prescriberName}
                      onChange={(event) =>
                        setPrescription((current) => ({ ...current, prescriberName: event.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block font-semibold text-muted-foreground">Reg. number</span>
                    <input
                      value={prescription.prescriberRegNo}
                      onChange={(event) =>
                        setPrescription((current) => ({ ...current, prescriberRegNo: event.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block font-semibold text-muted-foreground">Reference</span>
                    <input
                      value={prescription.referenceNumber}
                      onChange={(event) =>
                        setPrescription((current) => ({ ...current, referenceNumber: event.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    <span className="mb-1 block font-semibold text-muted-foreground">
                      Prescription image (JPG/PNG)
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(event) => uploadPrescription(event.target.files?.[0])}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    {prescription.imageUrl && (
                      <span className="mt-1 block text-xs text-primary">Prescription attached.</span>
                    )}
                  </label>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Document &amp; customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(["receipt", "invoice", "quote"] as DocumentType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDocumentType(type)}
                      className={`rounded-lg border px-2 py-2 text-xs font-semibold capitalize transition ${
                        documentType === type
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(["in_shop", "field"] as Channel[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setChannel(option)}
                      className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                        channel === option
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {option === "in_shop" ? "In shop" : "Field"}
                    </button>
                  ))}
                </div>
                {channel === "field" && (
                  <label className="block text-xs">
                    <span className="mb-1 block font-semibold text-muted-foreground">Field agent</span>
                    <select
                      value={agentId}
                      onChange={(event) => setAgentId(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    >
                      <option value="">No agent selected</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.adminName || agent.adminEmail || agent.territory || "Agent"}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {([
                  ["name", "Customer name"],
                  ["phone", "Phone"],
                  ["email", "Email"],
                  ["idNumber", "ID / passport"],
                  ["address", "Address"],
                ] as [keyof CustomerForm, string][]).map(([field, label]) => (
                  <label key={field} className="block text-xs">
                    <span className="mb-1 block font-semibold text-muted-foreground">{label}</span>
                    <input
                      type={field === "email" ? "email" : "text"}
                      value={customer[field]}
                      onChange={(event) => setCustomer((current) => ({ ...current, [field]: event.target.value }))}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </label>
                ))}
                <label className="block text-xs">
                  <span className="mb-1 block font-semibold text-muted-foreground">Notes</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs">
                    <span className="mb-1 block font-semibold text-muted-foreground">Delivery</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={deliveryFee}
                      onChange={(event) => setDeliveryFee(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block font-semibold text-muted-foreground">Installation</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={installationFee}
                      onChange={(event) => setInstallationFee(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payments.map((payment, index) => (
                  <div key={payment.key} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Payment {index + 1}</span>
                      {payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPayments((current) => current.filter((row) => row.key !== payment.key))}
                          className="text-xs font-semibold text-danger"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="text-xs">
                        <span className="mb-1 block font-semibold text-muted-foreground">Method</span>
                        <select
                          value={payment.method}
                          onChange={(event) =>
                            updatePayment(payment.key, { method: event.target.value as PaymentMethod })
                          }
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                        >
                          <option value="cash">Cash</option>
                          <option value="mpesa">M-Pesa</option>
                          <option value="card">Card</option>
                          <option value="bank">Bank</option>
                          <option value="credit">Credit</option>
                        </select>
                      </label>
                      <label className="text-xs">
                        <span className="mb-1 block font-semibold text-muted-foreground">Amount</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={payment.amount}
                          onChange={(event) => updatePayment(payment.key, { amount: event.target.value })}
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                        />
                      </label>
                    </div>
                    <label className="mt-2 block text-xs">
                      <span className="mb-1 block font-semibold text-muted-foreground">Reference</span>
                      <input
                        value={payment.reference}
                        onChange={(event) => updatePayment(payment.key, { reference: event.target.value })}
                        placeholder="e.g. M-Pesa code"
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      />
                    </label>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outlineSoft"
                  size="sm"
                  onClick={() =>
                    setPayments((current) => [...current, { key: makeKey(), method: "cash", amount: "", reference: "" }])
                  }
                >
                  <Plus size={15} /> Add payment
                </Button>
              </CardContent>
            </Card>

            <Card className="sticky bottom-4">
              <CardContent className="space-y-3 py-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatPrice(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-semibold">−{formatPrice(totals.discount)}</span>
                </div>
                {vatRegistered && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">VAT ({vatRate}%{vatInclusive ? " incl." : ""})</span>
                    <span className="font-semibold">{formatPrice(totals.tax)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">{formatPrice(totals.total)}</span>
                </div>
                {documentType !== "quote" && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {balance > 0 ? "Balance due" : balance < 0 ? "Overpayment" : "Paid in full"}
                    </span>
                    <span className={`font-semibold ${balance === 0 ? "text-primary" : "text-danger"}`}>
                      {formatPrice(Math.abs(balance))}
                    </span>
                  </div>
                )}
                <Button
                  type="button"
                  className="w-full"
                  size="touch"
                  onClick={completeSale}
                  disabled={busy || !online || !shift}
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  {busy ? "Recording…" : documentType === "quote" ? "Save quote" : "Complete sale"}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outlineSoft" size="sm" onClick={holdSale} disabled={busy}>
                    <PauseCircle size={15} /> Hold
                  </Button>
                  <Button type="button" variant="outlineSoft" size="sm" onClick={loadHeldSales} disabled={busy}>
                    <ArrowLeft size={15} /> Held sales
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {showHeld && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Held sales</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowHeld(false)}>
                Close
              </Button>
            </div>
            <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
              {heldSales.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No held sales for this division.
                </p>
              ) : (
                heldSales.map((held) => (
                  <div key={held.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{held.customer?.name || "Walk-in customer"}</p>
                      <p className="text-xs text-muted-foreground">
                        {held.cart?.length || 0} items · {new Date(held.updatedAt).toLocaleString("en-KE")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => resumeHeldSale(held)}>
                        Resume
                      </Button>
                      <Button size="sm" variant="outlineSoft" onClick={() => deleteHeldSale(held.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
