"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft, CalendarClock, Download, ExternalLink, FileText, Loader2,
  Mail, Plus, Trash2, UserRoundPlus, X,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RichTextEditor } from "@/components/rich-text-editor-lazy"
import { RichText } from "@/components/rich-text"
import {
  APPLICATION_STAGES, STAGE_LABELS, formatEatDateTime, formatKshRange,
  type Application, type ApplicationStage, type Interview, type Job,
} from "@/lib/careers"
import {
  EmailStatusBadge, StageBadge, Stars, fetchJson, inputCls, labelCls,
} from "@/components/admin/recruitment/shared"
import { EmailComposer, type ComposerTemplate } from "@/components/admin/recruitment/email-composer"
import { NotifyStageDialog } from "@/components/admin/recruitment/notify-stage-dialog"
import { InterviewDialog } from "@/components/admin/recruitment/interview-dialog"

interface FileMeta { id: string; kind: string; filename: string; mime: string; sizeBytes: number; accessUrl: string }
interface Note { id: string; adminName: string | null; body: string; createdAt: string }
interface Rating { id: string; adminName: string | null; rating: number; createdAt: string }
interface HistoryItem { id: string; fromStage: string; toStage: string; adminName: string | null; reason: string; createdAt: string }
interface Answer { id: string; prompt: string; answer: string; type: string }
interface TimelineItem {
  id: string; stage: string; subject: string; html: string; status: string
  scheduledFor: string | null; visibleToCandidate: boolean; createdAt: string
  senderName: string | null; error: string | null; sentAt: string | null
}
interface Duplicate { id: string; reference_number: string; job_title: string; stage: string }

interface Bundle {
  application: Application
  job: Job | null
  files: FileMeta[]
  answers: Answer[]
  notes: Note[]
  ratings: Rating[]
  history: HistoryItem[]
  tags: string[]
  interviews: Interview[]
  timeline: TimelineItem[]
  duplicates: Duplicate[]
  capabilities: { canManage: boolean; canEmail: boolean; canSeeSalary: boolean }
}

export default function ApplicantProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [templates, setTemplates] = useState<ComposerTemplate[]>([])
  const [error, setError] = useState("")
  const [pendingStage, setPendingStage] = useState<ApplicationStage | null>(null)
  const [noteBody, setNoteBody] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [myRating, setMyRating] = useState(0)
  const [tagInput, setTagInput] = useState("")
  const [interviewOpen, setInterviewOpen] = useState(false)
  const [rescheduling, setRescheduling] = useState<Interview | null>(null)
  const [feedbackFor, setFeedbackFor] = useState<Interview | null>(null)
  const [feedbackBody, setFeedbackBody] = useState("")
  const [expandedEmail, setExpandedEmail] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<Bundle>(`/api/admin/recruitment/applications/${id}`)
      setBundle(data)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the applicant.")
    }
  }, [id])

  useEffect(() => {
    void load()
    let cancelled = false
    fetchJson<{ templates: ComposerTemplate[] }>("/api/admin/recruitment/templates")
      .then((data) => { if (!cancelled) setTemplates(data.templates) })
      .catch(() => { /* composer works without templates */ })
    return () => { cancelled = true }
  }, [load])

  if (error) {
    return (
      <div className="p-6">
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
        <Link href="/admin/recruitment/applicants" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"><ArrowLeft size={14} /> Back to applicants</Link>
      </div>
    )
  }

  if (!bundle) {
    return <div className="space-y-4 p-4 lg:p-6"><div className="h-24 animate-pulse rounded-2xl bg-muted/50" /><div className="h-96 animate-pulse rounded-2xl bg-muted/50" /></div>
  }

  const { application, job, capabilities } = bundle
  const avgRating = bundle.ratings.length
    ? Math.round(bundle.ratings.reduce((sum, item) => sum + item.rating, 0) / bundle.ratings.length)
    : 0

  const addNote = async () => {
    if (!noteBody.trim()) return
    setSavingNote(true)
    try {
      await fetchJson(`/api/admin/recruitment/applications/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteBody }),
      })
      setNoteBody("")
      toast.success("Note added.")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the note.")
    } finally {
      setSavingNote(false)
    }
  }

  const saveRating = async (value: number) => {
    setMyRating(value)
    try {
      await fetchJson(`/api/admin/recruitment/applications/${id}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      })
      toast.success("Rating saved.")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the rating.")
    }
  }

  const saveTags = async (tags: string[]) => {
    try {
      await fetchJson(`/api/admin/recruitment/applications/${id}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update tags.")
    }
  }

  const patchInterview = async (interview: Interview, payload: Record<string, unknown>) => {
    setBusy(true)
    try {
      await fetchJson(`/api/admin/recruitment/interviews/${interview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      toast.success("Interview updated.")
      setFeedbackFor(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the interview.")
    } finally {
      setBusy(false)
    }
  }

  const cancelInterview = async (interview: Interview) => {
    setBusy(true)
    try {
      await fetchJson(`/api/admin/recruitment/interviews/${interview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })
      if (capabilities.canEmail && application.email) {
        try {
          await fetchJson(`/api/admin/recruitment/interviews/${interview.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancel" }),
          })
          toast.success("Interview cancelled — candidate notified.")
        } catch {
          toast.success("Interview cancelled (notification email failed).")
        }
      } else {
        toast.success("Interview cancelled.")
      }
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel the interview.")
    } finally {
      setBusy(false)
    }
  }

  const deleteApplicant = async () => {
    setBusy(true)
    try {
      await fetchJson(`/api/admin/recruitment/applications/${id}`, { method: "DELETE" })
      toast.success("Applicant data deleted.")
      router.push("/admin/recruitment/applicants")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete applicant data.")
      setBusy(false)
    }
  }

  const prefillParams = new URLSearchParams({
    prefillName: application.fullName,
    prefillEmail: application.email,
    ...(application.phone ? { prefillPhone: application.phone } : {}),
  })

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <Link href="/admin/recruitment/applicants" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /> Applicants</Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{application.fullName}</h1>
            <StageBadge stage={application.stage} />
            {avgRating > 0 && <Stars value={avgRating} size={15} />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {application.referenceNumber} · {job ? <Link href={`/admin/recruitment/jobs/${job.id}`} className="font-semibold hover:underline">{job.title}</Link> : "Job removed"} · Applied {formatEatDateTime(application.createdAt)} EAT
          </p>
          {/* Tags */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {bundle.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold">
                {tag}
                {capabilities.canManage && (
                  <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => void saveTags(bundle.tags.filter((item) => item !== tag))} className="rounded-full p-0.5 hover:bg-background focus-ring"><X size={10} /></button>
                )}
              </span>
            ))}
            {capabilities.canManage && (
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && tagInput.trim()) {
                    event.preventDefault()
                    void saveTags([...new Set([...bundle.tags, tagInput.trim().toLowerCase()])].slice(0, 20))
                    setTagInput("")
                  }
                }}
                placeholder="+ tag (Enter)"
                aria-label="Add a tag"
                className="h-7 w-28 rounded-full border border-dashed border-border bg-transparent px-2.5 text-[11px] outline-none focus:border-primary"
              />
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {capabilities.canManage && (
            <label className="text-xs font-semibold text-muted-foreground">Stage
              <select
                value={application.stage}
                onChange={(event) => setPendingStage(event.target.value as ApplicationStage)}
                className={`${inputCls} min-w-40`}
                aria-label="Change stage"
              >
                {APPLICATION_STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
              </select>
            </label>
          )}
          {application.stage === "hired" && capabilities.canManage && (
            <div className="flex flex-col gap-1.5">
              <Link href={`/admin/staff?${prefillParams}`} className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 focus-ring">
                <UserRoundPlus size={13} /> Create staff login
              </Link>
              <Link href={`/admin/agents?${prefillParams}`} className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 focus-ring">
                <UserRoundPlus size={13} /> Create field agent
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Duplicate warning */}
      {bundle.duplicates.length > 0 && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
          This email has {bundle.duplicates.length} other application{bundle.duplicates.length === 1 ? "" : "s"}:{" "}
          {bundle.duplicates.map((duplicate, index) => (
            <span key={duplicate.id}>
              {index > 0 && ", "}
              <Link href={`/admin/recruitment/applicants/${duplicate.id}`} className="underline">{duplicate.reference_number} ({duplicate.job_title})</Link>
            </span>
          ))}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Left: candidate details */}
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Candidate details</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Email</dt><dd className="min-w-0 truncate font-semibold">{application.email || "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Phone</dt><dd className="font-semibold">{application.phone || "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Location</dt><dd className="font-semibold">{application.currentLocation || "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Experience</dt><dd className="font-semibold">{application.yearsExperience} year{application.yearsExperience === 1 ? "" : "s"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Current employer</dt><dd className="min-w-0 truncate font-semibold">{application.currentEmployer || "—"}</dd></div>
              {capabilities.canSeeSalary && (
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Expected salary</dt><dd className="font-semibold">{application.expectedSalary !== null ? formatKshRange(application.expectedSalary, application.expectedSalary) : "—"}</dd></div>
              )}
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Notice period</dt><dd className="font-semibold">{application.noticePeriod || "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Heard about via</dt><dd className="font-semibold">{application.heardAbout || "—"}</dd></div>
              {application.portfolioUrl && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Portfolio</dt>
                  <dd><a href={application.portfolioUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Open link <ExternalLink size={12} /></a></dd>
                </div>
              )}
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Consent</dt><dd className="font-semibold">{application.consent ? `Given ${application.consentAt ? formatEatDateTime(application.consentAt) : ""}` : "Not given"}</dd></div>
            </dl>
          </section>

          {/* Documents */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Documents</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Files are stored securely. Links expire after 5 minutes and every access is logged.</p>
            {bundle.files.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No documents uploaded.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {bundle.files.map((file) => (
                  <li key={file.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <FileText size={18} className="shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{file.filename}</p>
                      <p className="text-[11px] text-muted-foreground">{file.kind === "cv" ? "CV / Résumé" : "Supporting document"} · {(file.sizeBytes / 1024).toFixed(0)} KB</p>
                    </div>
                    {file.mime === "application/pdf" && (
                      <a href={file.accessUrl} target="_blank" rel="noopener noreferrer" className="tap-target rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold hover:bg-muted focus-ring">View</a>
                    )}
                    <a href={`${file.accessUrl}&download=1`} className="tap-target inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold hover:bg-muted focus-ring"><Download size={12} /> Download</a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Cover letter */}
          {application.coverLetter && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Cover letter</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{application.coverLetter}</p>
            </section>
          )}

          {/* Screening answers */}
          {bundle.answers.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Screening answers</h2>
              <dl className="mt-3 space-y-3">
                {bundle.answers.map((answer) => (
                  <div key={answer.id}>
                    <dt className="text-xs font-semibold text-muted-foreground">{answer.prompt}</dt>
                    <dd className="mt-0.5 text-sm font-semibold">{answer.answer || "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {capabilities.canManage && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 focus-ring">
              <Trash2 size={13} /> Delete applicant data
            </button>
          )}
        </div>

        {/* Right: workflow tabs */}
        <div className="min-w-0">
          <Tabs defaultValue="notes">
            <TabsList className="flex-wrap">
              <TabsTrigger value="notes">Notes &amp; rating</TabsTrigger>
              <TabsTrigger value="emails">Emails</TabsTrigger>
              <TabsTrigger value="interviews">Interviews</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Notes & rating */}
            <TabsContent value="notes" className="mt-4 space-y-4">
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-bold">Your rating</h2>
                  <Stars value={myRating} onChange={(value) => void saveRating(value)} />
                </div>
                {bundle.ratings.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                    {bundle.ratings.map((rating) => (
                      <li key={rating.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold">{rating.adminName || "Reviewer"}</span>
                        <Stars value={rating.rating} size={12} />
                        <span className="text-muted-foreground">{formatEatDateTime(rating.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-bold">Add an internal note</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">Notes are only visible to the recruitment team, never to the candidate.</p>
                <div className="mt-3">
                  <RichTextEditor value={noteBody} onChange={setNoteBody} minHeight={120} placeholder="Interview impressions, follow-ups…" />
                </div>
                <button type="button" onClick={() => void addNote()} disabled={savingNote || !noteBody.trim()} className="tap-target mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50 focus-ring">
                  {savingNote ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add note
                </button>
              </section>

              {bundle.notes.map((note) => (
                <section key={note.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">{note.adminName || "Team member"}</span>
                    <span>{formatEatDateTime(note.createdAt)} EAT</span>
                  </div>
                  <div className="mt-2"><RichText html={note.body} /></div>
                </section>
              ))}
            </TabsContent>

            {/* Emails */}
            <TabsContent value="emails" className="mt-4 space-y-4">
              {capabilities.canEmail ? (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="mb-3 text-sm font-bold">Compose email</h2>
                  <EmailComposer
                    applicationId={application.id}
                    candidateName={application.fullName}
                    candidateEmail={application.email}
                    jobTitle={job?.title || application.jobTitle || ""}
                    jobModule={job?.module || application.jobModule || "company-wide"}
                    referenceNumber={application.referenceNumber}
                    closingDate={job?.expiresAt}
                    templates={templates}
                    defaultStage={application.stage}
                    onSent={() => void load()}
                  />
                </section>
              ) : (
                <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">You do not have permission to email candidates.</p>
              )}

              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-bold">Communication timeline</h2>
                {bundle.timeline.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No emails yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {bundle.timeline.map((item) => (
                      <li key={item.id} className="rounded-xl border border-border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button type="button" onClick={() => setExpandedEmail(expandedEmail === item.id ? "" : item.id)} className="min-w-0 text-left text-sm font-semibold hover:underline">
                            {item.subject}
                          </button>
                          <EmailStatusBadge status={item.status} />
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          <span className="capitalize">{item.stage.replace(/_/g, " ")}</span> · {item.senderName || "System"} · {formatEatDateTime(item.createdAt)} EAT
                          {item.scheduledFor && item.status !== "sent" && ` · scheduled for ${formatEatDateTime(item.scheduledFor)} EAT`}
                          {!item.visibleToCandidate && " · hidden from status page"}
                        </p>
                        {item.error && <p className="mt-1 text-[11px] font-semibold text-red-600">Delivery error: {item.error}</p>}
                        {expandedEmail === item.id && (
                          <div className="mt-3 rounded-lg border border-border bg-background p-3">
                            <RichText html={item.html} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </TabsContent>

            {/* Interviews */}
            <TabsContent value="interviews" className="mt-4 space-y-4">
              {capabilities.canManage && (
                <button type="button" onClick={() => setInterviewOpen(true)} className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 focus-ring">
                  <CalendarClock size={15} /> Schedule interview
                </button>
              )}
              {bundle.interviews.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No interviews scheduled.</p>
              ) : (
                bundle.interviews.map((interview) => (
                  <section key={interview.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold capitalize">{interview.type.replace("-", " ")} interview</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${interview.status === "scheduled" ? "bg-sky-100 text-sky-800" : interview.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{interview.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatEatDateTime(interview.startsAt)}{interview.endsAt ? ` – ${formatEatDateTime(interview.endsAt)}` : ""} EAT
                    </p>
                    {(interview.location || interview.meetingLink) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {interview.location}
                        {interview.meetingLink && <> · <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Meeting link</a></>}
                      </p>
                    )}
                    {interview.interviewers.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Panel: {interview.interviewers.join(", ")}</p>}
                    {interview.feedback && (
                      <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Feedback</p>
                        <div className="mt-1"><RichText html={interview.feedback} /></div>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setFeedbackFor(interview); setFeedbackBody(interview.feedback || "") }} className="tap-target rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted focus-ring">
                        {interview.feedback ? "Edit feedback" : "Add feedback"}
                      </button>
                      {capabilities.canManage && interview.status === "scheduled" && (
                        <>
                          <button type="button" onClick={() => setRescheduling(interview)} className="tap-target rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted focus-ring">Reschedule</button>
                          <button type="button" disabled={busy} onClick={() => void patchInterview(interview, { status: "completed" })} className="tap-target rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 focus-ring">Mark completed</button>
                          <button type="button" disabled={busy} onClick={() => void cancelInterview(interview)} className="tap-target rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 focus-ring">Cancel</button>
                        </>
                      )}
                    </div>
                  </section>
                ))
              )}
            </TabsContent>

            {/* History */}
            <TabsContent value="history" className="mt-4">
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-bold">Stage history</h2>
                {bundle.history.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No stage changes yet.</p>
                ) : (
                  <ol className="mt-3 space-y-3">
                    {[...bundle.history].reverse().map((item) => (
                      <li key={item.id} className="flex items-start gap-3">
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-1.5 text-sm">
                            <StageBadge stage={item.fromStage} /> <span aria-hidden="true">→</span> <StageBadge stage={item.toStage} />
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {item.adminName || "System"} · {formatEatDateTime(item.createdAt)} EAT{item.reason ? ` · ${item.reason}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Stage change notification */}
      {pendingStage && (
        <NotifyStageDialog
          open
          onOpenChange={(open) => { if (!open) setPendingStage(null) }}
          applicationId={application.id}
          candidateName={application.fullName}
          fromStage={application.stage}
          toStage={pendingStage}
          templates={templates}
          onDone={(moved) => { if (moved) void load() }}
        />
      )}

      {/* Schedule / reschedule interview */}
      <InterviewDialog
        open={interviewOpen || Boolean(rescheduling)}
        onOpenChange={(open) => { if (!open) { setInterviewOpen(false); setRescheduling(null) } }}
        applicationId={application.id}
        candidateName={application.fullName}
        interview={rescheduling}
        canEmail={capabilities.canEmail}
        onSaved={() => void load()}
      />

      {/* Interview feedback */}
      <Dialog open={Boolean(feedbackFor)} onOpenChange={(open) => { if (!open) setFeedbackFor(null) }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Interview feedback</DialogTitle></DialogHeader>
          <RichTextEditor value={feedbackBody} onChange={setFeedbackBody} minHeight={160} placeholder="Strengths, concerns, recommendation…" />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setFeedbackFor(null)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Cancel</button>
            <button type="button" disabled={busy} onClick={() => feedbackFor && void patchInterview(feedbackFor, { feedback: feedbackBody })} className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring">
              {busy && <Loader2 size={14} className="animate-spin" />} Save feedback
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete all applicant data?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes {application.fullName}&apos;s application, CV, notes, ratings and email history. This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Cancel</button>
            <button type="button" disabled={busy} onClick={() => void deleteApplicant()} className="tap-target inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 focus-ring">
              {busy && <Loader2 size={14} className="animate-spin" />} Delete permanently
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}