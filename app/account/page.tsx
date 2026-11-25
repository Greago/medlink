"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, LogOut, Package, UserRound } from "lucide-react"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { useStore } from "@/lib/store"

export default function AccountPage() {
  const currentUser = useStore((state) => state.currentUser)
  const accountChecked = useStore((state) => state.accountChecked)
  const logoutAccount = useStore((state) => state.logoutAccount)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    setLoggingOut(true)
    setError(null)
    try {
      await logoutAccount()
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Could not sign out.")
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <Navigation />

      <section className="cool-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white">My Account</h1>
          <p className="mt-3 text-white/75">Manage your Medlink account and order history.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {!accountChecked ? (
            <div className="rounded-3xl border border-gray-100 bg-white py-16 text-center text-[#5f7a7d]">
              Loading account...
            </div>
          ) : !currentUser ? (
            <div className="rounded-3xl border border-gray-100 bg-white py-16 text-center">
              <UserRound className="mx-auto mb-5 text-[#0c1f1d]" size={36} />
              <h2 className="text-2xl font-bold text-gray-900">Sign in to your account</h2>
              <p className="mt-3 text-[#5f7a7d]">You need an account to view your previous orders.</p>
              <Link
                href="/account/login"
                className="mt-8 inline-block rounded-xl bg-[#0c1f1d] px-6 py-3 font-semibold text-white hover:bg-[#123b38]"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="rounded-3xl border border-gray-100 bg-white p-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0c1f1d]/10 text-[#0c1f1d]">
                    <UserRound size={26} />
                  </div>
                  <div>
                    <p className="text-sm text-[#5f7a7d]">Signed in as</p>
                    <p className="text-xl font-bold text-[#0f2b2e]">{currentUser.name}</p>
                    <p className="text-sm text-[#5f7a7d]">{currentUser.email}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Link
                  href="/orders"
                  className="rounded-2xl border border-gray-100 bg-white p-6 transition-colors hover:border-[#99f6e4]"
                >
                  <Package size={24} className="mb-3 text-[#0c1f1d]" />
                  <h2 className="font-bold text-[#0f2b2e]">Order history</h2>
                  <p className="mt-1 text-sm text-[#5f7a7d]">See everything you ordered before.</p>
                </Link>

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center rounded-2xl border border-gray-100 bg-white p-6 text-left transition-colors hover:border-red-200 disabled:opacity-60"
                >
                  <div>
                    <LogOut size={24} className="mb-3 text-red-500" />
                    <h2 className="font-bold text-[#0f2b2e]">
                      {loggingOut ? "Signing out..." : "Sign out"}
                    </h2>
                    <p className="mt-1 text-sm text-[#5f7a7d]">End your session on this device.</p>
                  </div>
                  {loggingOut && <Loader2 size={18} className="ml-auto animate-spin text-[#0c1f1d]" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
