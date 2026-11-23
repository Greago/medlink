import { test } from "node:test"
import assert from "node:assert/strict"
import { renderTemplate, EMAIL_VARIABLES } from "@/lib/careers-emails"
import { eatLocalToUtc, utcToEatLocal, daysUntil, slugify, formatKshRange } from "@/lib/careers"
import { csvSafe } from "@/app/api/admin/recruitment/export/route"

test("renderer substitutes known variables", () => {
  const result = renderTemplate("Dear {{candidate_name}}, ref {{reference_number}}.", {
    candidate_name: "Jane Wanjiku",
    reference_number: "APP-2026-000001",
  })
  assert.equal(result.output, "Dear Jane Wanjiku, ref APP-2026-000001.")
  assert.deepEqual(result.missing, [])
})

test("renderer tolerates whitespace inside tokens", () => {
  const result = renderTemplate("Hi {{ candidate_name }}!", { candidate_name: "Sam" })
  assert.equal(result.output, "Hi Sam!")
})

test("renderer reports missing values and removes the token", () => {
  const result = renderTemplate("Dear {{candidate_name}}, interview on {{interview_date}}.", { candidate_name: "Jane" })
  assert.equal(result.output, "Dear Jane, interview on .")
  assert.deepEqual(result.missing, ["interview_date"])
})

test("renderer reports unknown variables", () => {
  const result = renderTemplate("{{not_a_variable}}", {})
  assert.deepEqual(result.missing, ["not_a_variable"])
  assert.equal(result.output, "")
})

test("renderer escapes values in HTML mode", () => {
  const result = renderTemplate("<p>{{candidate_name}}</p>", { candidate_name: '<script>alert("x")</script>' }, true)
  assert.ok(!result.output.includes("<script>"))
  assert.ok(result.output.includes("&lt;script&gt;"))
})

test("renderer does not escape in plain-text mode", () => {
  const result = renderTemplate("{{candidate_name}}", { candidate_name: "Ben & Jerry" })
  assert.equal(result.output, "Ben & Jerry")
})

test("renderer deduplicates repeated missing tokens", () => {
  const result = renderTemplate("{{interview_time}} {{interview_time}}", {})
  assert.deepEqual(result.missing, ["interview_time"])
})

test("all documented variables render", () => {
  const context = Object.fromEntries(EMAIL_VARIABLES.map((token) => [token, `v-${token}`]))
  const template = EMAIL_VARIABLES.map((token) => `{{${token}}}`).join("|")
  const result = renderTemplate(template, context)
  assert.deepEqual(result.missing, [])
  assert.equal(result.output, EMAIL_VARIABLES.map((token) => `v-${token}`).join("|"))
})

test("EAT conversion round-trips (UTC+3, no DST)", () => {
  const utc = eatLocalToUtc("2026-07-01T09:30")
  assert.equal(utc, "2026-07-01T06:30:00.000Z")
  assert.equal(utcToEatLocal(utc), "2026-07-01T09:30")
})

test("EAT conversion handles day rollover", () => {
  const utc = eatLocalToUtc("2026-01-01T01:00")
  assert.equal(utc, "2025-12-31T22:00:00.000Z")
  assert.equal(utcToEatLocal(utc), "2026-01-01T01:00")
})

test("EAT conversion rejects empty/invalid input", () => {
  assert.equal(eatLocalToUtc(""), null)
  assert.equal(eatLocalToUtc("not-a-date"), null)
  assert.equal(utcToEatLocal(null), "")
})

test("daysUntil computes whole days and handles null", () => {
  assert.equal(daysUntil(null), null)
  const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 - 60 * 1000).toISOString()
  assert.equal(daysUntil(soon), 2)
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  assert.ok((daysUntil(past) ?? 0) < 0)
})

test("slugify produces URL-safe slugs", () => {
  assert.equal(slugify("Pharmacy Technologist — Nairobi"), "pharmacy-technologist-nairobi")
  assert.equal(slugify("  Multiple   spaces  "), "multiple-spaces")
})

test("salary formatting uses KSh", () => {
  const text = formatKshRange(60000, 90000)
  assert.ok(text.includes("KSh"))
  assert.ok(text.includes("60,000") || text.includes("60000"))
})

test("csvSafe neutralises formula injection", () => {
  for (const dangerous of ["=SUM(A1:A2)", "+1234", "-cmd", "@import", "\tcmd", "\rcmd"]) {
    const cell = csvSafe(dangerous)
    assert.ok(cell.startsWith("\"'"), `expected quote-prefix for ${JSON.stringify(dangerous)}, got ${cell}`)
  }
})

test("csvSafe quotes and escapes normal values", () => {
  assert.equal(csvSafe('He said "hi"'), '"He said ""hi"""')
  assert.equal(csvSafe("plain"), '"plain"')
  assert.equal(csvSafe(null), '""')
  assert.equal(csvSafe(42), '"42"')
})