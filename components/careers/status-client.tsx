"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { CalendarClock, Check, Loader2, Mail, ShieldCheck } from "lucide-react"
import { sanitizeForRender } from "@/lib/rich-text"

interface ProgressStep { key: string; label: string; done: boolean; current: boolean }
interface StatusPayload {
  referenceNumber: string
  jobTitle: string
  jobSlug: string
  stage: string
  stageLabel: string
  submittedAt: string
  progress: ProgressStep[]
  interviews: { type: string; when: string; location: string; meetingLink: string }[]
  messages: { subject: string; html: string; date: string }[]
}

export function StatusClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [linkError, setLinkError] = useState("")
  const [reference, setReference] = useState("")
  const [email, setEmail] = useState("")
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const [withdrawEmail, setWithdrawEmail] = useState("")
  const [withdrawn, setWithdrawn] = useState(false)
  const [openMessage, setOpenMessage] = useState<number | null>(null)

  const load = useCallback(async (value: string) => {
    setLoading(true)
    setLinkError("")
    try {
      const response = await fetch(`/api/careers/status?token=${encodeURIComponent(value)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "This link is invalid or has expired.")
      setStatus(data.status)
      // Single-use link: remove the token from the address bar.
      window.history.replaceState(null, "", "/careers/status")
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "This link is invalid or has expired.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) void load(token)
  }, [token, load])

  const requestLink = async (event: React.FormEvent) => {
    event.preventDefault()
    setRequesting(true)
    try {
      const response = await fetch("/api/careers/status/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email }),
      })
      const data = await response.json()
      setRequested(true)
      toast.success(data.message || "If the details match, a secure link has been sent.")
    } catch {
      toast.error("Could not send the link. Please try again.")
    } finally {
      setRequesting(false)
    }
  }

  const withdraw = async () => {
    if (!status) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(withdrawEmail.trim())) {
      toast.error("Please enter the email you applied with to confirm.")
      return
    }
    setWithdrawing(true)
    try {
      const response = await fetch("/api/careers/status/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: status.referenceNumber, email: withdrawEmail.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not withdraw.")
      setWithdrawn(true)
      setConfirmWithdraw(false)
      setStatus((current) => current ? {
        ...current,
        stage: "withdrawn",
        stageLabel: "Withdrawn",
        progress: current.progress.map((step) => step.key === "decision" ? { ...step, label: "Withdrawn", done: true, current: true } : { ...step, current: false }),
      } : current)
      toast.success("Your application has been withdrawn.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not withdraw.")
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-muted/50" />
        <div className="h-48 animate-pulse rounded-2xl bg-muted/50" />
      </div>
    )
  }

  if (!status) {
    return (
      <div className="mx-auto max-w-md">
        {linkError && (
          <div role="alert" className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{linkError}</div>
        )}
        <div className="careers-card p-6">
          <ShieldCheck size={24} className="text-accent" />
          <h2 className="mt-3 text-lg font-bold">Track your application</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your reference number and the email you applied with. We will send you a secure one-time link — no account needed.
          </p>
          {requested ? (
            <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm">
              <Mail size={18} className="text-accent" />
              <p className="mt-2 font-semibold">Check your inbox</p>
              <p className="mt-1 text-muted-foreground">
                If that reference and email match an application, a secure link has been sent. It expires in 30 minutes and can only be used once.
              </p>
            </div>
          ) : (
            <form onSubmit={requestLink} className="mt-5 space-y-3">
              <label className="block text-xs font-semibold text-muted-foreground">
                Reference number
                <input
                  required
                  value={reference}
                  onChange={(event) => setReference(event.target.value.toUpperCase())}
                  placeholder="APP-2026-000001"
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 font-mono text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block text-xs font-semibold text-muted-foreground">
                Email you applied with
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <button
                type="submit"
                disabled={requesting}
                className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring"
              >
                {requesting && <Loader2 size={15} className="animate-spin" />} Send secure link
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="careers-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-semibold text-muted-foreground">{status.referenceNumber}</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight">{status.jobTitle}</h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${withdrawn || status.stage === "withdrawn" ? "bg-muted text-muted-foreground" : "careers-chip"}`}>
            {status.stageLabel}
          </span>
        </div>

        {/* Progress tracker */}
        <ol className="mt-6 flex items-center" aria-label="Application progress">
          {status.progress.map((step, index) => (
            <li key={step.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  className={`flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    step.current ? "border-primary bg-primary text-primary-foreground"
                    : step.done ? "border-accent bg-accent/15 text-foreground"
                    : "border-border bg-card text-muted-foreground"
                  }`}
                  aria-current={step.current ? "step" : undefined}
                >
                  {step.done && !step.current ? <Check size={14} /> : index + 1}
                </span>
                <span className={`mt-1.5 max-w-16 text-center text-[10px] font-semibold leading-tight sm:max-w-none sm:text-xs ${step.current ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
              {index < status.progress.length - 1 && <span className={`mx-1 mb-5 h-0.5 flex-1 ${step.done ? "bg-accent" : "bg-border"}`} aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </div>

      {status.interviews.length > 0 && (
        <div className="careers-card p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold"><CalendarClock size={16} className="text-accent" /> Upcoming interview</h3>
          {status.interviews.map((interview, index) => (
            <div key={index} className="mt-3 rounded-xl bg-muted/50 p-4 text-sm">
              <p className="font-semibold">{interview.when} (EAT) · {interview.type}</p>
              {interview.location && <p className="mt-1 text-muted-foreground">Location: {interview.location}</p>}
              {interview.meetingLink && (
                <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-accent underline">
                  Join meeting
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {status.messages.length > 0 && (
        <div className="careers-card p-6">
          <h3 className="text-sm font-bold">Messages from our team</h3>
          <ul className="mt-3 divide-y divide-border/70">
            {status.messages.map((message, index) => (
              <li key={index} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenMessage(openMessage === index ? null : index)}
                  aria-expanded={openMessage === index}
                  className="flex w-full items-center justify-between gap-3 text-left text-sm focus-ring rounded"
                >
                  <span className="font-semibold">{message.subject}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{message.date}</span>
                </button>
                {openMessage === index && (
                  <div className="rte-content mt-3 rounded-xl border border-border bg-background p-4 text-sm" dangerouslySetInnerHTML={{ __html: sanitizeForRender(message.html) }} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!withdrawn && status.stage !== "withdrawn" && (
        <div className="careers-card p-6">
          {confirmWithdraw ? (
            <div>
              <h3 className="text-sm font-bold">Withdraw your application?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This will mark your application as withdrawn and notify our recruitment team. Enter the email you applied with to confirm.
              </p>
              <input
                type="email"
                value={withdrawEmail}
                onChange={(event) => setWithdrawEmail(event.target.value)}
                placeholder="you@example.com"
                aria-label="Email you applied with"
                className="mt-3 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={withdraw}
                  disabled={withdrawing}
                  className="tap-target inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 focus-ring"
                >
                  {withdrawing && <Loader2 size={15} className="animate-spin" />} Yes, withdraw
                </button>
                <button type="button" onClick={() => setConfirmWithdraw(false)} className="tap-target rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted focus-ring">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">No longer interested in this role?</p>
              <button type="button" onClick={() => setConfirmWithdraw(true)} className="tap-target rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 focus-ring">
                Withdraw my application
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Need help? Email <a href="mailto:careers@medlinkexpedite.co.ke" className="underline">careers@medlinkexpedite.co.ke</a> ·{" "}
        <Link href="/careers" className="underline">Back to careers</Link>
      </p>
    </div>
  )
}