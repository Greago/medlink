"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { RichTextEditor } from "@/components/rich-text-editor-lazy"
import { RichText } from "@/components/rich-text"
import {
  daysUntil, eatLocalToUtc, EMPLOYMENT_TYPES, formatEatDateTime, formatKshRange, JOB_MODULES,
  jobTheme, slugify, utcToEatLocal, WORK_MODES, type Job, type JobModule, type ScreeningQuestion,
} from "@/lib/careers"
import { fetchJson, inputCls, labelCls, JobStatusBadge } from "./shared"

interface FormState {
  title: string; slug: string; department: string; module: JobModule
  employmentType: string; workMode: string; location: string; openings: string
  salaryMin: string; salaryMax: string; salaryVisible: boolean
  purposeStatement: string; description: string; responsibilities: string
  qualificationsRequired: string; qualificationsPreferred: string; benefits: string; howToApply: string
  status: string; scheduledPublishAt: string; expiresAt: string; noExpiry: boolean
}

interface QuestionDraft { prompt: string; type: ScreeningQuestion["type"]; options: string; required: boolean }
interface ReviewerDraft { adminId: string; name: string; email: string; role: string; selected: boolean; canEmail: boolean }

const emptyForm: FormState = {
  title: "", slug: "", department: "", module: "company-wide",
  employmentType: "Full-time", workMode: "On-site", location: "", openings: "1",
  salaryMin: "", salaryMax: "", salaryVisible: false,
  purposeStatement: "", description: "", responsibilities: "",
  qualificationsRequired: "", qualificationsPreferred: "", benefits: "", howToApply: "",
  status: "draft", scheduledPublishAt: "", expiresAt: "", noExpiry: false,
}

function jobToForm(job: Job): FormState {
  return {
    title: job.title, slug: job.slug, department: job.department, module: job.module,
    employmentType: job.employmentType, workMode: job.workMode, location: job.location, openings: String(job.openings),
    salaryMin: job.salaryMin !== null ? String(job.salaryMin) : "", salaryMax: job.salaryMax !== null ? String(job.salaryMax) : "",
    salaryVisible: job.salaryVisible,
    purposeStatement: job.purposeStatement, description: job.description, responsibilities: job.responsibilities,
    qualificationsRequired: job.qualificationsRequired, qualificationsPreferred: job.qualificationsPreferred,
    benefits: job.benefits, howToApply: job.howToApply,
    status: job.status, scheduledPublishAt: utcToEatLocal(job.scheduledPublishAt),
    expiresAt: utcToEatLocal(job.expiresAt), noExpiry: !job.expiresAt,
  }
}

const RICH_FIELDS: { key: keyof FormState; label: string; hint: string }[] = [
  { key: "purposeStatement", label: "Purpose of the role", hint: "A short summary shown on job cards." },
  { key: "description", label: "About the role", hint: "The full role description." },
  { key: "responsibilities", label: "Key responsibilities", hint: "Use bullet lists for clarity." },
  { key: "qualificationsRequired", label: "Required qualifications", hint: "Must-have skills and experience." },
  { key: "qualificationsPreferred", label: "Preferred qualifications", hint: "Nice-to-have extras." },
  { key: "benefits", label: "Benefits", hint: "What the candidate gets." },
  { key: "howToApply", label: "How to apply (sidebar)", hint: "Optional extra guidance." },
]

export function JobForm({ jobId }: { jobId?: string }) {
  const router = useRouter()
  const draftKey = `medlink-job-draft:${jobId || "new"}`
  const [form, setForm] = useState<FormState>(emptyForm)
  const [questions, setQuestions] = useState<QuestionDraft[]>([])
  const [reviewers, setReviewers] = useState<ReviewerDraft[]>([])
  const [loading, setLoading] = useState(Boolean(jobId))
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [preview, setPreview] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [currentJob, setCurrentJob] = useState<Job | null>(null)
  const dirtyRef = useRef(false)
  const questionsDirtyRef = useRef(false)
  const reviewersDirtyRef = useRef(false)

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    dirtyRef.current = true
    setForm((current) => ({ ...current, [key]: value }))
  }, [])

  // Load existing job, or restore the local draft for a new job.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (jobId) {
        try {
          const data = await fetchJson<{ job: Job; questions: ScreeningQuestion[] }>(`/api/admin/recruitment/jobs/${jobId}`)
          if (cancelled) return
          setCurrentJob(data.job)
          setForm(jobToForm(data.job))
          setQuestions(data.questions.map((question) => ({ prompt: question.prompt, type: question.type, options: question.options.join(", "), required: question.required })))
          try {
            const reviewerData = await fetchJson<{ reviewers: { adminId: string; canEmail: boolean }[]; staff: { id: string; name: string; email: string; role: string }[] }>(`/api/admin/recruitment/jobs/${jobId}/reviewers`)
            if (cancelled) return
            setReviewers(reviewerData.staff.map((member) => {
              const assigned = reviewerData.reviewers.find((item) => item.adminId === member.id)
              return { adminId: member.id, name: member.name, email: member.email, role: member.role, selected: Boolean(assigned), canEmail: assigned?.canEmail || false }
            }))
          } catch { /* reviewer list is optional */ }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not load the job.")
        } finally {
          if (!cancelled) { setLoading(false); setHydrated(true) }
        }
      } else {
        try {
          const saved = localStorage.getItem(draftKey)
          if (saved && !cancelled) setForm({ ...emptyForm, ...(JSON.parse(saved) as Partial<FormState>) })
        } catch { /* ignore */ }
        if (!cancelled) { setLoading(false); setHydrated(true) }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [jobId, draftKey])

  const buildPayload = useCallback(() => ({
    title: form.title.trim(),
    slug: form.slug.trim() || undefined,
    department: form.department.trim(),
    module: form.module,
    employmentType: form.employmentType,
    workMode: form.workMode,
    location: form.location.trim(),
    openings: Number(form.openings) || 1,
    salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
    salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
    salaryVisible: form.salaryVisible,
    purposeStatement: form.purposeStatement,
    description: form.description,
    responsibilities: form.responsibilities,
    qualificationsRequired: form.qualificationsRequired,
    qualificationsPreferred: form.qualificationsPreferred,
    benefits: form.benefits,
    howToApply: form.howToApply,
    status: form.status,
    scheduledPublishAt: form.scheduledPublishAt ? eatLocalToUtc(form.scheduledPublishAt) : null,
    expiresAt: form.noExpiry ? null : form.expiresAt ? eatLocalToUtc(form.expiresAt) : null,
  }), [form])

  const saveQuestions = useCallback(async (id: string) => {
    await fetchJson(`/api/admin/recruitment/jobs/${id}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions: questions
          .filter((question) => question.prompt.trim())
          .map((question) => ({
            prompt: question.prompt.trim(),
            type: question.type,
            options: question.type === "choice" ? question.options.split(",").map((option) => option.trim()).filter(Boolean) : [],
            required: question.required,
          })),
      }),
    })
  }, [questions])

  const saveReviewers = useCallback(async (id: string) => {
    await fetchJson(`/api/admin/recruitment/jobs/${id}/reviewers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewers: reviewers.filter((item) => item.selected).map((item) => ({ adminId: item.adminId, canEmail: item.canEmail })) }),
    })
  }, [reviewers])

  // Autosave existing jobs (debounced), including questions/reviewers when changed.
  useEffect(() => {
    if (!hydrated || !jobId) return
    const timer = setTimeout(async () => {
      if (!dirtyRef.current && !questionsDirtyRef.current && !reviewersDirtyRef.current) return
      if (!form.title.trim()) return
      setSaveState("saving")
      try {
        if (dirtyRef.current) {
          const data = await fetchJson<{ job: Job }>(`/api/admin/recruitment/jobs/${jobId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildPayload()),
          })
          setCurrentJob(data.job)
          dirtyRef.current = false
        }
        if (questionsDirtyRef.current) { await saveQuestions(jobId); questionsDirtyRef.current = false }
        if (reviewersDirtyRef.current) { await saveReviewers(jobId); reviewersDirtyRef.current = false }
        setSaveState("saved")
      } catch {
        setSaveState("error")
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [hydrated, jobId, form, questions, reviewers, buildPayload, saveQuestions, saveReviewers])

  // Local draft autosave for new jobs.
  useEffect(() => {
    if (!hydrated || jobId) return
    const timer = setTimeout(() => {
      try { localStorage.setItem(draftKey, JSON.stringify(form)) } catch { /* full */ }
    }, 500)
    return () => clearTimeout(timer)
  }, [hydrated, jobId, draftKey, form])

  const create = async (publish: boolean) => {
    if (form.title.trim().length < 3) {
      toast.error("Please give the job a title (at least 3 characters).")
      return
    }
    setSaving(true)
    try {
      const data = await fetchJson<{ job: Job }>("/api/admin/recruitment/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildPayload(), status: publish ? "published" : "draft" }),
      })
      if (questions.some((question) => question.prompt.trim())) await saveQuestions(data.job.id)
      if (reviewers.some((item) => item.selected)) await saveReviewers(data.job.id)
      try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
      toast.success(publish ? "Job created and published." : "Job saved as draft.")
      router.push(`/admin/recruitment/jobs/${data.job.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the job.")
    } finally {
      setSaving(false)
    }
  }

  const saveNow = async () => {
    if (!jobId) return
    setSaving(true)
    try {
      const data = await fetchJson<{ job: Job }>(`/api/admin/recruitment/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      })
      setCurrentJob(data.job)
      dirtyRef.current = false
      if (questionsDirtyRef.current) { await saveQuestions(jobId); questionsDirtyRef.current = false }
      if (reviewersDirtyRef.current) { await saveReviewers(jobId); reviewersDirtyRef.current = false }
      setSaveState("saved")
      toast.success("Job saved.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the job.")
    } finally {
      setSaving(false)
    }
  }

  const expiryDays = useMemo(() => (form.noExpiry || !form.expiresAt ? null : daysUntil(eatLocalToUtc(form.expiresAt))), [form.noExpiry, form.expiresAt])
  const theme = jobTheme(form.module)

  if (loading) {
    return <div className="p-6"><div className="h-64 animate-pulse rounded-2xl bg-muted/50" /></div>
  }

  return (
    <div className="space-y-5 p-4 lg:p-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{jobId ? "Edit job" : "New job"}</h1>
          {currentJob && <JobStatusBadge status={currentJob.status} />}
          {jobId && saveState !== "idle" && (
            <span className={`text-xs font-semibold ${saveState === "error" ? "text-red-600" : "text-muted-foreground"}`} aria-live="polite">
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes saved" : "Autosave failed — use Save"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setPreview((current) => !current)} className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted focus-ring">
            {preview ? <EyeOff size={15} /> : <Eye size={15} />} {preview ? "Hide preview" : "Live preview"}
          </button>
          {jobId ? (
            <button type="button" onClick={() => void saveNow()} disabled={saving} className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
            </button>
          ) : (
            <>
              <button type="button" onClick={() => void create(false)} disabled={saving} className="tap-target inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60 focus-ring">
                {saving && <Loader2 size={14} className="animate-spin" />} Save draft
              </button>
              <button type="button" onClick={() => void create(true)} disabled={saving} className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring">
                <Check size={15} /> Create &amp; publish
              </button>
            </>
          )}
        </div>
      </div>

      {expiryDays !== null && expiryDays <= 3 && (
        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
          {expiryDays > 0 ? `This job expires in ${expiryDays} day${expiryDays === 1 ? "" : "s"}.` : "This job's expiry is today or in the past."} Extend it if you need more time.
        </p>
      )}

      <div className={`grid gap-5 ${preview ? "xl:grid-cols-2" : ""}`}>
        <div className="min-w-0 space-y-5">
          {/* Basics */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Job basics</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className={`${labelCls} sm:col-span-2`}>Job title *
                <input value={form.title} onChange={(event) => set("title", event.target.value)} className={inputCls} placeholder="e.g. Pharmacy Technologist" />
              </label>
              <label className={labelCls}>URL slug
                <input value={form.slug} onChange={(event) => set("slug", event.target.value)} className={inputCls} placeholder={form.title ? slugify(form.title) : "auto-generated"} />
              </label>
              <label className={labelCls}>Department
                <input value={form.department} onChange={(event) => set("department", event.target.value)} className={inputCls} placeholder="e.g. Pharmacy Operations" />
              </label>
              <label className={labelCls}>Division
                <select value={form.module} onChange={(event) => set("module", event.target.value as JobModule)} className={inputCls}>
                  {JOB_MODULES.map((module) => <option key={module} value={module}>{jobTheme(module).label}</option>)}
                </select>
              </label>
              <label className={labelCls}>Location
                <input value={form.location} onChange={(event) => set("location", event.target.value)} className={inputCls} placeholder="e.g. Nairobi" />
              </label>
              <label className={labelCls}>Employment type
                <select value={form.employmentType} onChange={(event) => set("employmentType", event.target.value)} className={inputCls}>
                  {EMPLOYMENT_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label className={labelCls}>Work mode
                <select value={form.workMode} onChange={(event) => set("workMode", event.target.value)} className={inputCls}>
                  {WORK_MODES.map((mode) => <option key={mode}>{mode}</option>)}
                </select>
              </label>
              <label className={labelCls}>Openings
                <input type="number" min={1} max={999} value={form.openings} onChange={(event) => set("openings", event.target.value)} className={inputCls} />
              </label>
              <label className={labelCls}>Status
                <select value={form.status} onChange={(event) => set("status", event.target.value)} className={inputCls}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className={labelCls}>Salary min (KSh)
                <input type="number" min={0} value={form.salaryMin} onChange={(event) => set("salaryMin", event.target.value)} className={inputCls} placeholder="e.g. 60000" />
              </label>
              <label className={labelCls}>Salary max (KSh)
                <input type="number" min={0} value={form.salaryMax} onChange={(event) => set("salaryMax", event.target.value)} className={inputCls} placeholder="e.g. 90000" />
              </label>
              <label className="flex items-end gap-2 pb-2 text-xs font-semibold text-muted-foreground">
                <input type="checkbox" checked={form.salaryVisible} onChange={(event) => set("salaryVisible", event.target.checked)} className="size-4 accent-[var(--primary)]" />
                Show salary publicly
              </label>
            </div>
          </section>

          {/* Scheduling */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Publishing &amp; expiry (EAT)</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>Scheduled publish (optional)
                <input type="datetime-local" value={form.scheduledPublishAt} onChange={(event) => set("scheduledPublishAt", event.target.value)} className={inputCls} />
              </label>
              <label className={labelCls}>Expiry date &amp; time
                <input type="datetime-local" value={form.expiresAt} disabled={form.noExpiry} onChange={(event) => set("expiresAt", event.target.value)} className={`${inputCls} disabled:opacity-50`} />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <input type="checkbox" checked={form.noExpiry} onChange={(event) => set("noExpiry", event.target.checked)} className="size-4 accent-[var(--primary)]" />
              No expiry — open until filled
            </label>
            <p className="mt-2 text-[11px] text-muted-foreground">Expiry is enforced on the server: the public listing, job page and apply endpoint all stop accepting applications after this time. A cron job marks overdue jobs as expired.</p>
          </section>

          {/* Rich text fields */}
          {RICH_FIELDS.map((field) => (
            <section key={field.key} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-bold">{field.label}</h2>
                <span className="text-[11px] text-muted-foreground">{field.hint}</span>
              </div>
              <div className="mt-3">
                <RichTextEditor
                  value={form[field.key] as string}
                  onChange={(html) => set(field.key, html)}
                  minHeight={field.key === "description" ? 220 : 140}
                  placeholder={`Write the ${field.label.toLowerCase()}…`}
                />
              </div>
            </section>
          ))}

          {/* Screening questions */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Screening questions</h2>
              <button
                type="button"
                onClick={() => { questionsDirtyRef.current = true; setQuestions((current) => [...current, { prompt: "", type: "text", options: "", required: false }]) }}
                className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted focus-ring"
              >
                <Plus size={13} /> Add question
              </button>
            </div>
            {questions.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No screening questions — applicants go straight to documents.</p>}
            <div className="mt-3 space-y-3">
              {questions.map((question, index) => (
                <div key={index} className="rounded-xl border border-border p-3.5">
                  <div className="flex items-start gap-2">
                    <input
                      value={question.prompt}
                      onChange={(event) => { questionsDirtyRef.current = true; setQuestions((current) => current.map((item, i) => i === index ? { ...item, prompt: event.target.value } : item)) }}
                      placeholder="Question prompt…"
                      className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                    />
                    <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => { questionsDirtyRef.current = true; setQuestions((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next }) }} className="rounded-lg p-2 hover:bg-muted disabled:opacity-30 focus-ring"><ArrowUp size={14} /></button>
                    <button type="button" aria-label="Move down" disabled={index === questions.length - 1} onClick={() => { questionsDirtyRef.current = true; setQuestions((current) => { const next = [...current]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next }) }} className="rounded-lg p-2 hover:bg-muted disabled:opacity-30 focus-ring"><ArrowDown size={14} /></button>
                    <button type="button" aria-label="Remove question" onClick={() => { questionsDirtyRef.current = true; setQuestions((current) => current.filter((_, i) => i !== index)) }} className="rounded-lg p-2 text-red-600 hover:bg-red-50 focus-ring"><Trash2 size={14} /></button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <select
                      value={question.type}
                      onChange={(event) => { questionsDirtyRef.current = true; setQuestions((current) => current.map((item, i) => i === index ? { ...item, type: event.target.value as QuestionDraft["type"] } : item)) }}
                      className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
                      aria-label="Answer type"
                    >
                      <option value="text">Free text</option>
                      <option value="yes-no">Yes / No</option>
                      <option value="choice">Multiple choice</option>
                    </select>
                    {question.type === "choice" && (
                      <input
                        value={question.options}
                        onChange={(event) => { questionsDirtyRef.current = true; setQuestions((current) => current.map((item, i) => i === index ? { ...item, options: event.target.value } : item)) }}
                        placeholder="Options, comma separated"
                        className="h-9 min-w-52 flex-1 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                      />
                    )}
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <input type="checkbox" checked={question.required} onChange={(event) => { questionsDirtyRef.current = true; setQuestions((current) => current.map((item, i) => i === index ? { ...item, required: event.target.checked } : item)) }} className="size-4 accent-[var(--primary)]" />
                      Required
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Reviewers */}
          {jobId && reviewers.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Interviewers / reviewers</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">Assigned staff can view this job&apos;s applicants. &quot;Can email&quot; additionally allows sending candidate emails.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {reviewers.map((reviewer) => (
                  <div key={reviewer.adminId} className={`flex items-center gap-3 rounded-xl border p-3 ${reviewer.selected ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                    <input
                      type="checkbox"
                      checked={reviewer.selected}
                      onChange={(event) => { reviewersDirtyRef.current = true; setReviewers((current) => current.map((item) => item.adminId === reviewer.adminId ? { ...item, selected: event.target.checked } : item)) }}
                      className="size-4 accent-[var(--primary)]"
                      aria-label={`Assign ${reviewer.name}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{reviewer.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{reviewer.role.replace(/_/g, " ")} · {reviewer.email}</p>
                    </div>
                    {reviewer.selected && (
                      <label className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-muted-foreground">
                        <input type="checkbox" checked={reviewer.canEmail} onChange={(event) => { reviewersDirtyRef.current = true; setReviewers((current) => current.map((item) => item.adminId === reviewer.adminId ? { ...item, canEmail: event.target.checked } : item)) }} className="size-3.5 accent-[var(--primary)]" />
                        Can email
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Live preview */}
        {preview && (
          <div className="min-w-0">
            <div className="sticky top-20 overflow-hidden rounded-2xl border border-border">
              <div className="careers-hero px-6 py-8" style={{ ["--c-primary" as string]: theme.primary, ["--c-accent" as string]: theme.accent }}>
                <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">{theme.label}</span>
                <h2 className="mt-3 text-2xl font-extrabold text-white">{form.title || "Job title"}</h2>
                <p className="mt-2 text-sm text-white/85">
                  {[form.department, form.location, form.employmentType, form.workMode].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="max-h-[70vh] space-y-5 overflow-y-auto bg-background p-6">
                {form.salaryVisible && (form.salaryMin || form.salaryMax) && (
                  <p className="text-sm font-bold text-foreground">{formatKshRange(form.salaryMin ? Number(form.salaryMin) : null, form.salaryMax ? Number(form.salaryMax) : null)} / month</p>
                )}
                {!form.noExpiry && form.expiresAt && (
                  <p className="text-xs font-semibold text-muted-foreground">Closes {formatEatDateTime(eatLocalToUtc(form.expiresAt))} (EAT)</p>
                )}
                {RICH_FIELDS.filter((field) => (form[field.key] as string).trim()).map((field) => (
                  <section key={field.key}>
                    <h3 className="text-base font-bold">{field.label}</h3>
                    <div className="mt-2"><RichText html={form[field.key] as string} /></div>
                  </section>
                ))}
                {questions.filter((question) => question.prompt.trim()).length > 0 && (
                  <section>
                    <h3 className="text-base font-bold">Screening questions</h3>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                      {questions.filter((question) => question.prompt.trim()).map((question, index) => (
                        <li key={index}>{question.prompt}{question.required && <span className="text-red-600"> *</span>}</li>
                      ))}
                    </ol>
                  </section>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}