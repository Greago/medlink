"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Hand,
  Loader2,
  MessageCircle,
  Send,
  Share2,
  UserRound,
} from "lucide-react"
import type { BlogPost } from "@/lib/blog"
import { sanitizeForRender } from "@/lib/rich-text"

export interface PublicBlogComment {
  id: string
  postId: string
  name: string
  body: string
  createdAt: string
}

function formatDate(value: string | null): string {
  if (!value) return "Recent"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recent"
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatShortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recently"
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Request failed.")
  }
  return data as T
}

export function BlogDetail({
  post,
  comments,
  related,
  initialClaps,
  initialClapped,
}: {
  post: BlogPost
  comments: PublicBlogComment[]
  related: BlogPost[]
  initialClaps: number
  initialClapped: boolean
}) {
  const [claps, setClaps] = useState(initialClaps)
  const [clapped, setClapped] = useState(initialClapped)
  const [clapBusy, setClapBusy] = useState(false)
  const [commentList, setCommentList] = useState(comments)
  const [commentTotal, setCommentTotal] = useState(post.commentCount)
  const [form, setForm] = useState({ name: "", email: "", body: "" })
  const [commentBusy, setCommentBusy] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) setShareOpen(false)
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  const handleClap = async () => {
    if (clapBusy) return
    setClapBusy(true)
    try {
      const data = await postJson<{ count: number; clapped: boolean }>(`/api/blog/posts/${post.id}/clap`)
      setClaps(data.count)
      setClapped(data.clapped)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your clap.")
    } finally {
      setClapBusy(false)
    }
  }

  const handleComment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (commentBusy) return
    setCommentBusy(true)
    try {
      const data = await postJson<{ comment: PublicBlogComment }>(`/api/blog/posts/${post.id}/comments`, form)
      setCommentList((current) => [...current, data.comment])
      setCommentTotal((current) => current + 1)
      setForm({ name: "", email: "", body: "" })
      toast.success("Your comment has been posted.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post your comment.")
    } finally {
      setCommentBusy(false)
    }
  }

  const share = async (platform: "x" | "facebook" | "linkedin" | "whatsapp" | "copy") => {
    const url = `${window.location.origin}/blog/${post.slug}`
    const title = post.title
    const shareUrls: Record<Exclude<typeof platform, "copy">, string> = {
      x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`,
    }

    if (platform === "copy") {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        toast.success("Article link copied.")
        window.setTimeout(() => setCopied(false), 2000)
      } catch {
        toast.error("Could not copy the link. Please copy it from the address bar.")
      }
    } else {
      window.open(shareUrls[platform], "_blank", "noopener,noreferrer")
    }
    setShareOpen(false)
  }

  const safeContent = sanitizeForRender(post.content)

  return (
    <>
      <div className="sticky top-[72px] z-40 border-b border-border bg-card/95 backdrop-blur-xl lg:top-[72px]">
        <div className="section-shell flex h-14 items-center justify-between gap-4">
          <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline focus-ring">
            <ArrowLeft size={16} /> Back to insights
          </Link>
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:block">
            Medlink journal
          </span>
        </div>
      </div>

      <article className="py-10 md:py-16">
        <div className="section-shell max-w-4xl">
          <div className="mb-7">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
              {post.categoryName}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">{post.title}</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">{post.excerpt}</p>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-6 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <UserRound size={15} className="text-primary" /> {post.author}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={15} className="text-primary" />
                {formatDate(post.publishedAt || post.publishAt || post.createdAt)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 size={15} className="text-primary" /> {Math.max(1, Math.round(safeContent.length / 6000))} min read
              </span>
            </div>
          </div>

          {post.coverImage && (
            <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-3xl border border-border bg-surface-soft shadow-[var(--shadow-lift)]">
              <Image
                src={post.coverImage}
                alt=""
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 896px"
                className="object-cover"
              />
            </div>
          )}

          <div className="rte-content mx-auto max-w-3xl text-[15px] leading-8 md:text-base" dangerouslySetInnerHTML={{ __html: safeContent }} />

          <div className="mt-12 flex flex-wrap items-center gap-3 border-y border-border py-5">
            <button
              type="button"
              onClick={() => void handleClap()}
              disabled={clapBusy}
              aria-pressed={clapped}
              className={`tap-target inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition focus-ring disabled:opacity-60 ${
                clapped
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              {clapBusy ? <Loader2 size={17} className="animate-spin" /> : <Hand size={17} className={clapped ? "fill-current" : ""} />}
              {clapped ? "Clapped" : "Clap"} · {claps}
            </button>

            <a
              href="#comments"
              className="tap-target inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary focus-ring"
            >
              <MessageCircle size={17} /> {commentTotal} {commentTotal === 1 ? "comment" : "comments"}
            </a>

            <div className="relative ml-auto" ref={shareRef}>
              <button
                type="button"
                onClick={() => setShareOpen((open) => !open)}
                aria-expanded={shareOpen}
                className="tap-target inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 focus-ring"
              >
                <Share2 size={16} /> Share
              </button>

              {shareOpen && (
                <div
                  role="menu"
                  aria-label="Share this article"
                  className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-[var(--shadow-lift)] animate-fade-in"
                >
                  {([
                    ["x", "X / Twitter"],
                    ["facebook", "Facebook"],
                    ["linkedin", "LinkedIn"],
                    ["whatsapp", "WhatsApp"],
                  ] as const).map(([platform, label]) => (
                    <button
                      key={platform}
                      type="button"
                      role="menuitem"
                      onClick={() => void share(platform)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold hover:bg-muted focus-ring"
                    >
                      <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-[11px] font-extrabold text-ink">
                        {platform === "x" ? "X" : platform === "facebook" ? "f" : platform === "linkedin" ? "in" : "WA"}
                      </span>
                      {label}
                    </button>
                  ))}
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void share("copy")}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold hover:bg-muted focus-ring"
                  >
                    <span className="flex size-7 items-center justify-center rounded-lg bg-muted">
                      {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                    </span>
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <section id="comments" className="section-shell mt-14 max-w-4xl scroll-mt-28">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-lift)] md:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow mb-2">Join the conversation</p>
                <h2 className="text-xl font-bold tracking-tight md:text-2xl">Comments ({commentTotal})</h2>
              </div>
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessageCircle size={19} />
              </span>
            </div>

            <form onSubmit={handleComment} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Your name
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="e.g. Jane Kamau"
                    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Email address
                  <input
                    required
                    type="email"
                    maxLength={160}
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="you@example.com"
                    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
              <label className="text-xs font-semibold text-muted-foreground">
                Your comment
                <textarea
                  required
                  minLength={3}
                  maxLength={2000}
                  rows={4}
                  value={form.body}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="Share your thoughts or ask a question…"
                  className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <div>
                <button
                  type="submit"
                  disabled={commentBusy}
                  className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 focus-ring disabled:opacity-60"
                >
                  {commentBusy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Post comment
                </button>
              </div>
            </form>

            <div className="mt-8 space-y-4 border-t border-border pt-6">
              {commentList.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No comments yet. Be the first to share a thought.</p>
              ) : (
                commentList.map((comment) => (
                  <div key={comment.id} className="rounded-2xl bg-muted/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold">{comment.name}</p>
                      <span className="text-[11px] font-medium text-muted-foreground">{formatShortDate(comment.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{comment.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="section-shell mt-16 max-w-6xl">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-2">Keep reading</p>
                <h2 className="text-2xl font-bold tracking-tight">Related articles</h2>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                All articles <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/blog/${item.slug}`}
                  className="surface-card hover-lift group flex flex-col overflow-hidden focus-ring"
                >
                  <div className="relative h-40 overflow-hidden bg-surface-soft">
                    <Image
                      src={item.coverImage || "/placeholder.jpg"}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-primary">{item.categoryName}</span>
                    <h3 className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug">{item.title}</h3>
                    <span className="mt-auto pt-3 text-[11px] font-semibold text-muted-foreground">
                      {formatShortDate(item.publishedAt || item.publishAt || item.createdAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  )
}
