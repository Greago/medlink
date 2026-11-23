import { randomUUID } from "crypto"
import { ensureSchema, query } from "@/lib/db"
import type { AppModule } from "@/lib/modules/types"

export interface AuditEvent {
  adminId?: string | null
  module?: AppModule | string
  action: string
  entityType: string
  entityId?: string
  before?: unknown
  after?: unknown
}

export async function writeAudit(event: AuditEvent): Promise<void> {
  await ensureSchema()
  await query(
    `INSERT INTO audit_log (id, admin_id, module, action, entity_type, entity_id, before, after)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
    [
      randomUUID(),
      event.adminId || null,
      event.module || "medical",
      event.action,
      event.entityType,
      event.entityId || "",
      JSON.stringify(event.before ?? {}),
      JSON.stringify(event.after ?? {}),
    ]
  )
}
