"use client"

import type { ApplicationStage, JobStatus } from "@/lib/careers"
import { STAGE_LABELS } from "@/lib/careers"

/** Small fetch helper: throws with the server-provided message on failure. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error((data as { error?: string; message?: string }).message || (data as { error?: string }).error || "Request failed.") as Error & { status?: number; code?: string }
    error.status = response.status
    error.code = (data as { error?: string }).error
    throw error
  }
  return data as T
}

export const inputCls =
  "mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
export const labelCls = "block text-xs font-semibold text-muted-foreground"

const STAGE_TONES: Record<ApplicationStage, string> = {
  applied: "bg-slate-100 text-slate-700",
  screening: "bg-sky-100 text-sky-800",
  shortlisted: "bg-teal-100 text-teal-800",
  interview: "bg-indigo-100 text-indigo-800",
  offer: "bg-amber-100 text-amber-800",
  hired: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-600",
  talent_pool: "bg-purple-100 text-purple-800",
}

export function StageBadge({ stage }: { stage: string }) {
  const tone = STAGE_TONES[stage as ApplicationStage] || "bg-muted text-muted-foreground"
  const label = STAGE_LABELS[stage as ApplicationStage] || stage
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{label}</span>
}

const JOB_STATUS_TONES: Record<JobStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  published: "bg-emerald-100 text-emerald-800",
  closed: "bg-gray-100 text-gray-600",
  expired: "bg-amber-100 text-amber-800",
  archived: "bg-red-100 text-red-700",
}

export function JobStatusBadge({ status }: { status: string }) {
  const tone = JOB_STATUS_TONES[status as JobStatus] || "bg-muted text-muted-foreground"
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${tone}`}>{status}</span>
}

export function EmailStatusBadge({ status }: { status: string }) {
  const tone =
    status === "sent" ? "bg-emerald-100 text-emerald-800"
    : status === "queued" || status === "pending" ? "bg-sky-100 text-sky-800"
    : status === "scheduled" ? "bg-indigo-100 text-indigo-800"
    : status === "failed" ? "bg-red-100 text-red-700"
    : status === "duplicate" ? "bg-gray-100 text-gray-600"
    : "bg-muted text-muted-foreground"
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${tone}`}>{status}</span>
}

export function Stars({ value, onChange, size = 18 }: { value: number; onChange?: (value: number) => void; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" role={onChange ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          className={`rounded p-0.5 focus-ring disabled:cursor-default ${star <= value ? "text-amber-500" : "text-muted-foreground/40"}`}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill={star <= value ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  )
}