import { randomUUID } from "crypto"
import type { QueryResultRow } from "pg"
import { ensureSchema, query, withTransaction } from "@/lib/db"
import {
  normalizeBlogSchedule,
  slugifyBlog,
  validateBlogComment,
  type BlogPostStatus,
  type ValidBlogComment,
} from "@/lib/blog-helpers"
import { sanitizeRichText } from "@/lib/rich-text"

export type { BlogPostStatus } from "@/lib/blog-helpers"

export interface BlogCategory {
  id: string
  name: string
  slug: string
  description: string
  postCount: number
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  coverImage: string
  author: string
  categoryId: string | null
  categoryName: string
  categorySlug: string
  status: BlogPostStatus
  publishAt: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  clapCount: number
  commentCount: number
}

export interface BlogComment {
  id: string
  postId: string
  name: string
  email: string
  body: string
  status: "pending" | "published" | "hidden"
  createdAt: string
}

export interface BlogPostInput {
  title: string
  slug?: string
  excerpt: string
  content: string
  coverImage: string
  author: string
  categoryId: string | null
  status: BlogPostStatus
  publishAt: string | null
}

interface BlogCategoryRow extends QueryResultRow {
  id: string
  name: string
  slug: string
  description: string
  post_count: number | string
}

interface BlogPostRow extends QueryResultRow {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  cover_image: string
  author: string
  category_id: string | null
  category_name: string | null
  category_slug: string | null
  status: string
  publish_at: Date | string | null
  published_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
  clap_count: number | string
  comment_count: number | string
}

interface BlogCommentRow extends QueryResultRow {
  id: string
  post_id: string
  name: string
  email: string
  body: string
  status: string
  created_at: Date | string
}

const VISIBLE_SQL = `(p.status = 'published' OR (p.status = 'scheduled' AND p.publish_at <= NOW()))`

const POST_SELECT = `
  SELECT p.id, p.slug, p.title, p.excerpt, p.content, p.cover_image, p.author,
         p.category_id, c.name AS category_name, c.slug AS category_slug,
         p.status, p.publish_at, p.published_at, p.created_at, p.updated_at,
         (SELECT COUNT(*)::int FROM blog_claps cl WHERE cl.post_id = p.id) AS clap_count,
         (SELECT COUNT(*)::int FROM blog_comments co
           WHERE co.post_id = p.id AND co.status = 'published') AS comment_count
  FROM blog_posts p
  LEFT JOIN blog_categories c ON c.id = p.category_id
`

function iso(value: Date | string | null | undefined): string | null {
  if (value == null) return null
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function number(value: number | string | null | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0)
}

function mapCategory(row: BlogCategoryRow): BlogCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    postCount: number(row.post_count),
  }
}

function mapPost(row: BlogPostRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || "",
    content: row.content || "",
    coverImage: row.cover_image || "",
    author: row.author || "Medlink Expedite",
    categoryId: row.category_id || null,
    categoryName: row.category_name || "General",
    categorySlug: row.category_slug || "general",
    status: (row.status === "draft" || row.status === "scheduled" ? row.status : "published") as BlogPostStatus,
    publishAt: iso(row.publish_at),
    publishedAt: iso(row.published_at),
    createdAt: iso(row.created_at) || new Date().toISOString(),
    updatedAt: iso(row.updated_at) || new Date().toISOString(),
    clapCount: number(row.clap_count),
    commentCount: number(row.comment_count),
  }
}

function mapComment(row: BlogCommentRow): BlogComment {
  return {
    id: row.id,
    postId: row.post_id,
    name: row.name,
    email: row.email,
    body: row.body,
    status: (row.status === "pending" || row.status === "hidden" ? row.status : "published") as BlogComment["status"],
    createdAt: iso(row.created_at) || new Date().toISOString(),
  }
}

export async function getBlogCategories(publishedOnly = false): Promise<BlogCategory[]> {
  await ensureSchema()
  const countCondition = publishedOnly
    ? `AND (p.status = 'published' OR (p.status = 'scheduled' AND p.publish_at <= NOW()))`
    : ""
  const result = await query<BlogCategoryRow>(
    `SELECT c.id, c.name, c.slug, c.description, COUNT(p.id)::int AS post_count
     FROM blog_categories c
     LEFT JOIN blog_posts p ON p.category_id = c.id ${countCondition}
     GROUP BY c.id, c.name, c.slug, c.description
     ORDER BY c.name ASC`
  )
  return result.rows.map(mapCategory)
}

export async function createBlogCategory(name: string, description = ""): Promise<BlogCategory> {
  await ensureSchema()
  const cleanName = name.trim()
  if (!cleanName) throw new Error("Category name is required.")

  const result = await query<BlogCategoryRow>(
    `INSERT INTO blog_categories (id, name, slug, description)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, slug, description, 0::int AS post_count`,
    [randomUUID(), cleanName, slugifyBlog(cleanName), description.trim()]
  )
  return mapCategory(result.rows[0])
}

export async function updateBlogCategory(id: string, name: string, description: string): Promise<BlogCategory | null> {
  await ensureSchema()
  const cleanName = name.trim()
  if (!cleanName) throw new Error("Category name is required.")

  const result = await query<BlogCategoryRow>(
    `UPDATE blog_categories
     SET name = $2, slug = $3, description = $4
     WHERE id = $1
     RETURNING id, name, slug, description,
       (SELECT COUNT(*)::int FROM blog_posts WHERE category_id = $1) AS post_count`,
    [id, cleanName, slugifyBlog(cleanName), description.trim()]
  )
  return result.rows[0] ? mapCategory(result.rows[0]) : null
}

export async function deleteBlogCategory(id: string): Promise<boolean> {
  await ensureSchema()
  const result = await query(
    `DELETE FROM blog_categories c
     WHERE c.id = $1
       AND NOT EXISTS (SELECT 1 FROM blog_posts p WHERE p.category_id = $1)
     RETURNING c.id`,
    [id]
  )
  return (result.rowCount ?? 0) > 0
}

export async function getBlogPosts(options: {
  publishedOnly?: boolean
  categorySlug?: string
  categoryId?: string
  search?: string
} = {}): Promise<BlogPost[]> {
  await ensureSchema()
  const conditions: string[] = []
  const params: unknown[] = []

  if (options.publishedOnly !== false) conditions.push(VISIBLE_SQL)

  if (options.categorySlug) {
    params.push(options.categorySlug)
    conditions.push(`c.slug = $${params.length}`)
  }

  if (options.categoryId) {
    params.push(options.categoryId)
    conditions.push(`p.category_id = $${params.length}`)
  }

  if (options.search?.trim()) {
    params.push(`%${options.search.trim()}%`)
    const index = params.length
    conditions.push(`(p.title ILIKE $${index} OR p.excerpt ILIKE $${index} OR p.content ILIKE $${index})`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
  const result = await query<BlogPostRow>(
    `${POST_SELECT} ${where}
     ORDER BY COALESCE(p.published_at, p.publish_at, p.created_at) DESC, p.created_at DESC`,
    params
  )
  return result.rows.map(mapPost)
}

export async function getBlogPost(idOrSlug: string, publishedOnly = true): Promise<BlogPost | null> {
  await ensureSchema()
  const result = await query<BlogPostRow>(
    `${POST_SELECT} WHERE (p.id = $1 OR p.slug = $1) ${publishedOnly ? `AND ${VISIBLE_SQL}` : ""} LIMIT 1`,
    [idOrSlug]
  )
  return result.rows[0] ? mapPost(result.rows[0]) : null
}

export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  await ensureSchema()
  const result = await query<BlogPostRow>(
    `${POST_SELECT}
     WHERE ${VISIBLE_SQL} AND p.id <> $1
     ORDER BY (p.category_id = $2) DESC,
              COALESCE(p.published_at, p.publish_at, p.created_at) DESC
     LIMIT $3`,
    [post.id, post.categoryId || "", limit]
  )
  return result.rows.map(mapPost)
}

async function uniqueSlug(slug: string, currentId = ""): Promise<string> {
  let candidate = slug
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await query("SELECT 1 FROM blog_posts WHERE slug = $1 AND id <> $2 LIMIT 1", [candidate, currentId])
    if (!result.rowCount) return candidate
    candidate = `${slug}-${randomUUID().slice(0, 6)}`
  }
  return `${slug}-${randomUUID()}`
}

export async function saveBlogPost(input: BlogPostInput, id?: string): Promise<BlogPost> {
  await ensureSchema()

  const title = input.title.trim()
  if (title.length < 3) throw new Error("Article title is required.")

  const schedule = normalizeBlogSchedule({ status: input.status, publishAt: input.publishAt })
  const slug = await uniqueSlug(slugifyBlog(input.slug?.trim() || title), id)
  const values = [
    slug,
    title,
    input.excerpt.trim(),
    sanitizeRichText(input.content),
    input.coverImage.trim(),
    input.author.trim() || "Medlink Expedite",
    input.categoryId || null,
    schedule.status,
    schedule.publishAt,
    schedule.publishedAt,
  ]

  if (id) {
    const result = await query<{ id: string }>(
      `UPDATE blog_posts
       SET slug = $2, title = $3, excerpt = $4, content = $5, cover_image = $6,
           author = $7, category_id = $8, status = $9, publish_at = $10,
           published_at = $11, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, ...values]
    )
    if (!result.rows[0]) throw new Error("Article not found.")
    const updated = await getBlogPost(id, false)
    if (!updated) throw new Error("Article not found.")
    return updated
  }

  const newId = randomUUID()
  await query(
    `INSERT INTO blog_posts
       (id, slug, title, excerpt, content, cover_image, author, category_id, status, publish_at, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [newId, ...values]
  )
  const created = await getBlogPost(newId, false)
  if (!created) throw new Error("Could not create the article.")
  return created
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  await ensureSchema()
  const result = await query("DELETE FROM blog_posts WHERE id = $1 RETURNING id", [id])
  return (result.rowCount ?? 0) > 0
}

export async function getBlogClapState(
  postId: string,
  customerId?: string | null
): Promise<{ count: number; clapped: boolean }> {
  await ensureSchema()
  const [countResult, ownResult] = await Promise.all([
    query<{ count: number | string }>("SELECT COUNT(*)::int AS count FROM blog_claps WHERE post_id = $1", [postId]),
    customerId
      ? query("SELECT 1 FROM blog_claps WHERE post_id = $1 AND customer_id = $2 LIMIT 1", [postId, customerId])
      : Promise.resolve({ rowCount: 0 }),
  ])
  return {
    count: number(countResult.rows[0]?.count),
    clapped: Boolean(ownResult.rowCount),
  }
}

export async function toggleBlogClap(
  postId: string,
  customerId: string
): Promise<{ count: number; clapped: boolean }> {
  await ensureSchema()

  return withTransaction(async (client) => {
    const existing = await client.query("SELECT 1 FROM blog_claps WHERE post_id = $1 AND customer_id = $2", [
      postId,
      customerId,
    ])
    const clapped = !existing.rowCount

    if (existing.rowCount) {
      await client.query("DELETE FROM blog_claps WHERE post_id = $1 AND customer_id = $2", [postId, customerId])
    } else {
      await client.query("INSERT INTO blog_claps (post_id, customer_id) VALUES ($1, $2)", [postId, customerId])
    }

    const countResult = await client.query<{ count: number | string }>(
      "SELECT COUNT(*)::int AS count FROM blog_claps WHERE post_id = $1",
      [postId]
    )
    return { count: number(countResult.rows[0]?.count), clapped }
  })
}

export async function getBlogComments(postId: string, publishedOnly = true): Promise<BlogComment[]> {
  await ensureSchema()
  const condition = publishedOnly ? "AND status = 'published'" : ""
  const result = await query<BlogCommentRow>(
    `SELECT id, post_id, name, email, body, status, created_at
     FROM blog_comments
     WHERE post_id = $1 ${condition}
     ORDER BY created_at ASC`,
    [postId]
  )
  return result.rows.map(mapComment)
}

export async function getAllBlogComments(): Promise<BlogComment[]> {
  await ensureSchema()
  const result = await query<BlogCommentRow>(
    `SELECT co.id, co.post_id, co.name, co.email, co.body, co.status, co.created_at
     FROM blog_comments co
     ORDER BY co.created_at DESC
     LIMIT 200`
  )
  return result.rows.map(mapComment)
}

export async function addBlogComment(
  postId: string,
  customerId: string,
  input: { name: unknown; email: unknown; body: unknown }
): Promise<BlogComment> {
  await ensureSchema()
  const comment: ValidBlogComment = validateBlogComment(input)
  const id = randomUUID()
  const result = await query<BlogCommentRow>(
    `INSERT INTO blog_comments (id, post_id, customer_id, name, email, body, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'published')
     RETURNING id, post_id, name, email, body, status, created_at`,
    [id, postId, customerId, comment.name, comment.email, comment.body]
  )
  return mapComment(result.rows[0])
}

export async function setBlogCommentStatus(id: string, status: BlogComment["status"]): Promise<BlogComment | null> {
  await ensureSchema()
  const result = await query<BlogCommentRow>(
    `UPDATE blog_comments SET status = $2 WHERE id = $1
     RETURNING id, post_id, name, email, body, status, created_at`,
    [id, status]
  )
  return result.rows[0] ? mapComment(result.rows[0]) : null
}

export async function deleteBlogComment(id: string): Promise<boolean> {
  await ensureSchema()
  const result = await query("DELETE FROM blog_comments WHERE id = $1 RETURNING id", [id])
  return (result.rowCount ?? 0) > 0
}
