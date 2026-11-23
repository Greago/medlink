import { MEDICAL_CATEGORIES, MEDICAL_PRODUCTS } from "./medical"
import { PHARMACY_CATEGORIES, PHARMACY_PRODUCTS } from "./pharmacy"
import type { AppModule, CatalogueProduct } from "./types"

export interface ModuleDefinition {
  id: AppModule
  /** Full name used in headings and emails. */
  label: string
  /** Compact name used in switchers. */
  shortLabel: string
  /** What a single item is called in this module. */
  itemLabel: string
  eyebrow: string
  heroHeading: [string, string, string]
  heroDescription: string
  heroImageAlt: string
  featuredLead: string
  featuredAccent: string
  featuredDescription: string
  productLabel: string
  catalogueTitle: string
  catalogueKicker: string
  catalogueIntro: string
  catalogueHero: string
  footerDescriptor: string
  seedCategories: string[]
  seedProducts: CatalogueProduct[]
}

export const MODULE_REGISTRY: Record<AppModule, ModuleDefinition> = {
  medical: {
    id: "medical",
    label: "Medical Equipment",
    shortLabel: "Medical",
    itemLabel: "equipment",
    eyebrow: "Medical Equipment Division",
    heroHeading: ["Reliable Medical", "Equipment for", "Hospitals & Clinics"],
    heroDescription:
      "Medlink Expedite supplies high-quality diagnostic, laboratory, surgical, and patient care equipment across Kenya and East Africa. We help healthcare facilities access trusted medical solutions with fast delivery and dependable support.",
    heroImageAlt: "Medical Equipment Supplier Kenya",
    featuredLead: "Featured",
    featuredAccent: "Equipment",
    featuredDescription:
      "Browse equipment from recognised manufacturers, with clear KSh pricing and support for facilities of every size.",
    productLabel: "Products",
    catalogueTitle: "MEDICAL EQUIPMENT CATALOGUE",
    catalogueKicker: "PRODUCT CATALOGUE",
    catalogueIntro:
      "We supply practical, reliable medical equipment to hospitals, clinics and healthcare professionals across Kenya and East Africa. This catalogue brings our current range together in one place.",
    catalogueHero: "QUALITY MEDICAL EQUIPMENT",
    footerDescriptor: "Medical Equipment Supply",
    seedCategories: MEDICAL_CATEGORIES,
    seedProducts: MEDICAL_PRODUCTS,
  },
  pharmacy: {
    id: "pharmacy",
    label: "Pharmacy",
    shortLabel: "Pharmacy",
    itemLabel: "medicines",
    eyebrow: "Pharmacy Division",
    heroHeading: ["Trusted Pharmacy", "Supplies for", "Every Community"],
    heroDescription:
      "Medlink Pharmacy supplies essential medicines, vaccines, supplements and clinical consumables to pharmacies, clinics and healthcare providers across Kenya and East Africa, with careful handling and dependable delivery.",
    heroImageAlt: "Pharmacy Supplies Kenya",
    featuredLead: "Featured",
    featuredAccent: "Pharmacy",
    featuredDescription:
      "Quality-assured medicines, vaccines and clinical supplies from verified pharmaceutical partners.",
    productLabel: "Medicines",
    catalogueTitle: "PHARMACY CATALOGUE",
    catalogueKicker: "PHARMACY PRODUCT CATALOGUE",
    catalogueIntro:
      "We supply quality-assured medicines, vaccines, supplements and clinical consumables to pharmacies and healthcare facilities across Kenya and East Africa. This catalogue brings our current pharmacy range together in one place.",
    catalogueHero: "QUALITY PHARMACY SUPPLIES",
    footerDescriptor: "Pharmacy Supply",
    seedCategories: PHARMACY_CATEGORIES,
    seedProducts: PHARMACY_PRODUCTS,
  },
}

export const MODULE_IDS: AppModule[] = ["medical", "pharmacy"]

export const SEED_PRODUCTS: CatalogueProduct[] = MODULE_IDS.flatMap(
  (module) => MODULE_REGISTRY[module].seedProducts
)

export function getModule(id: AppModule): ModuleDefinition {
  return MODULE_REGISTRY[id]
}

export function getSeedProducts(id: AppModule): CatalogueProduct[] {
  return MODULE_REGISTRY[id].seedProducts
}
