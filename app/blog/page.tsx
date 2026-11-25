import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, Heart, MessageCircle } from "lucide-react"
import { BlogListing } from "@/components/blog/blog-listing"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { getBlogCategories, getBlogPosts } from "@/lib/blog"

export const metadata: Metadata = {
  title: "Insights & guides",
  description:
    "Practical articles, product guides and industry insights from the Medlink Expedite team for hospitals, clinics and pharmacies.",
}

export const dynamic = "force-dynamic"

const journalHeroStyle = {
  backgroundColor: "#f2efe9",
  backgroundImage: [
    "radial-gradient(circle at 84% 18%, rgba(17, 24, 39, 0.07), transparent 34%)",
    "linear-gradient(to right, rgba(17, 24, 39, 0.045) 1px, transparent 1px)",
    "linear-gradient(to bottom, rgba(17, 24, 39, 0.045) 1px, transparent 1px)",
  ].join(", "),
  backgroundSize: "auto, 72px 72px, 72px 72px",
} as const

export default async function BlogPage() {
  let posts: Awaited<ReturnType<typeof getBlogPosts>> = []
  let categories: Awaited<ReturnType<typeof getBlogCategories>> = []

  try {
    ;[posts, categories] = await Promise.all([getBlogPosts({ publishedOnly: true }), getBlogCategories(true)])
  } catch {
    // The page still renders a useful empty state if content is unavailable.
  }

  const totalClaps = posts.reduce((sum, post) => sum + post.clapCount, 0)
  const totalComments = posts.reduce((sum, post) => sum + post.commentCount, 0)

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <section className="relative overflow-hidden border-b border-border" style={journalHeroStyle}>
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 lg:block" aria-hidden="true">
          <div className="absolute right-[12%] top-1/2 size-72 -translate-y-1/2 rounded-full border border-border/70" />
          <div className="absolute right-[18%] top-1/2 size-48 -translate-y-1/2 rounded-full border border-border/50" />
        </div>

        <div className="section-shell relative grid gap-10 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                The Medlink journal
              </p>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground md:text-6xl">
              Equipment insights for better healthcare decisions
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Expert articles, buying guides and field-tested advice for the teams keeping hospitals, clinics and
              pharmacies running.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <BookOpen size={15} className="text-foreground" /> {posts.length} articles
              </span>
              <span className="hidden size-1 rounded-full bg-border sm:block" aria-hidden="true" />
              <span className="inline-flex items-center gap-2">
                <Heart size={15} className="text-foreground" /> {totalClaps} claps
              </span>
              <span className="hidden size-1 rounded-full bg-border sm:block" aria-hidden="true" />
              <span className="inline-flex items-center gap-2">
                <MessageCircle size={15} className="text-foreground" /> {totalComments} comments
              </span>
            </div>
          </div>

          <div className="hidden items-end gap-7 lg:flex">
            <div className="border-l-2 border-foreground pl-5">
              <p className="text-4xl font-extrabold tracking-tight text-foreground">
                {String(posts.length).padStart(2, "0")}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Published notes
              </p>
            </div>
            <div className="border-l border-border pl-5">
              <p className="text-4xl font-extrabold tracking-tight text-foreground">
                {String(totalClaps).padStart(2, "0")}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Claps received
              </p>
            </div>
          </div>
        </div>
      </section>

      {posts[0] && (
        <section className="border-b border-border bg-background">
          <div className="section-shell py-8">
            <Link
              href={`/blog/${posts[0].slug}`}
              className="group grid overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] transition hover:border-foreground/20 hover:shadow-[var(--shadow-lift)] focus-ring lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
            >
              <div className="relative min-h-[240px] overflow-hidden bg-surface-soft">
                <Image
                  src={posts[0].coverImage || "/placeholder.jpg"}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col justify-center p-6 md:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Latest from the desk
                </p>
                <h2 className="mt-3 text-2xl font-bold leading-snug tracking-tight md:text-3xl">{posts[0].title}</h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{posts[0].excerpt}</p>
                <span className="mt-5 inline-flex items-center gap-2 self-start text-xs font-bold text-foreground group-hover:gap-3">
                  Read the latest article <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}

      <BlogListing posts={posts} categories={categories} featuredSlug={posts[0]?.slug} />
      <Footer />
    </main>
  )
}
