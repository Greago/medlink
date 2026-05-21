"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Plus, Trash2, Edit2, Package } from "lucide-react"
import { ProductForm } from "@/components/admin/product-form"

export default function ProductsPage() {
  const { products, addProduct, deleteProduct } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your medical equipment inventory</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setShowForm(!showForm)
          }}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      {showForm && (
        <ProductForm
          onSuccess={() => setShowForm(false)}
          editingId={editingId}
          onCancel={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-lg">No products added yet</p>
          <p className="text-muted-foreground text-sm mt-2">Click "Add Product" to get started</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all animate-fade-in"
            >
              <div className="h-40 bg-muted overflow-hidden">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <p className="text-sm text-primary font-semibold mb-1">{product.category}</p>
                <h3 className="font-bold text-foreground mb-2 line-clamp-2">{product.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{product.description}</p>
                <p className="text-2xl font-bold text-primary mb-4">${product.price.toFixed(2)}</p>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(product.id)
                      setShowForm(true)
                    }}
                    className="flex-1 bg-primary/10 text-primary py-2 rounded-lg font-semibold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="flex-1 bg-destructive/10 text-destructive py-2 rounded-lg font-semibold hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
