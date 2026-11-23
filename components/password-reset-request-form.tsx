"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail, MailCheck } from "lucide-react"

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch("/api/account/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || "Could not send the reset email.")
      }

      setSent(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not send the reset email.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md rounded-[28px] border border-[#e5e7eb] bg-white p-7 shadow-[0_24px_70px_-36px_rgba(12,31,29,0.35)] sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0c1f1d]/10 text-[#0c1f1d]">
          <MailCheck size={28} />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#0f2b2e]">Check your inbox</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f7a7d]">
          If an account exists for <span className="font-semibold text-[#0f2b2e]">{email}</span>, we’ve sent a password
          reset link. The link expires in 1 hour.
        </p>

        <div className="mt-7 rounded-xl bg-[#f0fdfa] px-4 py-3 text-xs leading-5 text-[#123b38]">
          Didn’t receive it? Check your spam folder, or request another link after a few minutes.
        </div>

        <Link
          href="/account/login"
          className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#0c1f1d] hover:underline"
        >
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-[28px] border border-[#e5e7eb] bg-white p-7 shadow-[0_24px_70px_-36px_rgba(12,31,29,0.35)] sm:p-9">
      <div className="mb-7">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0c1f1d]/10 text-[#0c1f1d]">
          <MailCheck size={24} />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0c1f1d]">Account recovery</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0f2b2e]">Forgot your password?</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f7a7d]">
          Enter your email and we’ll send you a secure link to reset it.
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
          <label htmlFor="reset-email" className="mb-2 block text-sm font-semibold text-[#0f2b2e]">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#89a5a4]" size={18} />
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-[#d7e5e4] bg-[#fbfdfd] py-3.5 pl-12 pr-4 text-sm text-[#0f2b2e] outline-none transition-colors placeholder:text-[#9ab0b0] focus:border-[#0c1f1d] focus:bg-white focus:ring-4 focus:ring-[#0c1f1d]/10"
              placeholder="you@company.com"
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
              <Loader2 size={18} className="animate-spin" /> Sending link...
            </>
          ) : (
            <>
              Send Reset Link <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <Link
        href="/account/login"
        className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#0c1f1d] hover:underline"
      >
        <ArrowLeft size={16} /> Back to sign in
      </Link>

      <div className="mt-7 flex items-start gap-2.5 rounded-xl bg-[#f0fdfa] px-4 py-3 text-xs leading-5 text-[#123b38]">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        <span>For security, we’ll only send a link if the email matches an existing account.</span>
      </div>
    </div>
  )
}
