export const BLOG_STATUSES = ["draft", "scheduled", "published"] as const
export type BlogPostStatus = (typeof BLOG_STATUSES)[number]

export interface BlogScheduleInput {
  status: BlogPostStatus
  publishAt: string | null
}

export interface BlogSchedule {
  status: BlogPostStatus
  publishAt: string | null
  publishedAt: string | null
}

export function slugifyBlog(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || `blog-${Date.now()}`
  )
}

/**
 * A scheduled post whose date has arrived becomes published automatically, so
 * public queries never need a cron job to reveal it.
 */
export function normalizeBlogSchedule(input: BlogScheduleInput, now: Date = new Date()): BlogSchedule {
  const publishAt = input.publishAt && !Number.isNaN(new Date(input.publishAt).getTime())
    ? new Date(input.publishAt).toISOString()
    : null

  if (input.status === "scheduled" && !publishAt) {
    throw new Error("Choose a publish date for a scheduled article.")
  }

  if (input.status === "draft") {
    return { status: "draft", publishAt, publishedAt: null }
  }

  if (input.status === "scheduled" && publishAt && new Date(publishAt).getTime() > now.getTime()) {
    return { status: "scheduled", publishAt, publishedAt: null }
  }

  const visibleAt = publishAt ?? now.toISOString()
  return { status: "published", publishAt: visibleAt, publishedAt: visibleAt }
}

export function isBlogPostVisible(
  post: Pick<BlogSchedule, "status" | "publishedAt"> & { publishAt?: string | null },
  now: Date = new Date()
): boolean {
  if (post.status === "published") return true
  if (post.status !== "scheduled" || !post.publishAt) return false
  return new Date(post.publishAt).getTime() <= now.getTime()
}

export interface ValidBlogComment {
  name: string
  email: string
  body: string
}

export function validateBlogComment(input: {
  name?: unknown
  email?: unknown
  body?: unknown
}): ValidBlogComment {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : ""
  const email = typeof input.email === "string" ? input.email.trim().slice(0, 160) : ""
  const body = typeof input.body === "string" ? input.body.trim().slice(0, 2000) : ""

  if (name.length < 2) throw new Error("Please enter your name.")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address.")
  if (body.length < 3) throw new Error("Please write a comment.")

  return { name, email, body }
}
