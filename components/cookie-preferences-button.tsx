"use client"

import { OPEN_COOKIE_PREFERENCES_EVENT } from "@/lib/cookie-consent"

export function CookiePreferencesButton({
  className = "hover:text-accent",
  children = "Cookie preferences",
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))}
      className={className}
    >
      {children}
    </button>
  )
}
