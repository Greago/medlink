"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  ShoppingCart,
  Truck,
} from "lucide-react"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Badge, Button, EmptyState, PriceTag, ProductCard, SectionHeader, StockBadge } from "@/components/design-system"
import { formatPrice, getDisplayProducts, type CatalogueProduct } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

type DetailTab = "features" | "specifications" | "delivery"

export default function ProductDetailPage() {
  const params = useParams()
  const productId = Array.isArray(params.id) ? params.id[0] : String(params.id ?? "")
  const products = useStore((state) => state.products)
  const activeModule = useStore((state) => state.activeModule)
  const isHydrated = useStore((state) => state.isHydrated)
  const likes = useStore((state) => state.likes)
  const addToCart = useStore((state) => state.addToCart)
  const toggleLike = useStore((state) => state.toggleLike)
  const whatsappNumber = useStore((state) => state.whatsappNumber)
  const deliveryThreshold = useStore((state) => state.deliveryThreshold)

  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<DetailTab>("features")
  const [added, setAdded] = useState(false)

  const moduleInfo = getModule(activeModule)
  const catalogue = useMemo(
    () => getDisplayProducts(activeModule, products, isHydrated),
    [activeModule, products, isHydrated]
  )
  const product = catalogue.find((item) => item.id === productId)
  const related = product
    ? catalogue.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4)
    : []
  const liked = product ? likes.includes(product.id) : false

  useEffect(() => {
    setQuantity(1)
    setActiveTab("features")
    setAdded(false)
  }, [productId])

  const soldOut = product ? !product.inStock || product.stockQuantity === 0 : true

  const handleAdd = () => {
    if (!product || soldOut) return
    void addToCart(product, quantity)
      .then(() => {
        setAdded(true)
        toast.success(`${quantity} × ${product.name} added to cart`)
        window.setTimeout(() => setAdded(false), 2000)
      })
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not add to cart."))
  }

  const handleLike = () => {
    if (!product) return
    void toggleLike(product.id).catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not update saved items.")
    )
  }

  const whatsappHref = () => {
    if (!product) return ""
    const message = encodeURIComponent(
      `Hello, I would like to order:\n\n*${product.name}*\nQuantity: ${quantity}\nUnit price: ${formatPrice(product.price)}\nTotal: ${formatPrice(product.price * quantity)}\n\nPlease confirm availability and delivery options.`
    )
    return `https://wa.me/${whatsappNumber.replace(/\D/g, "") || "254743325746"}?text=${message}`
  }

  const handleShare = async () => {
    if (!product) return
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: product.description, url })
        return
      } catch {
        // User cancelled; fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Product link copied")
    } catch {
      toast.error("Could not copy the link.")
    }
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-background">
        <Navigation />
        <div className="section-shell py-24">
          <EmptyState
            title="Product not found"
            description={`This item is not available in the ${moduleInfo.label.toLowerCase()} catalogue. Use the division switcher to browse the other catalogue.`}
            action={
              <Button asChild variant="primary" size="pill">
                <Link href="/products">Browse {moduleInfo.productLabel.toLowerCase()} <ArrowRight size={16} /></Link>
              </Button>
            }
          />
        </div>
        <Footer />
      </main>
    )
  }

  const details: Array<[string, string | number]> = [
    ["Category", product.category],
    ...(product.brand ? ([["Brand", product.brand]] as Array<[string, string]>) : []),
    ...(product.model ? ([["Model", product.model]] as Array<[string, string]>) : []),
    ...(product.strength ? ([["Strength", product.strength]] as Array<[string, string]>) : []),
    ...(product.dosageForm ? ([["Dosage form", product.dosageForm]] as Array<[string, string]>) : []),
    ...(product.expiryDate ? ([["Expiry date", product.expiryDate]] as Array<[string, string]>) : []),
    ...(product.warranty ? ([["Warranty", product.warranty]] as Array<[string, string]>) : []),
    ...(typeof product.stockQuantity === "number"
      ? ([["Units available", product.stockQuantity]] as Array<[string, number]>)
      : []),
  ]

  return (
    <main className="min-h-screen bg-background pb-24 lg:pb-0">
      <Navigation />

      <div className="border-b border-border bg-card">
        <div className="section-shell flex flex-wrap items-center gap-2 py-4 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">Home</Link>
          <ChevronRight size={13} />
          <Link href="/products" className="hover:text-primary">{moduleInfo.productLabel}</Link>
          <ChevronRight size={13} />
          <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-primary">
            {product.category}
          </Link>
          <ChevronRight size={13} />
          <span className="font-semibold text-ink">{product.name}</span>
          <Link href="/products" className="ml-auto inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            <ArrowLeft size={13} /> Back to catalogue
          </Link>
        </div>
      </div>

      <section className="section-shell py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
          <div>
            <div className="surface-card relative aspect-square overflow-hidden">
              <Image
                src={product.image || "/placeholder.jpg"}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {product.brand && <Badge variant="soft" className="rounded-full px-3 py-1">{product.brand}</Badge>}
                {product.requiresPrescription && <Badge variant="rx" className="rounded-full px-3 py-1">Prescription required</Badge>}
              </div>
              {soldOut && (
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/50">
                  <Badge variant="danger" className="rounded-full px-5 py-2 text-sm">Out of stock</Badge>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <StockBadge product={product} />
              <span>Category: {product.category}</span>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="soft">{moduleInfo.shortLabel}</Badge>
              <StockBadge product={product} />
              {typeof product.rating === "number" && (product.reviewCount || 0) > 0 && (
                <Badge variant="warning">★ {product.rating.toFixed(1)} ({product.reviewCount})</Badge>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{product.name}</h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">{product.description}</p>

            <div className="surface-soft mt-6 p-5">
              <PriceTag product={product} className="[&_span:first-child]:text-3xl" />
              <p className="mt-1 text-xs text-muted-foreground">Prices in Kenyan shillings. Delivery arranged after checkout.</p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold">Quantity</span>
                <div className="flex items-center rounded-xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    aria-label="Decrease quantity"
                    className="flex size-10 items-center justify-center rounded-l-xl hover:bg-muted"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                    aria-label="Quantity"
                    className="h-10 w-14 border-x border-border bg-transparent text-center text-sm font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => current + 1)}
                    aria-label="Increase quantity"
                    className="flex size-10 items-center justify-center rounded-r-xl hover:bg-muted"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  Total: <strong className="text-ink">{formatPrice(product.price * quantity)}</strong>
                </span>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button variant="primary" size="touch" onClick={handleAdd} disabled={soldOut}>
                  {added ? <Check size={18} /> : <ShoppingCart size={18} />}
                  {added ? "Added to cart" : "Add to cart"}
                </Button>
                <Button asChild variant="soft" size="touch">
                  <a href={whatsappHref()} target="_blank" rel="noreferrer">
                    <MessageCircle size={18} /> Ask on WhatsApp
                  </a>
                </Button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outlineSoft" size="touch" onClick={handleLike} aria-pressed={liked}>
                <Heart size={17} className={liked ? "fill-danger text-danger" : ""} />
                {liked ? "Saved" : "Save item"}
              </Button>
              <Button variant="outlineSoft" size="touch" onClick={handleShare}>
                <Share2 size={17} /> Share
              </Button>
              <Button asChild variant="outlineSoft" size="touch">
                <Link href="/inquiry"><FileText size={17} /> Request quote</Link>
              </Button>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
              <Truck size={19} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-muted-foreground">
                {deliveryThreshold > 0
                  ? `Free delivery on orders over ${formatPrice(deliveryThreshold)}. Otherwise delivery is quoted at checkout.`
                  : "Delivery is quoted and confirmed when you place your order."}
              </p>
            </div>
          </div>
        </div>

        <div className="surface-card mt-10 overflow-hidden">
          <div className="flex border-b border-border">
            {([
              ["features", "Features"],
              ["specifications", "Specifications"],
              ["delivery", "Delivery & support"],
            ] as Array<[DetailTab, string]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                aria-pressed={activeTab === key}
                className={`flex-1 px-3 py-4 text-xs font-semibold transition sm:text-sm ${
                  activeTab === key
                    ? "border-b-2 border-primary bg-primary/5 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-7">
            {activeTab === "features" && (
              product.features.length > 0 ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-ink-soft">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check size={12} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No additional features listed for this item.</p>
              )
            )}

            {activeTab === "specifications" && (
              details.length > 0 ? (
                <dl className="grid gap-3 sm:grid-cols-2">
                  {details.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 rounded-xl bg-muted/60 px-4 py-3 text-sm">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-right font-semibold text-ink">{value}</dd>
                    </div>
                  ))}
                  {product.specs.map((spec) => (
                    <div key={spec} className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3 text-sm font-medium">
                      <span className="size-1.5 rounded-full bg-primary" /> {spec}
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">No specifications listed for this item.</p>
              )
            )}

            {activeTab === "delivery" && (
              <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                <p>
                  We arrange delivery across Kenya and East Africa. Timelines depend on your location and the items
                  ordered; contact our team for a firm estimate before placing bulk orders.
                </p>
                <p>
                  {deliveryThreshold > 0
                    ? `Orders above ${formatPrice(deliveryThreshold)} qualify for free delivery.`
                    : "Delivery charges are confirmed with your order quote."}
                  {product.warranty ? ` Warranty: ${product.warranty}.` : ""}
                </p>
                <p>
                  Need a formal quote or assistance choosing the right item?{" "}
                  <Link href="/inquiry" className="font-semibold text-primary hover:underline">Contact our sales team</Link>.
                </p>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <SectionHeader
              eyebrow="You may also need"
              title={`More from ${product.category}`}
              action={
                <Button asChild variant="soft" size="touch">
                  <Link href={`/products?category=${encodeURIComponent(product.category)}`}>View category <ArrowRight size={16} /></Link>
                </Button>
              }
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  liked={likes.includes(item.id)}
                  onAdd={(value) => void addToCart(value).catch(() => toast.error("Could not add to cart."))}
                  onLike={() => void toggleLike(item.id)}
                />
              ))}
            </div>
          </section>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 backdrop-blur-lg lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-muted-foreground">{formatPrice(product.price * quantity)} total</p>
            <p className="truncate text-xs font-semibold">{product.name}</p>
          </div>
          <Button asChild variant="outlineSoft" size="icon">
            <a href={whatsappHref()} target="_blank" rel="noreferrer" aria-label="Ask on WhatsApp">
              <MessageCircle size={18} />
            </a>
          </Button>
          <Button variant="primary" size="touch" onClick={handleAdd} disabled={soldOut}>
            <ShoppingCart size={17} /> {soldOut ? "Unavailable" : "Add to cart"}
          </Button>
        </div>
      </div>

      <Footer />
    </main>
  )
}
