"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Mail, MailX } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { STAGE_LABELS, type ApplicationStage } from "@/lib/careers"
import { fetchJson, StageBadge } from "./shared"
import type { ComposerTemplate } from "./email-composer"

/**
 * Shown whenever an applicant is moved to a new stage: choose whether the
 * candidate gets the stage email, with a preview of what will be sent.
 */
export function NotifyStageDialog({
  open, onOpenChange, applicationId, candidateName, fromStage, toStage, templates, onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId: string
  candidateName: string
  fromStage: string
  toStage: ApplicationStage
  templates: ComposerTemplate[]
  onDone: (moved: boolean) => void
}) {
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const template = useMemo(() => templates.find((item) => item.stage === toStage && item.enabled), [templates, toStage])

  const confirm = async () => {
    setBusy(true)
    try {
      await fetchJson(`/api/admin/recruitment/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: toStage }),
      })
      if (notify && template) {
        try {
          await fetchJson(`/api/admin/recruitment/applications/${applicationId}/emails`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stage: toStage, templateId: template.id, idempotencySuffix: `stage-entry:${toStage}` }),
          })
          toast.success(`Moved to ${STAGE_LABELS[toStage]} — email queued.`)
        } catch (error) {
          const err = error as Error & { code?: string }
          if (err.code === "already_sent") {
            toast.info(`Moved to ${STAGE_LABELS[toStage]}. The stage email was already sent before, so it was not repeated.`)
          } else {
            toast.error(`Stage moved, but the email failed: ${err.message}`)
          }
        }
      } else {
        toast.success(`Moved to ${STAGE_LABELS[toStage]}.`)
      }
      onDone(true)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change the stage.")
      onDone(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Move {candidateName} to {STAGE_LABELS[toStage]}?</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 text-sm">
          <StageBadge stage={fromStage} /> <span aria-hidden="true">→</span> <StageBadge stage={toStage} />
        </div>

        <div className="mt-3 space-y-2" role="radiogroup" aria-label="Candidate notification">
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm ${notify && template ? "border-primary bg-primary/5" : "border-border"}`}>
            <input type="radio" name="notify-choice" checked={notify && Boolean(template)} disabled={!template} onChange={() => setNotify(true)} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>
              <span className="flex items-center gap-1.5 font-semibold"><Mail size={14} /> Move and email the candidate</span>
              {template ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Subject: <span className="font-medium text-foreground">{template.subject}</span>
                </span>
              ) : (
                <span className="mt-1 block text-xs text-muted-foreground">No enabled email template exists for this stage.</span>
              )}
            </span>
          </label>
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm ${!notify || !template ? "border-primary bg-primary/5" : "border-border"}`}>
            <input type="radio" name="notify-choice" checked={!notify || !template} onChange={() => setNotify(false)} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>
              <span className="flex items-center gap-1.5 font-semibold"><MailX size={14} /> Move without emailing</span>
              <span className="mt-1 block text-xs text-muted-foreground">The stage changes silently; you can email later from the profile.</span>
            </span>
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Cancel</button>
          <button type="button" onClick={() => void confirm()} disabled={busy} className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring">
            {busy && <Loader2 size={14} className="animate-spin" />} Confirm move
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}