"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { eatLocalToUtc, utcToEatLocal, type Interview } from "@/lib/careers"
import { fetchJson, inputCls, labelCls } from "./shared"

/**
 * Schedule a new interview or reschedule an existing one. All times are
 * entered in EAT (Africa/Nairobi) and converted to UTC for the server.
 */
export function InterviewDialog({
  open, onOpenChange, applicationId, candidateName, interview, canEmail, onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId: string
  candidateName: string
  /** Present when rescheduling. */
  interview?: Interview | null
  canEmail: boolean
  onSaved: () => void
}) {
  const [type, setType] = useState("video")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [location, setLocation] = useState("")
  const [meetingLink, setMeetingLink] = useState("")
  const [interviewers, setInterviewers] = useState("")
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setType(interview?.type || "video")
    setStartsAt(interview ? utcToEatLocal(interview.startsAt) : "")
    setEndsAt(interview ? utcToEatLocal(interview.endsAt) : "")
    setLocation(interview?.location || "")
    setMeetingLink(interview?.meetingLink || "")
    setInterviewers(interview?.interviewers.join(", ") || "")
    setNotify(true)
  }, [open, interview])

  const save = async () => {
    if (!startsAt) {
      toast.error("Choose a start date and time (EAT).")
      return
    }
    setBusy(true)
    const payload = {
      type,
      startsAt: eatLocalToUtc(startsAt),
      endsAt: endsAt ? eatLocalToUtc(endsAt) : null,
      location,
      meetingLink,
      interviewers: interviewers.split(",").map((name) => name.trim()).filter(Boolean).slice(0, 10),
    }
    try {
      if (interview) {
        await fetchJson(`/api/admin/recruitment/interviews/${interview.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (notify && canEmail) {
          try {
            await fetchJson(`/api/admin/recruitment/interviews/${interview.id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "reschedule" }),
            })
            toast.success("Interview rescheduled — updated invite emailed with a calendar file.")
          } catch (error) {
            toast.error(`Rescheduled, but the email failed: ${error instanceof Error ? error.message : "unknown error"}`)
          }
        } else {
          toast.success("Interview rescheduled.")
        }
      } else {
        const data = await fetchJson<{ email: { ok: boolean; error?: string } | null }>("/api/admin/recruitment/interviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId, ...payload, sendInvite: notify && canEmail }),
        })
        if (data.email && !data.email.ok) {
          toast.error(`Interview saved, but the invite failed: ${data.email.error || "unknown error"}`)
        } else {
          toast.success(notify && canEmail ? "Interview scheduled — invite emailed with a calendar file." : "Interview scheduled.")
        }
      }
      onSaved()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the interview.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{interview ? "Reschedule interview" : "Schedule interview"} — {candidateName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelCls}>Type
            <select value={type} onChange={(event) => setType(event.target.value)} className={inputCls}>
              <option value="video">Video call</option>
              <option value="phone">Phone</option>
              <option value="in-person">In person</option>
            </select>
          </label>
          <label className={labelCls}>Interviewers (comma separated)
            <input value={interviewers} onChange={(event) => setInterviewers(event.target.value)} className={inputCls} placeholder="Names of the panel" />
          </label>
          <label className={labelCls}>Starts (EAT) *
            <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={inputCls} />
          </label>
          <label className={labelCls}>Ends (EAT, optional)
            <input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={inputCls} />
          </label>
          <label className={labelCls}>Location
            <input value={location} onChange={(event) => setLocation(event.target.value)} className={inputCls} placeholder="Office / address" />
          </label>
          <label className={labelCls}>Meeting link
            <input value={meetingLink} onChange={(event) => setMeetingLink(event.target.value)} className={inputCls} placeholder="https://…" />
          </label>
        </div>
        {canEmail && (
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} className="size-4 accent-[var(--primary)]" />
            Email the candidate an invite with a calendar (.ics) attachment
          </label>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Cancel</button>
          <button type="button" onClick={() => void save()} disabled={busy} className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring">
            {busy && <Loader2 size={14} className="animate-spin" />} {interview ? "Save changes" : "Schedule"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}