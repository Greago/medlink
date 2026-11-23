"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, Link2, Linkedin, MessageCircle } from "lucide-react"

export function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Link copied")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy the link.")
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Share this job">
      <span className="text-xs font-semibold text-muted-foreground">Share:</span>
      <button type="button" onClick={copy} className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted focus-ring">
        {copied ? <Check size={14} /> : <Link2 size={14} />} Copy link
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted focus-ring"
      >
        <MessageCircle size={14} /> WhatsApp
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted focus-ring"
      >
        <Linkedin size={14} /> LinkedIn
      </a>
    </div>
  )
}