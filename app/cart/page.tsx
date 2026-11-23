"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Loader2,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react"
import { Button, EmptyState, Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle, PriceTag } from "@/components/design-system"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { formatPrice } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

export default function CartPage() {
  const router = useRouter()
  const cart = useStore((state) => state.cart)
  const currentUser = useStore((state) => state.currentUser)
  const activeModule = useStore((state) => state.activeModule)
  const whatsappNumber = useStore((state) => state.whatsappNumber)
  const deliveryThreshold = useStore((state) => state.deliveryThreshold)
  const updateCartQuantity = useStore((state) => state.updateCartQuantity)
  const removeFromCart = useStore((state) => state.removeFromCart)
  const clearCart = useStore((state) => state.clearCart)
  const placeOrder = useStore((state) => state.placeOrder)

  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0)
  const subtotal = cart.reduce((total, item) => total + item.product.price * item.quantity, 0)
  const savings = cart.reduce(
    (total, item) =>
      total + (item.product.compareAtPrice && item.product.compareAtPrice > item.product.price
        ? (item.product.compareAtPrice - item.product.price) * item.quantity
        : 0),
    0
  )
  const moduleInfo = getModule(activeModule)

  const whatsappMessage = encodeURIComponent(
    `Hello, I would like to order from the ${moduleInfo.label} division:\n\n${cart
      .map((item) => `• ${item.product.name} × ${item.quantity} — ${formatPrice(item.product.price * item.quantity)}`)
      .join("\n")}\n\nEstimated total: ${formatPrice(subtotal)}\n\nPlease confirm availability and delivery options.`
  )

  const handlePlaceOrder = async () => {
    setPlacingOrder(true)
    setOrderError(null)
    try {
      await placeOrder()
      toast.success("Order placed")
      router.push("/orders")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not place the order."
      setOrderError(message)
      toast.error(message)
    } finally {
      setPlacingOrder(false)
    }
  }

  return (
    <main className="min-h-screen bg-background pb-24 lg:pb-0">
      <Navigation />

      <section className="border-b border-border bg-card">
        <div className="section-shell py-8 lg:py-10">
          <p className="eyebrow">{moduleInfo.shortLabel} division</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Your cart</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {itemCount === 0
              ? "No items yet. Browse the catalogue to get started."
              : `${itemCount} item${itemCount === 1 ? "" : "s"} from the ${moduleInfo.label.toLowerCase()} catalogue.`}
          </p>
        </div>
      </section>

      <section className="section-shell py-8 lg:py-12">
        {cart.length === 0 ? (
          <EmptyState
            title="Your cart is empty"
            description="Browse the catalogue and add the items you need. Your cart is tied to the division you are viewing."
            action={
              <Button asChild variant="primary" size="pill">
                <Link href="/products">Browse {moduleInfo.productLabel.toLowerCase()} <ArrowRight size={16} /></Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
            <div className="space-y-4">
              {cart.map((item) => (
                <article key={item.product.id} className="surface-card flex flex-col gap-4 p-4 sm:flex-row">
                  <Link
                    href={`/products/${item.product.id}`}
                    className="relative h-36 w-full shrink-0 overflow-hidden rounded-2xl bg-surface-soft sm:h-32 sm:w-40"
                  >
                    <Image
                      src={item.product.image || "/placeholder.jpg"}
                      alt={item.product.name}
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                          {item.product.brand || item.product.category}
                        </p>
                        <Link href={`/products/${item.product.id}`} className="mt-1 block truncate text-base font-semibold hover:text-primary">
                          {item.product.name}
                        </Link>
                        <PriceTag product={item.product} className="mt-1 text-xs" />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          void removeFromCart(item.product.id)
                          toast.success("Item removed")
                        }}
                        aria-label={`Remove ${item.product.name}`}
                        className="text-muted-foreground hover:text-danger"
                      >
                        <Trash2 size={17} />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <div className="flex items-center rounded-xl border border-border bg-card">
                        <button
                          type="button"
                          onClick={() => void updateCartQuantity(item.product.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="flex size-10 items-center justify-center rounded-l-xl hover:bg-muted"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => void updateCartQuantity(item.product.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="flex size-10 items-center justify-center rounded-r-xl hover:bg-muted"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <span className="text-lg font-bold text-ink">{formatPrice(item.product.price * item.quantity)}</span>
                    </div>
                  </div>
                </article>
              ))}

              <Link href="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                <ArrowLeft size={16} /> Continue shopping
              </Link>
            </div>

            <aside className="surface-card sticky top-24 p-5 lg:p-6">
              <h2 className="text-lg font-bold">Order summary</h2>
              <div className="mt-5 space-y-3 border-b border-border pb-5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Items ({itemCount})</span>
                  <span className="font-semibold text-ink">{formatPrice(subtotal + savings)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discounts</span>
                    <span className="font-semibold">−{formatPrice(savings)}</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3 text-muted-foreground">
                  <span className="flex items-center gap-2"><Truck size={15} /> Delivery</span>
                  <span className="text-right text-xs">
                    {deliveryThreshold > 0 && subtotal >= deliveryThreshold
                      ? "Free"
                      : "Quoted at checkout"}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-baseline justify-between">
                <span className="text-sm font-semibold">Estimated total</span>
                <span className="text-2xl font-bold text-primary">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Prices in Kenyan shillings. Delivery is confirmed before fulfilment.
              </p>

              {orderError && (
                <p className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">{orderError}</p>
              )}

              <div className="mt-5 space-y-2">
                {currentUser ? (
                  <Button variant="primary" size="touch" className="w-full" onClick={handlePlaceOrder} disabled={placingOrder}>
                    {placingOrder ? <Loader2 size={18} className="animate-spin" /> : <PackageCheck size={18} />}
                    {placingOrder ? "Placing order…" : "Place order"}
                  </Button>
                ) : (
                  <Button asChild variant="primary" size="touch" className="w-full">
                    <Link href="/account/login?next=/cart">Sign in to place order</Link>
                  </Button>
                )}
                <Button asChild variant="soft" size="touch" className="w-full">
                  <a href={`https://wa.me/${whatsappNumber.replace(/\D/g, "") || "254743325746"}?text=${whatsappMessage}`} target="_blank" rel="noreferrer">
                    <MessageCircle size={17} /> Send cart on WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outlineSoft" size="touch" className="w-full">
                  <Link href="/inquiry"><FileText size={17} /> Request a formal quote</Link>
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="w-full pt-2 text-xs font-medium text-muted-foreground hover:text-danger"
                >
                  Clear cart
                </button>
              </div>
            </aside>
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 backdrop-blur-lg lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">{itemCount} items</p>
            <p className="truncate text-sm font-bold">{formatPrice(subtotal)}</p>
          </div>
          {currentUser ? (
            <Button variant="primary" size="touch" onClick={handlePlaceOrder} disabled={placingOrder || cart.length === 0}>
              {placingOrder ? <Loader2 size={17} className="animate-spin" /> : <PackageCheck size={17} />}
              Place order
            </Button>
          ) : (
            <Button asChild variant="primary" size="touch">
              <Link href="/account/login?next=/cart">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      <Modal open={confirmClear} onOpenChange={setConfirmClear}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Clear this cart?</ModalTitle>
            <ModalDescription>All items in the current {moduleInfo.shortLabel.toLowerCase()} cart will be removed.</ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outlineSoft" onClick={() => setConfirmClear(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                void clearCart()
                setConfirmClear(false)
                toast.success("Cart cleared")
              }}
            >
              Clear cart
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Footer />
    </main>
  )
}
