"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Loader2, LockKeyhole } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/design-system"

export function AdminResetPasswordForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    if (password !== confirm) {
      toast.error("Passwords do not match.")
      return
    }
    setBusy(true)
    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not reset your password.")
      setDone(true)
      toast.success("Password reset. Sign in with your new password.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reset your password.")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="mt-6 rounded-2xl bg-primary/5 p-4 text-sm">
        <p className="font-semibold">Password updated.</p>
        <p className="mt-1 text-muted-foreground">Your old sessions have been signed out.</p>
        <Button asChild className="mt-4">
          <Link href="/admin/login">Go to admin login</Link>
        </Button>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="mt-6 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        This reset link is missing its token. Request a fresh link from the admin login page.
      </div>
    )
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block text-sm">
        <span className="mb-2 block font-semibold">New password</span>
        <input
          type="password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
          autoComplete="new-password"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-2 block font-semibold">Confirm new password</span>
        <input
          type="password"
          minLength={8}
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={inputClass}
          autoComplete="new-password"
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
        {busy ? "Updating…" : "Set new password"}
      </Button>
    </form>
  )
}
