"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Mail, RefreshCw } from "lucide-react"
import { Badge, Button } from "@/components/design-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface OutboxMessage {
  id: string
  module: string
  kind: string
  recipient: string
  subject: string
  status: string
  attempts: number
  last_error: string
  next_attempt_at: string
  sent_at: string | null
  created_at: string
}

export default function EmailOutboxPage() {
  const [messages, setMessages] = useState<OutboxMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/email/outbox", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load the email outbox.")
      const data = (await response.json()) as { messages: OutboxMessage[] }
      setMessages(data.messages)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the email outbox.")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const processQueue = async () => {
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/admin/email/outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process", limit: 20 }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not process the queue.")
      toast.success("Email queue processed.")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not process the queue.")
    } finally {
      setBusy(false)
    }
  }

  const retry = async (id: string) => {
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/admin/email/outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", id }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not retry the email.")
      toast.success("Email queued for retry.")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not retry the email.")
    } finally {
      setBusy(false)
    }
  }

  const statusVariant = (status: string) =>
    status === "sent" ? "success" : status === "failed" ? "danger" : "warning"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Tools</p>
          <h1 className="text-3xl font-bold">Email outbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inspect queued receipts and credit notes, process due messages and retry failures.
          </p>
        </div>
        <Button onClick={processQueue} disabled={busy}>
          {busy ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />} Process queue
        </Button>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <p>{error}</p>
          <button type="button" onClick={() => setError("")} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail size={18} /> Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {messages.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No emails in the outbox.
            </p>
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Created</th>
                  <th className="py-2">Recipient</th>
                  <th className="py-2">Subject</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Attempts</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message.id} className="border-b border-border/60 last:border-0 align-top">
                    <td className="py-3">{new Date(message.created_at).toLocaleString("en-KE")}</td>
                    <td className="py-3">{message.recipient}</td>
                    <td className="py-3">
                      {message.subject}
                      {message.last_error && (
                        <span className="block text-xs text-danger">{message.last_error}</span>
                      )}
                    </td>
                    <td className="py-3">
                      <Badge variant={statusVariant(message.status) as "success" | "danger" | "warning"}>
                        {message.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">{message.attempts}</td>
                    <td className="py-3 text-right">
                      {message.status !== "sent" && (
                        <Button size="sm" variant="outlineSoft" onClick={() => retry(message.id)} disabled={busy}>
                          Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
