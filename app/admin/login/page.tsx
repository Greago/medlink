"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const ADMIN_EMAIL = "admin@medlinkexpedite.co.ke"
const ADMIN_PASSWORD = "@medlinkadmin"

export default function AdminLogin() {
  const router = useRouter()
  const login = useStore((s) => s.login)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    await new Promise((r) => setTimeout(r, 400))

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      login(email)
      router.push("/admin/dashboard")
    } else {
      setError("Invalid email or password. Please try again.")
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(8,25,22,0.24),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(13,149,137,0.18),_transparent_25%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[#081916]/95 shadow-2xl shadow-[#081916]/30 backdrop-blur-xl sm:grid-cols-[1.2fr_0.8fr]">
          <div className="relative px-8 py-10 sm:px-12 sm:py-16">
            
              <Image
                src="/logo.png"
                alt="Medlink Logo"
                width={156}
                height={356}
                
              />
            

            <div className="mt-10 space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0d9589]/80">Secure sign in</p>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Access your admin dashboard</h1>
                <p className="max-w-xl text-base leading-7 text-slate-300">
                  Sign in with your team credentials to manage Medlink inventory, inquiries, quotes, and settings.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-[#0d9589]/20 bg-[#081916]/95 p-6 shadow-lg shadow-[#081916]/20 sm:p-8">
                <div className="space-y-4 text-sm text-slate-300">
                  <div className="rounded-3xl border border-[#0d9589]/20 bg-[#0d9589]/10 p-4">
                    <p className="font-semibold text-slate-100">Simple, secure admin access</p>
                    <p className="mt-2 text-slate-400">Login once to access your Medlink dashboard and handle requests efficiently.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-[#081916]/90 p-4 text-slate-300">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#0d9589]/80">Confident</p>
                      <p className="mt-2 text-sm text-white">Built for secure team operations.</p>
                    </div>
                    <div className="rounded-3xl bg-[#081916]/90 p-4 text-slate-300">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#0d9589]/80">Clear</p>
                      <p className="mt-2 text-sm text-white">Minimal login flow with strong branding.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-20 top-10 hidden h-52 w-52 rounded-full bg-gradient-to-br from-[#081916]/20 to-[#0d9589]/15 blur-3xl sm:block" />
          </div>

          <div className="flex items-center justify-center bg-slate-950/95 px-8 py-10 sm:px-12 sm:py-16">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#0d9589]/90">Admin login</p>
                <h2 className="mt-3 text-3xl font-bold text-white">Welcome back</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Enter your credentials to access the Medlink admin dashboard.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <label htmlFor="email" className="text-sm font-medium text-slate-200">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin"
                    className="bg-slate-900/90 text-white"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="password" className="text-sm font-medium text-slate-200">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="bg-slate-900/90 text-white pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:text-white"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-[#0d9589] hover:bg-[#0b7f79]" size="lg">
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-8 text-center text-sm text-slate-500">
                <Link href="/" className="font-medium text-[#0d9589] transition hover:text-[#0b7f79]">
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
