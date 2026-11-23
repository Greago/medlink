"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Mail, Paperclip, Search, Send } from "lucide-react"
import {
  Badge,
  Button,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  EmptyState,
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  SectionHeader,
} from "@/components/design-system"

interface BulkSend {
  id: number
  subject: string
  body: string
  recipientCount: number
  sentCount: number
  failedCount: number
  attachedCatalogue: boolean
  createdAt: string
}

interface SendResult {
  total: number
  sentCount: number
  failedCount: number
  attachCatalogue: boolean
}

const PAGE_SIZE = 8

export default function BulkEmailPage() {
  const [recipients, setRecipients] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [attachCatalogue, setAttachCatalogue] = useState(true)
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)
  const [history, setHistory] = useState<BulkSend[]>([])
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/email/bulk", { cache: "no-store" })
      if (!response.ok) return
      const data = (await response.json()) as { sends: BulkSend[] }
      setHistory(data.sends)
    } catch {
      // Keep the form usable if history cannot load.
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const recipientList = useMemo(
    () => recipients.split(/[\s,;]+/).map((email) => email.trim()).filter(Boolean),
    [recipients]
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle
      ? history.filter((item) => [item.subject, item.body].join(" ").toLowerCase().includes(needle))
      : history
  }, [history, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const validate = () => {
    if (recipientList.length === 0) {
      toast.error("Add at least one recipient email address.")
      return false
    }
    if (recipientList.length > 100) {
      toast.error("You can send to a maximum of 100 recipients at a time.")
      return false
    }
    if (!subject.trim() || !message.trim()) {
      toast.error("A subject and message are required.")
      return false
    }
    return true
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    setConfirmOpen(true)
  }

  const sendEmails = async () => {
    setSending(true)
    setResult(null)
    try {
      const response = await fetch("/api/email/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: recipientList,
          subject: subject.trim(),
          message: message.trim(),
          attachCatalogue,
        }),
      })
      const data = (await response.json()) as SendResult & { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not send the emails.")
      setResult({
        total: data.total,
        sentCount: data.sentCount,
        failedCount: data.failedCount,
        attachCatalogue: data.attachCatalogue,
      })
      setMessage("")
      setConfirmOpen(false)
      toast.success(`Sent ${data.sentCount} of ${data.total} email${data.total === 1 ? "" : "s"}.`)
      void loadHistory()
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Could not send the emails.")
    } finally {
      setSending(false)
    }
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"

  return (
    <div className="space-y-6 p-4 lg:p-7">
      <SectionHeader
        eyebrow="Tools"
        title="Bulk email"
        description="Send updates or the current catalogue to customers. Each recipient receives a separate email from bulk@medlinkexpedite.co.ke."
      />

      {result && (
        <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          Sent {result.sentCount} of {result.total} email{result.total === 1 ? "" : "s"}
          {result.failedCount > 0 && ` (${result.failedCount} failed)`}
          {result.attachCatalogue && " with the catalogue attached"}.
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <Card className="gap-0 space-y-5 p-5 lg:p-6">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Recipients</span>
            <textarea
              value={recipients}
              onChange={(event) => { setRecipients(event.target.value); setPage(1) }}
              rows={6}
              placeholder={"client1@example.com\nclient2@example.com"}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
            <span className="mt-2 block text-xs text-muted-foreground">
              {recipientList.length} recipient(s) · one per line or comma separated · maximum 100
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Subject</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={200}
              placeholder="Your Medlink catalogue is ready"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={9}
              maxLength={10000}
              placeholder="Hello, please find our latest catalogue and product updates below."
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </label>
        </Card>

        <Card className="h-fit gap-0 space-y-5 p-5 lg:p-6">
          <div>
            <h2 className="font-bold">Email options</h2>
            <p className="mt-1 text-xs text-muted-foreground">Choose what to include in the message.</p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition hover:border-primary/40">
            <input
              type="checkbox"
              checked={attachCatalogue}
              onChange={(event) => setAttachCatalogue(event.target.checked)}
              className="mt-0.5 size-4 accent-[var(--primary)]"
            />
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Paperclip size={15} /> Attach catalogue PDF
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Includes the current product catalogue generated from the database.
              </span>
            </span>
          </label>

          <Button type="submit" variant="primary" size="touch" className="w-full" disabled={sending}>
            <Send size={17} /> Send bulk email
          </Button>

          <p className="text-xs text-muted-foreground">
            Duplicate addresses are removed automatically. Delivery failures are reported in the result banner.
          </p>
        </Card>
      </form>

      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold"><Mail size={17} className="text-primary" /> Recent bulk emails</h3>
            <p className="mt-1 text-xs text-muted-foreground">{history.length} previous send(s)</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1) }}
              placeholder="Search by subject"
              className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </div>
        </div>

        {history.length === 0 ? (
          <EmptyState icon={Mail} title="No bulk emails sent yet" description="Your send history will appear here." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="No matching sends" description="Try a different subject." action={<Button variant="soft" onClick={() => setQuery("")}>Clear search</Button>} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <DataTable>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>Subject</DataTableHead>
                    <DataTableHead>Date</DataTableHead>
                    <DataTableHead>Recipients</DataTableHead>
                    <DataTableHead>Result</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {visible.map((item) => (
                    <DataTableRow key={item.id}>
                      <DataTableCell>
                        <span className="block max-w-xs truncate font-semibold">{item.subject}</span>
                        {item.attachedCatalogue && <Badge variant="soft" className="mt-1">Catalogue attached</Badge>}
                      </DataTableCell>
                      <DataTableCell className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</DataTableCell>
                      <DataTableCell>{item.recipientCount}</DataTableCell>
                      <DataTableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="success">{item.sentCount} sent</Badge>
                          {item.failedCount > 0 && <Badge variant="danger">{item.failedCount} failed</Badge>}
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground">
              <span>Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-2">
                <Button variant="outlineSoft" size="sm" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
                <span className="font-semibold text-ink">Page {currentPage} of {pageCount}</span>
                <Button variant="outlineSoft" size="sm" disabled={currentPage >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal open={confirmOpen} onOpenChange={(open) => !open && !sending && setConfirmOpen(false)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Send this email?</ModalTitle>
            <ModalDescription>
              This will send “{subject.trim()}” to {recipientList.length} recipient{recipientList.length === 1 ? "" : "s"}
              {attachCatalogue ? " with the catalogue attached" : ""}.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outlineSoft" onClick={() => setConfirmOpen(false)} disabled={sending}>Cancel</Button>
            <Button variant="primary" onClick={() => void sendEmails()} disabled={sending}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? "Sending…" : "Send now"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
