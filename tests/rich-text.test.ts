import { test } from "node:test"
import assert from "node:assert/strict"
import { sanitizeRichText, richTextToPlainText, richTextToEmailHtml } from "@/lib/rich-text"

test("sanitiser keeps allowed formatting", () => {
  const html = '<h2>Title</h2><p>Hello <strong>world</strong> and <em>friends</em>.</p><ul><li>One</li><li>Two</li></ul>'
  const clean = sanitizeRichText(html)
  assert.ok(clean.includes("<h2>Title</h2>"))
  assert.ok(clean.includes("<strong>world</strong>"))
  assert.ok(clean.includes("<li>One</li>"))
})

test("sanitiser strips script tags and their content", () => {
  const clean = sanitizeRichText('<p>Hi</p><script>alert("xss")</script>')
  assert.ok(!clean.includes("<script"))
  assert.ok(!clean.includes("alert("))
  assert.ok(clean.includes("<p>Hi</p>"))
})

test("sanitiser strips inline event handlers", () => {
  const clean = sanitizeRichText('<p onclick="alert(1)" onmouseover="steal()">Text</p>')
  assert.ok(!clean.includes("onclick"))
  assert.ok(!clean.includes("onmouseover"))
  assert.ok(clean.includes("Text"))
})

test("sanitiser blocks javascript: and data: URLs", () => {
  const clean = sanitizeRichText('<a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a><img src="data:image/svg+xml;base64,xxx" />')
  assert.ok(!clean.includes("javascript:"))
  assert.ok(!clean.includes("data:image"))
  assert.ok(clean.includes('href="https://example.com"'))
})

test("sanitiser forces safe link rel/target", () => {
  const clean = sanitizeRichText('<a href="https://example.com" target="_self">link</a>')
  assert.ok(clean.includes('rel="noopener noreferrer"'))
  assert.ok(clean.includes('target="_blank"'))
})

test("sanitiser strips iframes, objects and forms", () => {
  const clean = sanitizeRichText('<iframe src="https://evil.example"></iframe><object data="x"></object><form action="/steal"><input name="a" /></form><p>ok</p>')
  assert.ok(!clean.includes("<iframe"))
  assert.ok(!clean.includes("<object"))
  assert.ok(!clean.includes("<form"))
  assert.ok(!clean.includes("<input"))
  assert.ok(clean.includes("<p>ok</p>"))
})

test("sanitiser allows safe styles but drops dangerous ones", () => {
  const clean = sanitizeRichText('<p style="color:#ff0000;text-align:center;position:fixed;background-image:url(javascript:alert(1))">x</p>')
  assert.ok(clean.includes("color:#ff0000"))
  assert.ok(clean.includes("text-align:center"))
  assert.ok(!clean.includes("position"))
  assert.ok(!clean.includes("background-image"))
})

test("sanitiser keeps tables and variable spans", () => {
  const clean = sanitizeRichText('<table><tr><th colspan="2">H</th></tr><tr><td>C</td></tr></table><span data-variable="candidate_name">{{candidate_name}}</span>')
  assert.ok(clean.includes("<table>"))
  assert.ok(clean.includes('colspan="2"'))
  assert.ok(clean.includes('data-variable="candidate_name"'))
})

test("plain text conversion strips tags and keeps line breaks", () => {
  const text = richTextToPlainText("<p>Dear Jane,</p><ul><li>First</li><li>Second</li></ul><p>Regards</p>")
  assert.ok(!text.includes("<"))
  assert.ok(text.includes("Dear Jane,"))
  assert.ok(text.includes("- First"))
  assert.ok(text.includes("Regards"))
})

test("plain text decodes entities", () => {
  const text = richTextToPlainText("<p>Ben &amp; Jerry&#39;s &lt;test&gt;</p>")
  assert.equal(text, "Ben & Jerry's <test>")
})

test("email HTML conversion sanitises and inlines styles", () => {
  const html = richTextToEmailHtml('<p onclick="x()">Hello</p><script>bad()</script>')
  assert.ok(!html.includes("onclick"))
  assert.ok(!html.includes("<script"))
  assert.ok(html.includes("font-size:14px"))
})

test("empty input returns empty string", () => {
  assert.equal(sanitizeRichText(""), "")
  assert.equal(richTextToPlainText(""), "")
})