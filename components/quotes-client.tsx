"use client"

import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { useStore, type Quote, type QuoteItem } from "@/lib/store"
import { Plus, Download, Trash2, FileText, X, Send, Check, Clock, XCircle, Eye } from "lucide-react"

// Generate quote number
function generateQuoteNumber() {
  const date = new Date()
  const year = date.getFullYear()
  const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `MEV/QT/${year}/${sequence}`
}

function formatKES(value: number) {
  return value.toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  })
}

async function loadImageAsDataUrl(url: string) {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result)
        } else {
          reject(new Error("Unable to convert image to data URL"))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// PDF Generation function
async function generatePDF(quote: Quote) {
  // Dynamically import jspdf
  const { default: jsPDF } = await import("jspdf")
  
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let y = 20
  const headerRgb = [0, 77, 62] as const
  const accentRgb = [14, 110, 92] as const
  const bodyRgb = [40, 40, 40] as const

  const addPageIfNeeded = (spaceNeeded: number) => {
    if (y + spaceNeeded > pageHeight - margin) {
      doc.addPage()
      y = margin
      return true
    }
    return false
  }

  const addTableHeader = () => {
    doc.setFillColor(...headerRgb)
    doc.rect(margin, y, pageWidth - margin * 2, 10, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("ITEM", margin + 3, y + 7)
    doc.text("QTY", 110, y + 7)
    doc.text("UNIT PRICE", 130, y + 7)
    doc.text("TOTAL", pageWidth - margin - 3, y + 7, { align: "right" })
  }

  // Header
  doc.setFillColor(...headerRgb)
  doc.rect(0, 0, pageWidth, 48, "F")

  const logoDataUrl = await loadImageAsDataUrl("/teallogo.png")
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", margin, 12, 40, 22)
  }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.setFont("helvetica", "bold")
  const headerX = margin + 58
  let headerY = 18
  doc.text("MEDLINK EXPEDITE VENTURES LIMITED", headerX, headerY)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  headerY += 8
  doc.text("Email: info@medlinkexpedite.co.ke", headerX, headerY)
  headerY += 6
  doc.text("Tel: +254 743 325 746", headerX, headerY)
  headerY += 6
  doc.text("Nairobi, Kenya", headerX, headerY)
  headerY += 6
  doc.text("Reliable Medical Equipment and Supplies", headerX, headerY)

  // Quote title
  y = 60
  doc.setTextColor(...accentRgb)
  doc.setFontSize(28)
  doc.setFont("helvetica", "bold")
  doc.text("QUOTATION", pageWidth - margin, y, { align: "right" })
  
  // Quote details
  y = 75
  doc.setTextColor(...bodyRgb)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Quote #: ${quote.quoteNumber}`, pageWidth - margin, y, { align: "right" })
  doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, pageWidth - margin, y + 6, { align: "right" })
  doc.text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, pageWidth - margin, y + 12, { align: "right" })

  // Client info
  y = 75
  doc.setTextColor(...accentRgb)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("BILL TO:", margin, y)
  doc.setTextColor(...bodyRgb)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(quote.clientName, margin, y + 8)
  doc.text(quote.clientCompany, margin, y + 14)
  doc.text(quote.clientEmail, margin, y + 20)
  doc.text(quote.clientPhone, margin, y + 26)
  if (quote.clientAddress) {
    const addressLines = doc.splitTextToSize(quote.clientAddress, 80)
    doc.text(addressLines, margin, y + 32)
  }

  // Table header
  y = 120
  addTableHeader()

  // Table rows
  y += 15
  doc.setFont("helvetica", "normal")
  quote.items.forEach((item, index) => {
    if (addPageIfNeeded(40)) {
      addTableHeader()
      y += 15
    }

    doc.setFillColor(index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 250)
    doc.rect(margin, y - 5, pageWidth - margin * 2, 10, "F")
    
    doc.setTextColor(50, 50, 50)
    const productName = doc.splitTextToSize(item.productName, 70)
    doc.text(productName[0], margin + 3, y + 2)
    doc.text(item.quantity.toString(), 110, y + 2)
    doc.text(formatKES(item.unitPrice), 130, y + 2)
    doc.text(formatKES(item.total), pageWidth - margin - 3, y + 2, { align: "right" })
    y += 12
  })

  // Totals
  if (addPageIfNeeded(80)) {
    // leave enough room for totals and summary
  }

  y += 10
  doc.setDrawColor(...accentRgb)
  doc.line(120, y, pageWidth - margin, y)
  y += 8
  
  doc.setTextColor(...bodyRgb)
  doc.setFont("helvetica", "normal")
  doc.text("Subtotal:", 130, y)
  doc.text(formatKES(quote.subtotal), pageWidth - margin - 3, y, { align: "right" })
  
  y += 8
  doc.text(`Tax (${quote.taxRate}%):`, 130, y)
  doc.text(formatKES(quote.taxAmount), pageWidth - margin - 3, y, { align: "right" })
  
  y += 10
  doc.setFillColor(...headerRgb)
  doc.rect(120, y - 5, pageWidth - margin - 120, 12, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("TOTAL:", 130, y + 3)
  doc.text(formatKES(quote.totalPrice), pageWidth - margin - 3, y + 3, { align: "right" })

  // Terms and conditions and notes
  const terms = [
    "1. This quotation is valid for thirty (30) days from the date of issue unless otherwise stated.",
    "2. Prices quoted are in Kenya Shillings (KSh) and are inclusive of applicable VAT.",
    "3. Delivery timelines shall be communicated upon confirmation of the order.",
  ]
  const estimatedTermsHeight = terms.reduce((height, term) => {
    const termLines = doc.splitTextToSize(term, pageWidth - margin * 2)
    return height + termLines.length * 6 + 10
  }, 0)

  if (addPageIfNeeded(estimatedTermsHeight + 80)) {
    // start terms on a fresh page if needed
  }

  y += 25
  doc.setTextColor(...accentRgb)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("TERMS AND CONDITIONS", margin, y)
  y += 6
  doc.setTextColor(...bodyRgb)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")

  const lineSpacing = 4
  terms.forEach(term => {
    const termLines = doc.splitTextToSize(term, pageWidth - margin * 2)
    y += 2
    doc.text(termLines, margin, y)
    y += termLines.length * lineSpacing
  })

  y += 10
  doc.setTextColor(...accentRgb)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("PAYMENT DETAILS", margin, y)
  y += 6
  doc.setTextColor(...bodyRgb)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("Paybill Number: 400200", margin, y)
  y += 6
  doc.text("Account Number: 01102787392001", margin, y)
  y += 8
  doc.setFont("helvetica", "bold")
  doc.text("Bank Transfer Details", margin, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.text("Account Name: Medlink Expedite Ventures Ltd", margin, y)
  y += 6
  doc.text("Account Number: 01102787392001", margin, y)
  y += 6
  doc.text("Bank: Co-operative Bank of Kenya", margin, y)
  y += 8
  doc.setFont("helvetica", "italic")
  doc.text(
    "Kindly use the quotation number as the payment reference and share proof of payment for processing.",
    margin,
    y,
    { maxWidth: pageWidth - margin * 2 }
  )

  if (quote.notes) {
    if (addPageIfNeeded(40)) {
      // start notes on a fresh page if there isn't enough space
    }
    y += 14
    doc.setFont("helvetica", "bold")
    doc.text("NOTES:", margin, y)
    doc.setFont("helvetica", "normal")
    const noteLines = doc.splitTextToSize(quote.notes, pageWidth - margin * 2)
    doc.text(noteLines, margin, y + 6)
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setDrawColor(...accentRgb)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10)
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text("Medlink Expediate Ventures Limited | info@medlinkexpedite.co.ke | +254 743 325 746", pageWidth / 2, footerY, { align: "center" })

  // Save
  doc.save(`Quote-${quote.quoteNumber}.pdf`)
}

const statusColors = {
  Draft: { bg: "bg-gray-100", text: "text-gray-700", icon: FileText },
  Sent: { bg: "bg-blue-100", text: "text-blue-700", icon: Send },
  Accepted: { bg: "bg-green-100", text: "text-green-700", icon: Check },
  Rejected: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
  Expired: { bg: "bg-amber-100", text: "text-amber-700", icon: Clock },
}

export function QuotesClient() {
  const { quotes, addQuote, products, inquiries } = useStore()
  const searchParams = useSearchParams()
  const inquiryId = searchParams.get("inquiryId")
  const inquiry = inquiryId ? inquiries.find(i => i.id === inquiryId) : null

  const [showForm, setShowForm] = useState(false)
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [taxRate, setTaxRate] = useState(10)
  const [validDays, setValidDays] = useState(30)
  const [paymentTerms, setPaymentTerms] = useState("Net 30 - Payment due within 30 days of invoice date")
  const [notes, setNotes] = useState("")
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null)

  // Client info
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
    
    const product = products.find(p => p.id === selectedProductId)
    if (!product) return

    // Check if already added
    const existing = quoteItems.find(i => i.productName === product.name)
    if (existing) {
      setQuoteItems(quoteItems.map(i => 
        i.productName === product.name 
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
          : i
      ))
    } else {
      setQuoteItems([...quoteItems, {
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        total: product.price
      }])
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
    setQuoteItems(quoteItems.filter((_, i) => i !== index))
  }

  const subtotal = quoteItems.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const totalPrice = subtotal + taxAmount

  const handleCreateQuote = () => {
    if (quoteItems.length === 0 || !clientName || !clientCompany) return

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

    addQuote(newQuote)
    resetForm()
  }

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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#0f2b2e]">Quote Generator</h1>
          <p className="text-[#5f7a7d] mt-1">Create professional quotes and export as PDF</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 bg-[#0d9488] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0f766e] transition-colors"
        >
          <Plus size={20} /> New Quote
        </button>
      </div>

      {/* Quote Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[calc(100vh-3rem)] overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-[#0f2b2e]">Create New Quote</h2>
                <p className="text-sm text-[#5f7a7d]">Fill in client details and add products</p>
              </div>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-hidden">
              <div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
                <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-18rem)] pr-4">
                  {/* Client Information */}
                  <div>
                <h3 className="text-sm font-semibold text-[#0f2b2e] uppercase tracking-wide mb-4">Client Information</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0f2b2e] mb-1">Contact Name *</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0f2b2e] mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={clientCompany}
                      onChange={(e) => setClientCompany(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                      placeholder="Healthcare Inc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0f2b2e] mb-1">Email</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                      placeholder="john@healthcare.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0f2b2e] mb-1">Phone</label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-[#0f2b2e] mb-1">Address</label>
                    <input
                      type="text"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                      placeholder="123 Medical Center Dr, New York, NY 10001"
                    />
                  </div>
                </div>
              </div>

              {/* Add Products */}
              <div>
                <h3 className="text-sm font-semibold text-[#0f2b2e] uppercase tracking-wide mb-4">Line Items</h3>
                
                {/* Product selector */}
                <div className="flex gap-3 mb-4">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                  >
                    <option value="">Select a product...</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {formatKES(product.price)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addProductToQuote}
                    disabled={!selectedProductId}
                    className="px-4 py-2.5 bg-[#0d9488] text-white rounded-lg font-medium hover:bg-[#0f766e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                  <button
                    onClick={addCustomItem}
                    className="px-4 py-2.5 border border-gray-300 text-[#0f2b2e] rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Custom Item
                  </button>
                </div>

                {/* Items table */}
                {quoteItems.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[24rem] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Product</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase w-24">Qty</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase w-32">Unit Price</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase w-32">Total</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {quoteItems.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.productName}
                                onChange={(e) => updateItem(index, "productName", e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0d9488]"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-[#0d9488]"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-[#0d9488]"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-[#0f2b2e]">
                              {formatKES(item.total)}
                            </td>
                            <td className="px-2 py-3">
                              <button
                                onClick={() => removeItem(index)}
                                className="p-1.5 hover:bg-red-50 rounded text-red-500"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {quoteItems.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                    <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">No items added yet</p>
                    <p className="text-sm text-gray-400">Select a product above or add a custom item</p>
                  </div>
                )}
              </div>
            </div>

              <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-18rem)] pl-4">
                {/* Totals and Settings */}
                {quoteItems.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#0f2b2e] mb-1">Tax Rate (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={taxRate}
                          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#0f2b2e] mb-1">Valid for (days)</label>
                        <input
                          type="number"
                          min="1"
                          value={validDays}
                          onChange={(e) => setValidDays(parseInt(e.target.value) || 30)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0f2b2e] mb-1">Payment Terms</label>
                      <select
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                      >
                        <option>Net 30 - Payment due within 30 days of invoice date</option>
                        <option>Net 15 - Payment due within 15 days of invoice date</option>
                        <option>Due on Receipt - Payment due immediately</option>
                        <option>50% Upfront - 50% due before delivery</option>
                        <option>Custom terms (specify in notes)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0f2b2e] mb-1">Notes</label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] resize-none"
                        placeholder="Additional terms, delivery notes, etc."
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-gray-600 uppercase mb-4">Quote Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[#0f2b2e]">
                        <span>Subtotal</span>
                        <span className="font-medium">{formatKES(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-[#0f2b2e]">
                        <span>Tax ({taxRate}%)</span>
                        <span className="font-medium">{formatKES(taxAmount)}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-3 flex justify-between">
                        <span className="font-bold text-lg text-[#0f2b2e]">Total</span>
                        <span className="font-bold text-xl text-[#0d9589]">{formatKES(totalPrice)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={resetForm}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateQuote}
                disabled={quoteItems.length === 0 || !clientName || !clientCompany}
                className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg font-medium hover:bg-[#0f766e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FileText size={18} /> Create Quote
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Quote Preview Modal */}
      {previewQuote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-[#0f2b2e]">Quote Preview</h2>
              <button onClick={() => setPreviewQuote(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <Image
                    src="/logo.png"
                    alt="Medlink Logo"
                    width={72}
                    height={72}
                    className="rounded-2xl object-contain"
                  />
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-[#0d9589] font-semibold">Medlink Expedite</p>
                    <p className="text-lg font-bold text-[#0f2b2e]">Quotation</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500 space-y-1 text-right">
                  <p>info@medlinkexpedite.co.ke</p>
                  <p>+254 743 325 746</p>
                  <p>Nairobi, Kenya</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">Bill To</p>
                  <p className="font-semibold text-[#0f2b2e]">{previewQuote.clientName}</p>
                  <p className="text-sm text-gray-600">{previewQuote.clientCompany}</p>
                  <p className="text-sm text-gray-600">{previewQuote.clientEmail}</p>
                  <p className="text-sm text-gray-600">{previewQuote.clientPhone}</p>
                  {previewQuote.clientAddress && (
                    <p className="text-sm text-gray-600 mt-2">{previewQuote.clientAddress}</p>
                  )}
                </div>
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">Quote Details</p>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Quote #</span>
                      <span>{previewQuote.quoteNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Date</span>
                      <span>{new Date(previewQuote.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Valid Until</span>
                      <span>{new Date(previewQuote.validUntil).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Status</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[previewQuote.status].bg} ${statusColors[previewQuote.status].text}`}>
                        {previewQuote.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-gray-200">
                <table className="w-full text-left">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Item</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 text-center">Qty</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewQuote.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-4">
                          <p className="font-medium text-[#0f2b2e]">{item.productName || "Custom Item"}</p>
                        </td>
                        <td className="px-4 py-4 text-center text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-4 text-right text-gray-600">{formatKES(item.unitPrice)}</td>
                        <td className="px-4 py-4 text-right font-semibold text-[#0f2b2e]">{formatKES(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_280px]">
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
                  <p className="font-semibold text-gray-800 mb-2">Notes</p>
                  <p>{previewQuote.notes || "No additional notes provided."}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.2em] font-medium text-gray-500">Payment Terms</p>
                  <p>{previewQuote.paymentTerms}</p>
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-semibold text-gray-800 mb-2">Payment Details</p>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p className="mt-3 font-semibold text-gray-900">MPESA Details</p>
                      <p><span className="font-semibold text-gray-900">Paybill Number:</span> 400200</p>
                      <p><span className="font-semibold text-gray-900">Account Number:</span> 01102787392001</p>
                      <p className="mt-3 font-semibold text-gray-900">Bank Transfer Details</p>
                      <p>Account Name: Medlink Expedite Ventures Ltd</p>
                      <p>Account Number: 01102787392001</p>
                      <p>Bank: Co-operative Bank of Kenya</p>
                      <p className="mt-3 text-xs text-gray-500">Use the quotation number as the payment reference and share proof of payment for processing.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-gray-200 bg-[#081916]/5 p-5">
                  <div className="flex justify-between text-sm text-gray-600 mb-3">
                    <span>Subtotal</span>
                    <span>{formatKES(previewQuote.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-3">
                    <span>Tax ({previewQuote.taxRate}%)</span>
                    <span>{formatKES(previewQuote.taxAmount)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold text-[#0f2b2e]">
                    <span>Total</span>
                    <span>{formatKES(previewQuote.totalPrice)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { generatePDF(previewQuote); setPreviewQuote(null); }}
                className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg font-medium hover:bg-[#0f766e] transition-colors flex items-center gap-2"
              >
                <Download size={18} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quotes List */}
      {quotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-[#0f2b2e] mb-1">No quotes yet</h3>
          <p className="text-gray-500 mb-4">Create your first quote to get started</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0d9488] text-white rounded-lg font-medium hover:bg-[#0f766e] transition-colors"
          >
            <Plus size={18} /> Create Quote
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => {
            const StatusIcon = statusColors[quote.status].icon
            return (
              <div
                key={quote.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#f0fdfa] rounded-lg flex items-center justify-center shrink-0">
                      <FileText size={24} className="text-[#0d9488]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-[#0f2b2e]">{quote.quoteNumber}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[quote.status].bg} ${statusColors[quote.status].text}`}>
                          <StatusIcon size={12} /> {quote.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{quote.clientCompany} - {quote.clientName}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Created {new Date(quote.createdAt).toLocaleDateString()} | Valid until {new Date(quote.validUntil).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{quote.items.length} item{quote.items.length !== 1 ? "s" : ""}</p>
                      <p className="text-xl font-bold text-[#0d9589]">{formatKES(quote.totalPrice)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreviewQuote(quote)}
                        className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                        title="Preview"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => generatePDF(quote)}
                        className="p-2.5 bg-[#0d9488] text-white rounded-lg hover:bg-[#0f766e] transition-colors"
                        title="Download PDF"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
