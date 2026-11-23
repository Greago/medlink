"use client"

import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Check,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  Send,
  Trash2,
  X,
  XCircle,
} from "lucide-react"
import {
  Badge,
  Button,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  EmptyState,
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  SectionHeader,
  StatCard,
} from "@/components/design-system"
import { formatPrice } from "@/lib/catalogue"
import { buildQuotePdf } from "@/lib/quote-pdf"
import { useStore, type Quote, type QuoteItem } from "@/lib/store"

const PAGE_SIZE = 8

const statusVariant: Record<Quote["status"], "soft" | "info" | "success" | "danger" | "warning"> = {
  Draft: "soft",
  Sent: "info",
  Accepted: "success",
  Rejected: "danger",
  Expired: "warning",
}

const statusIcon: Record<Quote["status"], typeof FileText> = {
  Draft: FileText,
  Sent: Send,
  Accepted: Check,
  Rejected: XCircle,
  Expired: Clock,
}

function generateQuoteNumber() {
  const date = new Date()
  const year = date.getFullYear()
  const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `MEV/QT/${year}/${sequence}`
}

async function loadImageAsDataUrl(url: string) {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === "string") resolve(reader.result)
        else reject(new Error("Unable to convert image to data URL"))
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function downloadQuotePdf(quote: Quote) {
  const logoDataUrl = await loadImageAsDataUrl("/teallogo.png")
  const pdf = await buildQuotePdf(quote, logoDataUrl)
  const blob = new Blob([pdf as unknown as BlobPart], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `Quote-${quote.quoteNumber}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function QuotesClient() {
  const { quotes, addQuote, sendQuoteEmail, products, inquiries } = useStore()
  const searchParams = useSearchParams()
  const inquiryId = searchParams.get("inquiryId")
  const inquiry = inquiryId ? inquiries.find((item) => item.id === inquiryId) : null

  const [showForm, setShowForm] = useState(false)
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [taxRate, setTaxRate] = useState(10)
  const [validDays, setValidDays] = useState(30)
  const [paymentTerms, setPaymentTerms] = useState("Net 30 - Payment due within 30 days of invoice date")
  const [notes, setNotes] = useState("")
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null)
  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<Quote["status"] | "All">("All")
  const [page, setPage] = useState(1)

  const [clientName, setClientName] = useState(inquiry?.contactPerson || "")
  const [clientCompany, setClientCompany] = useState(inquiry?.companyName || "")
  const [clientEmail, setClientEmail] = useState(inquiry?.email || "")
  const [clientPhone, setClientPhone] = useState(inquiry?.phone || "")
  const [clientAddress, setClientAddress] = useState("")

  useEffect(() => {
    if (inquiry) {
      setClientName(inquiry.contactPerson)
      setClientCompany(inquiry.companyName)
      setClientEmail(inquiry.email)
      setClientPhone(inquiry.phone)
      setShowForm(true)
    }
  }, [inquiry])

  const addProductToQuote = () => {
    if (!selectedProductId) return
    const product = products.find((item) => item.id === selectedProductId)
    if (!product) return
    const existing = quoteItems.find((item) => item.productName === product.name)
    if (existing) {
      setQuoteItems(
        quoteItems.map((item) =>
          item.productName === product.name
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
            : item
        )
      )
    } else {
      setQuoteItems([
        ...quoteItems,
        { productName: product.name, quantity: 1, unitPrice: product.price, total: product.price },
      ])
    }
    setSelectedProductId("")
  }

  const addCustomItem = () => {
    setQuoteItems([...quoteItems, { productName: "", quantity: 1, unitPrice: 0, total: 0 }])
  }

  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    const updated = [...quoteItems]
    updated[index] = { ...updated[index], [field]: value }
    if (field === "quantity" || field === "unitPrice") {
      updated[index].total = updated[index].quantity * updated[index].unitPrice
    }
    setQuoteItems(updated)
  }

  const removeItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, itemIndex) => itemIndex !== index))
  }

  const subtotal = quoteItems.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const totalPrice = subtotal + taxAmount

  const resetForm = () => {
    setShowForm(false)
    setQuoteItems([])
    setClientName("")
    setClientCompany("")
    setClientEmail("")
    setClientPhone("")
    setClientAddress("")
    setNotes("")
    setTaxRate(10)
    setValidDays(30)
  }

  const handleCreateQuote = async () => {
    if (quoteItems.length === 0 || !clientName || !clientCompany) {
      toast.error("Add at least one item, a contact name and a company.")
      return
    }

    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validDays)

    const newQuote: Quote = {
      id: Date.now().toString(),
      quoteNumber: generateQuoteNumber(),
      inquiryId: inquiryId || undefined,
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      clientAddress,
      items: quoteItems,
      subtotal,
      taxRate,
      taxAmount,
      totalPrice,
      validUntil: validUntil.toISOString(),
      paymentTerms,
      notes,
      status: "Draft",
      createdAt: new Date().toISOString(),
    }

    try {
      await addQuote(newQuote)
      toast.success(`Quote ${newQuote.quoteNumber} saved as a draft`)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the quote.")
    }
  }

  const handleSendEmail = async (quote: Quote) => {
    setSendingQuoteId(quote.id)
    try {
      await sendQuoteEmail(quote.id)
      toast.success(`Quote ${quote.quoteNumber} emailed to ${quote.clientEmail || "the customer"}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not email the quote.")
    } finally {
      setSendingQuoteId(null)
    }
  }

  const handleDownload = async (quote: Quote) => {
    setDownloadingId(quote.id)
    try {
      await downloadQuotePdf(quote)
      toast.success(`Quote ${quote.quoteNumber} PDF downloaded`)
    } catch {
      toast.error("Could not generate the quote PDF.")
    } finally {
      setDownloadingId(null)
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return quotes
      .filter((quote) => {
        const matchesStatus = status === "All" || quote.status === status
        const matchesQuery =
          !needle ||
          [quote.quoteNumber, quote.clientName, quote.clientCompany, quote.clientEmail]
            .join(" ")
            .toLowerCase()
            .includes(needle)
        return matchesStatus && matchesQuery
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [quotes, query, status])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const draftCount = quotes.filter((quote) => quote.status === "Draft").length
  const quotedValue = quotes.reduce((total, quote) => total + quote.totalPrice, 0)

  const inputClass =
    "h-10 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
  const tableInputClass =
    "w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"

  return (
    <div className="space-y-6 p-4 lg:p-7">
      <SectionHeader
        eyebrow="Customer requests"
        title="Quote generator"
        description="Build a formal KSh quote, preview it, download the PDF and email it to the customer. Quotes are shared across both divisions."
        action={
          <Button variant="primary" size="touch" onClick={() => setShowForm(true)}>
            <Plus size={17} /> New quote
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="All quotes" value={quotes.length} icon={FileText} hint="Both divisions" />
        <StatCard label="Drafts" value={draftCount} icon={Clock} hint="Not yet sent" />
        <StatCard label="Quoted value" value={formatPrice(quotedValue)} icon={Check} hint="KSh total" />
      </div>

      <Card className="gap-0 p-4 lg:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1) }}
              placeholder="Search quote number, company or email"
              className="h-11 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </div>
          <label className="relative">
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(event) => { setStatus(event.target.value as Quote["status"] | "All"); setPage(1) }}
              className="h-11 appearance-none rounded-xl border border-input bg-background pl-4 pr-10 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            >
              <option value="All">All statuses</option>
              {(Object.keys(statusVariant) as Quote["status"][]).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </label>
        </div>
      </Card>

      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotes yet"
          description="Create your first quote to get started."
          action={<Button variant="primary" onClick={() => setShowForm(true)}><Plus size={16} /> Create quote</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching quotes"
          description="Try a different search term or status."
          action={<Button variant="soft" onClick={() => { setQuery(""); setStatus("All") }}>Clear filters</Button>}
        />
      ) : (
        <>
          <Card className="gap-0 overflow-hidden p-0">
            <div className="overflow-x-auto">
              <DataTable>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>Quote</DataTableHead>
                    <DataTableHead>Client</DataTableHead>
                    <DataTableHead>Status</DataTableHead>
                    <DataTableHead>Items</DataTableHead>
                    <DataTableHead>Total</DataTableHead>
                    <DataTableHead className="text-right">Actions</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {visible.map((quote) => {
                    const Icon = statusIcon[quote.status]
                    return (
                      <DataTableRow key={quote.id}>
                        <DataTableCell>
                          <span className="flex items-center gap-2 font-semibold">
                            <Icon size={15} className="text-primary" /> {quote.quoteNumber}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </span>
                        </DataTableCell>
                        <DataTableCell>
                          <span className="block text-xs font-semibold">{quote.clientCompany}</span>
                          <span className="block text-xs text-muted-foreground">{quote.clientName}</span>
                        </DataTableCell>
                        <DataTableCell><Badge variant={statusVariant[quote.status]}>{quote.status}</Badge></DataTableCell>
                        <DataTableCell>{quote.items.length}</DataTableCell>
                        <DataTableCell className="font-semibold text-primary">{formatPrice(quote.totalPrice)}</DataTableCell>
                        <DataTableCell>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon-sm" onClick={() => setPreviewQuote(quote)} aria-label={`Preview ${quote.quoteNumber}`}>
                              <Eye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => void handleDownload(quote)}
                              disabled={downloadingId === quote.id}
                              aria-label={`Download ${quote.quoteNumber} PDF`}
                            >
                              {downloadingId === quote.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            </Button>
                            <Button
                              variant="soft"
                              size="sm"
                              onClick={() => void handleSendEmail(quote)}
                              disabled={sendingQuoteId === quote.id}
                            >
                              {sendingQuoteId === quote.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                              {quote.status === "Sent" ? "Resend" : "Email"}
                            </Button>
                          </div>
                        </DataTableCell>
                      </DataTableRow>
                    )
                  })}
                </DataTableBody>
              </DataTable>
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outlineSoft" size="sm" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
              <span className="font-semibold text-ink">Page {currentPage} of {pageCount}</span>
              <Button variant="outlineSoft" size="sm" disabled={currentPage >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}

      <Modal open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <ModalContent className="flex max-h-[92vh] max-w-6xl flex-col gap-0 overflow-hidden p-0">
          <ModalHeader className="border-b border-border p-6 pr-14">
            <ModalTitle>Create new quote</ModalTitle>
            <ModalDescription>Add client details and KSh-priced line items. The quote is saved as a draft.</ModalDescription>
          </ModalHeader>

          <div className="grid flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-6">
              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-primary">Client information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold">Contact name *</span>
                    <input value={clientName} onChange={(event) => setClientName(event.target.value)} className={inputClass} placeholder="John Smith" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold">Company name *</span>
                    <input value={clientCompany} onChange={(event) => setClientCompany(event.target.value)} className={inputClass} placeholder="Healthcare facility" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold">Email</span>
                    <input type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} className={inputClass} placeholder="client@example.co.ke" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold">Phone</span>
                    <input type="tel" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} className={inputClass} placeholder="+254 ..." />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold">Address</span>
                    <input value={clientAddress} onChange={(event) => setClientAddress(event.target.value)} className={inputClass} placeholder="Optional" />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-primary">Line items</h3>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                  <label className="relative flex-1">
                    <span className="sr-only">Select a product</span>
                    <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className={`${inputClass} appearance-none pr-10`}>
                      <option value="">Select a product…</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>{product.name} — {formatPrice(product.price)}</option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </label>
                  <Button variant="primary" size="touch" onClick={addProductToQuote} disabled={!selectedProductId}>Add</Button>
                  <Button variant="outlineSoft" size="touch" onClick={addCustomItem}>Custom item</Button>
                </div>

                {quoteItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                    No items added yet. Select a product or add a custom item.
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-2xl border border-border">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-muted/80 text-[10px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                        <tr>
                          <th className="px-3 py-2">Item</th>
                          <th className="w-20 px-2 py-2 text-center">Qty</th>
                          <th className="w-28 px-2 py-2 text-right">Unit price</th>
                          <th className="w-28 px-2 py-2 text-right">Total</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {quoteItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2">
                              <input value={item.productName} onChange={(event) => updateItem(index, "productName", event.target.value)} className={tableInputClass} placeholder="Item name" />
                            </td>
                            <td className="px-2 py-2">
                              <input type="number" min={1} value={item.quantity} onChange={(event) => updateItem(index, "quantity", Number(event.target.value) || 1)} className={`${tableInputClass} text-center`} />
                            </td>
                            <td className="px-2 py-2">
                              <input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, "unitPrice", Number(event.target.value) || 0)} className={`${tableInputClass} text-right`} />
                            </td>
                            <td className="px-2 py-2 text-right text-sm font-semibold">{formatPrice(item.total)}</td>
                            <td className="px-1 py-2">
                              <Button variant="ghost" size="icon-sm" onClick={() => removeItem(index)} aria-label="Remove item" className="text-danger">
                                <Trash2 size={15} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-4">
              <Card className="gap-0 p-4">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-primary">Quote settings</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold">Tax rate (%)</span>
                    <input type="number" min={0} max={100} step="0.1" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value) || 0)} className={inputClass} />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold">Valid for (days)</span>
                    <input type="number" min={1} value={validDays} onChange={(event) => setValidDays(Number(event.target.value) || 30)} className={inputClass} />
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className="mb-1.5 block text-xs font-semibold">Payment terms</span>
                  <select value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} className={inputClass}>
                    <option>Net 30 - Payment due within 30 days of invoice date</option>
                    <option>Net 15 - Payment due within 15 days of invoice date</option>
                    <option>Due on Receipt - Payment due immediately</option>
                    <option>50% Upfront - 50% due before delivery</option>
                    <option>Custom terms (specify in notes)</option>
                  </select>
                </label>
                <label className="mt-3 block">
                  <span className="mb-1.5 block text-xs font-semibold">Notes</span>
                  <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25" placeholder="Delivery notes or additional terms" />
                </label>
              </Card>

              <Card className="gap-0 bg-muted/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Summary</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span>{formatPrice(taxAmount)}</span></div>
                  <div className="flex justify-between border-t border-border pt-3 text-base font-bold text-primary">
                    <span>Total</span><span>{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <ModalFooter className="border-t border-border bg-muted/30 p-4 sm:p-5">
            <Button variant="outlineSoft" size="touch" onClick={resetForm}>Cancel</Button>
            <Button variant="primary" size="touch" onClick={() => void handleCreateQuote()} disabled={quoteItems.length === 0 || !clientName || !clientCompany}>
              <FileText size={16} /> Create quote
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={Boolean(previewQuote)} onOpenChange={(open) => !open && setPreviewQuote(null)}>
        <ModalContent className="flex max-h-[92vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
          {previewQuote && (
            <>
              <ModalHeader className="border-b border-border p-5 pr-14 sm:p-6 sm:pr-14">
                <ModalTitle>Quote preview</ModalTitle>
                <ModalDescription>{previewQuote.quoteNumber} · Created {new Date(previewQuote.createdAt).toLocaleDateString()}</ModalDescription>
              </ModalHeader>
              <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Image src="/logo.png" alt="Medlink Logo" width={56} height={56} className="rounded-xl object-contain" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Medlink Expedite</p>
                      <p className="text-lg font-bold">Quotation</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>info@medlinkexpedite.co.ke</p>
                    <p>+254 743 325 746</p>
                    <p>Nairobi, Kenya</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-muted/50 p-4 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Bill to</p>
                    <p className="mt-2 font-semibold">{previewQuote.clientName}</p>
                    <p>{previewQuote.clientCompany}</p>
                    <p>{previewQuote.clientEmail}</p>
                    <p>{previewQuote.clientPhone}</p>
                    {previewQuote.clientAddress && <p className="mt-2">{previewQuote.clientAddress}</p>}
                  </div>
                  <div className="rounded-2xl bg-muted/50 p-4 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Quote details</p>
                    <dl className="mt-2 space-y-1.5">
                      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Valid until</dt><dd>{new Date(previewQuote.validUntil).toLocaleDateString()}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Status</dt><dd><Badge variant={statusVariant[previewQuote.status]}>{previewQuote.status}</Badge></dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Payment terms</dt><dd className="text-right">{previewQuote.paymentTerms}</dd></div>
                    </dl>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr><th className="px-4 py-2">Item</th><th className="px-2 py-2 text-center">Qty</th><th className="px-2 py-2 text-right">Unit</th><th className="px-4 py-2 text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewQuote.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 font-medium">{item.productName || "Custom item"}</td>
                          <td className="px-2 py-3 text-center">{item.quantity}</td>
                          <td className="px-2 py-3 text-right">{formatPrice(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatPrice(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
                  <div className="rounded-2xl bg-muted/50 p-4 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Payment details</p>
                    <div className="mt-2 space-y-1">
                      <p><span className="font-semibold">M-Pesa paybill:</span> 400200</p>
                      <p><span className="font-semibold">Account number:</span> 01102787392001</p>
                      <p className="pt-2"><span className="font-semibold">Bank:</span> Co-operative Bank of Kenya</p>
                      <p><span className="font-semibold">Account name:</span> Medlink Expedite Ventures Ltd</p>
                      <p><span className="font-semibold">Account number:</span> 01102787392001</p>
                    </div>
                    {previewQuote.notes && <p className="mt-3 border-t border-border pt-3 text-muted-foreground">{previewQuote.notes}</p>}
                  </div>
                  <div className="rounded-2xl border border-border p-4 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(previewQuote.subtotal)}</span></div>
                    <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatPrice(previewQuote.taxAmount)}</span></div>
                    <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-bold text-primary"><span>Total</span><span>{formatPrice(previewQuote.totalPrice)}</span></div>
                  </div>
                </div>
              </div>
              <ModalFooter className="border-t border-border bg-muted/30 p-4 sm:p-5">
                <Button variant="outlineSoft" size="touch" onClick={() => setPreviewQuote(null)}>Close</Button>
                <Button variant="soft" size="touch" onClick={() => void handleDownload(previewQuote)} disabled={downloadingId === previewQuote.id}>
                  {downloadingId === previewQuote.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Download PDF
                </Button>
                <Button variant="primary" size="touch" onClick={() => void handleSendEmail(previewQuote)} disabled={sendingQuoteId === previewQuote.id}>
                  {sendingQuoteId === previewQuote.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {previewQuote.status === "Sent" ? "Resend email" : "Email quote"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
