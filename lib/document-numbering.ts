import { ensureSchema, getSettings, withTransaction } from "@/lib/db"
import type { PoolClient } from "pg"
import type { AppModule } from "@/lib/modules/types"

export type DocumentType = "receipt" | "invoice" | "quote" | "credit_note" | "shift"

type Settings = Awaited<ReturnType<typeof getSettings>>

function prefixFor(module: AppModule, type: DocumentType, settings: Settings): string {
  switch (type) {
    case "receipt":
      return module === "medical" ? settings.medicalPrefix : settings.pharmacyPrefix
    case "invoice":
      return settings.invoicePrefix
    case "quote":
      return settings.quotePrefix
    case "credit_note":
      return settings.creditNotePrefix
    case "shift":
      return `${module === "medical" ? settings.medicalPrefix : settings.pharmacyPrefix}-SFT`
  }
}

/** Allocates a number using a row already locked by the caller's transaction. */
export async function nextDocumentNumberIn(
  client: PoolClient,
  module: AppModule,
  type: DocumentType,
  settings: Settings
): Promise<string> {
  const prefix = prefixFor(module, type, settings).toUpperCase().replace(/[^A-Z0-9]/g, "") || "MED"
  const result = await client.query<{ next_number: number }>(
    `SELECT next_number FROM document_sequences
     WHERE module = $1 AND document_type = $2
     FOR UPDATE OF document_sequences`,
    [module, type]
  )
  const nextNumber = result.rows[0]?.next_number
  if (!nextNumber) throw new Error(`Document sequence for ${type} is missing.`)

  await client.query(
    `UPDATE document_sequences SET prefix = $3, next_number = next_number + 1
     WHERE module = $1 AND document_type = $2`,
    [module, type, prefix]
  )
  return `${prefix}-${String(nextNumber).padStart(6, "0")}`
}

/** Standalone allocation for callers that do not already own a transaction. */
export async function nextDocumentNumber(module: AppModule, type: DocumentType): Promise<string> {
  await ensureSchema()
  const settings = await getSettings()
  return withTransaction((client) => nextDocumentNumberIn(client, module, type, settings))
}
