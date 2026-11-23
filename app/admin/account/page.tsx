"use client"

import { useEffect, useState } from "react"
import type React from "react"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2, Save, ShieldCheck, UserRound } from "lucide-react"
import { Button, Card, SectionHeader } from "@/components/design-system"
import { useStore } from "@/lib/store"

export default function AdminAccountPage() {
  const adminEmail = useStore((state) => state.adminEmail)
  const adminName = useStore((state) => state.adminName)
  const updateAdminProfile = useStore((state) => state.updateAdminProfile)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(adminName)
    setEmail(adminEmail)
  }, [adminName, adminEmail])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match.")
      return
    }
    if (newPassword && !currentPassword) {
      toast.error("Enter your current password before setting a new one.")
      return
    }

    setSaving(true)
    try {
      await updateAdminProfile({
        name,
        email,
        ...(newPassword ? { currentPassword, newPassword } : {}),
      })
      toast.success(newPassword ? "Profile and password updated." : "Profile updated.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not update your profile.")
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"

  return (
    <div className="space-y-6 p-4 lg:p-7">
      <SectionHeader
        eyebrow="Workspace"
        title="My account"
        description="Update your administrator name, email address and password. Credentials can only be changed here."
      />

      <Card className="mx-auto max-w-3xl gap-0 p-5 lg:p-7">
        <form onSubmit={handleSubmit} className="space-y-7">
          <div className="flex items-center gap-3 border-b border-border pb-5">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound size={23} />
            </span>
            <div>
              <p className="font-bold">Administrator profile</p>
              <p className="text-xs text-muted-foreground">These details are used for your admin session.</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Full name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={120}
                required
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                required
                className={inputClass}
              />
            </label>
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              <h2 className="font-bold">Change password</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Leave these fields blank to keep your current password.</p>

            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold">Current password</span>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">New password</span>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">Confirm new password</span>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setShowPasswords((visible) => !visible)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPasswords ? "Hide passwords" : "Show passwords"}
            </button>
          </div>

          <div className="flex justify-end border-t border-border pt-5">
            <Button type="submit" variant="primary" size="touch" disabled={saving}>
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
