"use client"

import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/next"
import { CONSENT_UPDATED_EVENT, readConsentFromDocument } from "@/lib/cookie-consent"

/** Loads Vercel Analytics only after the visitor allows analytics cookies. */
export function AnalyticsConsent() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const sync = () => setAllowed(Boolean(readConsentFromDocument()?.analytics))

    sync()
    window.addEventListener(CONSENT_UPDATED_EVENT, sync)
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, sync)
  }, [])

  return allowed ? <Analytics /> : null
}
