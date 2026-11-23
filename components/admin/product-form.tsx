"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { ImagePlus, Loader2, Save, Tags, UploadCloud, X } from "lucide-react"
import { Badge, Button, Card } from "@/components/design-system"
import { getModule, MODULE_REGISTRY } from "@/lib/modules/registry"
import { useStore, type Product } from "@/lib/store"

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

interface ProductFormProps {
  onSuccess: () => void
  editingId?: string | null
  onCancel: () => void
}

function emptyForm(module: Product["module"], category: string): Partial<Product> {
  return {
    module,
    name: "",
    category,
    price: 0,
    image: "",
    description: "",
    specs: [],
    features: [],
    inStock: true,
    brand: "",
    compareAtPrice: null,
    rating: null,
    reviewCount: 0,
    stockQuantity: null,
    lowStockThreshold: 5,
    requiresPrescription: false,
    strength: "",
    dosageForm: "",
    expiryDate: "",
    warranty: "",
    model: "",
    featured: false,
    status: "published",
  }
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function ProductForm({ onSuccess, editingId, onCancel }: ProductFormProps) {
  const { products, addProduct, updateProduct, isHydrated } = useStore()
  const activeModule = useStore((state) => state.activeModule)
  const moduleInfo = getModule(activeModule)
  const fallbackCategories = MODULE_REGISTRY[activeModule].seedCategories

  const [categories, setCategories] = useState<string[]>(fallbackCategories)
  const [formData, setFormData] = useState<Partial<Product>>(() => emptyForm(activeModule, fallbackCategories[0]))
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const editing = editingId ? products.find((product) => product.id === editingId) : null
    setFormData(editing ? { ...editing } : emptyForm(activeModule, categories[0] || fallbackCategories[0]))
    setImageError(null)
  }, [editingId, activeModule, isHydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/categories", { cache: "no-store" })
        const data = await response.json()
        if (!response.ok) return
        const names: string[] = (data.categories || []).map((category: { name: string }) => category.name)
        if (names.length > 0) {
          setCategories(names)
          setFormData((current) =>
            current.category && names.includes(current.category) ? current : { ...current, category: names[0] }
          )
        }
      } catch {
        // Keep fallback categories if the request fails.
      }
    }
    void loadCategories()
  }, [activeModule])

  const setField = <K extends keyof Product>(key: K, value: Product[K] | string | number | null | undefined) =>
    setFormData((current) => ({ ...current, [key]: value }))

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setImageError(null)

    const validType = ["image/jpeg", "image/png"].includes(file.type)
    const validName = /\.(jpe?g|png)$/i.test(file.name)
    if (!validType || !validName) {
      setImageError("Only JPG or PNG images are accepted.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Images must be 4 MB or smaller.")
      return
    }

    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const response = await fetch("/api/uploads", { method: "POST", body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not upload that image.")
      setField("image", data.url as string)
      toast.success("Photo uploaded")
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Could not upload that image.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragging(false)
    void handleFile(event.dataTransfer.files?.[0])
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData.name?.trim() || !formData.category || !formData.description?.trim()) {
      toast.error("Add a name, category and description before saving.")
      return
    }
    if (!formData.image) {
      setImageError("Please upload a product photo.")
      toast.error("Please upload a product photo.")
      return
    }

    setSaving(true)
    try {
      const payload: Product = {
        ...formData,
        id: editingId || formData.id || `${activeModule === "pharmacy" ? "ph" : "md"}-${Date.now()}`,
        module: activeModule,
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim(),
        price: Number(formData.price) || 0,
        image: formData.image,
        specs: formData.specs || [],
        features: formData.features || [],
        inStock: formData.inStock ?? true,
        brand: formData.brand?.trim() || null,
        compareAtPrice: formData.compareAtPrice ?? null,
        rating: formData.rating ?? null,
        reviewCount: formData.reviewCount ?? 0,
        stockQuantity: formData.stockQuantity ?? null,
        lowStockThreshold: formData.lowStockThreshold ?? 5,
        requiresPrescription: Boolean(formData.requiresPrescription),
        strength: formData.strength?.trim() || null,
        dosageForm: formData.dosageForm?.trim() || null,
        expiryDate: formData.expiryDate || null,
        warranty: formData.warranty?.trim() || null,
        model: formData.model?.trim() || null,
        featured: Boolean(formData.featured),
        status: formData.status === "draft" ? "draft" : "published",
      }

      if (editingId) await updateProduct(editingId, payload)
      else await addProduct(payload)

      toast.success(editingId ? "Product updated" : "Product added")
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the product.")
    } finally {
      setSaving(false)
    }
  }

  const categoryOptions = Array.from(new Set([...categories, formData.category].filter(Boolean)))
  const inputClass =
    "h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
  const textareaClass =
    "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"

  return (
    <Card className="animate-fade-in gap-0 p-5 lg:p-7">
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">{editingId ? "Edit product" : `Add new ${moduleInfo.shortLabel.toLowerCase()} product`}</h2>
            <Badge variant="soft">{moduleInfo.label}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Changes are saved to the active division only.</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Close product form">
          <X size={20} />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-primary">Core details</h3>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Product name *</span>
              <input required value={formData.name || ""} onChange={(event) => setField("name", event.target.value)} className={inputClass} placeholder="e.g. Portable Ultrasound" />
            </label>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-semibold">Category *</label>
                <Link href="/admin/categories" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  <Tags size={13} /> Manage categories
                </Link>
              </div>
              <select required value={formData.category || ""} onChange={(event) => setField("category", event.target.value)} className={inputClass}>
                <option value="" disabled>Select a category</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold">Description *</span>
              <textarea required rows={4} value={formData.description || ""} onChange={(event) => setField("description", event.target.value)} className={textareaClass} placeholder="What does this item do, and who is it for?" />
            </label>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-primary">Pricing &amp; stock</h3>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Price (KSh) *</span>
              <input type="number" min="0" step="0.01" required value={formData.price ?? 0} onChange={(event) => setField("price", Number(event.target.value) || 0)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Compare-at price (KSh)</span>
              <input type="number" min="0" step="0.01" value={formData.compareAtPrice ?? ""} onChange={(event) => setField("compareAtPrice", numberOrNull(event.target.value))} className={inputClass} placeholder="Optional" />
              <span className="mt-1.5 block text-xs text-muted-foreground">Only shown when higher than the price.</span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Units in stock</span>
              <input type="number" min="0" step="1" value={formData.stockQuantity ?? ""} onChange={(event) => setField("stockQuantity", numberOrNull(event.target.value))} className={inputClass} placeholder="Optional" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Low-stock alert at</span>
              <input type="number" min="0" step="1" value={formData.lowStockThreshold ?? 5} onChange={(event) => setField("lowStockThreshold", numberOrNull(event.target.value) ?? 0)} className={inputClass} />
            </label>
            <label className="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm font-semibold">
              <input type="checkbox" checked={Boolean(formData.inStock)} onChange={(event) => setField("inStock", event.target.checked)} className="size-4 accent-[var(--primary)]" />
              Available for order
            </label>
            <label className="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm font-semibold">
              <input type="checkbox" checked={Boolean(formData.featured)} onChange={(event) => setField("featured", event.target.checked)} className="size-4 accent-[var(--primary)]" />
              Feature this item
            </label>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-primary">Merchandising</h3>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Brand</span>
              <input value={formData.brand || ""} onChange={(event) => setField("brand", event.target.value)} className={inputClass} placeholder="Optional" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Rating (0–5)</span>
              <input type="number" min="0" max="5" step="0.1" value={formData.rating ?? ""} onChange={(event) => setField("rating", numberOrNull(event.target.value))} className={inputClass} placeholder="Optional" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Review count</span>
              <input type="number" min="0" step="1" value={formData.reviewCount ?? 0} onChange={(event) => setField("reviewCount", numberOrNull(event.target.value) ?? 0)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Status</span>
              <select value={formData.status || "published"} onChange={(event) => setField("status", event.target.value as Product["status"])} className={inputClass}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-primary">
            {activeModule === "pharmacy" ? "Pharmacy details" : "Equipment details"}
          </h3>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeModule === "pharmacy" ? (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Strength</span>
                  <input value={formData.strength || ""} onChange={(event) => setField("strength", event.target.value)} className={inputClass} placeholder="e.g. 500mg" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Dosage form</span>
                  <input value={formData.dosageForm || ""} onChange={(event) => setField("dosageForm", event.target.value)} className={inputClass} placeholder="e.g. Tablets" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Expiry date</span>
                  <input type="date" value={formData.expiryDate || ""} onChange={(event) => setField("expiryDate", event.target.value)} className={inputClass} />
                </label>
                <label className="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm font-semibold">
                  <input type="checkbox" checked={Boolean(formData.requiresPrescription)} onChange={(event) => setField("requiresPrescription", event.target.checked)} className="size-4 accent-[var(--primary)]" />
                  Prescription required
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Model</span>
                  <input value={formData.model || ""} onChange={(event) => setField("model", event.target.value)} className={inputClass} placeholder="Optional" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Warranty</span>
                  <input value={formData.warranty || ""} onChange={(event) => setField("warranty", event.target.value)} className={inputClass} placeholder="e.g. 12 months" />
                </label>
              </>
            )}
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Specifications</span>
              <textarea rows={3} value={(formData.specs || []).join("\n")} onChange={(event) => setField("specs", event.target.value.split("\n").map((line) => line.trim()).filter(Boolean))} className={textareaClass} placeholder="One specification per line" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Key features</span>
              <textarea rows={3} value={(formData.features || []).join("\n")} onChange={(event) => setField("features", event.target.value.split("\n").map((line) => line.trim()).filter(Boolean))} className={textareaClass} placeholder="One feature per line" />
            </label>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-primary">Product photo</h3>
          <div className="grid gap-5 md:grid-cols-[180px_1fr]">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
              {formData.image ? (
                <Image src={formData.image} alt="Product preview" fill sizes="180px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground"><ImagePlus size={30} /></div>
              )}
            </div>
            <div
              onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
            >
              <UploadCloud size={26} className="text-primary" />
              <p className="mt-3 text-sm font-semibold">Drop a photo here, or choose a file</p>
              <p className="mt-1 text-xs text-muted-foreground">JPG or PNG only · maximum 4 MB · stored securely in the database</p>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={(event) => void handleFile(event.target.files?.[0])} className="hidden" id="product-image-input" />
              <Button type="button" variant="outlineSoft" size="touch" className="mt-4" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                {uploading ? "Uploading…" : formData.image ? "Change photo" : "Choose photo"}
              </Button>
              {imageError && <p className="mt-3 text-xs font-semibold text-danger">{imageError}</p>}
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Button type="button" variant="outlineSoft" size="touch" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" size="touch" disabled={uploading || saving}>
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            {saving ? "Saving…" : editingId ? "Update product" : "Add product"}
          </Button>
        </div>
      </form>
    </Card>
  )
}
