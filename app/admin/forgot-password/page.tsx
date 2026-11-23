"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button, Card } from "@/components/design-system"

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not send the reset email.")
      setSent(true)
      toast.success("If that account exists, a reset link has been sent.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send the reset email.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-10">
      <div className="mx-auto max-w-md">
        <Link href="/admin/login" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0c1f1d]">
          <ArrowLeft size={16} /> Back to admin login
        </Link>

        <Card className="mt-6 gap-0 p-7">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Mail size={22} />
          </span>
          <h1 className="mt-4 text-2xl font-bold">Reset your staff password</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Enter your staff login email. We will send a one-time reset link if the account exists.
          </p>

          {sent ? (
            <div className="mt-6 rounded-2xl bg-primary/5 p-4 text-sm">
              <p className="font-semibold">Check your inbox.</p>
              <p className="mt-1 text-muted-foreground">
                The link expires in 1 hour and can only be used once. You can close this page.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-5">
              <label className="block text-sm">
                <span className="mb-2 block font-semibold">Staff email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@medlinkexpedite.co.ke"
                  className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                />
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                {busy ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </main>
  )
}
