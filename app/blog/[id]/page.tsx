import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { ArrowLeft, FileQuestion } from "lucide-react"
import { BlogDetail } from "@/components/blog/blog-detail"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { getBlogClapState, getBlogComments, getBlogPost, getRelatedPosts } from "@/lib/blog"
import { CUSTOMER_COOKIE } from "@/lib/customer"
import { sanitizeRichText } from "@/lib/rich-text"

export const metadata: Metadata = {
  title: "Article",
  description: "Insights and practical guides from Medlink Expedite.",
}

export const dynamic = "force-dynamic"

interface Context {
  params: Promise<{ id: string }>
}

export default async function BlogDetailPage({ params }: Context) {
  const { id } = await params

  let post: Awaited<ReturnType<typeof getBlogPost>> = null
  try {
    post = await getBlogPost(id, true)
  } catch {
    post = null
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-background">
        <Navigation />
        <div className="section-shell py-24 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileQuestion size={26} />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Article not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            It may have been unpublished or the link may have changed. Browse the latest insights instead.
          </p>
          <Link
            href="/blog"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 focus-ring"
          >
            <ArrowLeft size={16} /> Back to insights
          </Link>
        </div>
        <Footer />
      </main>
    )
  }

  const cookieStore = await cookies()
  const customerId = cookieStore.get(CUSTOMER_COOKIE)?.value || null

  const [comments, related, claps] = await Promise.all([
    getBlogComments(post.id, true),
    getRelatedPosts(post, 3),
    getBlogClapState(post.id, customerId),
  ])

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <BlogDetail
        post={{ ...post, content: sanitizeRichText(post.content) }}
        comments={comments.map(({ email: _email, ...comment }) => comment)}
        related={related}
        initialClaps={claps.count}
        initialClapped={claps.clapped}
      />
      <Footer />
    </main>
  )
}
