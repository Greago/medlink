import { z } from "zod"

/**
 * Shared validation for product writes. All optional merchandising fields are
 * additive: older products simply omit them and the UI hides empty sections.
 */
export const productSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().min(0),
  image: z.string().default(""),
  description: z.string().default(""),
  specs: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  inStock: z.boolean().default(true),
  compareAtPrice: z.number().min(0).nullable().optional(),
  brand: z.string().max(120).nullable().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  reviewCount: z.number().int().min(0).nullable().optional(),
  stockQuantity: z.number().int().min(0).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  requiresPrescription: z.boolean().nullable().optional(),
  strength: z.string().max(120).nullable().optional(),
  dosageForm: z.string().max(120).nullable().optional(),
  expiryDate: z.string().max(10).nullable().optional(),
  warranty: z.string().max(200).nullable().optional(),
  model: z.string().max(120).nullable().optional(),
  featured: z.boolean().nullable().optional(),
  status: z.enum(["draft", "published"]).nullable().optional(),
  costPrice: z.number().min(0).nullable().optional(),
  controlledSubstance: z.boolean().nullable().optional(),
})
