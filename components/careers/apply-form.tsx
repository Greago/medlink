"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Check, FileText, Loader2, UploadCloud, X } from "lucide-react"
import type { Job, ScreeningQuestion } from "@/lib/careers"

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED = [".pdf", ".doc", ".docx"]

interface DraftState {
  fullName: string
  email: string
  phone: string
  currentLocation: string
  yearsExperience: string
  currentEmployer: string
  expectedSalary: string
  noticePeriod: string
  portfolioUrl: string
  coverLetter: string
  heardAbout: string
  answers: Record<string, string>
  idempotencyKey: string
}

function emptyDraft(): DraftState {
  return {
    fullName: "", email: "", phone: "", currentLocation: "", yearsExperience: "",
    currentEmployer: "", expectedSalary: "", noticePeriod: "", portfolioUrl: "",
    coverLetter: "", heardAbout: "", answers: {},
    idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `app-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const STEPS = ["Personal details", "Experience", "Screening", "Documents", "Review & submit"]

export function ApplyForm({ job, questions }: { job: Job; questions: ScreeningQuestion[] }) {
  const router = useRouter()
  const storageKey = `medlink-apply-draft:${job.id}`
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<DraftState>(emptyDraft)
  const [hydrated, setHydrated] = useState(false)
  const [cv, setCv] = useState<File | null>(null)
  const [extras, setExtras] = useState<File[]>([])
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState("") // honeypot
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const cvInputRef = useRef<HTMLInputElement>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  // Restore draft (files cannot be persisted).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<DraftState>
        setDraft((current) => ({ ...current, ...parsed, answers: parsed.answers || {} }))
      }
    } catch { /* ignore corrupt draft */ }
    setHydrated(true)
  }, [storageKey])

  // Debounced autosave of the draft.
  useEffect(() => {
    if (!hydrated) return
    const timer = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(draft)) } catch { /* storage full */ }
    }, 400)
    return () => clearTimeout(timer)
  }, [draft, hydrated, storageKey])

  // Optional Turnstile captcha, only when configured.
  useEffect(() => {
    if (!turnstileSiteKey || step !== STEPS.length - 1) return
    const win = window as unknown as { turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string } }
    const renderWidget = () => {
      if (turnstileRef.current && win.turnstile && !turnstileRef.current.dataset.rendered) {
        win.turnstile.render(turnstileRef.current, { sitekey: turnstileSiteKey, theme: "light" })
        turnstileRef.current.dataset.rendered = "1"
      }
    }
    if (win.turnstile) { renderWidget(); return }
    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
    script.async = true
    script.onload = renderWidget
    document.head.appendChild(script)
  }, [turnstileSiteKey, step])

  const set = useCallback(<K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }, [])

  const addCv = useCallback((file: File | null | undefined) => {
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!ACCEPTED.some((ext) => lower.endsWith(ext))) {
      toast.error("Only PDF, DOC and DOCX files are accepted.")
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Your CV must be 5 MB or smaller.")
      return
    }
    setCv(file)
  }, [])

  const addExtras = useCallback((files: FileList | null) => {
    if (!files) return
    const next: File[] = []
    for (const file of Array.from(files)) {
      const lower = file.name.toLowerCase()
      if (!ACCEPTED.some((ext) => lower.endsWith(ext))) {
        toast.error(`"${file.name}" was skipped — only PDF, DOC and DOCX are accepted.`)
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`"${file.name}" was skipped — files must be 5 MB or smaller.`)
        continue
      }
      next.push(file)
    }
    setExtras((current) => [...current, ...next].slice(0, 5))
  }, [])

  const validateStep = useCallback((target: number): string[] => {
    const problems: string[] = []
    if (target >= 1) {
      if (draft.fullName.trim().length < 2) problems.push("Please enter your full name.")
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) problems.push("Please enter a valid email address.")
      if (draft.phone.trim().length < 7) problems.push("Please enter a valid phone number.")
      if (draft.currentLocation.trim().length < 2) problems.push("Please enter your current location.")
    }
    if (target >= 2) {
      const years = Number(draft.yearsExperience)
      if (draft.yearsExperience === "" || Number.isNaN(years) || years < 0 || years > 60) problems.push("Please enter your years of experience (0–60).")
    }
    if (target >= 3) {
      for (const question of questions) {
        if (question.required && !(draft.answers[question.id] || "").trim()) {
          problems.push(`Please answer: "${question.prompt}"`)
        }
      }
    }
    if (target >= 4) {
      if (!cv) problems.push("Please attach your CV (PDF, DOC or DOCX, max 5 MB).")
    }
    return problems
  }, [draft, questions, cv])

  const goTo = (target: number) => {
    if (target > step) {
      const problems = validateStep(target)
      if (problems.length) {
        setErrors(problems)
        return
      }
    }
    setErrors([])
    setStep(Math.min(Math.max(target, 0), STEPS.length - 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const submit = async () => {
    const problems = validateStep(STEPS.length)
    if (!consent) problems.push("Please accept the data protection consent to submit.")
    if (problems.length) {
      setErrors(problems)
      return
    }
    setSubmitting(true)
    setErrors([])
    try {
      const formData = new FormData()
      formData.set("jobId", job.id)
      formData.set("fullName", draft.fullName.trim())
      formData.set("email", draft.email.trim())
      formData.set("phone", draft.phone.trim())
      formData.set("currentLocation", draft.currentLocation.trim())
      formData.set("yearsExperience", draft.yearsExperience)
      formData.set("currentEmployer", draft.currentEmployer.trim())
      if (draft.expectedSalary) formData.set("expectedSalary", draft.expectedSalary)
      formData.set("noticePeriod", draft.noticePeriod.trim())
      formData.set("portfolioUrl", draft.portfolioUrl.trim())
      formData.set("coverLetter", draft.coverLetter)
      formData.set("heardAbout", draft.heardAbout.trim())
      formData.set("consent", "true")
      formData.set("idempotencyKey", draft.idempotencyKey)
      formData.set("website", website)
      formData.set("answers", JSON.stringify(Object.entries(draft.answers).map(([questionId, answer]) => ({ questionId, answer }))))
      if (cv) formData.set("cv", cv)
      for (const file of extras) formData.append("extra", file)
      if (turnstileSiteKey) {
        const win = window as unknown as { turnstile?: { getResponse: () => string } }
        formData.set("captchaToken", win.turnstile?.getResponse() || "")
      }
      const response = await fetch("/api/careers/apply", { method: "POST", body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not submit your application.")
      try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
      router.push(`/careers/application-received?ref=${encodeURIComponent(data.referenceNumber || "")}&job=${encodeURIComponent(job.title)}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit your application."
      setErrors([message])
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = "mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
  const labelClass = "block text-xs font-semibold text-muted-foreground"

  const reviewRows = useMemo(() => [
    ["Full name", draft.fullName],
    ["Email", draft.email],
    ["Phone", draft.phone],
    ["Location", draft.currentLocation],
    ["Experience", draft.yearsExperience ? `${draft.yearsExperience} years` : ""],
    ["Current/last employer", draft.currentEmployer],
    ["Expected salary (KSh)", draft.expectedSalary ? Number(draft.expectedSalary).toLocaleString("en-KE") : ""],
    ["Notice period", draft.noticePeriod],
    ["Portfolio / LinkedIn", draft.portfolioUrl],
    ["CV", cv ? `${cv.name} (${formatBytes(cv.size)})` : ""],
    ["Extra documents", extras.map((file) => file.name).join(", ")],
  ], [draft, cv, extras])

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <ol className="flex flex-wrap items-center gap-2" aria-label="Application progress">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => index < step && goTo(index)}
              aria-current={index === step ? "step" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-ring ${
                index === step ? "bg-primary text-primary-foreground"
                : index < step ? "bg-muted text-foreground hover:bg-muted/70"
                : "bg-muted/50 text-muted-foreground"
              }`}
            >
              {index < step ? <Check size={12} /> : <span>{index + 1}</span>}
              <span className="hidden sm:inline">{label}</span>
            </button>
            {index < STEPS.length - 1 && <span className="h-px w-3 bg-border" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      {errors.length > 0 && (
        <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-bold">Please fix the following:</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      )}

      <div className="careers-card mt-5 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Personal details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Full name *
                <input value={draft.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" className={inputClass} />
              </label>
              <label className={labelClass}>Email *
                <input type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" className={inputClass} />
              </label>
              <label className={labelClass}>Phone *
                <input type="tel" value={draft.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="+254 7XX XXX XXX" className={inputClass} />
              </label>
              <label className={labelClass}>Current location *
                <input value={draft.currentLocation} onChange={(e) => set("currentLocation", e.target.value)} placeholder="e.g. Nairobi" className={inputClass} />
              </label>
            </div>
            <label className={labelClass}>How did you hear about this role?
              <select value={draft.heardAbout} onChange={(e) => set("heardAbout", e.target.value)} className={inputClass}>
                <option value="">Prefer not to say</option>
                <option>LinkedIn</option><option>Indeed</option><option>Company website</option>
                <option>Referral</option><option>Social media</option><option>Other</option>
              </select>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Experience</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Years of experience *
                <input type="number" min={0} max={60} step={0.5} value={draft.yearsExperience} onChange={(e) => set("yearsExperience", e.target.value)} className={inputClass} />
              </label>
              <label className={labelClass}>Current / last employer
                <input value={draft.currentEmployer} onChange={(e) => set("currentEmployer", e.target.value)} className={inputClass} />
              </label>
              <label className={labelClass}>Expected salary (KSh, optional)
                <input type="number" min={0} value={draft.expectedSalary} onChange={(e) => set("expectedSalary", e.target.value)} placeholder="e.g. 80000" className={inputClass} />
              </label>
              <label className={labelClass}>Notice period
                <select value={draft.noticePeriod} onChange={(e) => set("noticePeriod", e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  <option>Immediately available</option><option>1 week</option><option>2 weeks</option>
                  <option>1 month</option><option>2 months</option><option>3+ months</option>
                </select>
              </label>
            </div>
            <label className={labelClass}>LinkedIn / portfolio URL (optional)
              <input type="url" value={draft.portfolioUrl} onChange={(e) => set("portfolioUrl", e.target.value)} placeholder="https://" className={inputClass} />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Screening questions</h2>
            {questions.length === 0 && <p className="text-sm text-muted-foreground">No screening questions for this role — continue to documents.</p>}
            {questions.map((question) => (
              <div key={question.id}>
                <p className="text-sm font-semibold">
                  {question.prompt} {question.required && <span className="text-red-600">*</span>}
                </p>
                {question.type === "text" && (
                  <textarea
                    value={draft.answers[question.id] || ""}
                    onChange={(e) => set("answers", { ...draft.answers, [question.id]: e.target.value })}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                )}
                {question.type === "yes-no" && (
                  <div className="mt-2 flex gap-2" role="radiogroup" aria-label={question.prompt}>
                    {["Yes", "No"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={draft.answers[question.id] === option}
                        onClick={() => set("answers", { ...draft.answers, [question.id]: option })}
                        className={`tap-target rounded-xl border px-5 py-2 text-sm font-semibold focus-ring ${
                          draft.answers[question.id] === option ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                {question.type === "choice" && (
                  <select
                    value={draft.answers[question.id] || ""}
                    onChange={(e) => set("answers", { ...draft.answers, [question.id]: e.target.value })}
                    className={inputClass}
                    aria-label={question.prompt}
                  >
                    <option value="">Select…</option>
                    {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">Documents</h2>
            <div>
              <p className="text-sm font-semibold">CV <span className="text-red-600">*</span> <span className="font-normal text-muted-foreground">(PDF, DOC or DOCX, max 5 MB)</span></p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addCv(e.dataTransfer.files?.[0]) }}
                className={`mt-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
              >
                {cv ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText size={20} className="text-accent" />
                    <span className="text-sm font-semibold">{cv.name}</span>
                    <span className="text-xs text-muted-foreground">{formatBytes(cv.size)}</span>
                    <button type="button" onClick={() => setCv(null)} aria-label="Remove CV" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted focus-ring"><X size={15} /></button>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={24} className="mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Drag and drop your CV here, or</p>
                    <button type="button" onClick={() => cvInputRef.current?.click()} className="tap-target mt-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">
                      Browse files
                    </button>
                  </>
                )}
                <input ref={cvInputRef} type="file" accept={ACCEPTED.join(",")} className="hidden" onChange={(e) => { addCv(e.target.files?.[0]); e.target.value = "" }} />
              </div>
            </div>
            <label className={labelClass}>Extra documents (optional, up to 5)
              <input type="file" multiple accept={ACCEPTED.join(",")} onChange={(e) => { addExtras(e.target.files); e.target.value = "" }} className="mt-1 block w-full text-xs text-muted-foreground file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:text-xs file:font-semibold file:text-foreground" />
            </label>
            {extras.length > 0 && (
              <ul className="space-y-1.5">
                {extras.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                    <FileText size={15} className="text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                    <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setExtras((current) => current.filter((_, i) => i !== index))} className="rounded p-1 hover:bg-muted focus-ring"><X size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            <label className={labelClass}>Cover letter (optional)
              <textarea value={draft.coverLetter} onChange={(e) => set("coverLetter", e.target.value)} rows={6} placeholder="Tell us why you are a great fit…" className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">Review &amp; submit</h2>
            <dl className="divide-y divide-border/70 rounded-xl border border-border">
              {reviewRows.filter(([, value]) => value).map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
                  <dt className="shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 break-words text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            {questions.length > 0 && (
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Screening answers</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {questions.map((question) => (
                    <li key={question.id}>
                      <p className="font-semibold">{question.prompt}</p>
                      <p className="text-muted-foreground">{draft.answers[question.id] || "—"}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <label className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-4 text-xs leading-5 text-muted-foreground">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
              <span>
                I confirm the information provided is accurate and I consent to Medlink Expedite processing my personal data
                for recruitment purposes in line with the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Kenya Data Protection Act, 2019</a>.
                I understand I can withdraw my application or request deletion of my data at any time. *
              </span>
            </label>
            {turnstileSiteKey && <div ref={turnstileRef} className="min-h-16" />}
            <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            disabled={step === 0 || submitting}
            className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-40 focus-ring"
          >
            <ArrowLeft size={15} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => goTo(step + 1)}
              className="tap-target inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 focus-ring"
            >
              Continue <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          )}
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">Your progress is saved in this browser — you can safely reload and continue.</p>
      </div>
    </div>
  )
}