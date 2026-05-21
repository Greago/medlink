"use client"

import type React from "react"
import { useState } from "react"
import { useStore } from "@/lib/store"
import type { ProfilePage } from "@/lib/store"
import { Plus, Trash2, Save, GripVertical, BookOpen, Pencil } from "lucide-react"

const defaultPages: ProfilePage[] = [
  {
    title: "About Medlink Expedites",
    content:
      "Medlink Expedites is a global leader in medical equipment supply, dedicated to empowering healthcare facilities with cutting-edge devices and trusted solutions.",
    highlight: "Serving 150+ countries since 2015",
  },
  {
    title: "Our Mission",
    content:
      "To deliver premium, certified medical equipment to healthcare providers worldwide, ensuring rapid deployment, competitive pricing, and unmatched after-sales support.",
    highlight: "Empowering healthcare, one device at a time",
  },
  {
    title: "What We Supply",
    content:
      "From diagnostic imaging systems and patient monitors to hospital beds, surgical instruments, and respiratory care devices, our catalog spans over 500 products across 12 categories.",
    highlight: "500+ products across 12 categories",
  },
]

export default function ProfileManagement() {
  const { profilePages, setProfilePages, addProfilePage, updateProfilePage, deleteProfilePage } = useStore()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<ProfilePage>({ title: "", content: "", highlight: "" })
  const [showAdd, setShowAdd] = useState(false)
  const [saved, setSaved] = useState(false)

  const pages = profilePages.length > 0 ? profilePages : defaultPages

  const handleLoadDefaults = () => {
    setProfilePages(defaultPages)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setFormData(pages[index])
    setShowAdd(false)
  }

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      if (profilePages.length === 0) {
        setProfilePages(defaultPages.map((p, i) => (i === editingIndex ? formData : p)))
      } else {
        updateProfilePage(editingIndex, formData)
      }
      setEditingIndex(null)
      setFormData({ title: "", content: "", highlight: "" })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleAddPage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.content) return
    if (profilePages.length === 0) {
      setProfilePages([...defaultPages, formData])
    } else {
      addProfilePage(formData)
    }
    setFormData({ title: "", content: "", highlight: "" })
    setShowAdd(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDelete = (index: number) => {
    if (profilePages.length === 0) {
      setProfilePages(defaultPages.filter((_, i) => i !== index))
    } else {
      deleteProfilePage(index)
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Company Profile</h1>
          <p className="text-muted-foreground mt-1">Manage the pages shown in your company profile flipbook</p>
        </div>
        <div className="flex gap-3">
          {saved && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#f0fdfa] text-[#115e59] rounded-lg text-sm font-medium border border-[#ccfbf1] animate-fade-in">
              <Save size={16} />
              Saved
            </div>
          )}
          <button
            onClick={handleLoadDefaults}
            className="px-4 py-2 bg-[#f0fdfa] text-[#115e59] rounded-lg text-sm font-medium border border-[#ccfbf1] hover:bg-[#e6f7f5] transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={() => {
              setShowAdd(true)
              setEditingIndex(null)
              setFormData({ title: "", content: "", highlight: "" })
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0d9488] text-white rounded-lg text-sm font-medium hover:bg-[#0f766e] transition-colors"
          >
            <Plus size={16} /> Add Page
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {(showAdd || editingIndex !== null) && (
        <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
          <h3 className="text-lg font-bold text-foreground mb-4">
            {editingIndex !== null ? "Edit Page" : "Add New Page"}
          </h3>
          <form
            onSubmit={editingIndex !== null ? (e) => { e.preventDefault(); handleSaveEdit(); } : handleAddPage}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Page Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                placeholder="e.g. Our Mission"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent resize-none"
                placeholder="Describe this section of your company profile..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Highlight Text</label>
              <input
                type="text"
                value={formData.highlight}
                onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
                placeholder="e.g. ISO 13485 Certified"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg font-medium text-sm hover:bg-[#0f766e] transition-colors"
              >
                {editingIndex !== null ? "Save Changes" : "Add Page"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false)
                  setEditingIndex(null)
                  setFormData({ title: "", content: "", highlight: "" })
                }}
                className="px-6 py-2.5 bg-muted text-foreground rounded-lg font-medium text-sm hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pages List */}
      <div className="space-y-3">
        {pages.map((page, i) => (
          <div
            key={i}
            className="bg-card rounded-xl border border-border p-6 flex items-start gap-4 hover:shadow-md transition-shadow group"
          >
            <div className="mt-1 text-muted-foreground">
              <GripVertical size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[#f0fdfa] rounded-lg flex items-center justify-center shrink-0">
                  <BookOpen size={16} className="text-[#0d9488]" />
                </div>
                <h3 className="font-bold text-foreground truncate">{page.title}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                  Page {i + 1}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{page.content}</p>
              {page.highlight && (
                <span className="inline-block text-xs font-medium text-[#115e59] bg-[#f0fdfa] px-3 py-1 rounded-full border border-[#ccfbf1]">
                  {page.highlight}
                </span>
              )}
            </div>
            <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEdit(i)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-[#f0fdfa] hover:text-[#0d9488] transition-colors"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(i)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {pages.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <BookOpen size={40} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No profile pages yet</p>
          <button
            onClick={handleLoadDefaults}
            className="px-6 py-2.5 bg-[#0d9488] text-white rounded-lg font-medium text-sm hover:bg-[#0f766e] transition-colors"
          >
            Load Default Pages
          </button>
        </div>
      )}
    </div>
  )
}
