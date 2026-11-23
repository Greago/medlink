"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Menu, MessageSquare, UserRound } from "lucide-react"
import { ModuleSwitcher } from "@/components/module-switcher"
import { Badge, Button } from "@/components/design-system"
import { useStore } from "@/lib/store"

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/account": "My account",
  "/admin/roles": "Roles & capabilities",
  "/admin/products": "Products",
  "/admin/categories": "Categories",
  "/admin/inquiries": "Inquiries",
  "/admin/quotes": "Quotes",
  "/admin/orders": "Orders",
  "/admin/bulk-email": "Bulk email",
  "/admin/profile": "Company profile",
  "/admin/settings": "Settings",
  "/admin/recruitment": "Recruitment overview",
  "/admin/recruitment/jobs": "Jobs",
  "/admin/recruitment/jobs/new": "New job",
  "/admin/recruitment/applicants": "Applicants",
  "/admin/recruitment/interviews": "Interviews",
  "/admin/recruitment/settings": "Recruitment settings",
}

function titleFor(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith("/admin/recruitment/applicants/")) return "Applicant profile"
  if (pathname.startsWith("/admin/recruitment/jobs/")) return "Edit job"
  return "Dashboard"
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()
  const adminEmail = useStore((state) => state.adminEmail)
  const adminName = useStore((state) => state.adminName)
  const inquiries = useStore((state) => state.inquiries)
  const title = titleFor(pathname)
  const firstName = adminName?.trim().split(/\s+/)[0] || "Administrator"
  const newInquiries = inquiries.filter((item) => item.status === "New").length

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-xl">
      <div className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-3 lg:px-7">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onMenuClick}
          aria-label="Open admin navigation"
          className="lg:hidden"
        >
          <Menu size={20} />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold">{title}</h2>
            <Badge variant="soft" className="hidden sm:inline-flex">Admin</Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {greeting()}, {firstName} · {adminEmail || "Administrator"}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ModuleSwitcher variant="admin" showCompare={false} />
          <Button asChild variant="ghost" size="icon-sm" className="relative" aria-label="New inquiries">
            <Link href="/admin/inquiries">
              <MessageSquare size={18} />
              {newInquiries > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                  {newInquiries}
                </span>
              )}
            </Link>
          </Button>
          <Button asChild variant="outlineSoft" size="icon-sm" aria-label="My account">
            <Link href="/admin/account"><UserRound size={18} /></Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
