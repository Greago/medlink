"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BookOpen,
  Briefcase,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Newspaper,
  Package,
  Pill,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  UserRound,
  UserRoundCog,
  Users,
  Wallet,
  X,
} from "lucide-react"
import { Button } from "@/components/design-system"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { getModule } from "@/lib/modules/registry"
import type { AppModule } from "@/lib/modules/types"
import { hasPermission, type Permission } from "@/lib/roles"
import { useStore } from "@/lib/store"

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  permission?: Permission
  module?: AppModule
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/account", label: "My account", icon: UserRound },
    ],
  },
  {
    label: "Point of sale",
    items: [
      { href: "/admin/pos", label: "New sale", icon: Store, permission: "pos.access" },
      { href: "/admin/pos/shifts", label: "Tills & shifts", icon: CreditCard, permission: "pos.shift.manage" },
      { href: "/admin/pos/sales", label: "Sales & documents", icon: ReceiptText, permission: "sales.read.own" },
      { href: "/admin/pharmacy/batches", label: "Pharmacy batches", icon: Pill, permission: "stock.manage", module: "pharmacy" },
      { href: "/admin/pharmacy/dispensing", label: "Dispensing register", icon: ClipboardList, permission: "sales.read.own", module: "pharmacy" },
      { href: "/admin/medical/warranties", label: "Serials & warranties", icon: ShieldCheck, permission: "sales.read.own", module: "medical" },
    ],
  },
  {
    label: "Team",
    items: [
      { href: "/admin/staff", label: "Staff & logins", icon: Users, permission: "staff.manage" },
      { href: "/admin/roles", label: "Roles & capabilities", icon: ShieldCheck, permission: "staff.manage" },
      { href: "/admin/agents", label: "Agents", icon: UserRoundCog, permission: "agents.manage" },
      { href: "/admin/commissions", label: "Commissions", icon: Wallet, permission: "commission.manage" },
    ],
  },
  {
    label: "Recruitment",
    items: [
      { href: "/admin/recruitment", label: "Overview", icon: LayoutDashboard, permission: "recruitment.read" },
      { href: "/admin/recruitment/jobs", label: "Jobs", icon: Briefcase, permission: "recruitment.read" },
      { href: "/admin/recruitment/applicants", label: "Applicants", icon: Users, permission: "recruitment.read" },
      { href: "/admin/recruitment/interviews", label: "Interviews", icon: CalendarClock, permission: "recruitment.read" },
      { href: "/admin/recruitment/settings", label: "Recruitment settings", icon: Settings, permission: "recruitment.manage" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/finance", label: "Finance & ledger", icon: ReceiptText, permission: "finance.read" },
      { href: "/admin/finance/purchases", label: "Suppliers & purchases", icon: FileText, permission: "finance.read" },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: Tags },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/blog", label: "Blog & articles", icon: Newspaper, permission: "blog.manage" },
    ],
  },
  {
    label: "Customer requests",
    items: [
      { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
      { href: "/admin/quotes", label: "Quotes", icon: FileText },
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/admin/bulk-email", label: "Bulk email", icon: Mail },
      { href: "/admin/email-outbox", label: "Email outbox", icon: Mail, permission: "settings.manage" },
      { href: "/admin/profile", label: "Company profile", icon: BookOpen },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const logoutAdmin = useStore((state) => state.logoutAdmin)
  const activeModule = useStore((state) => state.activeModule)
  const adminRole = useStore((state) => state.adminRole)
  const adminModules = useStore((state) => state.adminModules)
  const adminPermissions = useStore((state) => state.adminPermissions)
  const moduleInfo = getModule(activeModule)
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [loggingOut, setLoggingOut] = useState(false)

  const toggle = (label: string) =>
    setCollapsed((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    )

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logoutAdmin()
      router.push("/admin/login")
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
        <Link href="/admin/dashboard" onClick={onNavigate} className="flex items-center">
          <div className="relative h-10 w-36">
            <Image src="/colorlogo.png" alt="Medlink Expedites" fill sizes="144px" className="object-contain object-left" />
          </div>
        </Link>
        {onNavigate && (
          <button type="button" onClick={onNavigate} aria-label="Close navigation" className="rounded-lg p-2 hover:bg-sidebar-accent lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="px-5 pt-4">
        <div className="rounded-2xl bg-primary/10 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Active division</p>
          <p className="mt-0.5 text-sm font-semibold text-primary">{moduleInfo.label}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navGroups.map((group) => {
          const subject = adminRole
            ? { role: adminRole, modules: adminModules, permissions: adminPermissions }
            : null
          const items = group.items.filter((item) => {
            if (item.module && item.module !== activeModule) return false
            if (item.permission && !hasPermission(subject, item.permission)) return false
            return true
          })
          if (!items.length) return null
          const isCollapsed = collapsed.includes(group.label)
          return (
            <div key={group.label} className="mb-2">
              <button
                type="button"
                onClick={() => toggle(group.label)}
                aria-expanded={!isCollapsed}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:bg-sidebar-accent"
              >
                {group.label}
                <ChevronDown size={14} className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
              </button>
              {!isCollapsed && (
                <div className="mt-1 space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <Icon size={18} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <Button
          type="button"
          variant="ghost"
          size="touch"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full justify-start text-muted-foreground hover:text-danger"
        >
          <LogOut size={17} /> {loggingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </div>
  )
}

export function AdminSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <>
      <aside className="hidden w-[252px] shrink-0 border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[86%] p-0 sm:max-w-xs">
          <SheetHeader className="sr-only">
            <SheetTitle>Admin navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => onOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
