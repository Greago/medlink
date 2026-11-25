import { MODULE_COOKIE } from "@/lib/modules/types"

export const CONSENT_COOKIE = "medlink_cookie_consent"
export const CONSENT_VERSION = 1
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export const OPEN_COOKIE_PREFERENCES_EVENT = "medlink:open-cookie-preferences"
export const CONSENT_UPDATED_EVENT = "medlink:consent-updated"

/** Admin sidebar state is a preference cookie written by the sidebar UI. */
const SIDEBAR_STATE_COOKIE = "sidebar_state"

export interface CookieConsent {
  version: number
  /** Always true. Necessary cookies cannot be switched off. */
  necessary: true
  preferences: boolean
  analytics: boolean
  updatedAt: string
}

export type OptionalConsentChoices = Pick<CookieConsent, "preferences" | "analytics">

export function createConsent(choices: OptionalConsentChoices, now: Date = new Date()): CookieConsent {
  return {
    version: CONSENT_VERSION,
    necessary: true,
    preferences: choices.preferences,
    analytics: choices.analytics,
    updatedAt: now.toISOString(),
  }
}

export function serializeConsent(consent: CookieConsent): string {
  return encodeURIComponent(JSON.stringify(consent))
}

export function parseConsent(value?: string | null): CookieConsent | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<CookieConsent>
    if (
      parsed.version !== CONSENT_VERSION ||
      parsed.necessary !== true ||
      typeof parsed.preferences !== "boolean" ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null
    }

    return {
      version: CONSENT_VERSION,
      necessary: true,
      preferences: parsed.preferences,
      analytics: parsed.analytics,
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return null
  }
}

export function readConsentFromDocument(): CookieConsent | null {
  if (typeof document === "undefined") return null

  const prefix = `${CONSENT_COOKIE}=`
  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))

  return parseConsent(entry ? entry.slice(prefix.length) : null)
}

export function writeConsentCookie(consent: CookieConsent): void {
  if (typeof document === "undefined") return

  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; secure" : ""
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(consent)}; path=/; max-age=${CONSENT_MAX_AGE_SECONDS}; samesite=lax${secure}`
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`
}

/**
 * Persists the visitor's choices and removes optional cookies when they are
 * declined. The consent cookie itself is always kept so the banner does not
 * reappear, and it records the decision for audit purposes.
 */
export function saveConsent(choices: OptionalConsentChoices): CookieConsent {
  const consent = createConsent(choices)
  writeConsentCookie(consent)

  if (!choices.preferences) {
    deleteCookie(MODULE_COOKIE)
    deleteCookie(SIDEBAR_STATE_COOKIE)
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<CookieConsent>(CONSENT_UPDATED_EVENT, { detail: consent }))
  }

  return consent
}
