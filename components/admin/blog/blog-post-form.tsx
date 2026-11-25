"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  Check,
  Clock3,
  Eye,
  FileEdit,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react"
import { RichTextEditor } from "@/components/rich-text-editor-lazy"
import { fetchJson, inputCls, labelCls } from "@/components/admin/recruitment/shared"
import { eatLocalToUtc, utcToEatLocal } from "@/lib/careers"
import type { BlogCategory, BlogPost } from "@/lib/blog"
import { BLOG_STATUSES, type BlogPostStatus } from "@/lib/blog-helpers"

interface FormState {
  title: string
  slug: string
  excerpt: string
  author: string
  categoryId: string
  coverImage: string
  status: BlogPostStatus
  publishAt: string
  content: string
}

const emptyForm: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  author: "Medlink Expedite",
  categoryId: "",
  coverImage: "",
  status: "draft",
  publishAt: "",
  content: "",
}

const STATUS_OPTIONS: { value: BlogPostStatus; title: string; description: string }[] = [
  { value: "draft", title: "Draft", description: "Only visible to your team." },
  { value: "scheduled", title: "Scheduled", description: "Goes live automatically at the chosen time." },
  { value: "published", title: "Published", description: "Live on the insights page now." },
]

function postToForm(post: BlogPost): FormState {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    author: post.author,
    categoryId: post.categoryId || "",
    coverImage: post.coverImage,
    status: post.status,
    publishAt: utcToEatLocal(post.publishAt || post.publishedAt),
    content: post.content,
  }
}

export function BlogPostForm({ postId }: { postId?: string }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(Boolean(postId))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [currentSlug, setCurrentSlug] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const categoryData = await fetchJson<{ categories: BlogCategory[] }>("/api/admin/blog/categories")
        if (!cancelled) setCategories(categoryData.categories)
        if (postId) {
          const data = await fetchJson<{ post: BlogPost }>(`/api/admin/blog/posts/${postId}`)
          if (cancelled) return
          setForm(postToForm(data.post))
          setCurrentSlug(data.post.slug)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load the editor.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [postId])

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    if (file.size > 4 * 1024 * 1024) throw new Error("Images must be 4 MB or smaller.")
    if (!/image\/(jpeg|png|webp)/.test(file.type)) throw new Error("Only JPG, PNG and WebP images are supported.")

    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const data = await fetchJson<{ url: string }>("/api/uploads", { method: "POST", body })
      return data.url
    } finally {
      setUploading(false)
    }
  }, [])

  const uploadCover = async (file: File) => {
    try {
      const url = await uploadImage(file)
      set("coverImage", url)
      toast.success("Cover image uploaded.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not upload the image."
      setForm((current) => ({ ...current, coverImage: "" }))
      toast.error(message)
    }
  }

  const createCategory = async () => {
    const name = newCategory.trim()
    if (!name || creatingCategory) return
    setCreatingCategory(true)
    try {
      const data = await fetchJson<{ category: BlogCategory }>("/api/admin/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      setCategories((current) => [...current, data.category].sort((a, b) => a.name.localeCompare(b.name)))
      set("categoryId", data.category.id)
      setNewCategory("")
      toast.success("Category created.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the category.")
    } finally {
      setCreatingCategory(false)
    }
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving) return
    if (form.status === "scheduled" && !form.publishAt) {
      toast.error("Choose when this article should be published.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        excerpt: form.excerpt.trim(),
        content: form.content,
        coverImage: form.coverImage.trim(),
        author: form.author.trim() || "Medlink Expedite",
        categoryId: form.categoryId || null,
        status: form.status,
        publishAt: form.publishAt ? eatLocalToUtc(form.publishAt) : null,
      }
      const data = await fetchJson<{ post: BlogPost }>(
        postId ? `/api/admin/blog/posts/${postId}` : "/api/admin/blog/posts",
        {
          method: postId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      toast.success(
        data.post.status === "scheduled"
          ? "Article scheduled. It will go live automatically."
          : data.post.status === "published"
            ? "Article published."
            : "Draft saved."
      )
      router.push("/admin/blog")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the article.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-muted/50" aria-busy="true" />
  }

  return (
    <form onSubmit={save} className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/blog" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
            <ArrowLeft size={14} /> Back to articles
          </Link>
          <h1 className="mt-2 text-xl font-bold tracking-tight">{postId ? "Edit article" : "New article"}</h1>
          <p className="mt-1 text-xs text-muted-foreground">Write, choose a category, then publish now or schedule it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {postId && currentSlug && (
            <a
              href={`/blog/${currentSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-target inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold hover:bg-muted focus-ring"
            >
              <Eye size={14} /> Preview
            </a>
          )}
          <button
            type="submit"
            disabled={saving}
            className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 focus-ring disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Saving…" : "Save article"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileEdit size={16} />
              </span>
              <h2 className="text-sm font-bold">Article details</h2>
            </div>
            <div className="grid gap-4">
              <label className={labelCls}>
                Title *
                <input
                  required
                  minLength={3}
                  maxLength={180}
                  value={form.title}
                  onChange={(event) => set("title", event.target.value)}
                  placeholder="e.g. How to choose a patient monitor"
                  className={inputCls}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelCls}>
                  URL slug
                  <input
                    value={form.slug}
                    onChange={(event) => set("slug", event.target.value)}
                    placeholder="Generated from the title"
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  Author
                  <input
                    maxLength={120}
                    value={form.author}
                    onChange={(event) => set("author", event.target.value)}
                    className={inputCls}
                  />
                </label>
              </div>
              <label className={labelCls}>
                Short excerpt
                <textarea
                  rows={3}
                  maxLength={500}
                  value={form.excerpt}
                  onChange={(event) => set("excerpt", event.target.value)}
                  placeholder="A short summary shown on article cards and social previews."
                  className={`${inputCls} h-auto resize-none py-2.5`}
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ImagePlus size={16} />
                </span>
                <h2 className="text-sm font-bold">Cover image</h2>
              </div>
              {uploading && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <Loader2 size={13} className="animate-spin" /> Uploading…
                </span>
              )}
            </div>

            <div
              onPaste={(event) => {
                const items = event.clipboardData?.items
                if (!items) return
                for (const item of Array.from(items)) {
                  if (item.type.startsWith("image/")) {
                    const file = item.getAsFile()
                    if (file) {
                      event.preventDefault()
                      void uploadCover(file)
                    }
                    return
                  }
                }
              }}
              onDrop={(event) => {
                event.preventDefault()
                const file = event.dataTransfer.files?.[0]
                if (file) void uploadCover(file)
              }}
              onDragOver={(event) => event.preventDefault()}
              className="rounded-2xl border border-dashed border-border bg-muted/30 p-3"
            >
              <div className="relative mb-3 aspect-[16/8] overflow-hidden rounded-xl bg-surface-soft">
                {form.coverImage ? (
                  <Image src={form.coverImage} alt="Cover preview" fill sizes="640px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-center">
                    <div>
                      <UploadCloud size={24} className="mx-auto text-muted-foreground" />
                      <p className="mt-2 text-xs font-semibold text-muted-foreground">
                        Upload, drag or paste an image here
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={form.coverImage}
                  onChange={(event) => set("coverImage", event.target.value)}
                  placeholder="Paste an image URL, or upload below…"
                  aria-label="Cover image URL"
                  className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void uploadCover(file)
                    event.target.value = ""
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="tap-target inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold hover:bg-muted focus-ring"
                >
                  <UploadCloud size={14} /> Upload
                </button>
                {form.coverImage && (
                  <button
                    type="button"
                    onClick={() => set("coverImage", "")}
                    aria-label="Remove cover image"
                    className="tap-target inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-danger hover:bg-danger/10 focus-ring"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">JPG, PNG or WebP up to 4 MB. Images are stored securely on the site.</p>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Save size={16} />
              </span>
              <h2 className="text-sm font-bold">Article content</h2>
            </div>
            <RichTextEditor
              value={form.content}
              onChange={(html) => set("content", html)}
              placeholder="Write your article here. You can paste images directly into the editor."
              minHeight={420}
              label="Article content"
              onImageUpload={(file) => uploadImage(file)}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Paste from Word or Google Docs, insert images, tables and links. Content is sanitised on save.
            </p>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold">Publishing</h2>
            <p className="mt-1 text-xs text-muted-foreground">Choose whether this article is visible now.</p>
            <div className="mt-4 space-y-2">
              {STATUS_OPTIONS.map((option) => {
                const active = form.status === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => set("status", option.value)}
                    aria-pressed={active}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition focus-ring ${
                      active ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                        active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      }`}
                    >
                      {active && <Check size={12} />}
                    </span>
                    <span>
                      <span className="block text-xs font-bold">{option.title}</span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{option.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            {(form.status === "scheduled" || form.status === "published") && (
              <label className={`${labelCls} mt-4`}>
                {form.status === "scheduled" ? "Publish at (East Africa time)" : "Publish at — optional"}
                <div className="relative">
                  <Clock3 size={15} className="pointer-events-none absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    value={form.publishAt}
                    onChange={(event) => set("publishAt", event.target.value)}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </label>
            )}
            {form.status === "scheduled" && (
              <button
                type="button"
                onClick={() => set("publishAt", utcToEatLocal(new Date(Date.now() + 3_600_000).toISOString()))}
                className="mt-2 text-[11px] font-bold text-primary hover:underline focus-ring"
              >
                Set to one hour from now
              </button>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold">Category</h2>
            <p className="mt-1 text-xs text-muted-foreground">Group related articles so readers can find them.</p>
            <select
              value={form.categoryId}
              onChange={(event) => set("categoryId", event.target.value)}
              className={`${inputCls} mt-3`}
              aria-label="Article category"
            >
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <div className="mt-4 border-t border-border pt-4">
              <label className={labelCls}>Add a new category</label>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void createCategory()
                    }
                  }}
                  placeholder="e.g. Case studies"
                  maxLength={60}
                  className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => void createCategory()}
                  disabled={!newCategory.trim() || creatingCategory}
                  aria-label="Create category"
                  className="tap-target inline-flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 focus-ring"
                >
                  {creatingCategory ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
                </button>
              </div>
            </div>
          </section>

          <section className="cool-gradient rounded-3xl p-5 text-white">
            <h2 className="text-sm font-bold">Before you publish</h2>
            <ul className="mt-3 space-y-2 text-[11px] leading-5 text-white/75">
              <li>• Add a cover image so the article stands out.</li>
              <li>• Keep the excerpt under two sentences for sharing.</li>
              <li>• Scheduled articles go live automatically — no extra step needed.</li>
            </ul>
          </section>
        </aside>
      </div>

      {!BLOG_STATUSES.includes(form.status) && (
        <p className="text-xs text-danger">Invalid status selected.</p>
      )}
    </form>
  )
}
