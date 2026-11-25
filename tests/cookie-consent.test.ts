import { test } from "node:test"
import assert from "node:assert/strict"
import {
  CONSENT_VERSION,
  createConsent,
  parseConsent,
  serializeConsent,
} from "@/lib/cookie-consent"

test("createConsent keeps necessary cookies enabled", () => {
  const consent = createConsent({ preferences: false, analytics: false }, new Date("2026-11-25T10:00:00.000Z"))

  assert.equal(consent.version, CONSENT_VERSION)
  assert.equal(consent.necessary, true)
  assert.equal(consent.preferences, false)
  assert.equal(consent.analytics, false)
  assert.equal(consent.updatedAt, "2026-11-25T10:00:00.000Z")
})

test("serialized consent round-trips through the parser", () => {
  const consent = createConsent({ preferences: true, analytics: false })
  const parsed = parseConsent(serializeConsent(consent))

  assert.deepEqual(parsed, consent)
})

test("parser rejects outdated or malformed consent", () => {
  assert.equal(parseConsent(null), null)
  assert.equal(parseConsent("not-json"), null)
  assert.equal(
    parseConsent(
      JSON.stringify({
        version: CONSENT_VERSION + 1,
        necessary: true,
        preferences: true,
        analytics: true,
        updatedAt: new Date().toISOString(),
      })
    ),
    null
  )
  assert.equal(
    parseConsent(
      JSON.stringify({
        version: CONSENT_VERSION,
        necessary: false,
        preferences: true,
        analytics: true,
        updatedAt: new Date().toISOString(),
      })
    ),
    null
  )
})
