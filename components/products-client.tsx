"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowRight,
  Check,
  ChevronDown,
  Grid3X3,
  Heart,
  LayoutList,
  MessageCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { CatalogueDownload } from "@/components/catalogue-download"
import { Badge, Button, EmptyState, Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle, PriceTag, ProductCard, StockBadge } from "@/components/design-system"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { formatPrice, getDisplayProducts, type CatalogueProduct } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

type SortOption = "name" | "price-low" | "price-high" | "featured"

export function ProductsClient() {
  const searchParams = useSearchParams()
  const products = useStore((state) => state.products)
  const activeModule = useStore((state) => state.activeModule)
  const isHydrated = useStore((state) => state.isHydrated)
  const likes = useStore((state) => state.likes)
  const addToCart = useStore((state) => state.addToCart)
  const toggleLike = useStore((state) => state.toggleLike)
  const whatsappNumber = useStore((state) => state.whatsappNumber)

  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("featured")
  const [inStockOnly, setInStockOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [quickViewProduct, setQuickViewProduct] = useState<CatalogueProduct | null>(null)
  const [visibleCount, setVisibleCount] = useState(12)

  const moduleInfo = getModule(activeModule)
  const catalogue = useMemo(
    () => getDisplayProducts(activeModule, products, isHydrated),
    [activeModule, products, isHydrated]
  )
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(catalogue.map((product) => product.category))).sort()],
    [catalogue]
  )

  useEffect(() => {
    const categoryParam = searchParams.get("category") || "All"
    const queryParam = searchParams.get("q") || ""
    setSelectedCategory(categories.includes(categoryParam) ? categoryParam : "All")
    setSearchQuery(queryParam)
    setVisibleCount(12)
    setQuickViewProduct(null)
  }, [activeModule, categories, searchParams])

  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase()
    return catalogue
      .filter((product) => {
        const matchesCategory = selectedCategory === "All" || product.category === selectedCategory
        const matchesSearch =
          !needle ||
          [product.name, product.category, product.description, product.brand || ""].some((value) =>
            value.toLowerCase().includes(needle)
          )
        const matchesStock = !inStockOnly || (!product.inStock ? false : product.stockQuantity !== 0)
        return matchesCategory && matchesSearch && matchesStock
      })
      .sort((a, b) => {
        if (sortBy === "price-low") return a.price - b.price
        if (sortBy === "price-high") return b.price - a.price
        if (sortBy === "name") return a.name.localeCompare(b.name)
        return Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.name.localeCompare(b.name)
      })
  }, [catalogue, inStockOnly, searchQuery, selectedCategory, sortBy])

  const visible = filtered.slice(0, visibleCount)
  const activeFilterCount =
    (selectedCategory !== "All" ? 1 : 0) + (searchQuery ? 1 : 0) + (inStockOnly ? 1 : 0)

  const whatsappHref = (product: CatalogueProduct) => {
    const message = encodeURIComponent(
      `Hello, I am interested in:\n\n*${product.name}*\nCategory: ${product.category}\nPrice: ${formatPrice(product.price)}\n\nPlease share availability and delivery options.`
    )
    return `https://wa.me/${whatsappNumber.replace(/\D/g, "") || "254743325746"}?text=${message}`
  }

  const handleAdd = (product: CatalogueProduct) => {
    void addToCart(product)
      .then(() => toast.success(`${product.name} added to cart`))
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not add to cart."))
  }

  const handleLike = (product: CatalogueProduct) => {
    void toggleLike(product.id)
      .then(() => toast.success(likes.includes(product.id) ? "Removed from saved items" : "Saved for later"))
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not update saved items."))
  }

  const resetFilters = () => {
    setSelectedCategory("All")
    setSearchQuery("")
    setInStockOnly(false)
    setSortBy("featured")
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-70" />
        <div className="section-shell relative py-12 lg:py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold">
                <span className="size-1.5 rounded-full bg-accent" />
                {moduleInfo.eyebrow}
              </span>
              <h1 className="mt-5 text-4xl font-bold text-white sm:text-5xl">
                {moduleInfo.productLabel} <span className="text-accent">catalogue</span>
              </h1>
              <p className="mt-4 text-sm leading-7 text-primary-foreground/70 sm:text-base">{moduleInfo.catalogueIntro}</p>
            </div>
            <CatalogueDownload
              variant="outlineSoft"
              size="pill"
              triggerClassName="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"
            />
          </div>
        </div>
      </section>

      <section className="section-shell py-10 lg:py-12">
        <div className="surface-card mb-6 p-4 lg:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={`Search ${moduleInfo.itemLabel}, categories or brands`}
                className="h-11 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <span className="sr-only">Category</span>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="h-11 appearance-none rounded-xl border border-input bg-background pl-4 pr-10 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === "All" ? "All categories" : category}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </label>

              <label className="relative">
                <span className="sr-only">Sort products</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="h-11 appearance-none rounded-xl border border-input bg-background pl-4 pr-10 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
                >
                  <option value="featured">Featured first</option>
                  <option value="name">Name: A–Z</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </label>

              <Button
                type="button"
                variant={showFilters ? "primary" : "outlineSoft"}
                size="touch"
                onClick={() => setShowFilters((open) => !open)}
                aria-expanded={showFilters}
                className="px-3"
              >
                <SlidersHorizontal size={17} />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[10px]">{activeFilterCount}</span>
                )}
              </Button>

              <div className="flex rounded-xl border border-border bg-muted/60 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  className={`flex size-9 items-center justify-center rounded-lg transition ${viewMode === "grid" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
                >
                  <Grid3X3 size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  className={`flex size-9 items-center justify-center rounded-lg transition ${viewMode === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
                >
                  <LayoutList size={17} />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => setInStockOnly(event.target.checked)}
                  className="size-4 rounded border-input accent-[var(--primary)]"
                />
                In stock only
              </label>
              <button type="button" onClick={resetFilters} className="text-left text-xs font-semibold text-primary hover:underline">
                Clear all filters
              </button>
            </div>
          )}
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            Showing <strong className="text-ink">{visible.length}</strong> of {filtered.length} {moduleInfo.itemLabel}
          </span>
          {selectedCategory !== "All" && (
            <button onClick={() => setSelectedCategory("All")} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
              {selectedCategory} <X size={12} />
            </button>
          )}
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
              “{searchQuery}” <X size={12} />
            </button>
          )}
          {inStockOnly && (
            <button onClick={() => setInStockOnly(false)} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
              In stock <X size={12} />
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title="No matching items"
            description="Try a different search term, category or filter. You can also request a quote for a specific item."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="soft" onClick={resetFilters}>Reset filters</Button>
                <Button asChild variant="outlineSoft">
                  <Link href="/inquiry">Request a quote <ArrowRight size={16} /></Link>
                </Button>
              </div>
            }
          />
        ) : viewMode === "grid" ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                liked={likes.includes(product.id)}
                onAdd={handleAdd}
                onLike={() => handleLike(product)}
                onQuickView={() => setQuickViewProduct(product)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((product) => (
              <article key={product.id} className="surface-card flex flex-col gap-5 p-4 sm:flex-row">
                <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-2xl bg-surface-soft sm:h-auto sm:w-56">
                  <Image src={product.image || "/placeholder.jpg"} alt={product.name} fill sizes="224px" className="object-cover" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{product.brand || product.category}</span>
                      <StockBadge product={product} />
                      {product.requiresPrescription && <Badge variant="rx">Rx</Badge>}
                    </div>
                    <Link href={`/products/${product.id}`} className="mt-2 block text-lg font-semibold hover:text-primary">
                      {product.name}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
                    {product.specs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {product.specs.slice(0, 3).map((spec) => (
                          <span key={spec} className="rounded-lg bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{spec}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
                    <PriceTag product={product} />
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="icon" onClick={() => handleLike(product)} aria-label={likes.includes(product.id) ? "Remove from saved" : "Save item"}>
                        <Heart size={17} className={likes.includes(product.id) ? "fill-danger text-danger" : ""} />
                      </Button>
                      <Button variant="outlineSoft" size="touch" onClick={() => handleAdd(product)}>
                        Add to cart
                      </Button>
                      <Button asChild variant="primary" size="touch">
                        <Link href={`/products/${product.id}`}>View details</Link>
                      </Button>
                      <Button asChild variant="soft" size="touch">
                        <a href={whatsappHref(product)} target="_blank" rel="noreferrer">
                          <MessageCircle size={16} /> WhatsApp
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {visibleCount < filtered.length && (
          <div className="mt-8 flex justify-center">
            <Button variant="outlineSoft" size="pill" onClick={() => setVisibleCount((count) => count + 12)}>
              Load more items <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </section>

      <Modal open={Boolean(quickViewProduct)} onOpenChange={(open) => !open && setQuickViewProduct(null)}>
        <ModalContent className="max-w-4xl gap-0 p-0">
          {quickViewProduct && (
            <div className="grid max-h-[88vh] overflow-y-auto md:grid-cols-2">
              <div className="relative min-h-64 bg-surface-soft md:min-h-[420px]">
                <Image src={quickViewProduct.image || "/placeholder.jpg"} alt={quickViewProduct.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
              <div className="p-6 sm:p-8">
                <ModalHeader className="mb-4 p-0 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="soft">{quickViewProduct.category}</Badge>
                    <StockBadge product={quickViewProduct} />
                  </div>
                  <ModalTitle className="text-2xl">{quickViewProduct.name}</ModalTitle>
                  <ModalDescription className="line-clamp-3">{quickViewProduct.description}</ModalDescription>
                </ModalHeader>
                <PriceTag product={quickViewProduct} className="mb-5" />
                {quickViewProduct.specs.length > 0 && (
                  <div className="mb-6">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Key specifications</p>
                    <div className="flex flex-wrap gap-1.5">
                      {quickViewProduct.specs.map((spec) => (
                        <span key={spec} className="rounded-lg bg-muted px-2.5 py-1 text-xs">{spec}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button variant="primary" size="touch" onClick={() => handleAdd(quickViewProduct)}>
                    <Check size={16} /> Add to cart
                  </Button>
                  <Button asChild variant="outlineSoft" size="touch">
                    <Link href={`/products/${quickViewProduct.id}`}>View full details <ArrowRight size={16} /></Link>
                  </Button>
                  <Button asChild variant="soft" size="touch">
                    <a href={whatsappHref(quickViewProduct)} target="_blank" rel="noreferrer">
                      <MessageCircle size={16} /> Ask on WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>

      <Footer />
    </main>
  )
}
