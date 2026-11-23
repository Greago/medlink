"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Check, Pencil, Plus, Search, Tags, Trash2, X } from "lucide-react"
import { Badge, Button, Card, EmptyState, Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle, SectionHeader, TableSkeleton } from "@/components/design-system"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

interface Category {
  id: string
  name: string
  productCount: number
}

export default function CategoriesPage() {
  const activeModule = useStore((state) => state.activeModule)
  const moduleInfo = getModule(activeModule)
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState("")
  const [query, setQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    setEditingId(null)
    try {
      const response = await fetch("/api/categories", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not load categories.")
      setCategories(data.categories || [])
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Could not load categories."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [activeModule])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  const addCategory = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not add the category.")

      setCategories((current) => [...current, data.category].sort((a, b) => a.name.localeCompare(b.name)))
      setName("")
      toast.success(`“${data.category.name as string}” added`)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Could not add the category."
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingId || !editingName.trim()) return

    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name: editingName }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not update the category.")

      setCategories((current) =>
        current
          .map((category) => (category.id === editingId ? data.category : category))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditingId(null)
      setEditingName("")
      toast.success(`Renamed to “${data.category.name as string}”`)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Could not update the category."
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const removeCategory = async () => {
    if (!deleting) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/categories?id=${encodeURIComponent(deleting.id)}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not delete the category.")
      setCategories((current) => current.filter((item) => item.id !== deleting.id))
      toast.success(`“${deleting.name}” deleted`)
      setDeleting(null)
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Could not delete the category."
      setError(message)
      toast.error(message)
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? categories.filter((category) => category.name.toLowerCase().includes(needle)) : categories
  }, [categories, query])

  const inputClass =
    "h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"

  return (
    <div className="space-y-6 p-4 lg:p-7">
      <SectionHeader
        eyebrow={`${moduleInfo.shortLabel} division`}
        title="Categories"
        description={`Organise the ${moduleInfo.label.toLowerCase()} catalogue. Renaming a category updates every product that uses it.`}
        action={
          <Badge variant="soft" className="rounded-full px-3 py-1.5">
            {categories.length} total
          </Badge>
        }
      />

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <Card className="gap-0 p-5">
        <form onSubmit={addCategory} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-2 block text-sm font-semibold">New category</span>
            <input
              id="new-category"
              type="text"
              required
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Imaging"
              className={inputClass}
            />
          </label>
          <Button type="submit" variant="primary" size="touch" disabled={busy}>
            <Plus size={17} /> Add category
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Categories are scoped to the active division. A category in use cannot be deleted until its products are moved.
        </p>
      </Card>

      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-bold">Category list</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {filtered.length} of {categories.length} shown
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search categories"
              className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-5"><TableSkeleton rows={5} columns={3} /></div>
        ) : categories.length === 0 ? (
          <EmptyState icon={Tags} title="No categories yet" description="Add one above to use it on new products." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="No matching categories" description="Try a different search term." action={<Button variant="soft" onClick={() => setQuery("")}>Clear search</Button>} />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((category) => (
              <div key={category.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                {editingId === category.id ? (
                  <form onSubmit={saveCategory} className="flex flex-1 items-center gap-2">
                    <input
                      autoFocus
                      required
                      maxLength={60}
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className={inputClass}
                    />
                    <Button type="submit" variant="primary" size="icon" disabled={busy} aria-label="Save category">
                      <Check size={17} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingId(null); setEditingName("") }}
                      aria-label="Cancel rename"
                    >
                      <X size={17} />
                    </Button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Tags size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {category.productCount} {category.productCount === 1 ? "product" : "products"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="soft"
                        size="sm"
                        onClick={() => { setEditingId(category.id); setEditingName(category.name) }}
                      >
                        <Pencil size={14} /> Rename
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(category)}
                        className="text-danger hover:text-danger"
                      >
                        <Trash2 size={14} /> Delete
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Delete this category?</ModalTitle>
            <ModalDescription>
              {deleting
                ? `“${deleting.name}” will be removed. Deletion is blocked while products still use it.`
                : "This cannot be undone."}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outlineSoft" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => void removeCategory()} disabled={busy}>Delete category</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
