"use client"

import type React from "react"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Plus, X } from "lucide-react"
import { useStore } from "@/lib/store"

export default function InquiryPage() {
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    products: [] as string[],
    quantity: 1,
    additionalNotes: "",
  })
  const [currentProduct, setCurrentProduct] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const addInquiry = useStore((s) => s.addInquiry)

  const handleAddProduct = () => {
    if (currentProduct.trim()) {
      setFormData({
        ...formData,
        products: [...formData.products, currentProduct],
      })
      setCurrentProduct("")
    }
  }

  const handleRemoveProduct = (index: number) => {
    setFormData({
      ...formData,
      products: formData.products.filter((_, i) => i !== index),
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addInquiry({
      id: Date.now().toString(),
      companyName: formData.companyName,
      contactPerson: formData.contactPerson,
      email: formData.email,
      phone: formData.phone,
      products: formData.products,
      quantity: formData.quantity,
      additionalNotes: formData.additionalNotes,
      status: "New",
      createdAt: new Date().toISOString(),
    })
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
    setFormData({
      companyName: "",
      contactPerson: "",
      email: "",
      phone: "",
      products: [],
      quantity: 1,
      additionalNotes: "",
    })
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 animate-fade-in">Request Equipment</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Submit your equipment inquiry and our team will provide you with a customized quote and delivery timeline.
          </p>
        </div>
      </section>

      {/* Inquiry Form */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="bg-card p-8 rounded-xl border border-border animate-fade-in">
            {submitted && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                Thank you for your inquiry! Our team will contact you within 24 hours.
              </div>
            )}

            <h2 className="text-2xl font-bold text-foreground mb-6">Facility Information</h2>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Company/Facility Name *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Your facility name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Contact Person *</label>
                <input
                  type="text"
                  required
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-6">Equipment Requirements</h2>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-foreground mb-2">Product Name *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentProduct}
                  onChange={(e) => setCurrentProduct(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddProduct())}
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Portable Ultrasound Machine"
                />
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <Plus size={18} /> Add
                </button>
              </div>
            </div>

            {formData.products.length > 0 && (
              <div className="mb-6 bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold text-foreground mb-3">Selected Products:</h3>
                <div className="space-y-2">
                  {formData.products.map((product, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-card p-3 rounded-lg border border-border"
                    >
                      <span className="text-foreground">{product}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(index)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-foreground mb-2">Estimated Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-foreground mb-2">Additional Notes</label>
              <textarea
                rows={5}
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Any specific requirements, timeline, or preferences?"
              />
            </div>

            <button
              type="submit"
              disabled={!formData.companyName || !formData.email || formData.products.length === 0}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Inquiry
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </main>
  )
}
