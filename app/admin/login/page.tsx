"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useStore } from "@/lib/store"

const ADMIN_EMAIL = "admin@medlink.com"
const ADMIN_PASSWORD = "admin123"

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
      setError("Invalid email or password. Try admin@medlink.com / admin123")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0f2b2e] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-[#0d9488] opacity-[0.06] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#0891b2] opacity-[0.04] rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#132628] rounded-2xl border border-[#1f4244] shadow-2xl p-8">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-[#0d9488] rounded-xl flex items-center justify-center text-white shadow-lg">
              <span className="text-2xl font-bold">ML</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2 text-center">Admin Portal</h1>
          <p className="text-[#7faaa8] text-center mb-8">Manage your medical equipment business</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-semibold text-white mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a3335] border border-[#1f4244] rounded-lg text-white placeholder-[#5f7a7d] focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all"
                placeholder="admin@medlink.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a3335] border border-[#1f4244] rounded-lg text-white placeholder-[#5f7a7d] focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7faaa8] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0d9488] text-white py-3.5 rounded-lg font-semibold hover:bg-[#0f766e] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-[#1a3335] border border-[#1f4244] rounded-lg text-sm">
            <p className="font-semibold mb-1 text-white">Demo Credentials</p>
            <p className="text-[#7faaa8]">Email: admin@medlink.com</p>
            <p className="text-[#7faaa8]">Password: admin123</p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-[#2dd4bf] hover:text-[#0d9488] transition-colors text-sm font-medium">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
