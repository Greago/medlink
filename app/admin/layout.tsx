"use client"

import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/header"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoggedIn = useStore((s) => s.isLoggedIn)

  // Don't wrap the login page with the dashboard shell
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    // Use a small client component to redirect
    return <RedirectToLogin />
  }

  return (
    <div className="flex h-screen bg-[#f0fdfb]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-auto bg-[#f7fffe]">{children}</main>
      </div>
    </div>
  )
}

function RedirectToLogin() {
  const router = useRouter()
  router.push("/admin/login")
  return (
    <div className="flex items-center justify-center h-screen bg-[#f0fdfb]">
      <div className="text-[#5f7a7d]">Redirecting to login...</div>
    </div>
  )
}
