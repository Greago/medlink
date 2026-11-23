"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { BookOpen, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react"
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  SectionHeader,
} from "@/components/design-system"
import { useStore, type ProfilePage } from "@/lib/store"

const defaultPages: ProfilePage[] = [
  {
    title: "About Medlink Expedite",
    content:
      "Medlink Expedite Ventures Limited supplies medical equipment and pharmacy products to healthcare facilities, clinics and practices across Kenya.",
    highlight: "Serving healthcare providers in Kenya",
  },
  {
    title: "Our Mission",
    content:
      "To make reliable healthcare products easier to source, with clear KSh pricing, responsive support and dependable delivery.",
    highlight: "Practical support for better care",
  },
  {
    title: "What We Supply",
    content:
      "From diagnostic equipment and patient monitors to hospital beds, prescription medicines and everyday medical supplies, our catalogue is organised by division.",
    highlight: "Medical equipment and pharmacy divisions",
  },
]

export default function ProfileManagement() {
  const { profilePages, setProfilePages, addProfilePage, updateProfilePage, deleteProfilePage } = useStore()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<ProfilePage>({ title: "", content: "", highlight: "" })
  const [showAdd, setShowAdd] = useState(false)
  const [query, setQuery] = useState("")
  const [confirmReset, setConfirmReset] = useState(false)
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)

  const pages = profilePages.length > 0 ? profilePages : defaultPages

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return pages.map((page, index) => ({ page, index }))
    return pages
      .map((page, index) => ({ page, index }))
      .filter(({ page }) => [page.title, page.content, page.highlight].join(" ").toLowerCase().includes(needle))
  }, [pages, query])

  const closeForm = () => {
    setShowAdd(false)
    setEditingIndex(null)
    setFormData({ title: "", content: "", highlight: "" })
  }

  const handleLoadDefaults = async () => {
    await setProfilePages(defaultPages)
    setConfirmReset(false)
    closeForm()
    toast.success("Default profile pages restored")
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setFormData(pages[index])
    setShowAdd(false)
  }

  const handleSaveEdit = async () => {
    if (editingIndex === null) return
    if (profilePages.length === 0) {
      await setProfilePages(defaultPages.map((page, index) => (index === editingIndex ? formData : page)))
    } else {
      await updateProfilePage(editingIndex, formData)
    }
    closeForm()
    toast.success("Profile page updated")
  }

  const handleAddPage = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData.title || !formData.content) return
    if (profilePages.length === 0) {
      await setProfilePages([...defaultPages, formData])
    } else {
      await addProfilePage(formData)
    }
    closeForm()
    toast.success("Profile page added")
  }

  const handleDelete = async () => {
    if (deletingIndex === null) return
    if (profilePages.length === 0) {
      await setProfilePages(defaultPages.filter((_, index) => index !== deletingIndex))
    } else {
      await deleteProfilePage(deletingIndex)
    }
    setDeletingIndex(null)
    toast.success("Profile page deleted")
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"

  return (
    <div className="space-y-6 p-4 lg:p-7">
      <SectionHeader
        eyebrow="Tools"
        title="Company profile"
        description="Manage the informational pages shown in the company profile flipbook."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outlineSoft" size="touch" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={16} /> Reset defaults
            </Button>
            <Button
              variant="primary"
              size="touch"
              onClick={() => {
                setShowAdd(true)
                setEditingIndex(null)
                setFormData({ title: "", content: "", highlight: "" })
              }}
            >
              <Plus size={16} /> Add page
            </Button>
          </div>
        }
      />

      {(showAdd || editingIndex !== null) && (
        <Card className="animate-fade-in gap-0 p-5 lg:p-6">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
            <h3 className="text-lg font-bold">{editingIndex !== null ? "Edit page" : "Add new page"}</h3>
            <Button variant="ghost" size="icon-sm" onClick={closeForm} aria-label="Close form">
              <X size={18} />
            </Button>
          </div>
          <form
            onSubmit={editingIndex !== null ? (event) => { event.preventDefault(); void handleSaveEdit() } : handleAddPage}
            className="space-y-4"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Page title</span>
              <input
                required
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                className={inputClass}
                placeholder="e.g. Our Mission"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Content</span>
              <textarea
                required
                rows={4}
                value={formData.content}
                onChange={(event) => setFormData({ ...formData, content: event.target.value })}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
                placeholder="Describe this section of your company profile..."
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Highlight text</span>
              <input
                value={formData.highlight}
                onChange={(event) => setFormData({ ...formData, highlight: event.target.value })}
                className={inputClass}
                placeholder="A short supporting line"
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outlineSoft" size="touch" onClick={closeForm}>Cancel</Button>
              <Button type="submit" variant="primary" size="touch">
                {editingIndex !== null ? "Save changes" : "Add page"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="gap-0 p-4 lg:p-5">
        <div className="relative">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search profile pages"
            className="h-11 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
          />
        </div>
      </Card>

      {pages.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No profile pages yet"
          description="Load the default pages or add your own."
          action={<Button variant="primary" onClick={() => setConfirmReset(true)}>Load default pages</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matching pages" description="Try a different search term." action={<Button variant="soft" onClick={() => setQuery("")}>Clear search</Button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map(({ page, index }) => (
            <Card key={index} className="group gap-0 p-5">
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{page.title}</h3>
                    <Badge variant="soft">Page {index + 1}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{page.content}</p>
                  {page.highlight && <Badge variant="success" className="mt-3">{page.highlight}</Badge>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(index)} aria-label={`Edit ${page.title}`}>
                    <Pencil size={16} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeletingIndex(index)} aria-label={`Delete ${page.title}`} className="text-danger">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={confirmReset} onOpenChange={setConfirmReset}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Reset profile pages?</ModalTitle>
            <ModalDescription>Your current profile pages will be replaced with the default pages.</ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outlineSoft" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void handleLoadDefaults()}>Reset pages</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={deletingIndex !== null} onOpenChange={(open) => !open && setDeletingIndex(null)}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Delete this page?</ModalTitle>
            <ModalDescription>
              {deletingIndex !== null ? `“${pages[deletingIndex]?.title}” will be removed from the profile.` : "This cannot be undone."}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outlineSoft" onClick={() => setDeletingIndex(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => void handleDelete()}>Delete page</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
