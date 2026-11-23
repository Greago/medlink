"use client"

import Link from "next/link"
import { ArrowRight, BadgeCheck, FileText, Headset, PackageCheck, Truck } from "lucide-react"
import { Button, CategoryCard, ProductCard, SectionHeader } from "@/components/design-system"
import { CatalogueDownload } from "@/components/catalogue-download"
import { getDisplayProducts } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

function useCatalogue() {
  const activeModule = useStore((state) => state.activeModule)
  const products = useStore((state) => state.products)
  const isHydrated = useStore((state) => state.isHydrated)
  const all = getDisplayProducts(activeModule, products, isHydrated)
  return { activeModule, moduleInfo: getModule(activeModule), all }
}

export function TrustBar() {
  const { all, moduleInfo } = useCatalogue()
  const categories = new Set(all.map((product) => product.category)).size

  const items = [
    { icon: PackageCheck, title: `${all.length} ${moduleInfo.itemLabel}`, note: "Listed in this division" },
    { icon: BadgeCheck, title: "Quality-assured", note: "Sourced from trusted suppliers" },
    { icon: Truck, title: "Nationwide delivery", note: "Across Kenya and East Africa" },
    { icon: Headset, title: "Quote-based support", note: "Bulk and facility requests welcome" },
  ]

  return (
    <section className="border-b border-border bg-card">
      <div className="section-shell grid gap-4 py-7 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <item.icon size={20} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{categories ? item.note : "Catalogue coming soon"}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function CategoryGrid() {
  const { activeModule, moduleInfo, all } = useCatalogue()
  const categories = Array.from(new Set(all.map((product) => product.category))).map((name) => {
    const products = all.filter((product) => product.category === name)
    return {
      name,
      count: products.length,
      image: products.find((product) => product.image && product.image !== "/placeholder.jpg")?.image || products[0]?.image,
    }
  })

  if (categories.length === 0) return null

  return (
    <section className="section-shell py-16 lg:py-20">
      <SectionHeader
        eyebrow="Browse by category"
        title="Find what your facility needs"
        description={`Explore the ${moduleInfo.label.toLowerCase()} catalogue by category. Every listing is scoped to the division you are viewing.`}
        action={
          <Button asChild variant="outlineSoft" size="touch">
            <Link href="/products">
              View all {moduleInfo.productLabel.toLowerCase()}
              <ArrowRight size={16} />
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.slice(0, 8).map((category) => (
          <CategoryCard
            key={category.name}
            name={category.name}
            count={category.count}
            image={category.image}
            href={`/products?category=${encodeURIComponent(category.name)}`}
          />
        ))}
      </div>
      <p className="sr-only">Current division: {activeModule}</p>
    </section>
  )
}

export function OfferStrip() {
  const { all, moduleInfo } = useCatalogue()
  const likes = useStore((state) => state.likes)
  const addToCart = useStore((state) => state.addToCart)
  const toggleLike = useStore((state) => state.toggleLike)
  const offers = all
    .filter((product) => product.compareAtPrice && product.compareAtPrice > product.price)
    .slice(0, 4)

  if (offers.length === 0) return null

  return (
    <section className="bg-surface-soft/70 py-16 lg:py-20">
      <div className="section-shell">
        <SectionHeader
          eyebrow="Current offers"
          title="Better value this week"
          description="Discounted items from the live catalogue, priced in KSh. Offers apply while stock lasts."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {offers.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              liked={likes.includes(product.id)}
              onAdd={addToCart}
              onLike={() => void toggleLike(product.id)}
            />
          ))}
        </div>
        <p className="sr-only">{moduleInfo.label} offers</p>
      </div>
    </section>
  )
}

export function BrandStrip() {
  const { all } = useCatalogue()
  const brands = Array.from(
    new Set(all.map((product) => product.brand?.trim()).filter((brand): brand is string => Boolean(brand)))
  )

  if (brands.length === 0) return null

  return (
    <section className="section-shell py-14">
      <SectionHeader eyebrow="Brands we supply" title="Trusted names, one reliable supplier" />
      <div className="flex flex-wrap gap-3">
        {brands.map((brand) => (
          <span key={brand} className="surface-card px-5 py-3 text-sm font-semibold text-ink-soft">
            {brand}
          </span>
        ))}
      </div>
    </section>
  )
}

export function ModuleCTA() {
  const { moduleInfo } = useCatalogue()
  const isPharmacy = moduleInfo.id === "pharmacy"

  return (
    <section className="section-shell pb-4 pt-10 lg:pb-8">
      <div className="relative overflow-hidden rounded-[32px] bg-primary px-6 py-12 text-primary-foreground sm:px-10 lg:px-14 lg:py-16">
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {isPharmacy ? "Pharmacy supply" : "Medical equipment supply"}
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl">
              {isPharmacy
                ? "Stock your pharmacy with quality-assured medicines and supplies."
                : "Equip your facility with reliable medical equipment."}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-primary-foreground/70">
              {isPharmacy
                ? "Tell us what you need and our team will prepare a quote with clear KSh pricing and delivery options."
                : "Share your requirements for a tailored quote, from single devices to complete facility packages."}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild variant="accent" size="pill" className="text-accent-foreground">
              <Link href="/inquiry">
                <FileText size={18} />
                Request a quote
                <ArrowRight size={16} />
              </Link>
            </Button>
            <CatalogueDownload
              variant="outlineSoft"
              size="pill"
              triggerClassName="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
