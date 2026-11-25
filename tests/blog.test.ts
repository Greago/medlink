import { test } from "node:test"
import assert from "node:assert/strict"
import {
  isBlogPostVisible,
  normalizeBlogSchedule,
  slugifyBlog,
  validateBlogComment,
} from "@/lib/blog-helpers"

test("blog slugs are URL safe", () => {
  assert.equal(slugifyBlog("Choosing the Right Equipment for Your Facility!"), "choosing-the-right-equipment-for-your-facility")
  assert.equal(slugifyBlog("  PPE & Safety  "), "ppe-safety")
})

test("future scheduled posts stay scheduled", () => {
  const now = new Date("2026-11-25T10:00:00.000Z")
  const schedule = normalizeBlogSchedule(
    { status: "scheduled", publishAt: "2026-11-26T07:00:00.000Z" },
    now
  )
  assert.equal(schedule.status, "scheduled")
  assert.equal(schedule.publishedAt, null)
})

test("scheduled posts whose time has arrived become published", () => {
  const now = new Date("2026-11-25T10:00:00.000Z")
  const schedule = normalizeBlogSchedule(
    { status: "scheduled", publishAt: "2026-11-25T09:00:00.000Z" },
    now
  )
  assert.equal(schedule.status, "published")
  assert.equal(schedule.publishedAt, "2026-11-25T09:00:00.000Z")
})

test("scheduling without a date is rejected", () => {
  assert.throws(
    () => normalizeBlogSchedule({ status: "scheduled", publishAt: null }),
    /publish date/i
  )
})

test("visibility includes published posts and reached schedules only", () => {
  const now = new Date("2026-11-25T10:00:00.000Z")
  assert.equal(isBlogPostVisible({ status: "published", publishAt: null, publishedAt: null }, now), true)
  assert.equal(
    isBlogPostVisible({ status: "scheduled", publishAt: "2026-11-25T09:00:00.000Z", publishedAt: null }, now),
    true
  )
  assert.equal(
    isBlogPostVisible({ status: "scheduled", publishAt: "2026-11-26T09:00:00.000Z", publishedAt: null }, now),
    false
  )
  assert.equal(isBlogPostVisible({ status: "draft", publishAt: null, publishedAt: null }, now), false)
})

test("comments require a name, email and message", () => {
  const valid = validateBlogComment({
    name: "Jane Kamau",
    email: "jane@example.com",
    body: "Very useful guide.",
  })
  assert.deepEqual(valid, { name: "Jane Kamau", email: "jane@example.com", body: "Very useful guide." })
  assert.throws(() => validateBlogComment({ name: "J", email: "jane@example.com", body: "Hello" }), /name/i)
  assert.throws(() => validateBlogComment({ name: "Jane", email: "not-an-email", body: "Hello" }), /email/i)
  assert.throws(() => validateBlogComment({ name: "Jane", email: "jane@example.com", body: "" }), /comment/i)
})
