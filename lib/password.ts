import { randomBytes, scrypt, timingSafeEqual } from "crypto"

function scryptAsync(password: string, salt: string, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey as Buffer)
    })
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex")
  const derivedKey = await scryptAsync(password, salt, 64)
  return `scrypt:${salt}:${derivedKey.toString("hex")}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [scheme, salt, expectedHex] = storedHash.split(":")
  if (scheme !== "scrypt" || !salt || !expectedHex) return false

  const expected = Buffer.from(expectedHex, "hex")
  const actual = await scryptAsync(password, salt, expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
