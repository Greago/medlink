"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, ShoppingCart } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { formatPrice, getSeedProductsForModule, type CatalogueProduct } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

export default function LikesPage() {
  const likes = useStore((state) => state.likes)
  const products = useStore((state) => state.products)
  const activeModule = useStore((state) => state.activeModule)
  const isHydrated = useStore((state) => state.isHydrated)
  const toggleLike = useStore((state) => state.toggleLike)
  const addToCart = useStore((state) => state.addToCart)

  const moduleInfo = getModule(activeModule)
  const allProducts: CatalogueProduct[] =
    isHydrated && products.length > 0 ? products : getSeedProductsForModule(activeModule)
  const savedProducts = likes
    .map((id) => allProducts.find((product) => product.id === id))
    .filter((product): product is CatalogueProduct => Boolean(product))

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <Navigation />

      <section className="cool-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white">Saved Items</h1>
          <p className="mt-3 text-white/75">
            {moduleInfo.label} division ·{" "}
            {savedProducts.length === 0
              ? "Items you save will appear here."
              : `${savedProducts.length} saved item${savedProducts.length === 1 ? "" : "s"}.`}
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {savedProducts.length === 0 ? (
            <div className="rounded-3xl border border-gray-100 bg-white py-20 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
                <Heart className="text-rose-500" size={28} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Nothing saved yet</h2>
              <p className="mx-auto mt-3 max-w-md text-gray-500">
                Tap the heart on any product to keep it here for later. Saved items stay with your session across visits.
              </p>
              <Link
                href="/products"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0c1f1d] px-6 py-3 font-semibold text-white hover:bg-[#123b38]"
              >
                Browse {moduleInfo.productLabel}
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {savedProducts.map((product) => (
                <div key={product.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                  <Link href={`/products/${product.id}`} className="relative block h-52 overflow-hidden bg-gray-50">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </Link>
                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0c1f1d]">{product.category}</p>
                    <Link
                      href={`/products/${product.id}`}
                      className="mt-1 block font-bold text-gray-900 hover:text-[#0c1f1d]"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-2 text-lg font-bold text-[#0c1f1d]">{formatPrice(product.price)}</p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => addToCart(product)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0c1f1d] py-2.5 text-sm font-semibold text-white hover:bg-[#123b38]"
                      >
                        <ShoppingCart size={16} /> Add to Cart
                      </button>
                      <button
                        onClick={() => toggleLike(product.id)}
                        aria-label={`Remove ${product.name} from saved items`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100"
                      >
                        <Heart size={18} className="fill-rose-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
