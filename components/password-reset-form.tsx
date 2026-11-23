"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react"

export function PasswordResetForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [complete, setComplete] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError("This reset link is missing. Request a new one.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/account/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || "Could not reset your password.")
      }

      setEmail(data.email || "")
      setComplete(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not reset your password.")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-[28px] border border-[#e5e7eb] bg-white p-7 text-center shadow-[0_24px_70px_-36px_rgba(12,31,29,0.35)] sm:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <AlertCircle size={28} />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-[#0f2b2e]">Invalid reset link</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f7a7d]">
          This link is missing its security token. Please request a fresh password reset email.
        </p>
        <Link
          href="/account/forgot-password"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0c1f1d] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#123b38]"
        >
          Request a New Link <ArrowRight size={17} />
        </Link>
      </div>
    )
  }

  if (complete) {
    return (
      <div className="w-full max-w-md rounded-[28px] border border-[#e5e7eb] bg-white p-7 shadow-[0_24px_70px_-36px_rgba(12,31,29,0.35)] sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0c1f1d]/10 text-[#0c1f1d]">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#0f2b2e]">Password updated</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f7a7d]">
          {email ? `Your password for ${email} has been changed.` : "Your password has been changed."} You have been
          signed out of other sessions.
        </p>

        <div className="mt-7 rounded-xl bg-[#f0fdfa] px-4 py-3 text-xs leading-5 text-[#123b38]">
          Use your new password the next time you sign in.
        </div>

        <Link
          href="/account/login"
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c1f1d] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-[#123b38]"
        >
          Sign In <ArrowRight size={17} />
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-[28px] border border-[#e5e7eb] bg-white p-7 shadow-[0_24px_70px_-36px_rgba(12,31,29,0.35)] sm:p-9">
      <div className="mb-7">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0c1f1d]/10 text-[#0c1f1d]">
          <LockKeyhole size={24} />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0c1f1d]">Choose a new password</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0f2b2e]">Reset your password</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f7a7d]">
          Create a strong password you haven’t used on this account before.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-[#0f2b2e]">
            New password
          </label>
          <div className="relative">
            <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#89a5a4]" size={18} />
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              required
              autoComplete="new-password"
              className="w-full rounded-xl border border-[#d7e5e4] bg-[#fbfdfd] py-3.5 pl-12 pr-12 text-sm text-[#0f2b2e] outline-none transition-colors placeholder:text-[#9ab0b0] focus:border-[#0c1f1d] focus:bg-white focus:ring-4 focus:ring-[#0c1f1d]/10"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#89a5a4] transition-colors hover:bg-[#f0fdfa] hover:text-[#0c1f1d]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-[#0f2b2e]">
            Confirm new password
          </label>
          <div className="relative">
            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-[#89a5a4]" size={18} />
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              required
              autoComplete="new-password"
              className="w-full rounded-xl border border-[#d7e5e4] bg-[#fbfdfd] py-3.5 pl-12 pr-4 text-sm text-[#0f2b2e] outline-none transition-colors placeholder:text-[#9ab0b0] focus:border-[#0c1f1d] focus:bg-white focus:ring-4 focus:ring-[#0c1f1d]/10"
              placeholder="Repeat your new password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c1f1d] px-6 py-3.5 font-semibold text-white shadow-lg shadow-[#0c1f1d]/20 transition-all hover:bg-[#123b38] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Updating password...
            </>
          ) : (
            <>
              Set New Password <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <div className="mt-7 flex items-start gap-2.5 rounded-xl bg-[#f0fdfa] px-4 py-3 text-xs leading-5 text-[#123b38]">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        <span>For security, changing your password signs you out of all other sessions.</span>
      </div>
    </div>
  )
}
