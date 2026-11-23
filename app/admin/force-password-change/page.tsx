"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Eye, EyeOff, KeyRound, Loader2, LogOut } from "lucide-react"
import { Button, Card, SectionHeader } from "@/components/design-system"
import type { AdminUser } from "@/lib/store"
import { useStore } from "@/lib/store"

export default function ForcePasswordChangePage() {
  const router = useRouter()
  const hydrateAdmin = useStore((state) => state.hydrateAdmin)
  const logoutAdmin = useStore((state) => state.logoutAdmin)
  const adminEmail = useStore((state) => state.adminEmail)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.")
      return
    }
    if (newPassword.length < 8) {
      toast.error("Use at least 8 characters.")
      return
    }

    setBusy(true)
    try {
      const response = await fetch("/api/admin/password-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = (await response.json().catch(() => ({}))) as { admin?: AdminUser; error?: string }
      if (!response.ok) throw new Error(data.error || "Could not change your password.")
      if (data.admin) hydrateAdmin(data.admin)
      toast.success("Password updated. You can continue.")
      router.push("/admin/dashboard")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not change your password.")
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    await logoutAdmin()
    router.push("/admin/login")
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"

  return (
    <div className="mx-auto max-w-2xl p-4 lg:p-7">
      <SectionHeader
        eyebrow="Security"
        title="Change your temporary password"
        description="Your administrator issued a temporary password. Choose a new one before you can use the admin portal."
      />

      <Card className="gap-0 p-6 lg:p-8">
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-primary/5 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound size={20} />
          </span>
          <div>
            <p className="text-sm font-bold">One-time setup</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Signed in as <strong>{adminEmail}</strong>. Enter the password from your welcome email, then choose a
              new one. Other sessions using the temporary password will be signed out.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <label className="block text-sm">
            <span className="mb-2 block font-semibold">Current / temporary password</span>
            <input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={inputClass}
              autoComplete="current-password"
              required
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-2 block font-semibold">New password</span>
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={inputClass}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block font-semibold">Confirm new password</span>
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={inputClass}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords((current) => !current)}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
            {showPasswords ? "Hide passwords" : "Show passwords"}
          </button>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <Button type="button" variant="ghost" onClick={signOut}>
              <LogOut size={16} /> Sign out
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {busy ? "Updating…" : "Set new password"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
