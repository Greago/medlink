"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { useStore, type Quote, type QuoteItem } from "@/lib/store"
import { Plus, Download, Trash2, FileText, X, Send, Check, Clock, XCircle, Eye } from "lucide-react"

// Generate quote number
function generateQuoteNumber() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `QT-${year}${month}-${random}`
}

// PDF Generation function
async function generatePDF(quote: Quote) {
  // Dynamically import jspdf
  const { default: jsPDF } = await import("jspdf")
  
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

  // Header
  doc.setFillColor(13, 148, 136)
  doc.rect(0, 0, pageWidth, 45, "F")
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.text("MEDLINK EXPEDIATE", margin, 25)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("VENTURES LIMITED", margin, 32)
  doc.text("Premium Medical Equipment & Supplies", margin, 38)

  // Quote title
  y = 60
  doc.setTextColor(13, 148, 136)
  doc.setFontSize(28)
  doc.setFont("helvetica", "bold")
  doc.text("QUOTATION", pageWidth - margin, y, { align: "right" })
  
  // Quote details
  y = 75
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Quote #: ${quote.quoteNumber}`, pageWidth - margin, y, { align: "right" })
  doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, pageWidth - margin, y + 6, { align: "right" })
  doc.text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, pageWidth - margin, y + 12, { align: "right" })

  // Client info
  y = 75
  doc.setTextColor(50, 50, 50)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("BILL TO:", margin, y)
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
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y, pageWidth - margin * 2, 10, "F")
  doc.setTextColor(50, 50, 50)
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("ITEM", margin + 3, y + 7)
  doc.text("QTY", 110, y + 7)
  doc.text("UNIT PRICE", 130, y + 7)
  doc.text("TOTAL", pageWidth - margin - 3, y + 7, { align: "right" })

  // Table rows
  y += 15
  doc.setFont("helvetica", "normal")
  quote.items.forEach((item, index) => {
    if (y > 250) {
      doc.addPage()
      y = 20
    }
    
    doc.setFillColor(index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 250)
    doc.rect(margin, y - 5, pageWidth - margin * 2, 10, "F")
    
    doc.setTextColor(50, 50, 50)
    const productName = doc.splitTextToSize(item.productName, 70)
    doc.text(productName[0], margin + 3, y + 2)
    doc.text(item.quantity.toString(), 110, y + 2)
    doc.text(`$${item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 130, y + 2)
    doc.text(`$${item.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, pageWidth - margin - 3, y + 2, { align: "right" })
    y += 12
  })

  // Totals
  y += 10
  doc.setDrawColor(200, 200, 200)
  doc.line(120, y, pageWidth - margin, y)
  y += 8
  
  doc.setFont("helvetica", "normal")
  doc.text("Subtotal:", 130, y)
  doc.text(`$${quote.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, pageWidth - margin - 3, y, { align: "right" })
  
  y += 8
  doc.text(`Tax (${quote.taxRate}%):`, 130, y)
  doc.text(`$${quote.taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, pageWidth - margin - 3, y, { align: "right" })
  
  y += 10
  doc.setFillColor(13, 148, 136)
  doc.rect(120, y - 5, pageWidth - margin - 120, 12, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("TOTAL:", 130, y + 3)
  doc.text(`$${quote.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, pageWidth - margin - 3, y + 3, { align: "right" })

  // Payment terms and notes
  y += 25
  doc.setTextColor(50, 50, 50)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("PAYMENT TERMS:", margin, y)
  doc.setFont("helvetica", "normal")
  doc.text(quote.paymentTerms, margin, y + 6)

  if (quote.notes) {
    y += 20
    doc.setFont("helvetica", "bold")
    doc.text("NOTES:", margin, y)
    doc.setFont("helvetica", "normal")
    const noteLines = doc.splitTextToSize(quote.notes, pageWidth - margin * 2)
    doc.text(noteLines, margin, y + 6)
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setDrawColor(13, 148, 136)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10)
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text("Medlink Expediate Ventures Limited | info@medlinkexpediate.com | +1 (555) 123-4567", pageWidth / 2, footerY, { align: "center" })

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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 animate-fade-in">
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

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
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
                        {product.name} - ${product.price.toLocaleString()}
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
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
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
                              ${item.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
                        <span className="font-medium">${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-[#0f2b2e]">
                        <span>Tax ({taxRate}%)</span>
                        <span className="font-medium">${taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-3 flex justify-between">
                        <span className="font-bold text-lg text-[#0f2b2e]">Total</span>
                        <span className="font-bold text-xl text-[#0d9488]">${totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Quote #</p>
                  <p className="font-bold text-[#0f2b2e]">{previewQuote.quoteNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[previewQuote.status].bg} ${statusColors[previewQuote.status].text}`}>
                    {previewQuote.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-semibold text-[#0f2b2e]">{previewQuote.clientName}</p>
                  <p className="text-sm text-gray-600">{previewQuote.clientCompany}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Valid Until</p>
                  <p className="font-semibold text-[#0f2b2e]">{new Date(previewQuote.validUntil).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Items</p>
                {previewQuote.items.map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-[#0f2b2e]">{item.productName}</p>
                      <p className="text-sm text-gray-500">{item.quantity} x ${item.unitPrice.toFixed(2)}</p>
                    </div>
                    <p className="font-semibold text-[#0f2b2e]">${item.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between"><span>Subtotal</span><span>${previewQuote.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax ({previewQuote.taxRate}%)</span><span>${previewQuote.taxAmount.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300">
                  <span>Total</span><span className="text-[#0d9488]">${previewQuote.totalPrice.toFixed(2)}</span>
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
                      <p className="text-xl font-bold text-[#0d9488]">${quote.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
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
