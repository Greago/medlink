"use client"

import type React from "react"

import { useState } from "react"
import { useStore, type Product } from "@/lib/store"
import { X } from "lucide-react"

const CATEGORIES = ["Diagnostic", "Monitoring", "Hospital Equipment", "Respiratory", "Surgical", "Mobility"]

interface ProductFormProps {
  onSuccess: () => void
  editingId?: string | null
  onCancel: () => void
}

export function ProductForm({ onSuccess, editingId, onCancel }: ProductFormProps) {
  const { products, addProduct, updateProduct } = useStore()
  const [formData, setFormData] = useState<Partial<Product>>(
    editingId
      ? products.find((p) => p.id === editingId) || {}
      : {
          id: "",
          name: "",
          category: CATEGORIES[0],
          price: 0,
          image: "",
          description: "",
        },
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.category || formData.price === undefined || !formData.description) {
      alert("Please fill in all fields")
      return
    }

    if (editingId) {
      updateProduct(editingId, formData as Product)
    } else {
      const newProduct: Product = {
        ...(formData as Product),
        id: Date.now().toString(),
      }
      addProduct(newProduct)
    }

    onSuccess()
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">{editingId ? "Edit Product" : "Add New Product"}</h2>
        <button onClick={onCancel} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <X size={24} className="text-foreground" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Product Name *</label>
            <input
              type="text"
              required
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Portable Ultrasound"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Category *</label>
            <select
              required
              value={formData.category || ""}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Price ($) *</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.price || ""}
              onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Image URL *</label>
            <input
              type="url"
              required
              value={formData.image || ""}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Description *</label>
          <textarea
            required
            rows={4}
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="Product description..."
          />
        </div>

        <div className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-border text-foreground rounded-lg font-semibold hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            {editingId ? "Update Product" : "Add Product"}
          </button>
        </div>
      </form>
    </div>
  )
}
