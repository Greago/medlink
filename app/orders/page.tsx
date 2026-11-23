"use client"

import { useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpRight,
  CircleDollarSign,
  Clock3,
  FileQuestion,
  Package,
  ShoppingBag,
} from "lucide-react"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { formatPrice } from "@/lib/catalogue"
import { useStore, type Order } from "@/lib/store"

const statusStyles: Record<Order["status"], string> = {
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Confirmed: "bg-blue-50 text-blue-700 ring-blue-200",
  Completed: "bg-green-50 text-green-700 ring-green-200",
  Cancelled: "bg-red-50 text-red-700 ring-red-200",
}

const statusDots: Record<Order["status"], string> = {
  Pending: "bg-amber-500",
  Confirmed: "bg-blue-500",
  Completed: "bg-green-500",
  Cancelled: "bg-red-500",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function OrdersPage() {
  const currentUser = useStore((state) => state.currentUser)
  const orders = useStore((state) => state.orders)
  const products = useStore((state) => state.products)
  const accountChecked = useStore((state) => state.accountChecked)

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const activeOrders = orders.filter((order) => order.status === "Pending" || order.status === "Confirmed").length
  const totalSpent = orders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + order.total, 0)

  return (
    <main className="min-h-screen bg-[#f6faf9]">
      <Navigation />

      <section className="relative overflow-hidden bg-[#073f42] py-14 text-white sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(45,212,191,0.22),transparent_45%)]" />
        <div className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full border border-white/10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#18bcaa]">Customer Portal</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">My Orders</h1>
              <p className="mt-3 max-w-xl text-white/70">
                {currentUser && orders.length > 0
                  ? `Welcome back, ${currentUser.name.split(" ")[0]}. Here is everything you have ordered from Medlink.`
                  : "Review the equipment you ordered and keep track of every request in one place."}
              </p>
            </div>

            <Link
              href="/products"
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Browse Products <ArrowUpRight size={17} />
            </Link>
          </div>

          {currentUser && (
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-[#18bcaa]">
                  <ShoppingBag size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Total orders</span>
                </div>
                <p className="mt-3 text-3xl font-bold">{orders.length}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-[#18bcaa]">
                  <Clock3 size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wide">In progress</span>
                </div>
                <p className="mt-3 text-3xl font-bold">{activeOrders}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-[#18bcaa]">
                  <CircleDollarSign size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Order value</span>
                </div>
                <p className="mt-3 text-2xl font-bold">{formatPrice(totalSpent)}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
          {!accountChecked ? (
            <div className="rounded-3xl border border-[#e5e7eb] bg-white py-16 text-center text-[#5f7a7d]">
              Loading orders...
            </div>
          ) : !currentUser ? (
            <div className="overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white">
              <div className="mx-auto max-w-xl px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0c1f1d]/10 text-[#0c1f1d]">
                  <FileQuestion size={30} />
                </div>
                <h2 className="mt-6 text-2xl font-bold text-[#0f2b2e]">Sign in to see your orders</h2>
                <p className="mx-auto mt-3 max-w-md text-[#5f7a7d]">
                  Create an account or sign in to review everything you ordered from Medlink.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/account/login"
                    className="rounded-xl bg-[#0c1f1d] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#123b38]"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/account/register"
                    className="rounded-xl border border-[#0c1f1d]/30 px-6 py-3 font-semibold text-[#0c1f1d] transition-colors hover:bg-[#0c1f1d]/5"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white">
              <div className="mx-auto max-w-xl px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0c1f1d]/10 text-[#0c1f1d]">
                  <ShoppingBag size={30} />
                </div>
                <h2 className="mt-6 text-2xl font-bold text-[#0f2b2e]">No orders yet</h2>
                <p className="mx-auto mt-3 max-w-md text-[#5f7a7d]">
                  Add products to your cart and place an order. It will appear here as soon as it is confirmed.
                </p>
                <Link
                  href="/products"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0c1f1d] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#123b38]"
                >
                  Browse Products <ArrowUpRight size={17} />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_16px_50px_-36px_rgba(12,31,29,0.35)]"
                >
                  <div className="flex flex-col gap-4 border-b border-[#eaf2f1] bg-[#fbfdfd] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0c1f1d]/10 text-[#0c1f1d]">
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0c1f1d]">
                          Order number
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-[#0f2b2e]">{order.orderNumber}</h2>
                        <p className="mt-1 text-xs text-[#5f7a7d]">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:justify-end">
                      <span className="text-xs text-[#5f7a7d]">
                        {order.items.length} item{order.items.length === 1 ? "" : "s"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${statusStyles[order.status]}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDots[order.status]}`} />
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="px-6 py-6 sm:px-7">
                    <div className="space-y-4">
                      {order.items.map((item) => {
                        const image = productMap.get(item.productId)?.image || "/placeholder.jpg"
                        return (
                          <div key={item.productId} className="flex items-center gap-4">
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#e2efed] bg-[#f6faf9]">
                              <Image src={image} alt="" fill sizes="56px" className="object-contain p-1.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-[#0f2b2e]">{item.productName}</p>
                              <p className="mt-0.5 text-xs text-[#5f7a7d]">
                                {item.quantity} × {formatPrice(item.unitPrice)}
                              </p>
                            </div>
                            <p className="shrink-0 font-semibold text-[#0f2b2e]">{formatPrice(item.total)}</p>
                          </div>
                        )
                      })}
                    </div>

                    {order.notes && (
                      <p className="mt-6 rounded-xl bg-[#f0fdfa] px-4 py-3 text-sm leading-6 text-[#123b38]">
                        <span className="font-semibold">Note:</span> {order.notes}
                      </p>
                    )}

                    <div className="mt-6 flex flex-col gap-3 border-t border-[#eef4f3] pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-[#5f7a7d]">Placed by {order.customerName}</p>
                      <div className="flex items-center justify-between gap-8 sm:justify-end">
                        <span className="text-sm font-semibold text-[#5f7a7d]">Order total</span>
                        <span className="text-2xl font-bold text-[#0c1f1d]">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#0c1f1d] hover:underline"
              >
                <ArrowLeft size={16} /> Continue shopping
              </Link>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
