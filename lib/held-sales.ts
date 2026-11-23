import { randomUUID } from "crypto"
import { ensureSchema, query } from "@/lib/db"
import type { AppModule } from "@/lib/modules/types"

export interface HeldSale {
  id: string
  module: AppModule
  branchId: string | null
  cashierId: string
  customer: unknown
  cart: unknown
  notes: string
  createdAt: string
  updatedAt: string
}

interface HeldSaleRow {
  id: string
  module: AppModule
  branch_id: string | null
  cashier_id: string
  customer: unknown
  cart: unknown
  notes: string
  created_at: string
  updated_at: string
}

function mapHeldSale(row: HeldSaleRow): HeldSale {
  return {
    id: row.id,
    module: row.module,
    branchId: row.branch_id,
    cashierId: row.cashier_id,
    customer: row.customer,
    cart: row.cart,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export interface SaveHeldSaleInput {
  id?: string
  module: AppModule
  branchId?: string | null
  cashierId: string
  customer: unknown
  cart: unknown
  notes?: string
}

export async function saveHeldSale(input: SaveHeldSaleInput): Promise<HeldSale> {
  await ensureSchema()
  const id = input.id || randomUUID()
  const result = await query<HeldSaleRow>(
    `INSERT INTO held_sales (id, module, branch_id, cashier_id, customer, cart, notes)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)
     ON CONFLICT (id) DO UPDATE SET
       module = EXCLUDED.module,
       branch_id = EXCLUDED.branch_id,
       customer = EXCLUDED.customer,
       cart = EXCLUDED.cart,
       notes = EXCLUDED.notes,
       updated_at = NOW()
     RETURNING *`,
    [
      id,
      input.module,
      input.branchId || null,
      input.cashierId,
      JSON.stringify(input.customer ?? {}),
      JSON.stringify(input.cart ?? []),
      input.notes || "",
    ]
  )
  return mapHeldSale(result.rows[0])
}

export async function listHeldSales(filters: { module: AppModule; cashierId?: string }): Promise<HeldSale[]> {
  await ensureSchema()
  const result = await query<HeldSaleRow>(
    `SELECT * FROM held_sales
     WHERE module = $1 AND ($2::uuid IS NULL OR cashier_id = $2)
     ORDER BY updated_at DESC`,
    [filters.module, filters.cashierId || null]
  )
  return result.rows.map(mapHeldSale)
}

export async function getHeldSale(id: string): Promise<HeldSale | null> {
  await ensureSchema()
  const result = await query<HeldSaleRow>("SELECT * FROM held_sales WHERE id = $1", [id])
  return result.rows[0] ? mapHeldSale(result.rows[0]) : null
}

export async function deleteHeldSale(id: string): Promise<boolean> {
  await ensureSchema()
  const result = await query("DELETE FROM held_sales WHERE id = $1", [id])
  return (result.rowCount ?? 0) > 0
}
