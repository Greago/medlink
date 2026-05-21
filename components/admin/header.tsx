"use client"

import { usePathname } from "next/navigation"
import { Bell, User } from "lucide-react"
import { useStore } from "@/lib/store"

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/products": "Products",
  "/admin/inquiries": "Inquiries",
  "/admin/quotes": "Quotes",
  "/admin/profile": "Company Profile",
}

export function AdminHeader() {
  const pathname = usePathname()
  const adminEmail = useStore((s) => s.adminEmail)
  const title = pageTitles[pathname] || "Dashboard"

  return (
    <header className="bg-white border-b border-[#d1e8e5] px-8 py-4 flex items-center justify-between shrink-0">
      <h2 className="text-xl font-bold text-[#0f2b2e]">{title}</h2>

      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-[#f0fdfa] rounded-lg transition-colors text-[#5f7a7d]">
          <Bell size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f0fdfa] rounded-full flex items-center justify-center">
            <User size={18} className="text-[#0d9488]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#0f2b2e]">{adminEmail || "Admin"}</p>
            <p className="text-xs text-[#5f7a7d]">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  )
}
