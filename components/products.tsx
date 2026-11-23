"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button, ProductCard, SectionHeader } from "@/components/design-system"
import { getDisplayProducts } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

export function Products() {
  const activeModule = useStore((state) => state.activeModule)
  const products = useStore((state) => state.products)
  const isHydrated = useStore((state) => state.isHydrated)
  const likes = useStore((state) => state.likes)
  const addToCart = useStore((state) => state.addToCart)
  const toggleLike = useStore((state) => state.toggleLike)
  const [selectedCategory, setSelectedCategory] = useState("All")

  const moduleInfo = getModule(activeModule)
  const catalogue = getDisplayProducts(activeModule, products, isHydrated)
  const categories = ["All", ...Array.from(new Set(catalogue.map((product) => product.category))).sort()]
  const visible = (selectedCategory === "All" ? catalogue : catalogue.filter((product) => product.category === selectedCategory))
    .slice()
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
    .slice(0, 8)

  return (
    <section className="section-shell py-16 lg:py-20">
      <SectionHeader
        eyebrow={moduleInfo.eyebrow}
        title={
          <>
            {moduleInfo.featuredLead} <span className="text-primary">{moduleInfo.featuredAccent}</span>
          </>
        }
        description={moduleInfo.featuredDescription}
        action={
          <Button asChild variant="soft" size="touch">
            <Link href="/products">
              View all {moduleInfo.productLabel.toLowerCase()}
              <ArrowRight size={16} />
            </Link>
          </Button>
        }
      />

      {categories.length > 1 && (
        <div className="no-scrollbar mb-8 flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {category === "All" ? "All items" : category}
            </button>
          ))}
        </div>
      )}

      {visible.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              liked={likes.includes(product.id)}
              onAdd={addToCart}
              onLike={() => void toggleLike(product.id)}
              priority={product.id === visible[0]?.id}
            />
          ))}
        </div>
      ) : (
        <p className="surface-card px-6 py-12 text-center text-sm text-muted-foreground">
          No {moduleInfo.itemLabel} in this category yet.
        </p>
      )}
    </section>
  )
}
