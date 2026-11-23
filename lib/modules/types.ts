/**
 * Shared types for the two storefront domains.
 *
 * Medlink runs as a modular monolith: one app, one database, one admin.
 * Every product, category and order carries an `AppModule` tag so the
 * medical and pharmacy storefronts share infrastructure without sharing
 * catalogue data.
 */
export type AppModule = "medical" | "pharmacy"

export const MODULE_COOKIE = "medlink_module"
export const MODULE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
export const DEFAULT_MODULE: AppModule = "medical"

/** Client event used to reopen the module chooser after the first visit. */
export const OPEN_MODULE_CHOOSER_EVENT = "medlink:open-module-chooser"

export function isAppModule(value: unknown): value is AppModule {
  return value === "medical" || value === "pharmacy"
}

/** The canonical product shape used by both modules and by PostgreSQL. */
export interface CatalogueProduct {
  id: string
  module: AppModule
  name: string
  category: string
  price: number
  image: string
  description: string
  specs: string[]
  features: string[]
  inStock: boolean

  /** Optional merchandising data. Hidden in the UI until an admin sets it. */
  compareAtPrice?: number | null
  brand?: string | null
  rating?: number | null
  reviewCount?: number | null
  stockQuantity?: number | null
  lowStockThreshold?: number | null
  requiresPrescription?: boolean | null
  strength?: string | null
  dosageForm?: string | null
  expiryDate?: string | null
  warranty?: string | null
  model?: string | null
  featured?: boolean | null
  status?: "draft" | "published" | null

  /** Cost and controlled-drug flags used by POS profit and dispensing rules. */
  costPrice?: number | null
  controlledSubstance?: boolean | null
}
