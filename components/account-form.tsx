"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react"
import { useStore } from "@/lib/store"

export function AccountForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter()
  const loginAccount = useStore((state) => state.loginAccount)
  const registerAccount = useStore((state) => state.registerAccount)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === "register") {
        await registerAccount(name, email, password)
      } else {
        await loginAccount(email, password)
      }
      router.push("/orders")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not continue. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const isRegister = mode === "register"

  return (
    <div className="w-full max-w-md rounded-[28px] border border-[#e5e7eb] bg-white p-7 shadow-[0_24px_70px_-36px_rgba(12,31,29,0.35)] sm:p-9">
      <div className="mb-7">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0c1f1d]/10 text-[#0c1f1d]">
          <ShieldCheck size={24} />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0c1f1d]">
          {isRegister ? "Create your account" : "Welcome back"}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">
          {isRegister ? "Join Medlink" : "Sign in to your account"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#6b7280]">
          {isRegister
            ? "Create an account to save your order history and review it any time."
            : "Your orders are waiting. Sign in to review everything you have purchased."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isRegister && (
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-semibold text-[#111827]">
              Full name
            </label>
            <div className="relative">
              <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={18} />
              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={120}
                required
                autoComplete="name"
                className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] py-3.5 pl-12 pr-4 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#0c1f1d] focus:bg-white focus:ring-4 focus:ring-[#0c1f1d]/10"
                placeholder="Your full name"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#111827]">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={18} />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] py-3.5 pl-12 pr-4 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#0c1f1d] focus:bg-white focus:ring-4 focus:ring-[#0c1f1d]/10"
              placeholder="you@company.com"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="password" className="block text-sm font-semibold text-[#111827]">
              Password
            </label>
            {!isRegister && (
              <Link
                href="/account/forgot-password"
                className="text-xs font-semibold text-[#0c1f1d] hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={18} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={isRegister ? 8 : 1}
              maxLength={128}
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] py-3.5 pl-12 pr-12 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#0c1f1d] focus:bg-white focus:ring-4 focus:ring-[#0c1f1d]/10"
              placeholder={isRegister ? "At least 8 characters" : "Enter your password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#0c1f1d]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c1f1d] px-6 py-3.5 font-semibold text-white shadow-lg shadow-[#0c1f1d]/20 transition-all hover:bg-[#123b38] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {isRegister ? "Creating account..." : "Signing you in..."}
            </>
          ) : (
            <>
              {isRegister ? "Create Account" : "Sign In"}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <div className="my-7 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#e5e7eb]" />
        <span className="text-xs font-medium uppercase tracking-wide text-[#9ca3af]">or</span>
        <span className="h-px flex-1 bg-[#e5e7eb]" />
      </div>

      <p className="text-center text-sm text-[#6b7280]">
        {isRegister ? "Already have an account?" : "New to Medlink?"}{" "}
        <Link
          href={isRegister ? "/account/login" : "/account/register"}
          className="font-semibold text-[#0c1f1d] hover:underline"
        >
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>

      <div className="mt-7 flex items-start gap-2.5 rounded-xl bg-[#f3f4f6] px-4 py-3 text-xs leading-5 text-[#123b38]">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        <span>Your session is stored securely and your order history is only visible to you.</span>
      </div>
    </div>
  )
}
