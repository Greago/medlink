"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ChevronDown, Loader2, Package, Search, ShoppingBag } from "lucide-react"
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionHeader,
  StatCard,
  TableSkeleton,
} from "@/components/design-system"
import { formatPrice } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore, type Order } from "@/lib/store"

const statuses: Order["status"][] = ["Pending", "Confirmed", "Completed", "Cancelled"]
const PAGE_SIZE = 10

const statusVariant: Record<Order["status"], "warning" | "info" | "success" | "danger"> = {
  Pending: "warning",
  Confirmed: "info",
  Completed: "success",
  Cancelled: "danger",
}

export default function AdminOrdersPage() {
  const activeModule = useStore((state) => state.activeModule)
  const moduleInfo = getModule(activeModule)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<Order["status"] | "All">("All")
  const [page, setPage] = useState(1)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load orders.")
      const data = (await response.json()) as { orders: Order[] }
      setOrders(data.orders)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Could not load orders."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [activeModule])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const updateStatus = async (order: Order, nextStatus: Order["status"]) => {
    setUpdatingId(order.id)
    setError(null)
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status: nextStatus }),
      })
      const data = (await response.json()) as { order?: Order; error?: string }
      if (!response.ok || !data.order) throw new Error(data.error || "Could not update the order.")
      setOrders((current) => current.map((item) => (item.id === order.id ? data.order! : item)))
      toast.success(`${order.orderNumber} marked ${nextStatus.toLowerCase()}`)
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Could not update the order."
      setError(message)
      toast.error(message)
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return orders
      .filter((order) => {
        const matchesStatus = status === "All" || order.status === status
        const matchesQuery =
          !needle ||
          [order.orderNumber, order.customerName, order.customerEmail, ...order.items.map((item) => item.productName)]
            .join(" ")
            .toLowerCase()
            .includes(needle)
        return matchesStatus && matchesQuery
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders, query, status])

  useEffect(() => setPage(1), [query, status, activeModule])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const outstanding = orders.filter((order) => order.status === "Pending" || order.status === "Confirmed")
  const completedValue = orders
    .filter((order) => order.status === "Completed")
    .reduce((total, order) => total + order.total, 0)

  return (
    <div className="space-y-6 p-4 lg:p-7">
      <SectionHeader
        eyebrow={`${moduleInfo.shortLabel} division`}
        title="Orders"
        description={`Review orders placed by customer accounts in the ${moduleInfo.label.toLowerCase()} division.`}
        action={
          <Button variant="outlineSoft" size="touch" onClick={() => void loadOrders()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="All orders" value={orders.length} icon={ShoppingBag} hint="Active division" />
        <StatCard label="To process" value={outstanding.length} icon={Package} hint="Pending + confirmed" />
        <StatCard label="Completed value" value={formatPrice(completedValue)} hint="KSh, active division" />
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <Card className="gap-0 p-4 lg:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order number, customer or product"
              className="h-11 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </div>
          <label className="relative">
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as Order["status"] | "All")}
              className="h-11 appearance-none rounded-xl border border-input bg-background pl-4 pr-10 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            >
              <option value="All">All statuses</option>
              {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </label>
        </div>
      </Card>

      {loading ? (
        <Card className="gap-0 p-5"><TableSkeleton rows={4} columns={4} /></Card>
      ) : orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders yet" description="Customer orders in this division will appear here after checkout." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matching orders" description="Try a different search term or status." action={<Button variant="soft" onClick={() => { setQuery(""); setStatus("All") }}>Clear filters</Button>} />
      ) : (
        <div className="space-y-4">
          {visible.map((order) => (
            <Card key={order.id} className="gap-0 p-5">
              <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{order.orderNumber}</p>
                    <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString("en-KE")} · {order.customerName} · {order.customerEmail}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary">{formatPrice(order.total)}</span>
                  <label className="relative">
                    <span className="sr-only">Update status</span>
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(event) => void updateStatus(order, event.target.value as Order["status"])}
                      className="h-10 appearance-none rounded-xl border border-input bg-background pl-3 pr-8 text-xs font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-ring/25 disabled:opacity-60"
                    >
                      {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {updatingId === order.id && <Loader2 size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin" />}
                  </label>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {order.items.map((item) => (
                  <div key={item.productId} className="flex justify-between gap-4 text-sm">
                    <span className="text-ink-soft">{item.quantity} × {item.productName}</span>
                    <span className="font-semibold">{formatPrice(item.total)}</span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <p className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">{order.notes}</p>
              )}
            </Card>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outlineSoft" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <span className="font-semibold text-ink">Page {page} of {pageCount}</span>
              <Button variant="outlineSoft" size="sm" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
