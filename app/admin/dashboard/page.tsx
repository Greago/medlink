"use client"

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock,
  FileText,
  Gauge,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Plus,
  Send,
  ShoppingBag,
  Sparkles,
  Tags,
  UserRound,
  Wallet,
} from "lucide-react"
import {
  Badge,
  Button,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  EmptyState,
  SectionHeader,
  StockBadge,
} from "@/components/design-system"
import { formatPrice } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore, type Order, type Quote } from "@/lib/store"

type DashboardTone = "teal" | "accent" | "warning" | "danger" | "ink"

const toneColor: Record<DashboardTone, string> = {
  teal: "#0c1f1d",
  accent: "#18bcaa",
  warning: "#b45309",
  danger: "#b42318",
  ink: "#123b38",
}

const toneSoft: Record<DashboardTone, string> = {
  teal: "rgba(12, 31, 29, 0.09)",
  accent: "rgba(24, 188, 170, 0.14)",
  warning: "rgba(180, 83, 9, 0.11)",
  danger: "rgba(180, 35, 24, 0.11)",
  ink: "rgba(18, 59, 56, 0.11)",
}

const quickActions: {
  href: string
  label: string
  detail: string
  icon: typeof Plus
  tone: DashboardTone
}[] = [
  { href: "/admin/products", label: "Add a product", detail: "Upload a photo and set a KSh price", icon: Plus, tone: "accent" },
  { href: "/admin/categories", label: "Manage categories", detail: "Organise this division's catalogue", icon: Tags, tone: "teal" },
  { href: "/admin/bulk-email", label: "Send bulk email", detail: "Reach customers with one message", icon: Mail, tone: "warning" },
  { href: "/admin/account", label: "Update your account", detail: "Change name, email or password", icon: UserRound, tone: "ink" },
]

const statusVariant: Record<Order["status"], "warning" | "success" | "info" | "danger"> = {
  Pending: "warning",
  Confirmed: "info",
  Completed: "success",
  Cancelled: "danger",
}

const statusColor: Record<Order["status"], string> = {
  Pending: "#b45309",
  Confirmed: "#123b38",
  Completed: "#18bcaa",
  Cancelled: "#b42318",
}

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    return date
  })
}

function countByDay<T>(items: T[], getDate: (item: T) => string, days: Date[]) {
  return days.map((day) => items.filter((item) => new Date(getDate(item)).toDateString() === day.toDateString()).length)
}

function deltaPercent(series: number[]): number | null {
  const previous = series[series.length - 2] ?? 0
  const current = series[series.length - 1] ?? 0
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}

function metricStyle(tone: DashboardTone): CSSProperties {
  return { "--metric": toneColor[tone], "--metric-soft": toneSoft[tone] } as CSSProperties
}

function DashboardMetric({
  label,
  value,
  icon: Icon,
  hint,
  series,
  tone = "teal",
}: {
  label: string
  value: ReactNode
  icon: typeof Package
  hint?: string
  series?: number[]
  tone?: DashboardTone
}) {
  const max = Math.max(1, ...(series ?? []))
  const delta = series ? deltaPercent(series) : null

  return (
    <div className="dashboard-stat surface-card group gap-0 p-5" style={metricStyle(tone)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-ink">{value}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            {delta !== null && (
              <span className={delta >= 0 ? "font-semibold text-success" : "font-semibold text-danger"}>
                {delta >= 0 ? "+" : ""}
                {delta}%
              </span>
            )}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        </div>
        <span className="dashboard-stat-icon flex size-11 shrink-0 items-center justify-center rounded-2xl">
          <Icon size={20} />
        </span>
      </div>

      {series && (
        <div className="mt-4 flex h-9 items-end gap-1" aria-hidden="true">
          {series.map((point, index) => (
            <span
              key={index}
              className="w-full rounded-t-md transition-all duration-500 group-hover:brightness-110"
              style={{
                height: `${Math.max(10, (point / max) * 100)}%`,
                backgroundColor: toneColor[tone],
                opacity: point ? 0.22 + (point / max) * 0.78 : 0.12,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DashboardAlert({
  title,
  value,
  icon: Icon,
  href,
  tone,
}: {
  title: string
  value: ReactNode | number
  icon: typeof Package
  href: string
  tone: "info" | "warning" | "danger" | "success"
}) {
  const alertTone: DashboardTone =
    tone === "info" ? "teal" : tone === "warning" ? "warning" : tone === "danger" ? "danger" : "accent"

  return (
    <Link
      href={href}
      className="dashboard-alert surface-card group flex items-center gap-4 p-4"
      style={metricStyle(alertTone)}
      aria-label={`${title}: ${value}. Open details`}
    >
      <span className="dashboard-alert-icon flex size-11 shrink-0 items-center justify-center rounded-2xl">
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-xl font-bold text-ink">{value}</p>
      </div>
      <ArrowRight
        size={16}
        className="ml-auto shrink-0 transition-transform group-hover:translate-x-0.5"
        style={{ color: toneColor[alertTone] }}
      />
    </Link>
  )
}

function StatusDonut({ totals, total }: { totals: Record<Order["status"], number>; total: number }) {
  const statuses = Object.keys(totals) as Order["status"][]
  let cursor = 0
  const gradient =
    total > 0
      ? `conic-gradient(${statuses
          .map((status) => {
            const share = (totals[status] / total) * 100
            const start = cursor
            cursor += share
            return `${statusColor[status]} ${start}% ${cursor}%`
          })
          .join(", ")})`
      : "conic-gradient(var(--border) 0% 100%)"

  return (
    <div className="relative mx-auto size-40 rounded-full p-3 shadow-[0_16px_40px_-20px_rgba(12,31,29,0.5)]" style={{ background: gradient }}>
      <div className="flex size-full flex-col items-center justify-center rounded-full bg-card text-center shadow-inner">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Total value</span>
        <span className="mt-1 max-w-[7rem] text-sm font-bold text-ink">{formatPrice(total)}</span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { products, inquiries, quotes, sendQuoteEmail } = useStore()
  const adminName = useStore((state) => state.adminName)
  const activeModule = useStore((state) => state.activeModule)
  const moduleInfo = getModule(activeModule)

  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null)
  const [firstName, setFirstName] = useState("Administrator")
  const [categoryCount, setCategoryCount] = useState(0)
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    setFirstName(adminName?.trim().split(/\s+/)[0] || "Administrator")
  }, [adminName])

  useEffect(() => {
    const loadModuleData = async () => {
      try {
        const [categoriesResponse, ordersResponse] = await Promise.all([
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/admin/orders", { cache: "no-store" }),
        ])
        const categoriesData = await categoriesResponse.json()
        if (categoriesResponse.ok && Array.isArray(categoriesData.categories)) {
          setCategoryCount(categoriesData.categories.length)
        }
        const ordersData = await ordersResponse.json()
        if (ordersResponse.ok && Array.isArray(ordersData.orders)) {
          setOrders(ordersData.orders as Order[])
        }
      } catch {
        // Core store data still works if these optional counts fail.
      }
    }
    void loadModuleData()
  }, [activeModule])

  const handleSendQuote = async (quote: Quote) => {
    setSendingQuoteId(quote.id)
    try {
      await sendQuoteEmail(quote.id)
      toast.success(`Quote ${quote.quoteNumber} emailed to ${quote.clientEmail}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not email the quote.")
    } finally {
      setSendingQuoteId(null)
    }
  }

  const newInquiries = inquiries.filter((item) => item.status === "New").length
  const draftQuotes = quotes.filter((item) => item.status === "Draft").length
  const pendingOrders = orders.filter((item) => item.status === "Pending").length
  const lowStock = products.filter(
    (product) =>
      product.inStock &&
      typeof product.stockQuantity === "number" &&
      product.stockQuantity <= (product.lowStockThreshold ?? 5)
  ).length
  const outOfStock = products.filter((product) => !product.inStock || product.stockQuantity === 0).length

  const days = useMemo(() => lastSevenDays(), [])
  const inquirySeries = useMemo(() => countByDay(inquiries, (item) => item.createdAt, days), [inquiries, days])
  const quoteSeries = useMemo(() => countByDay(quotes, (item) => item.createdAt, days), [quotes, days])
  const orderSeries = useMemo(() => countByDay(orders, (item) => item.createdAt, days), [orders, days])
  const chartMax = Math.max(1, ...inquirySeries, ...quoteSeries, ...orderSeries)
  const chartTotal = [...inquirySeries, ...quoteSeries, ...orderSeries].reduce((sum, value) => sum + value, 0)

  const statusTotals = useMemo(() => {
    const totals: Record<Order["status"], number> = {
      Pending: 0,
      Confirmed: 0,
      Completed: 0,
      Cancelled: 0,
    }
    orders.forEach((order) => {
      totals[order.status] += order.total
    })
    return totals
  }, [orders])
  const statusTotal = Object.values(statusTotals).reduce((sum, value) => sum + value, 0)
  const maxStatusTotal = Math.max(1, ...Object.values(statusTotals))

  const today = new Date().toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="admin-dashboard min-h-screen space-y-7 p-4 lg:p-7">
      <section className="dashboard-hero relative overflow-hidden rounded-[28px] px-6 py-8 text-primary-foreground lg:px-9 lg:py-10">
        <div className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full bg-accent/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/4 size-72 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                <Sparkles size={13} /> Workspace overview
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-semibold text-white/70">
                <CalendarDays size={12} /> {today}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Welcome back, {firstName}.</h1>
            <p className="mt-3 text-sm leading-7 text-white/70">
              A clear view of the {moduleInfo.label.toLowerCase()} catalogue, customer requests and orders. Inquiries
              and quotes are shared across both divisions; products, categories and orders follow the active division.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                {moduleInfo.label} division
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                {newInquiries} new inquiries
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                {pendingOrders} pending orders
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto">
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur-sm">
              {[
                { label: "Products", value: products.length },
                { label: "Requests", value: inquiries.length + orders.length },
                { label: "Attention", value: newInquiries + pendingOrders + outOfStock },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white/5 px-3 py-2 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{item.label}</p>
                  <p className="mt-1 text-lg font-bold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="accent" size="touch" className="text-accent-foreground">
                <Link href="/admin/products">
                  <Plus size={17} /> Add product
                </Link>
              </Button>
              <Button
                asChild
                variant="outlineSoft"
                size="touch"
                className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"
              >
                <Link href="/admin/inquiries">
                  Review inquiries <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardMetric label="Products" value={products.length} icon={Package} hint="Active division" tone="accent" />
        <DashboardMetric label="Categories" value={categoryCount} icon={Tags} hint="Active division" tone="ink" />
        <DashboardMetric
          label="Orders"
          value={orders.length}
          icon={ShoppingBag}
          hint="Last 7 days"
          tone="teal"
          series={orderSeries}
        />
        <DashboardMetric
          label="Inquiries"
          value={inquiries.length}
          icon={MessageSquare}
          hint="Last 7 days"
          tone="warning"
          series={inquirySeries}
        />
        <DashboardMetric
          label="Quotes"
          value={quotes.length}
          icon={FileText}
          hint="Last 7 days"
          tone="accent"
          series={quoteSeries}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardAlert title="New inquiries" value={newInquiries} icon={MessageSquare} href="/admin/inquiries" tone="info" />
        <DashboardAlert title="Draft quotes" value={draftQuotes} icon={FileText} href="/admin/quotes" tone="warning" />
        <DashboardAlert title="Pending orders" value={pendingOrders} icon={ShoppingBag} href="/admin/orders" tone="warning" />
        <DashboardAlert
          title="Low or out of stock"
          value={lowStock + outOfStock}
          icon={Package}
          href="/admin/products"
          tone={outOfStock > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Card className="dashboard-panel gap-0 overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-accent/12 text-primary">
                <MessageSquare size={18} />
              </span>
              <div>
                <h3 className="text-base font-bold">Recent requests</h3>
                <p className="mt-1 text-xs text-muted-foreground">Create a quote, then email it directly to the customer.</p>
              </div>
            </div>
            <Link href="/admin/inquiries" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>

          {inquiries.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No quote requests yet" description="Customer inquiries will appear here when submitted." />
          ) : (
            <div className="divide-y divide-border/70">
              {inquiries.slice(0, 5).map((inquiry) => {
                const quote = quotes.find((item) => item.inquiryId === inquiry.id)
                const isSending = sendingQuoteId === quote?.id
                const initials = inquiry.companyName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join("")
                  .toUpperCase()

                return (
                  <div key={inquiry.id} className="group flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#123b38] text-xs font-bold text-white shadow-sm">
                      {initials || "IN"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{inquiry.companyName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {inquiry.contactPerson} · {inquiry.products.length} item(s)
                      </p>
                      {quote && (
                        <p className="mt-1 text-xs font-semibold text-success">
                          {quote.quoteNumber} · {formatPrice(quote.totalPrice)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden text-right sm:block">
                        <Badge variant={inquiry.status === "New" ? "info" : inquiry.status === "Quoted" ? "success" : "soft"}>
                          {inquiry.status}
                        </Badge>
                        <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                          <Clock size={11} /> {new Date(inquiry.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {quote ? (
                        <Button variant="soft" size="sm" onClick={() => void handleSendQuote(quote)} disabled={isSending}>
                          {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                          {isSending ? "Sending…" : quote.status === "Sent" ? "Resend" : "Send email"}
                        </Button>
                      ) : (
                        <Button asChild variant="outlineSoft" size="sm">
                          <Link
                            href={`/admin/quotes?inquiryId=${encodeURIComponent(inquiry.id)}&company=${encodeURIComponent(inquiry.companyName)}`}
                          >
                            <FileText size={13} /> Create quote
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="dashboard-panel gap-0 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Activity size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold">Activity pulse</h3>
                  <p className="text-xs text-muted-foreground">Created in the last 7 days</p>
                </div>
              </div>
              <Badge variant="soft">{chartTotal} events</Badge>
            </div>

            <div className="relative flex h-40 items-end gap-2 rounded-2xl border border-border/70 bg-white/60 p-3">
              <div className="dashboard-chart-grid pointer-events-none absolute inset-3" />
              {days.map((day, index) => (
                <div key={day.toISOString()} className="relative flex h-full flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-full w-full items-end justify-center gap-1">
                    <div
                      title={`${inquirySeries[index]} inquiries`}
                      className="w-1/3 rounded-t-md bg-primary shadow-sm transition-all duration-500 hover:opacity-80"
                      style={{ height: `${Math.max(3, (inquirySeries[index] / chartMax) * 100)}%` }}
                    />
                    <div
                      title={`${quoteSeries[index]} quotes`}
                      className="w-1/3 rounded-t-md bg-warning shadow-sm transition-all duration-500 hover:opacity-80"
                      style={{ height: `${Math.max(3, (quoteSeries[index] / chartMax) * 100)}%` }}
                    />
                    <div
                      title={`${orderSeries[index]} orders`}
                      className="w-1/3 rounded-t-md bg-accent shadow-sm transition-all duration-500 hover:opacity-80"
                      style={{ height: `${Math.max(3, (orderSeries[index] / chartMax) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {day.toLocaleDateString("en-KE", { weekday: "short" })}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 border-t border-border/70 pt-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" /> Inquiries
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-warning" /> Quotes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-accent" /> Orders
              </span>
            </div>
          </Card>

          <Card className="dashboard-panel gap-0 p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-accent/12 text-primary">
                <Wallet size={18} />
              </span>
              <div>
                <h3 className="text-base font-bold">Order value by status</h3>
                <p className="mt-1 text-xs text-muted-foreground">Current division, in KSh</p>
              </div>
            </div>

            <div className="mt-5">
              <StatusDonut totals={statusTotals} total={statusTotal} />
            </div>

            <div className="mt-5 space-y-3">
              {(Object.keys(statusTotals) as Order["status"][]).map((status) => (
                <div key={status}>
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="size-2 rounded-full" style={{ backgroundColor: statusColor[status] }} />
                      {status}
                    </span>
                    <span className="text-muted-foreground">{formatPrice(statusTotals[status])}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(2, (statusTotals[status] / maxStatusTotal) * 100)}%`,
                        backgroundColor: statusColor[status],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="dashboard-panel gap-0 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingBag size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold">Recent orders</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Latest orders in the {moduleInfo.shortLabel.toLowerCase()} division.
              </p>
            </div>
          </div>
          <Link href="/admin/orders" className="text-xs font-semibold text-primary hover:underline">
            View all orders
          </Link>
        </div>
        {orders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No orders yet" description="Customer orders in this division will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableHead>Order</DataTableHead>
                  <DataTableHead>Customer</DataTableHead>
                  <DataTableHead>Items</DataTableHead>
                  <DataTableHead>Total</DataTableHead>
                  <DataTableHead>Status</DataTableHead>
                  <DataTableHead>Date</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {orders.slice(0, 5).map((order) => (
                  <DataTableRow key={order.id} className="transition-colors hover:bg-accent/5">
                    <DataTableCell className="font-semibold">{order.orderNumber}</DataTableCell>
                    <DataTableCell>
                      <span className="block truncate">{order.customerName}</span>
                      <span className="block truncate text-xs text-muted-foreground">{order.customerEmail}</span>
                    </DataTableCell>
                    <DataTableCell>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</DataTableCell>
                    <DataTableCell className="font-semibold">{formatPrice(order.total)}</DataTableCell>
                    <DataTableCell>
                      <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                    </DataTableCell>
                    <DataTableCell className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="dashboard-panel gap-0 p-5">
          <SectionHeader eyebrow="Shortcuts" title="Quick actions" className="mb-4" />
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-accent/8"
                  style={metricStyle(action.tone)}
                >
                  <span className="dashboard-stat-icon flex size-9 items-center justify-center rounded-xl">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{action.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{action.detail}</span>
                  </span>
                  <ArrowRight
                    size={15}
                    className="text-muted-foreground transition group-hover:translate-x-0.5"
                    style={{ color: toneColor[action.tone] }}
                  />
                </Link>
              )
            })}
          </div>
        </Card>

        <Card className="dashboard-panel gap-0 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-accent/12 text-primary">
                <Gauge size={18} />
              </span>
              <div>
                <h3 className="text-base font-bold">Catalogue snapshot</h3>
                <p className="mt-1 text-xs text-muted-foreground">Latest items in this division.</p>
              </div>
            </div>
            <Link href="/admin/products" className="text-xs font-semibold text-primary hover:underline">
              Manage products
            </Link>
          </div>
          {products.length === 0 ? (
            <EmptyState icon={Package} title="No products added yet" description="Head to Products to add your first item." />
          ) : (
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {products.slice(0, 4).map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${encodeURIComponent(product.id)}`}
                  className="group flex items-center gap-3 rounded-xl border border-border/80 bg-white/70 p-3 transition hover:border-accent/50 hover:shadow-sm"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-soft">
                    <Image src={product.image || "/placeholder.jpg"} alt="" fill sizes="56px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{product.category}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-primary">{formatPrice(product.price)}</p>
                      <StockBadge product={product} className="hidden sm:inline-flex" />
                    </div>
                  </div>
                  <ArrowUpRight size={15} className="shrink-0 text-muted-foreground group-hover:text-primary" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
