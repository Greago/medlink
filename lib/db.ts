import { randomUUID } from "crypto"
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg"
import { CATALOGUE_PRODUCTS, type CatalogueProduct } from "@/lib/catalogue"
import { getModule, MODULE_IDS } from "@/lib/modules/registry"
import { DEFAULT_MODULE, type AppModule } from "@/lib/modules/types"
import { hashPassword } from "@/lib/password"
import { normalizeModules, normalizePermissions, normalizeRole, type AdminRole } from "@/lib/roles"
import { BLOG_SCHEMA } from "@/lib/blog-schema"
import { BLOG_SEED_CATEGORIES, BLOG_SEED_POSTS } from "@/lib/blog-seed"
import { CAREERS_SCHEMA } from "@/lib/careers-schema"
import { EXTENDED_SCHEMA } from "@/lib/schema-extensions"
import type { AccountUser, AdminUser, CartItem, Inquiry, Order, OrderItem, ProfilePage, Quote, QuoteItem } from "@/lib/store"

const globalForPg = globalThis as unknown as { medlinkPool?: Pool }

export const pool =
  globalForPg.medlinkPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require")
      ? { rejectUnauthorized: true }
      : undefined,
    max: 5,
  })

if (process.env.NODE_ENV !== "production") globalForPg.medlinkPool = pool

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as never[])
}

export async function withTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await operation(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export const DEFAULT_SETTINGS = {
  whatsappNumber: "+254743325746",
  companyEmail: "info@medlinkexpedite.co.ke",
  companyPhone: "+254 743 325 746",
  companyAddress: "Nairobi, Kenya",
  deliveryThreshold: 0,
  ppbRegistrationNumber: "",
  businessName: "Medlink Expedite Ventures Limited",
  kraPin: "",
  vatRegistered: false,
  vatRate: 16,
  vatInclusive: true,
  receiptFooter: "Thank you for shopping with us.",
  receiptReturnPolicy: "Returns accepted within 7 days with proof of purchase.",
  receiptWarrantyNote: "Warranty terms are shown on the receipt where applicable.",
  medicalPrefix: "MED",
  pharmacyPrefix: "PHA",
  invoicePrefix: "INV",
  quotePrefix: "QUO",
  creditNotePrefix: "CN",
  etimsEnabled: false,
  salesFromEmail: "sales@medlinkexpedite.co.ke",
  receiptsFromEmail: "receipts@medlinkexpedite.co.ke",
}

const DEFAULT_ADMIN = {
  name: "Medlink Administrator",
  email: process.env.ADMIN_EMAIL || "admin@medlinkexpedite.co.ke",
  password: process.env.ADMIN_PASSWORD || "@medlinkadmin",
}

const DEFAULT_PROFILE_PAGES: ProfilePage[] = [
  {
    title: "About Medlink Expedites",
    content:
      "Medlink Expedites is a global leader in medical equipment supply, dedicated to empowering healthcare facilities with cutting-edge devices and trusted solutions.",
    highlight: "Serving 150+ countries since 2015",
  },
  {
    title: "Our Mission",
    content:
      "To deliver premium, certified medical equipment to healthcare providers worldwide, ensuring rapid deployment, competitive pricing, and unmatched after-sales support.",
    highlight: "Empowering healthcare, one device at a time",
  },
  {
    title: "What We Supply",
    content:
      "From diagnostic imaging systems and patient monitors to hospital beds, surgical instruments, and respiratory care devices, our catalog spans over 500 products across 12 categories.",
    highlight: "500+ products across 12 categories",
  },
]

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    module TEXT NOT NULL DEFAULT 'medical',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    mime TEXT NOT NULL,
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    image TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    specs JSONB NOT NULL DEFAULT '[]'::jsonb,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    compare_at_price NUMERIC(12,2),
    brand TEXT,
    rating NUMERIC(2,1),
    review_count INTEGER NOT NULL DEFAULT 0,
    stock_quantity INTEGER,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
    strength TEXT,
    dosage_form TEXT,
    expiry_date DATE,
    warranty TEXT,
    model TEXT,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (customer_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (customer_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    products JSONB NOT NULL DEFAULT '[]'::jsonb,
    quantity INTEGER NOT NULL DEFAULT 1,
    additional_notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'New',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    quote_number TEXT NOT NULL,
    inquiry_id TEXT,
    client_name TEXT NOT NULL,
    client_company TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_address TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    valid_until TEXT NOT NULL,
    payment_terms TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS profile_pages (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    highlight TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    whatsapp_number TEXT NOT NULL,
    company_email TEXT NOT NULL,
    company_phone TEXT NOT NULL,
    company_address TEXT NOT NULL,
    delivery_threshold NUMERIC(12,2) NOT NULL DEFAULT 0,
    ppb_registration_number TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS catalogue_requests (
    id SERIAL PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    email TEXT NOT NULL,
    product_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL DEFAULT 'medical',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS bulk_emails (
    id SERIAL PRIMARY KEY,
    subject TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    recipient_count INTEGER NOT NULL,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    attached_catalogue BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

  -- Module migrations. CREATE TABLE IF NOT EXISTS cannot add columns to
  -- databases created by earlier versions, so these run on every boot.
  ALTER TABLE products ADD COLUMN IF NOT EXISTS module TEXT NOT NULL DEFAULT 'medical';
  ALTER TABLE categories ADD COLUMN IF NOT EXISTS module TEXT NOT NULL DEFAULT 'medical';
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS module TEXT NOT NULL DEFAULT 'medical';
  ALTER TABLE catalogue_requests ADD COLUMN IF NOT EXISTS module TEXT NOT NULL DEFAULT 'medical';

  -- Additive merchandising migrations. Existing rows keep their data and
  -- receive sensible empty/default values; nothing is dropped or rewritten.
  ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12,2);
  ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1);
  ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS strength TEXT;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS dosage_form TEXT;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date DATE;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty TEXT;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS model TEXT;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS delivery_threshold NUMERIC(12,2) NOT NULL DEFAULT 0;
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS ppb_registration_number TEXT NOT NULL DEFAULT '';

  ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
  CREATE UNIQUE INDEX IF NOT EXISTS categories_module_name_idx ON categories (module, name);
  CREATE INDEX IF NOT EXISTS idx_products_module ON products (module);
  CREATE INDEX IF NOT EXISTS idx_categories_module ON categories (module);
  CREATE INDEX IF NOT EXISTS idx_orders_module_created ON orders (module, created_at DESC);
`

let schemaPromise: Promise<void> | null = null

export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await query(SCHEMA)
      await query(EXTENDED_SCHEMA)
      await query(CAREERS_SCHEMA)
      await query(BLOG_SCHEMA)

      // Seed each module independently. If an admin has already defined
      // categories for a module we leave them alone, so deleted categories
      // are never resurrected on the next boot.
      for (const module of MODULE_IDS) {
        const categoryCount = await query<{ count: number }>(
          "SELECT COUNT(*)::int AS count FROM categories WHERE module = $1",
          [module]
        )
        if (categoryCount.rows[0]?.count) continue

        const names = new Set<string>([
          ...getModule(module).seedCategories,
          ...getModule(module).seedProducts.map((product) => product.category),
        ])

        if (module === DEFAULT_MODULE) {
          const existing = await query<{ category: string }>(
            "SELECT DISTINCT category FROM products WHERE module = $1",
            [module]
          )
          for (const row of existing.rows) names.add(row.category)
        }

        for (const name of names) {
          const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
          await query(
            `INSERT INTO categories (id, name, module)
             VALUES ($1, $2, $3)
             ON CONFLICT (module, name) DO NOTHING`,
            [`${module}-${slug || randomUUID()}`, name, module]
          )
        }
      }

      for (const product of CATALOGUE_PRODUCTS) {
        await query(
          `INSERT INTO products (module, id, name, category, price, image, description, specs, features, in_stock)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)
           ON CONFLICT (id) DO NOTHING`,
          [
            product.module,
            product.id,
            product.name,
            product.category,
            product.price,
            product.image,
            product.description,
            JSON.stringify(product.specs),
            JSON.stringify(product.features),
            product.inStock,
          ]
        )
      }

      await query(
        `INSERT INTO settings (id, whatsapp_number, company_email, company_phone, company_address)
         VALUES (1, $1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [
          DEFAULT_SETTINGS.whatsappNumber,
          DEFAULT_SETTINGS.companyEmail,
          DEFAULT_SETTINGS.companyPhone,
          DEFAULT_SETTINGS.companyAddress,
        ]
      )

      const adminCount = await query("SELECT 1 FROM admin_users LIMIT 1")
      if (!adminCount.rowCount) {
        await query(
          `INSERT INTO admin_users (id, name, email, password_hash)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO NOTHING`,
          [
            randomUUID(),
            DEFAULT_ADMIN.name,
            DEFAULT_ADMIN.email.toLowerCase(),
            await hashPassword(DEFAULT_ADMIN.password),
          ]
        )
      }

      const { rowCount } = await query("SELECT 1 FROM profile_pages LIMIT 1")
      if (!rowCount) {
        for (const [index, page] of DEFAULT_PROFILE_PAGES.entries()) {
          await query(
            `INSERT INTO profile_pages (title, content, highlight, position)
             VALUES ($1, $2, $3, $4)`,
            [page.title, page.content, page.highlight, index]
          )
        }
      }

      // Seed the editorial starter content once. If staff have removed a seed
      // article we leave the blog alone so it is never resurrected on boot.
      for (const category of BLOG_SEED_CATEGORIES) {
        await query(
          `INSERT INTO blog_categories (id, name, slug, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [category.id, category.name, category.slug, category.description]
        )
      }

      const blogPostCount = await query("SELECT 1 FROM blog_posts LIMIT 1")
      if (!blogPostCount.rowCount) {
        for (const post of BLOG_SEED_POSTS) {
          await query(
            `INSERT INTO blog_posts
               (id, slug, title, excerpt, content, cover_image, author, category_id, status, publish_at, published_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7,
               (SELECT id FROM blog_categories WHERE slug = $8), $9, $10, $10)
             ON CONFLICT (id) DO NOTHING`,
            [
              post.id,
              post.slug,
              post.title,
              post.excerpt,
              post.content,
              post.coverImage,
              post.author,
              post.categorySlug,
              post.status,
              post.publishAt,
            ]
          )
        }
      }
    })().catch((error) => {
      schemaPromise = null
      throw error
    })
  }

  return schemaPromise
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

function asObjectArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

interface ProductRow extends QueryResultRow {
  id: string
  module: AppModule
  name: string
  category: string
  price: string | number
  image: string
  description: string
  specs: unknown
  features: unknown
  in_stock: boolean
  compare_at_price?: string | number | null
  brand?: string | null
  rating?: string | number | null
  review_count?: number | null
  stock_quantity?: number | null
  low_stock_threshold?: number | null
  requires_prescription?: boolean | null
  strength?: string | null
  dosage_form?: string | null
  expiry_date?: string | Date | null
  warranty?: string | null
  model?: string | null
  featured?: boolean | null
  status?: string | null
  cost_price?: string | number | null
  controlled_substance?: boolean | null
}

function mapProduct(row: ProductRow): CatalogueProduct {
  return {
    id: row.id,
    module: row.module,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    image: row.image,
    description: row.description,
    specs: asArray(row.specs),
    features: asArray(row.features),
    inStock: row.in_stock,
    compareAtPrice: row.compare_at_price == null ? null : Number(row.compare_at_price),
    brand: row.brand || null,
    rating: row.rating == null ? null : Number(row.rating),
    reviewCount: row.review_count ?? 0,
    stockQuantity: row.stock_quantity ?? null,
    lowStockThreshold: row.low_stock_threshold ?? 5,
    requiresPrescription: Boolean(row.requires_prescription),
    strength: row.strength || null,
    dosageForm: row.dosage_form || null,
    expiryDate:
      row.expiry_date == null
        ? null
        : row.expiry_date instanceof Date
          ? row.expiry_date.toISOString().slice(0, 10)
          : String(row.expiry_date).slice(0, 10),
    warranty: row.warranty || null,
    model: row.model || null,
    featured: Boolean(row.featured),
    status: row.status === "draft" ? "draft" : "published",
    costPrice: row.cost_price == null ? 0 : Number(row.cost_price),
    controlledSubstance: Boolean(row.controlled_substance),
  }
}

export interface StoredCategory {
  id: string
  module: AppModule
  name: string
  productCount: number
}

interface CategoryRow extends QueryResultRow {
  id: string
  module: AppModule
  name: string
  product_count: number | string
}

export async function getCategories(module?: AppModule): Promise<StoredCategory[]> {
  await ensureSchema()
  const result = await query<CategoryRow>(
    `SELECT c.id, c.module, c.name, COUNT(p.id)::int AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category = c.name AND p.module = c.module
     ${module ? "WHERE c.module = $1" : ""}
     GROUP BY c.id, c.module, c.name
     ORDER BY c.name ASC`,
    module ? [module] : []
  )

  return result.rows.map(mapCategory)
}

export async function createCategory(name: string, module: AppModule = DEFAULT_MODULE): Promise<StoredCategory> {
  await ensureSchema()
  const result = await query<CategoryRow>(
    `INSERT INTO categories (id, name, module)
     VALUES ($1, $2, $3)
     RETURNING id, name, module, 0::int AS product_count`,
    [randomUUID(), name, module]
  )
  return mapCategory(result.rows[0])
}

export async function renameCategory(
  id: string,
  name: string,
  module: AppModule = DEFAULT_MODULE
): Promise<StoredCategory | null> {
  await ensureSchema()

  return withTransaction(async (client) => {
    const current = await client.query<{ name: string }>(
      "SELECT name FROM categories WHERE id = $1 AND module = $2",
      [id, module]
    )
    const previousName = current.rows[0]?.name
    if (!previousName) return null

    await client.query("UPDATE categories SET name = $2 WHERE id = $1 AND module = $3", [id, name, module])
    await client.query("UPDATE products SET category = $2 WHERE category = $1 AND module = $3", [
      previousName,
      name,
      module,
    ])

    const updated = await client.query<CategoryRow>(
      `SELECT c.id, c.module, c.name, COUNT(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category = c.name AND p.module = c.module
       WHERE c.id = $1 AND c.module = $2
       GROUP BY c.id, c.module, c.name`,
      [id, module]
    )

    return mapCategory(updated.rows[0])
  })
}

export async function deleteCategory(id: string, module: AppModule = DEFAULT_MODULE): Promise<boolean> {
  await ensureSchema()

  const result = await query(
    `DELETE FROM categories
     WHERE id = $1 AND module = $2
       AND NOT EXISTS (
         SELECT 1 FROM products
         WHERE category = (SELECT name FROM categories WHERE id = $1 AND module = $2)
           AND module = $2
       )
     RETURNING id`,
    [id, module]
  )

  return (result.rowCount ?? 0) > 0
}

function mapCategory(row: CategoryRow): StoredCategory {
  return {
    id: row.id,
    module: row.module,
    name: row.name,
    productCount: Number(row.product_count),
  }
}

export async function saveProductImage(mime: string, data: Buffer): Promise<string> {
  await ensureSchema()
  const id = randomUUID()
  await query("INSERT INTO product_images (id, mime, data) VALUES ($1, $2, $3)", [id, mime, data])
  return id
}

export async function getProductImage(id: string): Promise<{ mime: string; data: Buffer } | null> {
  await ensureSchema()
  const result = await query<{ mime: string; data: Buffer }>(
    "SELECT mime, data FROM product_images WHERE id = $1",
    [id]
  )
  const row = result.rows[0]
  if (!row) return null
  return { mime: row.mime, data: row.data }
}

export async function getProducts(module?: AppModule): Promise<CatalogueProduct[]> {
  await ensureSchema()
  const result = await query<ProductRow>(
    `SELECT * FROM products ${module ? "WHERE module = $1" : ""} ORDER BY name ASC`,
    module ? [module] : []
  )
  return result.rows.map(mapProduct)
}

const PRODUCT_WRITE_COLUMNS = `
  module, id, name, category, price, image, description, specs, features, in_stock,
  compare_at_price, brand, rating, review_count, stock_quantity, low_stock_threshold,
  requires_prescription, strength, dosage_form, expiry_date, warranty, model, featured, status,
  cost_price, controlled_substance
`

function productValues(product: CatalogueProduct, id = product.id): unknown[] {
  return [
    product.module,
    id,
    product.name,
    product.category,
    product.price,
    product.image,
    product.description,
    JSON.stringify(product.specs || []),
    JSON.stringify(product.features || []),
    product.inStock,
    product.compareAtPrice ?? null,
    product.brand || null,
    product.rating ?? null,
    product.reviewCount ?? 0,
    product.stockQuantity ?? null,
    product.lowStockThreshold ?? 5,
    product.requiresPrescription ?? false,
    product.strength || null,
    product.dosageForm || null,
    product.expiryDate || null,
    product.warranty || null,
    product.model || null,
    product.featured ?? false,
    product.status === "draft" ? "draft" : "published",
    product.costPrice ?? 0,
    product.controlledSubstance ?? false,
  ]
}

function productUpdateAssignments(): string {
  return PRODUCT_WRITE_COLUMNS.split(",")
    .map((column) => column.trim())
    .filter((column) => column !== "id" && column !== "module")
    .map((column, index) => `${column} = $${index + 3}`)
    .join(", ")
}

export async function createProduct(product: CatalogueProduct): Promise<CatalogueProduct> {
  await ensureSchema()
  const result = await query<ProductRow>(
    `INSERT INTO products (${PRODUCT_WRITE_COLUMNS})
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
     ON CONFLICT (id) DO UPDATE SET
       module = EXCLUDED.module,
       ${productUpdateAssignments()}
     RETURNING *`,
    productValues(product)
  )
  return mapProduct(result.rows[0])
}

export async function updateProduct(id: string, product: CatalogueProduct): Promise<CatalogueProduct | null> {
  await ensureSchema()
  const result = await query<ProductRow>(
    `UPDATE products SET ${productUpdateAssignments()}
     WHERE id = $1 AND module = $25 RETURNING *`,
    [...productValues(product, id), product.module]
  )
  return result.rows[0] ? mapProduct(result.rows[0]) : null
}

export async function deleteProduct(id: string, module?: AppModule): Promise<void> {
  await ensureSchema()
  await query(`DELETE FROM products WHERE id = $1 ${module ? "AND module = $2" : ""}`,
    module ? [id, module] : [id]
  )
}

interface CartRow extends ProductRow {
  quantity: number | string
}

export async function getCart(customerId: string, module?: AppModule): Promise<CartItem[]> {
  await ensureSchema()
  const result = await query<CartRow>(
    `SELECT p.*, ci.quantity
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.customer_id = $1 ${module ? "AND p.module = $2" : ""}
     ORDER BY p.name ASC`,
    module ? [customerId, module] : [customerId]
  )

  return result.rows.map((row) => ({
    product: mapProduct(row),
    quantity: Number(row.quantity),
  }))
}

export async function setCartQuantity(
  customerId: string,
  productId: string,
  quantity: number,
  module?: AppModule
): Promise<CartItem[]> {
  await ensureSchema()
  await query("INSERT INTO customers (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [customerId])

  if (quantity < 1) {
    await query("DELETE FROM cart_items WHERE customer_id = $1 AND product_id = $2", [customerId, productId])
  } else {
    await query(
      `INSERT INTO cart_items (customer_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (customer_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
      [customerId, productId, Math.floor(quantity)]
    )
  }

  return getCart(customerId, module)
}

export async function clearCart(customerId: string, module?: AppModule): Promise<void> {
  await ensureSchema()
  if (module) {
    await query(
      `DELETE FROM cart_items
       WHERE customer_id = $1
         AND product_id IN (SELECT id FROM products WHERE module = $2)`,
      [customerId, module]
    )
    return
  }
  await query("DELETE FROM cart_items WHERE customer_id = $1", [customerId])
}

export async function getLikes(customerId: string, module?: AppModule): Promise<string[]> {
  await ensureSchema()
  const result = await query<{ product_id: string }>(
    module
      ? `SELECT l.product_id
         FROM likes l
         JOIN products p ON p.id = l.product_id
         WHERE l.customer_id = $1 AND p.module = $2
         ORDER BY l.created_at ASC`
      : "SELECT product_id FROM likes WHERE customer_id = $1 ORDER BY created_at ASC",
    module ? [customerId, module] : [customerId]
  )
  return result.rows.map((row) => row.product_id)
}

export async function toggleLike(customerId: string, productId: string, module?: AppModule): Promise<string[]> {
  await ensureSchema()
  await query("INSERT INTO customers (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [customerId])

  const existing = await query(
    "SELECT 1 FROM likes WHERE customer_id = $1 AND product_id = $2",
    [customerId, productId]
  )

  if (existing.rowCount) {
    await query("DELETE FROM likes WHERE customer_id = $1 AND product_id = $2", [customerId, productId])
  } else {
    await query(
      "INSERT INTO likes (customer_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [customerId, productId]
    )
  }

  return getLikes(customerId, module)
}

interface UserRow extends QueryResultRow {
  id: string
  name: string
  email: string
  password_hash: string
}

export interface StoredUser extends AccountUser {
  passwordHash: string
}

function mapUser(row: UserRow): StoredUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
  }
}

export async function getUserByEmail(email: string): Promise<StoredUser | null> {
  const result = await query<UserRow>("SELECT * FROM users WHERE email = $1", [email.trim().toLowerCase()])
  return result.rows[0] ? mapUser(result.rows[0]) : null
}

export async function createUser(name: string, email: string, passwordHash: string): Promise<AccountUser> {
  const result = await query<UserRow>(
    `INSERT INTO users (id, name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [randomUUID(), name.trim(), email.trim().toLowerCase(), passwordHash]
  )

  const user = mapUser(result.rows[0])
  return { id: user.id, name: user.name, email: user.email }
}

export async function createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  await query("DELETE FROM user_sessions WHERE expires_at < NOW()")
  await query("INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
    tokenHash,
    userId,
    expiresAt,
  ])
}

export async function getSessionUser(tokenHash: string): Promise<AccountUser | null> {
  const result = await query<UserRow>(
    `SELECT u.*
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [tokenHash]
  )

  if (!result.rows[0]) return null
  const user = mapUser(result.rows[0])
  return { id: user.id, name: user.name, email: user.email }
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await query("DELETE FROM user_sessions WHERE token_hash = $1", [tokenHash])
}

export async function createPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<void> {
  await query("DELETE FROM password_reset_tokens WHERE expires_at < NOW()")
  await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId])
  await query("INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
    tokenHash,
    userId,
    expiresAt,
  ])
}

export async function deletePasswordResetTokensForUser(userId: string): Promise<void> {
  await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId])
}

export async function resetUserPassword(tokenHash: string, passwordHash: string): Promise<AccountUser | null> {
  return withTransaction(async (client) => {
    const result = await client.query<UserRow>(
      `SELECT u.*
       FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1 AND t.expires_at > NOW()
       FOR UPDATE OF t`,
      [tokenHash]
    )

    const row = result.rows[0]
    if (!row) return null

    const user = mapUser(row)
    await client.query("UPDATE users SET password_hash = $2 WHERE id = $1", [user.id, passwordHash])
    await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [user.id])
    await client.query("DELETE FROM user_sessions WHERE user_id = $1", [user.id])

    return { id: user.id, name: user.name, email: user.email }
  })
}

interface AdminRow extends QueryResultRow {
  id: string
  name: string
  email: string
  password_hash: string
  role?: string
  modules?: string[] | string | null
  branch_id?: string | null
  max_discount_percent?: string | number
  status?: string
  permissions?: string[] | string | null
  must_change_password?: boolean
}

export interface StoredAdmin extends AdminUser {
  passwordHash: string
}

function mapAdmin(row: AdminRow): StoredAdmin {
  const role = normalizeRole(row.role) as AdminRole
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role,
    modules: normalizeModules(row.modules),
    branchId: row.branch_id || null,
    maxDiscountPercent: Number(row.max_discount_percent ?? 100),
    status: row.status === "inactive" ? "inactive" : "active",
    permissions: normalizePermissions(row.permissions),
    mustChangePassword: Boolean(row.must_change_password),
  }
}

function publicAdmin(admin: StoredAdmin): AdminUser {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    modules: admin.modules,
    branchId: admin.branchId,
    maxDiscountPercent: admin.maxDiscountPercent,
    status: admin.status,
    permissions: admin.permissions,
    mustChangePassword: admin.mustChangePassword,
  }
}

export async function getAdminByEmail(email: string): Promise<StoredAdmin | null> {
  const result = await query<AdminRow>("SELECT * FROM admin_users WHERE email = $1", [email.trim().toLowerCase()])
  return result.rows[0] ? mapAdmin(result.rows[0]) : null
}

export async function updateAdminProfile(
  id: string,
  profile: { name: string; email: string }
): Promise<AdminUser | null> {
  const result = await query<AdminRow>(
    `UPDATE admin_users
     SET name = $2, email = $3, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, profile.name.trim(), profile.email.trim().toLowerCase()]
  )
  if (!result.rows[0]) return null
  return publicAdmin(mapAdmin(result.rows[0]))
}

export async function updateAdminPasswordHash(id: string, passwordHash: string): Promise<void> {
  await query("UPDATE admin_users SET password_hash = $2, updated_at = NOW() WHERE id = $1", [id, passwordHash])
}

export async function createAdminSession(adminId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  await query("DELETE FROM admin_sessions WHERE expires_at < NOW()")
  await query("INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES ($1, $2, $3)", [
    tokenHash,
    adminId,
    expiresAt,
  ])
}

export async function getAdminSessionUser(tokenHash: string): Promise<AdminUser | null> {
  const result = await query<AdminRow>(
    `SELECT a.*
     FROM admin_sessions s
     JOIN admin_users a ON a.id = s.admin_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [tokenHash]
  )

  if (!result.rows[0]) return null
  return publicAdmin(mapAdmin(result.rows[0]))
}

export async function deleteAdminSession(tokenHash: string): Promise<void> {
  await query("DELETE FROM admin_sessions WHERE token_hash = $1", [tokenHash])
}

export async function deleteOtherAdminSessions(adminId: string, currentTokenHash: string): Promise<void> {
  await query("DELETE FROM admin_sessions WHERE admin_id = $1 AND token_hash <> $2", [adminId, currentTokenHash])
}

interface OrderRow extends QueryResultRow {
  id: string
  module: AppModule
  order_number: string
  customer_name: string
  customer_email: string
  items: unknown
  subtotal: string | number
  total: string | number
  status: Order["status"]
  notes: string
  created_at: Date | string
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    module: row.module,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    items: asObjectArray<OrderItem>(row.items),
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    status: row.status,
    notes: row.notes,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export async function getOrdersForUser(userId: string, module?: AppModule): Promise<Order[]> {
  await ensureSchema()
  const result = await query<OrderRow>(
    `SELECT * FROM orders
     WHERE user_id = $1 ${module ? "AND module = $2" : ""}
     ORDER BY created_at DESC`,
    module ? [userId, module] : [userId]
  )
  return result.rows.map(mapOrder)
}

export async function getAllOrders(module?: AppModule): Promise<Order[]> {
  await ensureSchema()
  const result = await query<OrderRow>(
    `SELECT * FROM orders ${module ? "WHERE module = $1" : ""} ORDER BY created_at DESC`,
    module ? [module] : []
  )
  return result.rows.map(mapOrder)
}

export async function updateOrderStatus(id: string, status: Order["status"]): Promise<Order | null> {
  const result = await query<OrderRow>("UPDATE orders SET status = $2 WHERE id = $1 RETURNING *", [id, status])
  return result.rows[0] ? mapOrder(result.rows[0]) : null
}

export async function createOrderFromCart(input: {
  userId: string
  customerId: string
  customerName: string
  customerEmail: string
  notes: string
  module?: AppModule
}): Promise<Order | null> {
  await ensureSchema()
  const module = input.module || DEFAULT_MODULE
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const cartResult = await client.query<CartRow>(
      `SELECT p.*, ci.quantity
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.customer_id = $1 AND p.module = $2
       ORDER BY p.name ASC`,
      [input.customerId, module]
    )

    if (!cartResult.rows.length) {
      await client.query("ROLLBACK")
      return null
    }

    const items: OrderItem[] = cartResult.rows.map((row) => {
      const product = mapProduct(row)
      const quantity = Number(row.quantity)
      return {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        total: product.price * quantity,
      }
    })

    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const id = randomUUID()
    const prefix = module === "pharmacy" ? "PHX" : "MEV"
    const orderNumber = `${prefix}/ORD/${new Date().getFullYear()}/${randomUUID().slice(0, 8).toUpperCase()}`

    const result = await client.query<OrderRow>(
      `INSERT INTO orders
         (id, module, order_number, user_id, customer_id, customer_name, customer_email,
          items, subtotal, total, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, 'Pending', $11)
       RETURNING *`,
      [
        id,
        module,
        orderNumber,
        input.userId,
        input.customerId,
        input.customerName,
        input.customerEmail,
        JSON.stringify(items),
        subtotal,
        subtotal,
        input.notes,
      ]
    )

    await client.query(
      `DELETE FROM cart_items
       WHERE customer_id = $1
         AND product_id IN (SELECT id FROM products WHERE module = $2)`,
      [input.customerId, module]
    )
    await client.query("COMMIT")

    return mapOrder(result.rows[0])
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

interface InquiryRow extends QueryResultRow {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  products: unknown
  quantity: number | string
  additional_notes: string
  status: Inquiry["status"]
  created_at: Date | string
}

function mapInquiry(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    companyName: row.company_name,
    contactPerson: row.contact_person,
    email: row.email,
    phone: row.phone,
    products: asArray(row.products),
    quantity: Number(row.quantity),
    additionalNotes: row.additional_notes,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export async function getInquiries(): Promise<Inquiry[]> {
  const result = await query<InquiryRow>("SELECT * FROM inquiries ORDER BY created_at DESC")
  return result.rows.map(mapInquiry)
}

export async function createInquiry(inquiry: Inquiry): Promise<Inquiry> {
  const result = await query<InquiryRow>(
    `INSERT INTO inquiries
       (id, company_name, contact_person, email, phone, products, quantity, additional_notes, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET
       company_name = EXCLUDED.company_name,
       contact_person = EXCLUDED.contact_person,
       email = EXCLUDED.email,
       phone = EXCLUDED.phone,
       products = EXCLUDED.products,
       quantity = EXCLUDED.quantity,
       additional_notes = EXCLUDED.additional_notes,
       status = EXCLUDED.status
     RETURNING *`,
    [
      inquiry.id,
      inquiry.companyName,
      inquiry.contactPerson,
      inquiry.email,
      inquiry.phone,
      JSON.stringify(inquiry.products),
      inquiry.quantity,
      inquiry.additionalNotes,
      inquiry.status,
      inquiry.createdAt,
    ]
  )
  return mapInquiry(result.rows[0])
}

export async function updateInquiryStatus(id: string, status: Inquiry["status"]): Promise<void> {
  await query("UPDATE inquiries SET status = $2 WHERE id = $1", [id, status])
}

export async function deleteInquiry(id: string): Promise<void> {
  await query("DELETE FROM inquiries WHERE id = $1", [id])
}

interface QuoteRow extends QueryResultRow {
  id: string
  quote_number: string
  inquiry_id: string | null
  client_name: string
  client_company: string
  client_email: string
  client_phone: string
  client_address: string
  items: unknown
  subtotal: string | number
  tax_rate: string | number
  tax_amount: string | number
  total_price: string | number
  valid_until: string
  payment_terms: string
  notes: string
  status: Quote["status"]
  created_at: Date | string
}

function mapQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    quoteNumber: row.quote_number,
    inquiryId: row.inquiry_id ?? undefined,
    clientName: row.client_name,
    clientCompany: row.client_company,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    clientAddress: row.client_address,
    items: asObjectArray<QuoteItem>(row.items),
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
    totalPrice: Number(row.total_price),
    validUntil: row.valid_until,
    paymentTerms: row.payment_terms,
    notes: row.notes,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export async function getQuotes(): Promise<Quote[]> {
  const result = await query<QuoteRow>("SELECT * FROM quotes ORDER BY created_at DESC")
  return result.rows.map(mapQuote)
}

export async function getQuote(id: string): Promise<Quote | null> {
  const result = await query<QuoteRow>("SELECT * FROM quotes WHERE id = $1", [id])
  return result.rows[0] ? mapQuote(result.rows[0]) : null
}

export async function updateQuoteStatus(id: string, status: Quote["status"]): Promise<Quote | null> {
  const result = await query<QuoteRow>("UPDATE quotes SET status = $2 WHERE id = $1 RETURNING *", [id, status])
  return result.rows[0] ? mapQuote(result.rows[0]) : null
}

export async function createQuote(quote: Quote): Promise<Quote> {
  const result = await query<QuoteRow>(
    `INSERT INTO quotes
       (id, quote_number, inquiry_id, client_name, client_company, client_email, client_phone,
        client_address, items, subtotal, tax_rate, tax_amount, total_price, valid_until,
        payment_terms, notes, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (id) DO UPDATE SET
       quote_number = EXCLUDED.quote_number,
       inquiry_id = EXCLUDED.inquiry_id,
       client_name = EXCLUDED.client_name,
       client_company = EXCLUDED.client_company,
       client_email = EXCLUDED.client_email,
       client_phone = EXCLUDED.client_phone,
       client_address = EXCLUDED.client_address,
       items = EXCLUDED.items,
       subtotal = EXCLUDED.subtotal,
       tax_rate = EXCLUDED.tax_rate,
       tax_amount = EXCLUDED.tax_amount,
       total_price = EXCLUDED.total_price,
       valid_until = EXCLUDED.valid_until,
       payment_terms = EXCLUDED.payment_terms,
       notes = EXCLUDED.notes,
       status = EXCLUDED.status
     RETURNING *`,
    [
      quote.id,
      quote.quoteNumber,
      quote.inquiryId || null,
      quote.clientName,
      quote.clientCompany,
      quote.clientEmail,
      quote.clientPhone,
      quote.clientAddress,
      JSON.stringify(quote.items),
      quote.subtotal,
      quote.taxRate,
      quote.taxAmount,
      quote.totalPrice,
      quote.validUntil,
      quote.paymentTerms,
      quote.notes,
      quote.status,
      quote.createdAt,
    ]
  )
  return mapQuote(result.rows[0])
}

export async function getProfilePages(): Promise<ProfilePage[]> {
  const result = await query<{ title: string; content: string; highlight: string }>(
    "SELECT title, content, highlight FROM profile_pages ORDER BY position ASC, id ASC"
  )
  return result.rows.map((row) => ({ title: row.title, content: row.content, highlight: row.highlight }))
}

export async function saveProfilePages(pages: ProfilePage[]): Promise<ProfilePage[]> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("DELETE FROM profile_pages")
    for (const [index, page] of pages.entries()) {
      await client.query(
        "INSERT INTO profile_pages (title, content, highlight, position) VALUES ($1, $2, $3, $4)",
        [page.title, page.content, page.highlight, index]
      )
    }
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }

  return getProfilePages()
}

export interface CompanySettings {
  whatsappNumber: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
  deliveryThreshold: number
  ppbRegistrationNumber: string
  businessName: string
  kraPin: string
  vatRegistered: boolean
  vatRate: number
  vatInclusive: boolean
  receiptFooter: string
  receiptReturnPolicy: string
  receiptWarrantyNote: string
  medicalPrefix: string
  pharmacyPrefix: string
  invoicePrefix: string
  quotePrefix: string
  creditNotePrefix: string
  etimsEnabled: boolean
  salesFromEmail: string
  receiptsFromEmail: string
}

interface SettingsRow extends QueryResultRow {
  whatsapp_number: string
  company_email: string
  company_phone: string
  company_address: string
  delivery_threshold: string | number
  ppb_registration_number: string
  business_name: string
  kra_pin: string
  vat_registered: boolean | string
  vat_rate: string | number
  vat_inclusive: boolean | string
  receipt_footer: string
  receipt_return_policy: string
  receipt_warranty_note: string
  medical_prefix: string
  pharmacy_prefix: string
  invoice_prefix: string
  quote_prefix: string
  credit_note_prefix: string
  etims_enabled: boolean | string
  sales_from_email: string
  receipts_from_email: string
}

function settingBoolean(value: boolean | string | undefined, fallback = false): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value === "t" || value === "true" || value === "1"
  return fallback
}

export async function getSettings(): Promise<CompanySettings> {
  await ensureSchema()
  const result = await query<SettingsRow>(
    `SELECT whatsapp_number, company_email, company_phone, company_address,
            delivery_threshold, ppb_registration_number, business_name, kra_pin,
            vat_registered, vat_rate, vat_inclusive, receipt_footer,
            receipt_return_policy, receipt_warranty_note, medical_prefix,
            pharmacy_prefix, invoice_prefix, quote_prefix, credit_note_prefix,
            etims_enabled, sales_from_email, receipts_from_email
     FROM settings WHERE id = 1`
  )

  const row = result.rows[0]
  if (!row) return DEFAULT_SETTINGS

  return {
    whatsappNumber: row.whatsapp_number,
    companyEmail: row.company_email,
    companyPhone: row.company_phone,
    companyAddress: row.company_address,
    deliveryThreshold: Number(row.delivery_threshold) || 0,
    ppbRegistrationNumber: row.ppb_registration_number || "",
    businessName: row.business_name || DEFAULT_SETTINGS.businessName,
    kraPin: row.kra_pin || "",
    vatRegistered: settingBoolean(row.vat_registered),
    vatRate: Number(row.vat_rate ?? DEFAULT_SETTINGS.vatRate),
    vatInclusive: settingBoolean(row.vat_inclusive, true),
    receiptFooter: row.receipt_footer || DEFAULT_SETTINGS.receiptFooter,
    receiptReturnPolicy: row.receipt_return_policy || DEFAULT_SETTINGS.receiptReturnPolicy,
    receiptWarrantyNote: row.receipt_warranty_note || DEFAULT_SETTINGS.receiptWarrantyNote,
    medicalPrefix: row.medical_prefix || DEFAULT_SETTINGS.medicalPrefix,
    pharmacyPrefix: row.pharmacy_prefix || DEFAULT_SETTINGS.pharmacyPrefix,
    invoicePrefix: row.invoice_prefix || DEFAULT_SETTINGS.invoicePrefix,
    quotePrefix: row.quote_prefix || DEFAULT_SETTINGS.quotePrefix,
    creditNotePrefix: row.credit_note_prefix || DEFAULT_SETTINGS.creditNotePrefix,
    etimsEnabled: settingBoolean(row.etims_enabled),
    salesFromEmail: row.sales_from_email || DEFAULT_SETTINGS.salesFromEmail,
    receiptsFromEmail: row.receipts_from_email || DEFAULT_SETTINGS.receiptsFromEmail,
  }
}

export async function saveSettings(settings: CompanySettings): Promise<CompanySettings> {
  await ensureSchema()
  await query(
    `UPDATE settings SET
       whatsapp_number = $1, company_email = $2, company_phone = $3, company_address = $4,
       delivery_threshold = $5, ppb_registration_number = $6, business_name = $7,
       kra_pin = $8, vat_registered = $9, vat_rate = $10, vat_inclusive = $11,
       receipt_footer = $12, receipt_return_policy = $13, receipt_warranty_note = $14,
       medical_prefix = $15, pharmacy_prefix = $16, invoice_prefix = $17,
       quote_prefix = $18, credit_note_prefix = $19, etims_enabled = $20,
       sales_from_email = $21, receipts_from_email = $22
     WHERE id = 1`,
    [
      settings.whatsappNumber,
      settings.companyEmail,
      settings.companyPhone,
      settings.companyAddress,
      settings.deliveryThreshold,
      settings.ppbRegistrationNumber,
      settings.businessName,
      settings.kraPin,
      settings.vatRegistered,
      settings.vatRate,
      settings.vatInclusive,
      settings.receiptFooter,
      settings.receiptReturnPolicy,
      settings.receiptWarrantyNote,
      settings.medicalPrefix,
      settings.pharmacyPrefix,
      settings.invoicePrefix,
      settings.quotePrefix,
      settings.creditNotePrefix,
      settings.etimsEnabled,
      settings.salesFromEmail,
      settings.receiptsFromEmail,
    ]
  )
  return getSettings()
}

export async function subscribeToNewsletter(email: string, module: AppModule): Promise<void> {
  await ensureSchema()
  await query(
    `INSERT INTO newsletter_subscribers (email, module)
     VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING`,
    [email, module]
  )
}

export async function logCatalogueRequest(
  email: string,
  productCount: number,
  module: AppModule = DEFAULT_MODULE
): Promise<void> {
  await ensureSchema()
  await query("INSERT INTO catalogue_requests (email, product_count, module) VALUES ($1, $2, $3)", [
    email,
    productCount,
    module,
  ])
}

export interface BulkEmailLog {
  id: number
  subject: string
  body: string
  recipientCount: number
  sentCount: number
  failedCount: number
  attachedCatalogue: boolean
  createdAt: string
}

interface BulkEmailRow extends QueryResultRow {
  id: number | string
  subject: string
  body: string
  recipient_count: number | string
  sent_count: number | string
  failed_count: number | string
  attached_catalogue: boolean
  created_at: Date | string
}

function mapBulkEmail(row: BulkEmailRow): BulkEmailLog {
  return {
    id: Number(row.id),
    subject: row.subject,
    body: row.body,
    recipientCount: Number(row.recipient_count),
    sentCount: Number(row.sent_count),
    failedCount: Number(row.failed_count),
    attachedCatalogue: row.attached_catalogue,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export async function getBulkEmails(): Promise<BulkEmailLog[]> {
  const result = await query<BulkEmailRow>("SELECT * FROM bulk_emails ORDER BY created_at DESC LIMIT 50")
  return result.rows.map(mapBulkEmail)
}

export async function logBulkEmail(log: {
  subject: string
  body: string
  recipientCount: number
  sentCount: number
  failedCount: number
  attachedCatalogue: boolean
}): Promise<void> {
  await query(
    `INSERT INTO bulk_emails
       (subject, body, recipient_count, sent_count, failed_count, attached_catalogue)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [log.subject, log.body, log.recipientCount, log.sentCount, log.failedCount, log.attachedCatalogue]
  )
}
