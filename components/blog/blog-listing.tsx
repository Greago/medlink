"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, CalendarDays, Heart, MessageCircle, Search, X } from "lucide-react"
import type { BlogCategory, BlogPost } from "@/lib/blog"

function formatPostDate(value: string | null): string {
  if (!value) return "Draft"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recent"
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function BlogListing({
  posts,
  categories,
  featuredSlug,
}: {
  posts: BlogPost[]
  categories: BlogCategory[]
  featuredSlug?: string
}) {
  const [activeCategory, setActiveCategory] = useState("all")
  const [search, setSearch] = useState("")
  const hasFilters = activeCategory !== "all" || search.trim().length > 0

  const visiblePosts = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return posts.filter((post) => {
      if (!hasFilters && featuredSlug && post.slug === featuredSlug) return false
      const matchesCategory = activeCategory === "all" || post.categorySlug === activeCategory
      const matchesSearch =
        !needle ||
        [post.title, post.excerpt, post.categoryName, post.author].some((value) =>
          value.toLowerCase().includes(needle)
        )
      return matchesCategory && matchesSearch
    })
  }, [posts, activeCategory, search, featuredSlug, hasFilters])

  return (
    <section className="bg-background py-14 md:py-20">
      <div className="section-shell">
        <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                The archive
              </p>
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              Browse every article
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Filter by topic or search for the guidance your team needs today.
            </p>
          </div>

          <label className="relative block w-full max-w-sm">
            <span className="sr-only">Search articles</span>
            <Search
              size={17}
              className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search articles…"
              className="h-11 w-full border-0 border-b border-border bg-transparent pl-7 pr-8 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-foreground focus-ring"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-ring"
              >
                <X size={15} />
              </button>
            )}
          </label>
        </div>

        <div className="flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="no-scrollbar flex gap-6 overflow-x-auto"
            role="group"
            aria-label="Filter articles by category"
          >
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              aria-pressed={activeCategory === "all"}
              className={`shrink-0 border-b-2 pb-2 text-xs font-bold uppercase tracking-[0.08em] transition focus-ring ${
                activeCategory === "all"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              All articles · {posts.length}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.slug)}
                aria-pressed={activeCategory === category.slug}
                className={`shrink-0 border-b-2 pb-2 text-xs font-bold uppercase tracking-[0.08em] transition focus-ring ${
                  activeCategory === category.slug
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {category.name} · {category.postCount}
              </button>
            ))}
          </div>

          <p className="shrink-0 text-xs font-semibold text-muted-foreground">
            Showing {visiblePosts.length} of {posts.length}
          </p>
        </div>

        {visiblePosts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
              <Search size={22} />
            </div>
            <h3 className="mt-4 text-lg font-bold">No articles found</h3>
            <p className="mt-2 text-sm text-muted-foreground">Try another keyword or choose a different category.</p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory("all")
                setSearch("")
              }}
              className="mt-5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground transition hover:border-foreground focus-ring"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            {visiblePosts.map((post, index) => (
              <article key={post.id} className="group flex flex-col" style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}>
                <Link
                  href={`/blog/${post.slug}`}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="relative block aspect-[16/10] overflow-hidden rounded-2xl bg-surface-soft focus-ring"
                >
                  <Image
                    src={post.coverImage || "/placeholder.jpg"}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </Link>

                <div className="flex flex-1 flex-col pt-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="text-foreground">{post.categoryName}</span>
                    <span className="size-1 rounded-full bg-border" aria-hidden="true" />
                    <span>{formatPostDate(post.publishedAt || post.publishAt || post.createdAt)}</span>
                  </div>

                  <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight text-foreground">
                    <Link href={`/blog/${post.slug}`} className="transition hover:underline focus-ring">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>

                  <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-[11px] font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Heart size={13} className="text-foreground/70" />
                      {post.clapCount} {post.clapCount === 1 ? "clap" : "claps"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MessageCircle size={13} className="text-foreground/70" />
                      {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
                    </span>
                  </div>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-4 inline-flex items-center gap-1.5 self-start text-xs font-bold text-foreground hover:gap-2.5 focus-ring"
                  >
                    Read article
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {hasFilters && visiblePosts.length > 0 && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setActiveCategory("all")
                setSearch("")
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-foreground transition hover:border-foreground focus-ring"
            >
              <X size={14} /> Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
