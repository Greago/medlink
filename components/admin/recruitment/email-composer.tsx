"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { CalendarClock, Eye, EyeOff, FileText, Loader2, Paperclip, Send, X } from "lucide-react"
import { RichTextEditor } from "@/components/rich-text-editor-lazy"
import { RichText } from "@/components/rich-text"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { eatLocalToUtc, formatEatDate, jobTheme, type JobModule } from "@/lib/careers"
import { useStore } from "@/lib/store"
import { fetchJson, inputCls, labelCls } from "./shared"

/** Keep in sync with EMAIL_VARIABLES in lib/careers-emails.ts. */
const VARIABLES = [
  "candidate_name", "first_name", "job_title", "reference_number", "company_name", "module_name",
  "stage", "interview_date", "interview_time", "interview_location_or_link", "interviewers",
  "closing_date", "status_page_link", "recruiter_name", "recruiter_email", "recruiter_phone",
  "salary_offer", "start_date",
] as const

const VARIABLE_LABELS: Record<string, string> = {
  candidate_name: "Candidate full name", first_name: "First name", job_title: "Job title",
  reference_number: "Reference number", company_name: "Company name", module_name: "Division",
  stage: "Stage", interview_date: "Interview date", interview_time: "Interview time (EAT)",
  interview_location_or_link: "Interview location / link", interviewers: "Interviewers",
  closing_date: "Job closing date", status_page_link: "Status page link",
  recruiter_name: "Recruiter name", recruiter_email: "Recruiter email", recruiter_phone: "Recruiter phone",
  salary_offer: "Salary offer (KSh)", start_date: "Start date",
}

export interface ComposerTemplate { id: string; stage: string; subject: string; body: string; enabled: boolean }

export interface EmailComposerProps {
  applicationId: string
  candidateName: string
  candidateEmail: string
  jobTitle: string
  jobModule: JobModule
  referenceNumber: string
  closingDate?: string | null
  templates: ComposerTemplate[]
  defaultStage?: string
  onSent?: () => void
}

interface Draft {
  stage: string; templateId: string; subject: string; body: string
  cc: string; bcc: string; scheduledFor: string; visible: boolean
  extra: Record<string, string>
}

function tokensIn(text: string): string[] {
  const found = new Set<string>()
  for (const match of text.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/gi)) found.add(match[1].toLowerCase())
  return [...found]
}

export function EmailComposer({
  applicationId, candidateName, candidateEmail, jobTitle, jobModule, referenceNumber, closingDate, templates, defaultStage, onSent,
}: EmailComposerProps) {
  const adminName = useStore((state) => state.adminName)
  const adminEmail = useStore((state) => state.adminEmail)
  const draftKey = `medlink-email-draft:${applicationId}`

  const [stage, setStage] = useState(defaultStage || "custom")
  const [templateId, setTemplateId] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [scheduledFor, setScheduledFor] = useState("")
  const [visible, setVisible] = useState(true)
  const [extra, setExtra] = useState<Record<string, string>>({})
  const [attachments, setAttachments] = useState<{ filename: string; contentBase64: string }[]>([])
  const [preview, setPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [confirmResend, setConfirmResend] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Restore a saved draft for this candidate.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey)
      if (saved) {
        const draft = JSON.parse(saved) as Draft
        setStage(draft.stage || defaultStage || "custom")
        setTemplateId(draft.templateId || "")
        setSubject(draft.subject || "")
        setBody(draft.body || "")
        setCc(draft.cc || "")
        setBcc(draft.bcc || "")
        setScheduledFor(draft.scheduledFor || "")
        setVisible(draft.visible ?? true)
        setExtra(draft.extra || {})
      }
    } catch { /* ignore corrupt draft */ }
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])

  // Debounced draft autosave.
  useEffect(() => {
    if (!hydrated) return
    const timer = setTimeout(() => {
      try {
        const draft: Draft = { stage, templateId, subject, body, cc, bcc, scheduledFor, visible, extra }
        if (subject || body) localStorage.setItem(draftKey, JSON.stringify(draft))
      } catch { /* storage full */ }
    }, 500)
    return () => clearTimeout(timer)
  }, [hydrated, draftKey, stage, templateId, subject, body, cc, bcc, scheduledFor, visible, extra])

  const applyTemplate = useCallback((id: string) => {
    setTemplateId(id)
    const template = templates.find((item) => item.id === id)
    if (template) {
      setStage(template.stage)
      setSubject(template.subject)
      setBody(template.body)
    }
  }, [templates])

  // Auto-filled context mirrors the server's sendApplicationEmail context.
  const autoContext = useMemo<Record<string, string>>(() => ({
    candidate_name: candidateName,
    first_name: candidateName.split(/\s+/)[0] || candidateName,
    job_title: jobTitle,
    reference_number: referenceNumber,
    company_name: "Medlink Expedite",
    module_name: jobTheme(jobModule).label,
    stage,
    closing_date: closingDate ? formatEatDate(closingDate) : "",
    status_page_link: `${typeof window !== "undefined" ? window.location.origin : ""}/careers/status`,
    recruiter_name: adminName || "Recruitment team",
    recruiter_email: adminEmail || "",
  }), [candidateName, jobTitle, referenceNumber, jobModule, stage, closingDate, adminName, adminEmail])

  const neededManual = useMemo(() => {
    const tokens = new Set([...tokensIn(subject), ...tokensIn(body)])
    return VARIABLES.filter((token) => tokens.has(token) && !(token in autoContext))
  }, [subject, body, autoContext])

  const fullContext = useMemo(() => ({ ...autoContext, ...extra }), [autoContext, extra])

  const renderPreview = useCallback((text: string) => {
    return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, token: string) => {
      const value = fullContext[token.toLowerCase()]
      return value ? value : `⟦${token}⟧`
    })
  }, [fullContext])

  const missing = useMemo(() => {
    const tokens = new Set([...tokensIn(subject), ...tokensIn(body)])
    return [...tokens].filter((token) => !VARIABLES.includes(token as (typeof VARIABLES)[number]) || !fullContext[token])
  }, [subject, body, fullContext])

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" is larger than 5 MB.`)
        continue
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "")
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      setAttachments((current) => [...current, { filename: file.name, contentBase64: base64 }].slice(0, 5))
    }
  }, [])

  const buildPayload = useCallback((forceResend: boolean) => {
    const template = templates.find((item) => item.id === templateId)
    const edited = !template || template.subject !== subject || template.body !== body
    return {
      stage,
      templateId: template && !edited ? template.id : null,
      subject: edited || !template ? subject : undefined,
      body: edited || !template ? body : undefined,
      cc, bcc,
      scheduledFor: scheduledFor ? eatLocalToUtc(scheduledFor) : null,
      visibleToCandidate: visible,
      forceResend,
      context: extra,
      attachments,
    }
  }, [stage, templateId, subject, body, cc, bcc, scheduledFor, visible, extra, attachments, templates])

  const send = async (forceResend = false) => {
    if (!candidateEmail) {
      toast.error("This candidate has no email address.")
      return
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("Please add a subject and a message.")
      return
    }
    if (missing.length > 0) {
      toast.error(`Fill the missing variables first: ${missing.join(", ")}`)
      return
    }
    setSending(true)
    try {
      await fetchJson(`/api/admin/recruitment/applications/${applicationId}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(forceResend)),
      })
      toast.success(scheduledFor ? "Email scheduled (EAT)." : "Email queued for delivery.")
      try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
      setConfirmResend(false)
      onSent?.()
    } catch (error) {
      const err = error as Error & { status?: number; code?: string }
      if (err.status === 409 && err.code === "already_sent") {
        setConfirmResend(true)
      } else {
        toast.error(err.message || "Could not send the email.")
      }
    } finally {
      setSending(false)
    }
  }

  const testSend = async () => {
    if (!adminEmail) return
    if (missing.length > 0) {
      toast.error(`Fill the missing variables first: ${missing.join(", ")}`)
      return
    }
    setTesting(true)
    try {
      await fetchJson(`/api/admin/recruitment/applications/${applicationId}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildPayload(true), testTo: adminEmail }),
      })
      toast.success(`Test email sent to ${adminEmail}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Test send failed.")
    } finally {
      setTesting(false)
    }
  }

  const variableOptions = VARIABLES.map((token) => ({ token: `{{${token}}}`, label: VARIABLE_LABELS[token] || token }))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelCls}>Template
          <select value={templateId} onChange={(event) => applyTemplate(event.target.value)} className={inputCls}>
            <option value="">Custom message…</option>
            {templates.filter((item) => item.enabled).map((item) => (
              <option key={item.id} value={item.id}>{item.stage.replace(/_/g, " ")}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>Stage / purpose
          <input value={stage} onChange={(event) => setStage(event.target.value)} className={inputCls} placeholder="e.g. shortlisted" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className={labelCls}>To
          <input value={candidateEmail || "No email on file"} readOnly className={`${inputCls} bg-muted/50`} />
        </label>
        <label className={labelCls}>CC (comma separated)
          <input value={cc} onChange={(event) => setCc(event.target.value)} className={inputCls} placeholder="optional" />
        </label>
        <label className={labelCls}>BCC (comma separated)
          <input value={bcc} onChange={(event) => setBcc(event.target.value)} className={inputCls} placeholder="optional" />
        </label>
      </div>

      <label className={labelCls}>Subject
        <input value={subject} onChange={(event) => setSubject(event.target.value)} className={inputCls} placeholder="Subject — you can use {{variables}}" />
      </label>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className={labelCls}>Message</span>
          <button type="button" onClick={() => setPreview((current) => !current)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted focus-ring">
            {preview ? <EyeOff size={13} /> : <Eye size={13} />} {preview ? "Edit" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-bold">{renderPreview(subject)}</p>
            <div className="mt-3">
              <RichText html={renderPreview(body)} />
            </div>
          </div>
        ) : (
          <RichTextEditor value={body} onChange={setBody} mode="email" variables={variableOptions} minHeight={200} placeholder="Write the message — insert variables from the toolbar…" />
        )}
      </div>

      {neededManual.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Variable values needed for this message</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {neededManual.map((token) => (
              <label key={token} className={labelCls}>{VARIABLE_LABELS[token] || token}
                <input
                  value={extra[token] || ""}
                  onChange={(event) => setExtra((current) => ({ ...current, [token]: event.target.value }))}
                  className={inputCls}
                  placeholder={`{{${token}}}`}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Sending is blocked until these variables are filled: {missing.join(", ")}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          <span className="inline-flex items-center gap-1.5"><CalendarClock size={13} /> Schedule send (EAT, optional)</span>
          <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className={inputCls} />
        </label>
        <div>
          <span className={labelCls}>Attachments (PDF/DOC/DOCX, max 5 MB each)</span>
          <div className="mt-1 flex items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted focus-ring">
              <Paperclip size={13} /> Attach file
            </button>
            <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={(event) => { void addFiles(event.target.files); event.target.value = "" }} />
          </div>
          {attachments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {attachments.map((file, index) => (
                <li key={`${file.filename}-${index}`} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs">
                  <FileText size={13} className="text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{file.filename}</span>
                  <button type="button" aria-label={`Remove ${file.filename}`} onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))} className="rounded p-1 hover:bg-muted focus-ring"><X size={12} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} className="size-4 accent-[var(--primary)]" />
        Show this message on the candidate&apos;s status page
      </label>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => void send(false)}
          disabled={sending || missing.length > 0}
          className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50 focus-ring"
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {scheduledFor ? "Schedule email" : "Send email"}
        </button>
        <button
          type="button"
          onClick={() => void testSend()}
          disabled={testing || missing.length > 0}
          className="tap-target inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50 focus-ring"
        >
          {testing && <Loader2 size={14} className="animate-spin" />} Send test to me
        </button>
        <span className="text-[11px] text-muted-foreground">Drafts save automatically in this browser.</span>
      </div>

      <Dialog open={confirmResend} onOpenChange={setConfirmResend}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send this email again?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A &quot;{stage.replace(/_/g, " ")}&quot; email was already sent to {candidateName}. Sending again will deliver a duplicate message.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmResend(false)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Cancel</button>
            <button type="button" onClick={() => void send(true)} disabled={sending} className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring">
              {sending && <Loader2 size={14} className="animate-spin" />} Yes, resend
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}