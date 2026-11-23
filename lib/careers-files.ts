import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto"
import { ensureSchema, query } from "@/lib/db"

export const MAX_APPLICATION_FILE_BYTES = 5 * 1024 * 1024

export interface ApplicationFileMeta {
  id: string
  applicationId: string
  kind: "cv" | "extra"
  filename: string
  mime: string
  sizeBytes: number
  createdAt: string
}

function signingKey(): Buffer {
  // Derived from an existing secret; never logged or exposed.
  return createHash("sha256").update(`${process.env.DATABASE_URL || "medlink"}:careers-files`).digest()
}

export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() || "document"
  return base.replace(/[^a-zA-Z0-9._ -]/g, "").trim().slice(0, 120) || "document"
}

/** Verify file type by magic bytes, not just the declared MIME/extension. */
export function detectApplicationFile(buffer: Buffer, filename: string): { mime: string } | { error: string } {
  if (buffer.length === 0) return { error: "The file is empty." }
  if (buffer.length > MAX_APPLICATION_FILE_BYTES) return { error: "Files must be 5 MB or smaller." }
  const head = buffer.subarray(0, 8)
  const lower = filename.toLowerCase()
  if (head.subarray(0, 4).toString("ascii") === "%PDF") {
    return { mime: "application/pdf" }
  }
  if (head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0) {
    if (!lower.endsWith(".doc")) return { error: "Legacy Word files must use the .doc extension." }
    return { mime: "application/msword" }
  }
  if (head[0] === 0x50 && head[1] === 0x4b && (head[2] === 0x03 || head[2] === 0x05 || head[2] === 0x07)) {
    if (!lower.endsWith(".docx")) return { error: "Word documents must use the .docx extension." }
    if (!buffer.includes(Buffer.from("word/document.xml"))) {
      return { error: "That file is not a valid Word document." }
    }
    return { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
  }
  return { error: "Only PDF, DOC and DOCX files are accepted." }
}

export async function saveApplicationFile(input: {
  applicationId: string
  kind: "cv" | "extra"
  filename: string
  buffer: Buffer
}): Promise<ApplicationFileMeta> {
  await ensureSchema()
  const detected = detectApplicationFile(input.buffer, input.filename)
  if ("error" in detected) throw new Error(detected.error)
  const id = randomUUID()
  const filename = sanitizeFilename(input.filename)
  await query(
    `INSERT INTO application_files (id, application_id, kind, filename, mime, size_bytes, data)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, input.applicationId, input.kind, filename, detected.mime, input.buffer.length, input.buffer]
  )
  return {
    id,
    applicationId: input.applicationId,
    kind: input.kind,
    filename,
    mime: detected.mime,
    sizeBytes: input.buffer.length,
    createdAt: new Date().toISOString(),
  }
}

export async function listApplicationFiles(applicationId: string): Promise<ApplicationFileMeta[]> {
  await ensureSchema()
  const result = await query<{
    id: string; application_id: string; kind: string; filename: string; mime: string; size_bytes: number; created_at: Date
  }>("SELECT id, application_id, kind, filename, mime, size_bytes, created_at FROM application_files WHERE application_id = $1 ORDER BY created_at ASC", [applicationId])
  return result.rows.map((row) => ({
    id: row.id,
    applicationId: row.application_id,
    kind: row.kind === "cv" ? "cv" : "extra",
    filename: row.filename,
    mime: row.mime,
    sizeBytes: row.size_bytes,
    createdAt: new Date(row.created_at).toISOString(),
  }))
}

export async function getApplicationFile(id: string): Promise<(ApplicationFileMeta & { data: Buffer }) | null> {
  await ensureSchema()
  const result = await query<{
    id: string; application_id: string; kind: string; filename: string; mime: string; size_bytes: number; created_at: Date; data: Buffer
  }>("SELECT * FROM application_files WHERE id = $1", [id])
  const row = result.rows[0]
  if (!row) return null
  return {
    id: row.id,
    applicationId: row.application_id,
    kind: row.kind === "cv" ? "cv" : "extra",
    filename: row.filename,
    mime: row.mime,
    sizeBytes: row.size_bytes,
    createdAt: new Date(row.created_at).toISOString(),
    data: row.data,
  }
}

/** Short-lived signed token for authenticated file access. */
export function createFileAccessToken(fileId: string, ttlSeconds = 300, adminId = ""): { token: string; expires: number } {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = `${fileId}.${expires}.${adminId}`
  const token = createHmac("sha256", signingKey()).update(payload).digest("base64url")
  return { token, expires }
}

export function verifyFileAccessToken(fileId: string, token: string, expires: number, adminId = ""): boolean {
  if (!token || !expires || expires < Math.floor(Date.now() / 1000)) return false
  const expected = createHmac("sha256", signingKey()).update(`${fileId}.${expires}.${adminId}`).digest("base64url")
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
