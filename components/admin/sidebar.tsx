"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Package, FileText, MessageSquare, LogOut, BookOpen, Settings } from "lucide-react"
import { useStore } from "@/lib/store"

const menuItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
  { href: "/admin/profile", label: "Company Profile", icon: BookOpen },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    router.push("/admin/login")
  }

  return (
    <aside className="w-64 bg-white border-r border-[#d1e8e5] flex flex-col shrink-0">
      <div className="p-6 border-b border-[#d1e8e5]">
        <Link href="/admin/dashboard" className="flex justify-center">
          <div className="w-full max-w-[140px]">
            <Image
              src="/colorlogo.png"
              alt="Medlink Logo"
              width={140}
              height={140}
              className="w-full h-auto object-contain"
            />
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                isActive
                  ? "bg-[#0d9488] text-white"
                  : "text-[#5f7a7d] hover:bg-[#f0fdfa] hover:text-[#0f2b2e]"
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#d1e8e5]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[#5f7a7d] hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
