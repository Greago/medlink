import { getSeedProducts, SEED_PRODUCTS } from "@/lib/modules/registry"
import type { AppModule, CatalogueProduct } from "@/lib/modules/types"

export type { AppModule, CatalogueProduct } from "@/lib/modules/types"

/**
 * Seed catalogue used to initialize the database on first request.
 * The database is the source of truth after seeding. Both modules are
 * seeded; the active storefront module decides what is displayed.
 */
export const CATALOGUE_PRODUCTS: CatalogueProduct[] = SEED_PRODUCTS

export function getSeedProductsForModule(module: AppModule): CatalogueProduct[] {
  return getSeedProducts(module)
}

/**
 * Products shown by the storefront. The database-backed store wins after
 * hydration; seeds only cover the first paint and offline rendering.
 */
export function getDisplayProducts(
  module: AppModule,
  storeProducts: CatalogueProduct[],
  isHydrated: boolean
): CatalogueProduct[] {
  const source = isHydrated && storeProducts.length > 0 ? storeProducts : getSeedProductsForModule(module)
  return source.filter((product) => product.module === module)
}

export function formatPrice(price: number): string {
  return `KSh ${new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 2,
  }).format(price)}`
}
