"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  CalendarClock,
  Check,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Loader2,
  MessageCircle,
  Newspaper,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Tags,
  Trash2,
} from "lucide-react"
import { fetchJson, inputCls, labelCls } from "@/components/admin/recruitment/shared"
import { formatEatDateTime } from "@/lib/careers"
import type { BlogCategory, BlogComment, BlogPost } from "@/lib/blog"
import { BLOG_STATUSES, type BlogPostStatus } from "@/lib/blog-helpers"
import { hasPermission } from "@/lib/roles"
import { useStore } from "@/lib/store"

function StatusBadge({ status }: { status: BlogPostStatus }) {
  const tones: Record<BlogPostStatus, string> = {
    draft: "bg-slate-100 text-slate-700",
    scheduled: "bg-indigo-100 text-indigo-800",
    published: "bg-emerald-100 text-emerald-800",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${tones[status] || tones.draft}`}>
      {status}
    </span>
  )
}

export default function AdminBlogPage() {
  const role = useStore((state) => state.adminRole)
  const permissions = useStore((state) => state.adminPermissions)
  const canManage = role ? hasPermission({ role, permissions }, "blog.manage") : false

  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [comments, setComments] = useState<BlogComment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<BlogPostStatus | "all">("all")
  const [categoryId, setCategoryId] = useState("all")
  const [busyId, setBusyId] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState("")
  const [editingCategoryName, setEditingCategoryName] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [postData, categoryData, commentData] = await Promise.all([
        fetchJson<{ posts: BlogPost[] }>("/api/admin/blog/posts"),
        fetchJson<{ categories: BlogCategory[] }>("/api/admin/blog/categories"),
        fetchJson<{ comments: BlogComment[] }>("/api/admin/blog/comments"),
      ])
      setPosts(postData.posts)
      setCategories(categoryData.categories)
      setComments(commentData.comments)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the blog.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canManage) void load()
    else setLoading(false)
  }, [canManage, load])

  const visiblePosts = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return posts.filter((post) => {
      if (status !== "all" && post.status !== status) return false
      if (categoryId !== "all" && post.categoryId !== categoryId) return false
      return !needle || [post.title, post.excerpt, post.author, post.categoryName].some((value) => value.toLowerCase().includes(needle))
    })
  }, [posts, search, status, categoryId])

  const stats = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((post) => post.status === "published").length,
      scheduled: posts.filter((post) => post.status === "scheduled").length,
      drafts: posts.filter((post) => post.status === "draft").length,
      comments: comments.length,
    }),
    [posts, comments]
  )

  const createCategory = async () => {
    const name = newCategory.trim()
    if (!name || creatingCategory) return
    setCreatingCategory(true)
    try {
      await fetchJson("/api/admin/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      setNewCategory("")
      toast.success("Category created.")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the category.")
    } finally {
      setCreatingCategory(false)
    }
  }

  const saveCategory = async (id: string) => {
    const name = editingCategoryName.trim()
    if (!name) return
    setBusyId(id)
    try {
      await fetchJson(`/api/admin/blog/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      setEditingCategoryId("")
      toast.success("Category updated.")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the category.")
    } finally {
      setBusyId("")
    }
  }

  const removeCategory = async (category: BlogCategory) => {
    if (!window.confirm(`Delete the “${category.name}” category?`)) return
    setBusyId(category.id)
    try {
      await fetchJson(`/api/admin/blog/categories/${category.id}`, { method: "DELETE" })
      toast.success("Category deleted.")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the category.")
    } finally {
      setBusyId("")
    }
  }

  const removePost = async (post: BlogPost) => {
    if (!window.confirm(`Delete “${post.title}”? Its claps and comments will also be removed.`)) return
    setBusyId(post.id)
    try {
      await fetchJson(`/api/admin/blog/posts/${post.id}`, { method: "DELETE" })
      toast.success("Article deleted.")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the article.")
    } finally {
      setBusyId("")
    }
  }

  const moderateComment = async (comment: BlogComment, statusValue: "published" | "hidden") => {
    setBusyId(comment.id)
    try {
      await fetchJson(`/api/admin/blog/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusValue }),
      })
      toast.success(statusValue === "published" ? "Comment published." : "Comment hidden.")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the comment.")
    } finally {
      setBusyId("")
    }
  }

  const removeComment = async (comment: BlogComment) => {
    if (!window.confirm("Delete this comment permanently?")) return
    setBusyId(comment.id)
    try {
      await fetchJson(`/api/admin/blog/comments/${comment.id}`, { method: "DELETE" })
      toast.success("Comment deleted.")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the comment.")
    } finally {
      setBusyId("")
    }
  }

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-danger/20 bg-danger/5 p-10 text-center">
          <ShieldAlert size={28} className="mx-auto text-danger" />
          <h1 className="mt-3 text-lg font-bold">Blog access required</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ask an owner or manager to enable the blog capability for your account.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Blog &amp; articles</h1>
          <p className="mt-1 text-xs text-muted-foreground">Write articles, manage categories and moderate reader comments.</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 focus-ring"
        >
          <Plus size={15} /> New article
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total articles", value: stats.total, icon: Newspaper },
          { label: "Published", value: stats.published, icon: Check },
          { label: "Scheduled", value: stats.scheduled, icon: CalendarClock },
          { label: "Drafts", value: stats.drafts, icon: FileText },
          { label: "Comments", value: stats.comments, icon: MessageCircle },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-muted-foreground">{item.label}</p>
              <item.icon size={15} className="text-primary" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={labelCls}>
              Search
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, author…" className={`${inputCls} pl-9`} />
              </div>
            </label>
            <label className={labelCls}>
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value as BlogPostStatus | "all")} className={inputCls}>
                <option value="all">All statuses</option>
                {BLOG_STATUSES.map((item) => <option key={item} value={item} className="capitalize">{item}</option>)}
              </select>
            </label>
            <label className={labelCls}>
              Category
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputCls}>
                <option value="all">All categories</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="h-72 animate-pulse rounded-2xl bg-muted/50" />
          ) : visiblePosts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border px-6 py-14 text-center">
              <Newspaper size={28} className="mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm font-bold">No articles found</p>
              <p className="mt-1 text-xs text-muted-foreground">Create your first article to start publishing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-bold">Article</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Category</th>
                    <th className="px-4 py-3 font-bold">Publish (EAT)</th>
                    <th className="px-4 py-3 font-bold">Engagement</th>
                    <th className="px-4 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visiblePosts.map((post) => (
                    <tr key={post.id} className="align-middle hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/admin/blog/${post.id}/edit`} className="font-semibold hover:underline">{post.title}</Link>
                        <p className="mt-0.5 line-clamp-1 max-w-sm text-xs text-muted-foreground">/{post.slug}</p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={post.status} /></td>
                      <td className="px-4 py-3 text-xs font-semibold">{post.categoryName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatEatDateTime(post.publishAt || post.publishedAt || post.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Heart size={13} /> {post.clapCount}</span>
                          <span className="inline-flex items-center gap-1"><MessageCircle size={13} /> {post.commentCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {busyId === post.id && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                          <Link href={`/admin/blog/${post.id}/edit`} title="Edit article" aria-label={`Edit ${post.title}`} className="rounded-lg p-2 hover:bg-muted focus-ring"><Pencil size={14} /></Link>
                          {post.status === "published" && (
                            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" title="View live article" aria-label={`View ${post.title}`} className="rounded-lg p-2 hover:bg-muted focus-ring"><ExternalLink size={14} /></a>
                          )}
                          {post.status === "scheduled" && <Clock3 size={14} className="text-indigo-600" aria-label="Scheduled" />}
                          <button type="button" onClick={() => void removePost(post)} disabled={busyId === post.id} title="Delete article" aria-label={`Delete ${post.title}`} className="rounded-lg p-2 text-danger hover:bg-danger/10 focus-ring disabled:opacity-50"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Tags size={16} /></span>
              <h2 className="text-sm font-bold">Categories</h2>
            </div>
            <div className="mt-4 space-y-2">
              {categories.length === 0 && <p className="text-xs text-muted-foreground">No categories yet.</p>}
              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                  {editingCategoryId === category.id ? (
                    <>
                      <input
                        value={editingCategoryName}
                        onChange={(event) => setEditingCategoryName(event.target.value)}
                        className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-card px-2 text-xs outline-none focus:border-primary"
                        aria-label={`Rename ${category.name}`}
                      />
                      <button type="button" onClick={() => void saveCategory(category.id)} disabled={busyId === category.id} aria-label="Save category" className="rounded-lg p-1.5 text-primary hover:bg-primary/10 focus-ring"><Check size={14} /></button>
                      <button type="button" onClick={() => setEditingCategoryId("")} aria-label="Cancel rename" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted focus-ring">×</button>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-xs font-bold">{category.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{category.postCount}</span>
                      <button
                        type="button"
                        onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name) }}
                        aria-label={`Rename ${category.name}`}
                        className="rounded-lg p-1.5 hover:bg-muted focus-ring"
                      ><Pencil size={13} /></button>
                      <button
                        type="button"
                        onClick={() => void removeCategory(category)}
                        aria-label={`Delete ${category.name}`}
                        className="rounded-lg p-1.5 text-danger hover:bg-danger/10 focus-ring"
                      ><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2 border-t border-border pt-4">
              <input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void createCategory() } }}
                placeholder="New category"
                maxLength={60}
                className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => void createCategory()}
                disabled={!newCategory.trim() || creatingCategory}
                className="tap-target inline-flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 focus-ring"
                aria-label="Create category"
              >
                {creatingCategory ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><MessageCircle size={16} /></span>
              <h2 className="text-sm font-bold">Recent comments</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Approve, hide or remove reader comments.</p>
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
              {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
              {comments.slice(0, 20).map((comment) => {
                const post = posts.find((item) => item.id === comment.postId)
                return (
                  <div key={comment.id} className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold">{comment.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{post?.title || "Deleted article"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${
                        comment.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}>{comment.status}</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-muted-foreground">{comment.body}</p>
                    <div className="mt-2 flex items-center gap-1">
                      {comment.status !== "published" && (
                        <button type="button" onClick={() => void moderateComment(comment, "published")} disabled={busyId === comment.id} title="Publish comment" className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50 focus-ring"><Eye size={13} /></button>
                      )}
                      {comment.status !== "hidden" && (
                        <button type="button" onClick={() => void moderateComment(comment, "hidden")} disabled={busyId === comment.id} title="Hide comment" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted focus-ring"><EyeOff size={13} /></button>
                      )}
                      <button type="button" onClick={() => void removeComment(comment)} disabled={busyId === comment.id} title="Delete comment" className="rounded-lg p-1.5 text-danger hover:bg-danger/10 focus-ring"><Trash2 size={13} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
