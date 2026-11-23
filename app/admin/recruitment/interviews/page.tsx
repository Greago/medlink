"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CalendarClock, CalendarPlus, Loader2, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RichTextEditor } from "@/components/rich-text-editor-lazy"
import { RichText } from "@/components/rich-text"
import { formatEatDateTime, type Application, type Interview } from "@/lib/careers"
import { hasPermission } from "@/lib/roles"
import { useStore } from "@/lib/store"
import { fetchJson, inputCls, labelCls } from "@/components/admin/recruitment/shared"
import { InterviewDialog } from "@/components/admin/recruitment/interview-dialog"

interface InterviewRow extends Interview {
  candidateName: string
  referenceNumber: string
  jobTitle?: string
  jobId: string
}

/** Build a downloadable .ics calendar file for an interview (times in UTC). */
function downloadIcs(interview: InterviewRow) {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Medlink Expedite//Recruitment//EN", "BEGIN:VEVENT",
    `UID:interview-${interview.id}@medlinkexpedite.co.ke`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(interview.startsAt)}`,
    `DTEND:${stamp(interview.endsAt || new Date(new Date(interview.startsAt).getTime() + 60 * 60 * 1000).toISOString())}`,
    `SUMMARY:${escape(`Interview: ${interview.jobTitle || "Medlink Expedite"} — ${interview.candidateName}`)}`,
    `LOCATION:${escape(interview.location || interview.meetingLink || "")}`,
    interview.meetingLink ? `URL:${interview.meetingLink}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean)
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `interview-${interview.referenceNumber}.ics`
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function RecruitmentInterviewsPage() {
  const role = useStore((state) => state.adminRole)
  const permissions = useStore((state) => state.adminPermissions)
  const canManage = role ? hasPermission({ role, permissions }, "recruitment.manage") : false
  const canEmail = role ? hasPermission({ role, permissions }, "recruitment.email") : false

  const [interviews, setInterviews] = useState<InterviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming")
  const [busy, setBusy] = useState(false)

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [candidates, setCandidates] = useState<Application[]>([])
  const [candidateId, setCandidateId] = useState("")
  const [rescheduling, setRescheduling] = useState<InterviewRow | null>(null)
  const [feedbackFor, setFeedbackFor] = useState<InterviewRow | null>(null)
  const [feedbackBody, setFeedbackBody] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchJson<{ interviews: InterviewRow[] }>("/api/admin/recruitment/interviews")
      setInterviews(data.interviews)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load interviews.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const openSchedule = async () => {
    setScheduleOpen(true)
    if (candidates.length === 0) {
      try {
        const data = await fetchJson<{ applications: Application[] }>("/api/admin/recruitment/applications?pageSize=200")
        setCandidates(data.applications)
      } catch {
        toast.error("Could not load the applicant list.")
      }
    }
  }

  const visible = useMemo(() => {
    const now = Date.now()
    const sorted = [...interviews].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    if (filter === "upcoming") return sorted.filter((item) => item.status === "scheduled" && new Date(item.startsAt).getTime() >= now - 60 * 60 * 1000)
    if (filter === "past") return sorted.filter((item) => item.status !== "scheduled" || new Date(item.startsAt).getTime() < now).reverse()
    return sorted
  }, [interviews, filter])

  const patch = async (interview: InterviewRow, payload: Record<string, unknown>) => {
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the interview.")
    } finally {
      setBusy(false)
    }
  }

  const sendEmail = async (interview: InterviewRow, action: "invite" | "cancel") => {
    setBusy(true)
    try {
      if (action === "cancel") {
        await fetchJson(`/api/admin/recruitment/interviews/${interview.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        })
      }
      await fetchJson(`/api/admin/recruitment/interviews/${interview.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      toast.success(action === "invite" ? "Invite emailed with a calendar file." : "Interview cancelled — candidate notified.")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.")
    } finally {
      setBusy(false)
    }
  }

  const selectedCandidate = candidates.find((item) => item.id === candidateId)

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Interviews</h1>
        {canManage && (
          <button type="button" onClick={() => void openSchedule()} className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 focus-ring">
            <Plus size={15} /> Schedule interview
          </button>
        )}
      </div>

      <div className="flex rounded-xl border border-border p-0.5" role="tablist" aria-label="Interview filter">
        {(["upcoming", "past", "all"] as const).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={filter === item} onClick={() => setFilter(item)} className={`tap-target rounded-lg px-4 py-1.5 text-xs font-bold capitalize focus-ring ${filter === item ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <CalendarClock size={28} className="mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No {filter !== "all" ? filter : ""} interviews</p>
          <p className="mt-1 text-xs text-muted-foreground">Schedule interviews from an applicant&apos;s profile or with the button above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((interview) => (
            <section key={interview.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/recruitment/applicants/${interview.applicationId}`} className="text-sm font-bold hover:underline">{interview.candidateName}</Link>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${interview.status === "scheduled" ? "bg-sky-100 text-sky-800" : interview.status === "completed" ? "bg-emerald-100 text-emerald-800" : interview.status === "no-show" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}`}>{interview.status}</span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold capitalize">{interview.type.replace("-", " ")}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatEatDateTime(interview.startsAt)}{interview.endsAt ? ` – ${formatEatDateTime(interview.endsAt)}` : ""} EAT · {interview.jobTitle || "—"}
                  </p>
                  {(interview.location || interview.meetingLink) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {interview.location}
                      {interview.meetingLink && <> · <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Meeting link</a></>}
                    </p>
                  )}
                  {interview.interviewers.length > 0 && <p className="mt-0.5 text-xs text-muted-foreground">Panel: {interview.interviewers.join(", ")}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => downloadIcs(interview)} title="Download calendar file" className="tap-target inline-flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-[11px] font-bold hover:bg-muted focus-ring">
                    <CalendarPlus size={12} /> .ics
                  </button>
                  <button type="button" onClick={() => { setFeedbackFor(interview); setFeedbackBody(interview.feedback || "") }} className="tap-target rounded-xl border border-border px-2.5 py-1.5 text-[11px] font-bold hover:bg-muted focus-ring">
                    {interview.feedback ? "Edit feedback" : "Feedback"}
                  </button>
                  {canEmail && interview.status === "scheduled" && (
                    <button type="button" disabled={busy} onClick={() => void sendEmail(interview, "invite")} className="tap-target rounded-xl border border-border px-2.5 py-1.5 text-[11px] font-bold hover:bg-muted focus-ring">Send invite</button>
                  )}
                  {canManage && interview.status === "scheduled" && (
                    <>
                      <button type="button" onClick={() => setRescheduling(interview)} className="tap-target rounded-xl border border-border px-2.5 py-1.5 text-[11px] font-bold hover:bg-muted focus-ring">Reschedule</button>
                      <button type="button" disabled={busy} onClick={() => void patch(interview, { status: "completed" })} className="tap-target rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 focus-ring">Completed</button>
                      <button type="button" disabled={busy} onClick={() => void patch(interview, { status: "no-show" })} className="tap-target rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 focus-ring">No-show</button>
                      <button type="button" disabled={busy} onClick={() => void (canEmail ? sendEmail(interview, "cancel") : patch(interview, { status: "cancelled" }))} className="tap-target rounded-xl border border-red-200 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 focus-ring">Cancel</button>
                    </>
                  )}
                </div>
              </div>
              {interview.feedback && (
                <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Feedback</p>
                  <div className="mt-1"><RichText html={interview.feedback} /></div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Pick candidate, then schedule */}
      <Dialog open={scheduleOpen && !candidateId} onOpenChange={(open) => { if (!open) setScheduleOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Who is being interviewed?</DialogTitle></DialogHeader>
          <label className={labelCls}>Applicant
            <select value={candidateId} onChange={(event) => setCandidateId(event.target.value)} className={inputCls}>
              <option value="">Choose an applicant…</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.fullName} — {candidate.jobTitle || candidate.referenceNumber}</option>
              ))}
            </select>
          </label>
        </DialogContent>
      </Dialog>
      <InterviewDialog
        open={(scheduleOpen && Boolean(candidateId)) || Boolean(rescheduling)}
        onOpenChange={(open) => { if (!open) { setScheduleOpen(false); setCandidateId(""); setRescheduling(null) } }}
        applicationId={rescheduling?.applicationId || candidateId}
        candidateName={rescheduling?.candidateName || selectedCandidate?.fullName || ""}
        interview={rescheduling}
        canEmail={canEmail}
        onSaved={() => { setCandidateId(""); void load() }}
      />

      {/* Feedback */}
      <Dialog open={Boolean(feedbackFor)} onOpenChange={(open) => { if (!open) setFeedbackFor(null) }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Feedback — {feedbackFor?.candidateName}</DialogTitle></DialogHeader>
          <RichTextEditor value={feedbackBody} onChange={setFeedbackBody} minHeight={160} placeholder="Strengths, concerns, recommendation…" />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setFeedbackFor(null)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Cancel</button>
            <button type="button" disabled={busy} onClick={() => feedbackFor && void patch(feedbackFor, { feedback: feedbackBody })} className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring">
              {busy && <Loader2 size={14} className="animate-spin" />} Save feedback
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}