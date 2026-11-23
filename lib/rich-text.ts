import sanitizeHtml from "sanitize-html"

/**
 * Server-side allow-list sanitiser for all rich text (jobs, emails, notes,
 * careers content). Run on every save and again before rendering.
 */
const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4",
  "p", "br", "hr",
  "strong", "b", "em", "i", "u", "s", "strike", "sub", "sup",
  "code", "pre", "blockquote",
  "ul", "ol", "li",
  "a",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "img",
  "span", "mark",
]

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "width", "height"],
  th: ["colspan", "rowspan"],
  td: ["colspan", "rowspan"],
  span: ["data-variable", "style"],
  p: ["style"],
  h1: ["style"],
  h2: ["style"],
  h3: ["style"],
  h4: ["style"],
  ul: ["style"],
  ol: ["style"],
  li: ["style"],
  blockquote: ["style"],
  table: ["style"],
  code: ["style"],
  pre: ["style"],
  mark: ["style"],
}

const ALLOWED_STYLES: sanitizeHtml.IOptions["allowedStyles"] = {
  "*": {
    "color": [/^#[0-9a-f]{3,8}$/i, /^rgb\([\d\s,.%]+\)$/i, /^rgba\([\d\s,.%]+\)$/i],
    "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb\([\d\s,.%]+\)$/i, /^rgba\([\d\s,.%]+\)$/i],
    "text-align": [/^(left|center|right|justify)$/],
    "font-size": [/^(10|11|12|13|14|15|16|18|20|24|28|32)px$/],
    "width": [/^\d{1,4}(px|%)$/],
    "height": [/^\d{1,4}(px|%)$/],
    "margin": [/^0$/],
    "padding": [/^\d{1,3}px$/],
  },
}

export function sanitizeRichText(html: string): string {
  if (!html) return ""
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedStyles: ALLOWED_STYLES,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    },
  })
}

/** Strip everything to clean plain text for email fallbacks and previews. */
export function richTextToPlainText(html: string): string {
  if (!html) return ""
  const withBreaks = html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(p|h1|h2|h3|h4|li|blockquote|pre|tr)\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "- ")
    .replace(/<\s*hr\s*\/?\s*>/gi, "\n---\n")
  const text = sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} })
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

const EMAIL_STYLES: Record<string, string> = {
  h1: "font-size:24px;line-height:1.3;margin:0 0 12px;font-weight:700;color:#0c1f1d;",
  h2: "font-size:20px;line-height:1.3;margin:20px 0 10px;font-weight:700;color:#0c1f1d;",
  h3: "font-size:17px;line-height:1.35;margin:16px 0 8px;font-weight:700;color:#0c1f1d;",
  h4: "font-size:15px;line-height:1.4;margin:14px 0 6px;font-weight:700;color:#0c1f1d;",
  p: "font-size:14px;line-height:1.65;margin:0 0 12px;color:#334155;",
  li: "font-size:14px;line-height:1.65;margin:0 0 6px;color:#334155;",
  ul: "margin:0 0 12px;padding-left:20px;",
  ol: "margin:0 0 12px;padding-left:20px;",
  blockquote: "margin:12px 0;padding:10px 14px;border-left:3px solid #18bcaa;background:#f1f7f6;color:#334155;font-size:14px;line-height:1.6;",
  a: "color:#0c7f73;text-decoration:underline;",
  strong: "font-weight:700;color:#0c1f1d;",
  em: "font-style:italic;",
  code: "font-family:Consolas,monospace;font-size:13px;background:#f1f5f9;padding:2px 4px;border-radius:4px;",
  pre: "font-family:Consolas,monospace;font-size:13px;background:#f1f5f9;padding:12px;border-radius:8px;overflow:auto;",
  table: "border-collapse:collapse;width:100%;margin:12px 0;font-size:13px;",
  th: "border:1px solid #dbe4e3;padding:8px;text-align:left;background:#f1f7f6;font-weight:700;",
  td: "border:1px solid #dbe4e3;padding:8px;",
  hr: "border:none;border-top:1px solid #dbe4e3;margin:16px 0;",
  img: "max-width:100%;height:auto;border:0;display:block;",
}

/** Convert sanitised editor HTML to inline-styled, email-client-safe HTML. */
export function richTextToEmailHtml(html: string): string {
  const safe = sanitizeRichText(html)
  return sanitizeHtml(safe, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedStyles: ALLOWED_STYLES,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    transformTags: Object.fromEntries(
      Object.entries(EMAIL_STYLES).map(([tag, style]) => [
        tag,
        (_tagName: string, attribs: Record<string, string>) => ({
          tagName: tag,
          attribs: { ...attribs, style: `${attribs.style || ""}${style}` },
        }),
      ])
    ) as sanitizeHtml.IOptions["transformTags"],
  })
}

/** Client-side render-time sanitiser (DOM-based, no server bundle). */
export function sanitizeForRender(html: string): string {
  if (!html || typeof window === "undefined") return sanitizeRichText(html)
  const template = document.createElement("template")
  template.innerHTML = html
  const walk = (node: Element) => {
    const tag = node.tagName.toLowerCase()
    if (!ALLOWED_TAGS.includes(tag)) {
      node.remove()
      return
    }
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase()
      if (name.startsWith("on") || name === "srcdoc") {
        node.removeAttribute(attr.name)
        continue
      }
      if (name === "href" || name === "src") {
        const value = attr.value.trim().toLowerCase()
        if (value.startsWith("javascript:") || value.startsWith("data:") || value.startsWith("vbscript:")) {
          node.removeAttribute(attr.name)
        }
      }
    }
    if (tag === "a") {
      node.setAttribute("target", "_blank")
      node.setAttribute("rel", "noopener noreferrer")
    }
    for (const child of Array.from(node.children)) walk(child)
  }
  for (const child of Array.from(template.content.children)) walk(child as Element)
  return template.innerHTML
}
