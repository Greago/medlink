"use client"

import dynamic from "next/dynamic"
import type { RichTextEditorProps } from "@/components/rich-text-editor"

/**
 * Lazy-loaded editor so public pages and initial admin bundles never ship
 * TipTap until an editor is actually mounted.
 */
const RichTextEditorLazy = dynamic(() => import("@/components/rich-text-editor"), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-border bg-card" aria-busy="true" aria-label="Loading editor">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="size-8 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <div className="h-40 animate-pulse bg-muted/40" />
    </div>
  ),
})

export function RichTextEditor(props: RichTextEditorProps) {
  return <RichTextEditorLazy {...props} />
}

export default RichTextEditor