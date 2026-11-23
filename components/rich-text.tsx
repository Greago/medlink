import { sanitizeRichText } from "@/lib/rich-text"

/**
 * Server-rendered rich text for public pages. Sanitised again at render time
 * even though stored HTML was sanitised on save.
 */
export function RichText({ html, className = "" }: { html: string; className?: string }) {
  if (!html || !html.trim()) return null
  return (
    <div
      className={`rte-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  )
}

export default RichText