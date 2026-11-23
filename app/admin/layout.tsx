"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { AdminHeader } from "@/components/admin/header"
import { AdminSidebar } from "@/components/admin/sidebar"
import { useStore } from "@/lib/store"

const PUBLIC_ADMIN_ROUTES = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoggedIn = useStore((state) => state.isLoggedIn)
  const adminChecked = useStore((state) => state.adminChecked)
  const adminMustChangePassword = useStore((state) => state.adminMustChangePassword)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (PUBLIC_ADMIN_ROUTES.includes(pathname)) {
    return <>{children}</>
  }

  if (!adminChecked) {
    return <AdminLoading label="Checking session…" />
  }

  if (!isLoggedIn) {
    return <RedirectToLogin />
  }

  if (adminMustChangePassword && pathname !== "/admin/force-password-change") {
    return <RedirectTo to="/admin/force-password-change" label="Password change required…" />
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

function AdminLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={18} className="animate-spin text-primary" />
        {label}
      </div>
    </div>
  )
}

function RedirectToLogin() {
  return <RedirectTo to="/admin/login" label="Redirecting to login…" />
}

function RedirectTo({ to, label }: { to: string; label: string }) {
  const router = useRouter()

  useEffect(() => {
    router.push(to)
  }, [router, to])

  return <AdminLoading label={label} />
}
