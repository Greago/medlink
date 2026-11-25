"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronRight,
  Heart,
  LayoutGrid,
  Menu,
  Package,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react"
import { ModuleSwitcher } from "@/components/module-switcher"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { formatPrice, getSeedProductsForModule, type CatalogueProduct } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

function useDebounced<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function SearchBox({ products, onNavigate }: { products: CatalogueProduct[]; onNavigate?: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounced(query.trim(), 180)

  const suggestions = useMemo(() => {
    if (debouncedQuery.length < 2) return []
    const needle = debouncedQuery.toLowerCase()
    return products
      .filter((product) =>
        [product.name, product.category, product.brand || ""].some((value) =>
          value.toLowerCase().includes(needle)
        )
      )
      .slice(0, 6)
  }, [debouncedQuery, products])

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setFocused(false)
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!query.trim()) return
    setFocused(false)
    onNavigate?.()
    router.push(`/products?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={submit} role="search">
        <label htmlFor="storefront-search" className="sr-only">
          Search the catalogue
        </label>
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id="storefront-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setFocused(false)
          }}
          placeholder="Search products, categories or brands"
          className="h-11 w-full rounded-full border border-input bg-muted/50 pl-11 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:ring-2 focus:ring-ring/20"
        />
      </form>

      {focused && debouncedQuery.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)] animate-fade-in">
          {suggestions.length > 0 ? (
            <>
              {suggestions.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  onClick={() => {
                    setFocused(false)
                    onNavigate?.()
                  }}
                  className="flex items-center gap-3 border-b border-border/70 px-4 py-3 transition-colors last:border-0 hover:bg-muted/60"
                >
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <Image src={product.image || "/placeholder.jpg"} alt="" fill sizes="40px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-primary">{formatPrice(product.price)}</span>
                </Link>
              ))}
              <button
                type="button"
                onClick={submit as unknown as () => void}
                className="w-full bg-muted/50 px-4 py-3 text-left text-xs font-semibold text-primary hover:bg-muted"
              >
                See all results for “{query}” →
              </button>
            </>
          ) : (
            <p className="px-4 py-5 text-sm text-muted-foreground">No matching catalogue items yet.</p>
          )}
        </div>
      )}
    </div>
  )
}

export function Navigation() {
  const pathname = usePathname()
  const activeModule = useStore((state) => state.activeModule)
  const products = useStore((state) => state.products)
  const isHydrated = useStore((state) => state.isHydrated)
  const deliveryThreshold = useStore((state) => state.deliveryThreshold)
  const cartCount = useStore((state) => state.cart.reduce((total, item) => total + item.quantity, 0))
  const likesCount = useStore((state) => state.likes.length)
  const currentUser = useStore((state) => state.currentUser)
  const [menuOpen, setMenuOpen] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)
  const megaRef = useRef<HTMLDivElement>(null)
  const moduleInfo = getModule(activeModule)

  const allProducts: CatalogueProduct[] =
    isHydrated && products.length > 0 ? products : getSeedProductsForModule(activeModule)
  const categories = useMemo(
    () => Array.from(new Set(allProducts.map((product) => product.category))).sort(),
    [allProducts]
  )

  useEffect(() => {
    setMenuOpen(false)
    setMegaOpen(false)
  }, [pathname, activeModule])

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (megaRef.current && !megaRef.current.contains(event.target as Node)) setMegaOpen(false)
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMegaOpen(false)
    }
    document.addEventListener("mousedown", handleOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  const links = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Shop" },
    { href: "/inquiry", label: "Quotes" },
    { href: "/careers", label: "Careers" },
    { href: "/blog", label: "Insights" },
    { href: "/contact", label: "Contact" },
  ]

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-primary text-primary-foreground">
        <div className="section-shell flex min-h-9 items-center justify-center gap-2 py-1.5 text-center text-[11px] font-medium sm:text-xs">
          {deliveryThreshold > 0 ? (
            <span>Nationwide delivery in Kenya · Free delivery on orders over {formatPrice(deliveryThreshold)}</span>
          ) : (
            <span>Nationwide delivery for hospitals, clinics and pharmacies across Kenya</span>
          )}
        </div>
      </div>

      <div className="border-b border-border/70 bg-card/95 backdrop-blur-xl">
        <div className="section-shell flex h-[72px] items-center gap-3 lg:gap-5">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open navigation menu"
                className="focus-ring tap-target flex items-center justify-center rounded-xl text-foreground lg:hidden"
              >
                <Menu size={22} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88%] p-0 sm:max-w-sm">
              <SheetHeader className="border-b border-border p-5">
                <SheetTitle className="text-lg">Medlink Expedite</SheetTitle>
                <p className="text-xs text-muted-foreground">{moduleInfo.label} division</p>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <SearchBox products={allProducts} onNavigate={() => setMenuOpen(false)} />
                <ModuleSwitcher showCompare={false} />
                <nav className="space-y-1">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex min-h-11 items-center justify-between rounded-xl px-4 text-sm font-semibold ${
                        pathname === link.href ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      }`}
                    >
                      {link.label}
                      <ChevronRight size={15} />
                    </Link>
                  ))}
                </nav>
                <div>
                  <p className="eyebrow mb-2">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Link
                        key={category}
                        href={`/products?category=${encodeURIComponent(category)}`}
                        onClick={() => setMenuOpen(false)}
                        className="rounded-full bg-muted px-3 py-2 text-xs font-medium hover:bg-primary/10 hover:text-primary"
                      >
                        {category}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-border p-4">
                <Link href="/account" onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1 rounded-xl p-2 text-[11px] font-medium hover:bg-muted">
                  <UserRound size={18} /> Account
                </Link>
                <Link href="/likes" onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1 rounded-xl p-2 text-[11px] font-medium hover:bg-muted">
                  <Heart size={18} /> Saved
                </Link>
                <Link href="/cart" onClick={() => setMenuOpen(false)} className="flex flex-col items-center gap-1 rounded-xl p-2 text-[11px] font-medium hover:bg-muted">
                  <ShoppingCart size={18} /> Cart
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex shrink-0 items-center" aria-label="Medlink Expedite home">
            <div className="relative h-11 w-[118px] sm:w-[138px]">
              <Image
                src="/colorlogo.png"
                alt="Medlink Expedites"
                fill
                priority
                sizes="138px"
                className="object-contain object-left"
              />
            </div>
          </Link>

          <div className="hidden flex-1 justify-center lg:flex">
            <div className="w-full max-w-md">
              <SearchBox products={allProducts} />
            </div>
          </div>

          <div className="ml-auto hidden items-center gap-1 xl:flex">
            <ModuleSwitcher />
          </div>

          <div className="ml-auto flex items-center gap-0.5 xl:ml-0">
            {currentUser ? (
              <Link href="/orders" aria-label="My orders" className="focus-ring tap-target hidden items-center justify-center rounded-xl text-foreground hover:bg-muted sm:flex">
                <Package size={19} />
              </Link>
            ) : null}
            <Link
              href={currentUser ? "/account" : "/account/login"}
              aria-label={currentUser ? "My account" : "Sign in"}
              className="focus-ring tap-target hidden items-center justify-center rounded-xl text-foreground hover:bg-muted sm:flex"
            >
              <UserRound size={19} />
            </Link>
            <Link href="/likes" aria-label={`Saved items, ${likesCount}`} className="focus-ring tap-target relative flex items-center justify-center rounded-xl text-foreground hover:bg-muted">
              <Heart size={19} className={likesCount > 0 ? "fill-danger text-danger" : ""} />
              {likesCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                  {likesCount}
                </span>
              )}
            </Link>
            <Link href="/cart" aria-label={`Cart, ${cartCount} items`} className="focus-ring tap-target relative flex items-center justify-center rounded-xl text-foreground hover:bg-muted">
              <ShoppingCart size={19} />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        <div className="hidden h-11 border-t border-border/60 bg-card/70 lg:block">
          <div className="section-shell flex h-full items-center gap-1">
            <div ref={megaRef} className="relative h-full">
              <button
                type="button"
                onClick={() => setMegaOpen((open) => !open)}
                aria-expanded={megaOpen}
                className="focus-ring flex h-full items-center gap-2 rounded-lg px-3 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <LayoutGrid size={15} className="text-primary" />
                Shop by category
              </button>
              {megaOpen && (
                <div className="absolute left-0 top-full z-50 w-[640px] rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-lift)] animate-fade-in">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="eyebrow">Browse {moduleInfo.label}</p>
                    <button type="button" onClick={() => setMegaOpen(false)} aria-label="Close categories" className="rounded-lg p-1.5 hover:bg-muted">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((category) => {
                      const count = allProducts.filter((product) => product.category === category).length
                      return (
                        <Link
                          key={category}
                          href={`/products?category=${encodeURIComponent(category)}`}
                          onClick={() => setMegaOpen(false)}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          <span className="truncate">{category}</span>
                          <span className="ml-2 text-[11px] text-muted-foreground">{count}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex h-full items-center border-b-2 px-3 text-xs font-semibold transition-colors ${
                  pathname === link.href
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="ml-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
              {categories.slice(0, 5).map((category) => (
                <Link
                  key={category}
                  href={`/products?category=${encodeURIComponent(category)}`}
                  className="whitespace-nowrap px-2 text-[11px] font-medium text-muted-foreground hover:text-primary"
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
