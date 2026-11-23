"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { ChevronDown, Edit2, Package, Plus, Search, Trash2 } from "lucide-react"
import { ProductForm } from "@/components/admin/product-form"
import { Badge, Button, Card, EmptyState, Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle, PriceTag, SectionHeader, StockBadge } from "@/components/design-system"
import { formatPrice } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

const PAGE_SIZE = 12

export default function ProductsPage() {
  const products = useStore((state) => state.products)
  const deleteProduct = useStore((state) => state.deleteProduct)
  const activeModule = useStore((state) => state.activeModule)
  const moduleInfo = getModule(activeModule)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")
  const [sort, setSort] = useState("name")
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setShowForm(false)
    setEditingId(null)
    setQuery("")
    setCategory("All")
    setPage(1)
  }, [activeModule])

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((product) => product.category))).sort()],
    [products]
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return products
      .filter((product) => {
        const matchesCategory = category === "All" || product.category === category
        const matchesQuery = !needle || [product.name, product.category, product.brand || ""].some((value) => value.toLowerCase().includes(needle))
        return matchesCategory && matchesQuery
      })
      .sort((a, b) => {
        if (sort === "price-low") return a.price - b.price
        if (sort === "price-high") return b.price - a.price
        return a.name.localeCompare(b.name)
      })
  }, [category, products, query, sort])

  useEffect(() => setPage(1), [query, category, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const deletingProduct = products.find((product) => product.id === deletingId)

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await deleteProduct(deletingId)
      toast.success("Product deleted")
      setDeletingId(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the product.")
    }
  }

  return (
    <div className="space-y-6 p-4 lg:p-7">
      <SectionHeader
        eyebrow={`${moduleInfo.shortLabel} division`}
        title={moduleInfo.productLabel}
        description={`Manage the ${moduleInfo.label.toLowerCase()} catalogue. Prices are shown in KSh.`}
        action={
          <Button
            variant="primary"
            size="touch"
            onClick={() => { setEditingId(null); setShowForm(true) }}
          >
            <Plus size={17} /> Add product
          </Button>
        }
      />

      {showForm && (
        <ProductForm
          onSuccess={() => { setShowForm(false); setEditingId(null) }}
          editingId={editingId}
          onCancel={() => { setShowForm(false); setEditingId(null) }}
        />
      )}

      <Card className="gap-0 p-4 lg:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products or brands"
              className="h-11 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <span className="sr-only">Filter by category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 appearance-none rounded-xl border border-input bg-background pl-4 pr-10 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-ring/25">
                {categories.map((item) => <option key={item} value={item}>{item === "All" ? "All categories" : item}</option>)}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </label>
            <label className="relative">
              <span className="sr-only">Sort products</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 appearance-none rounded-xl border border-input bg-background pl-4 pr-10 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-ring/25">
                <option value="name">Name: A–Z</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </label>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={products.length === 0 ? "No products added yet" : "No matching products"}
          description={products.length === 0 ? "Add your first item to this division." : "Try a different search term or category."}
          action={products.length === 0 ? (
            <Button variant="primary" onClick={() => { setEditingId(null); setShowForm(true) }}><Plus size={16} /> Add product</Button>
          ) : (
            <Button variant="soft" onClick={() => { setQuery(""); setCategory("All") }}>Clear filters</Button>
          )}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((product) => (
              <Card key={product.id} className="animate-fade-in gap-0 overflow-hidden p-0">
                <div className="relative aspect-[4/3] bg-surface-soft">
                  <Image src={product.image || "/placeholder.jpg"} alt={product.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    <StockBadge product={product} className="bg-card/90" />
                    {product.featured && <Badge variant="warning">Featured</Badge>}
                    {product.status === "draft" && <Badge variant="warning">Draft</Badge>}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] font-bold uppercase tracking-wide text-primary">{product.brand || product.category}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{product.category}</span>
                  </div>
                  <Link href={`/products/${product.id}`} className="line-clamp-2 text-sm font-semibold hover:text-primary">{product.name}</Link>
                  <PriceTag product={product} className="mt-auto" />
                  <div className="flex items-center gap-2 border-t border-border pt-3">
                    <Button variant="soft" size="touch" className="flex-1" onClick={() => { setEditingId(product.id); setShowForm(true) }}>
                      <Edit2 size={16} /> Edit
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${product.name}`} onClick={() => setDeletingId(product.id)} className="text-muted-foreground hover:text-danger">
                      <Trash2 size={17} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outlineSoft" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <span className="font-semibold text-ink">Page {page} of {pageCount}</span>
              <Button variant="outlineSoft" size="sm" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}

      <Modal open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Delete this product?</ModalTitle>
            <ModalDescription>
              {deletingProduct ? `“${deletingProduct.name}” will be removed from the ${moduleInfo.shortLabel.toLowerCase()} catalogue.` : "This cannot be undone."}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outlineSoft" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => void handleDelete()} disabled={!deletingId}>Delete product</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
