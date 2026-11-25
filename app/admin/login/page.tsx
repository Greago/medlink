"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Package,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react"
import { useStore } from "@/lib/store"

const consoleItems = [
  {
    number: "01",
    icon: Package,
    title: "Catalogue control",
    detail: "Keep products, pricing and stock accurate.",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Request queue",
    detail: "Turn customer inquiries into clear quotes.",
  },
  {
    number: "03",
    icon: ShoppingBag,
    title: "Order oversight",
    detail: "Follow every order from cart to delivery.",
  },
]

export default function AdminLogin() {
  const router = useRouter()
  const loginAdmin = useStore((s) => s.loginAdmin)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const signedIn = await loginAdmin(email, password)
      router.push(signedIn.mustChangePassword ? "/admin/force-password-change" : "/admin/dashboard")
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Invalid email or password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden cool-gradient text-white">

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-3 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Image src="/logo.png" alt="Medlink Logo" width={150} height={60} priority />
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-xs font-semibold text-white/70 transition-colors hover:text-white"
          >
            Back to website
            <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-8 py-4 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10">
          <section className="hidden lg:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#18bcaa]">Operations console / 01</p>
            <h1 className="mt-3 text-[42px] font-semibold leading-[1.03] tracking-tight">
              Every order,
              <br />
              <span className="text-[#18bcaa]">in motion.</span>
            </h1>
            <p className="mt-3 max-w-sm text-[13px] leading-5 text-white/60">
              One secure place to manage the catalogue, answer requests, prepare quotes and follow fulfilment.
            </p>

            <div className="mt-6 space-y-2">
              {consoleItems.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.number}
                    className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 transition-colors hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <span className="text-[11px] font-bold tracking-widest text-white/30">{item.number}</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#18bcaa]/10 text-[#18bcaa]">
                      <Icon size={15} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-xs text-white/45">{item.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-medium text-white/60">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#18bcaa]" />
              All systems operational
            </div>
          </section>

          <section className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 -rotate-2 rounded-[36px] border border-white/10" />
            <div className="absolute -inset-1 rotate-1 rounded-[34px] border border-white/[0.06]" />

            <div className="relative overflow-hidden rounded-[24px] border border-white/15 bg-white text-[#111827] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-[#f9fafb] px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#18bcaa]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
                  <span className="ml-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#6b7280]">Secure access</span>
                </div>
                <KeyRound size={16} className="text-[#0c1f1d]" />
              </div>

              <div className="px-6 py-5 sm:px-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0c1f1d]">Administrator portal</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-[28px]">Sign in to your console.</h2>
                <p className="mt-2 text-[13px] leading-5 text-[#5f7a7d]">Enter your credentials to open the Medlink dashboard.</p>

                <form onSubmit={handleLogin} className="mt-5 space-y-3">
                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
                      <AlertCircle size={15} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="admin-email" className="mb-1.5 block text-[13px] font-semibold text-[#111827]">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={16} />
                      <input
                        id="admin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        maxLength={254}
                        autoComplete="username"
                        placeholder="admin@medlinkexpedite.co.ke"
                        className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] py-2.5 pl-10 pr-3.5 text-[13px] text-[#111827] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#0c1f1d] focus:bg-white focus:ring-4 focus:ring-[#0c1f1d]/10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="admin-password" className="mb-1.5 block text-[13px] font-semibold text-[#111827]">
                      Password
                    </label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={16} />
                      <input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        maxLength={128}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] py-2.5 pl-10 pr-10 text-[13px] text-[#111827] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#0c1f1d] focus:bg-white focus:ring-4 focus:ring-[#0c1f1d]/10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#0c1f1d]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="mt-2 text-right">
                      <Link
                        href="/admin/forgot-password"
                        className="text-[12px] font-semibold text-[#0c1f1d] underline underline-offset-2"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c1f1d] px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-[#0c1f1d]/20 transition-all hover:bg-[#123b38] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Opening console...
                      </>
                    ) : (
                      <>
                        Enter dashboard <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#f3f4f6] px-3 py-2 text-[11px] leading-4 text-[#123b38]">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                  <span>Encrypted session. Update credentials in Admin → My Account.</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#e5e7eb] bg-[#f9fafb] px-5 py-2 text-[10px] font-medium uppercase tracking-wider text-[#6b7280]">
                <span>Encrypted session</span>
                <span>Medlink Expedites</span>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-xl bg-[#18bcaa] px-3 py-2 text-[11px] font-bold text-[#081614] shadow-lg sm:flex">
              <ShieldCheck size={15} /> Authorized access only
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-4 text-[11px] text-white/35">
          <span className="inline-flex items-center gap-2">
            <ArrowLeft size={13} /> Secure administrator sign-in
          </span>
          <span>© Medlink Expedites</span>
        </footer>
      </div>
    </main>
  )
}
