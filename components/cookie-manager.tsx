"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BarChart3, Check, Cookie, Lock, Settings2, ShieldCheck, X } from "lucide-react"
import {
  CONSENT_UPDATED_EVENT,
  OPEN_COOKIE_PREFERENCES_EVENT,
  readConsentFromDocument,
  saveConsent,
  type CookieConsent,
  type OptionalConsentChoices,
} from "@/lib/cookie-consent"

const ACCEPT_ALL: OptionalConsentChoices = { preferences: true, analytics: true }
const REJECT_OPTIONAL: OptionalConsentChoices = { preferences: false, analytics: false }

const cookieCategories = [
  {
    id: "necessary" as const,
    title: "Strictly necessary",
    description:
      "Required to keep the store secure and working, including sign-in sessions, your cart identity and this consent record.",
    detail: "medlink_user_session · medlink_admin_session · medlink_customer_id · medlink_cookie_consent",
    icon: ShieldCheck,
    locked: true,
  },
  {
    id: "preferences" as const,
    title: "Preferences",
    description:
      "Remember the division you chose and admin interface settings so you do not have to pick them again on every visit.",
    detail: "medlink_module · sidebar_state",
    icon: Settings2,
    locked: false,
  },
  {
    id: "analytics" as const,
    title: "Analytics",
    description:
      "Helps us understand which pages are useful through aggregated page views. This is only loaded if you allow it.",
    detail: "Vercel Analytics (page views only)",
    icon: BarChart3,
    locked: false,
  },
]

function ConsentToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-ring ${
        checked ? "bg-primary" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  )
}

export function CookieManager() {
  const [ready, setReady] = useState(false)
  const [consent, setConsent] = useState<CookieConsent | null>(null)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [draft, setDraft] = useState<OptionalConsentChoices>(REJECT_OPTIONAL)

  useEffect(() => {
    const sync = () => {
      const existing = readConsentFromDocument()
      setConsent(existing)
      setReady(true)
    }

    const openPreferences = () => {
      const current = readConsentFromDocument()
      setDraft(
        current
          ? { preferences: current.preferences, analytics: current.analytics }
          : REJECT_OPTIONAL
      )
      setPreferencesOpen(true)
    }

    const handleConsentUpdated = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsent>).detail
      if (detail) setConsent(detail)
    }

    sync()
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openPreferences)
    window.addEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated)

    return () => {
      window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openPreferences)
      window.removeEventListener(CONSENT_UPDATED_EVENT, handleConsentUpdated)
    }
  }, [])

  useEffect(() => {
    if (!preferencesOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreferencesOpen(false)
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [preferencesOpen])

  const persist = (choices: OptionalConsentChoices) => {
    const saved = saveConsent(choices)
    setConsent(saved)
    setDraft({ preferences: saved.preferences, analytics: saved.analytics })
    setPreferencesOpen(false)
  }

  return (
    <>
      {ready && !consent && !preferencesOpen && (
        <div
          role="region"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-[80] border-t border-white/15 bg-white/95 shadow-[0_-18px_45px_-25px_rgba(12,31,29,0.55)] backdrop-blur-xl"
        >
          <div className="section-shell flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Cookie size={20} />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Your privacy, your choice</p>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                  We use necessary cookies to run the store. With your permission, we also remember your preferences
                  and measure site usage. Read our{" "}
                  <Link href="/cookies" className="font-semibold text-primary underline underline-offset-2">
                    cookie policy
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => persist(REJECT_OPTIONAL)}
                className="tap-target rounded-xl border border-border bg-white px-4 text-xs font-semibold text-ink transition hover:bg-muted focus-ring"
              >
                Reject optional
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(REJECT_OPTIONAL)
                  setPreferencesOpen(true)
                }}
                className="tap-target rounded-xl border border-border bg-white px-4 text-xs font-semibold text-ink transition hover:bg-muted focus-ring"
              >
                Manage
              </button>
              <button
                type="button"
                onClick={() => persist(ACCEPT_ALL)}
                className="tap-target rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground transition hover:brightness-110 focus-ring"
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      )}

      {preferencesOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#111827]/75 p-4 backdrop-blur-md animate-fade-in"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreferencesOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-preferences-title"
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5 sm:px-8">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Cookie size={20} />
                </span>
                <div>
                  <h2 id="cookie-preferences-title" className="text-xl font-bold tracking-tight text-ink">
                    Cookie preferences
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Choose which optional cookies we may use. Necessary cookies stay on so the site works properly.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close cookie preferences"
                onClick={() => setPreferencesOpen(false)}
                autoFocus
                className="tap-target shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-ink focus-ring"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto px-6 py-5 sm:px-8">
              {cookieCategories.map((category) => {
                const Icon = category.icon
                const checked = category.locked
                  ? true
                  : category.id === "preferences"
                    ? draft.preferences
                    : draft.analytics

                return (
                  <div key={category.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon size={17} />
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-ink">{category.title}</h3>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{category.description}</p>
                          <p className="mt-2 text-[11px] font-medium text-muted-foreground/80">{category.detail}</p>
                        </div>
                      </div>

                      {category.locked ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                          <Lock size={12} /> Always on
                        </span>
                      ) : (
                        <ConsentToggle
                          checked={checked}
                          label={`Allow ${category.title.toLowerCase()} cookies`}
                          onChange={() =>
                            setDraft((current) =>
                              category.id === "preferences"
                                ? { ...current, preferences: !current.preferences }
                                : { ...current, analytics: !current.analytics }
                            )
                          }
                        />
                      )}
                    </div>
                  </div>
                )
              })}

              <p className="text-xs leading-5 text-muted-foreground">
                We do not use advertising or marketing cookies. You can change your choices at any time from the footer
                or the{" "}
                <Link href="/cookies" className="font-semibold text-primary underline underline-offset-2">
                  cookie policy
                </Link>{" "}
                page.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-5 sm:px-8">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Check size={13} className="text-primary" /> Changes take effect immediately
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => persist(REJECT_OPTIONAL)}
                  className="tap-target rounded-xl border border-border bg-white px-4 text-xs font-semibold text-ink transition hover:bg-muted focus-ring"
                >
                  Reject optional
                </button>
                <button
                  type="button"
                  onClick={() => persist(draft)}
                  className="tap-target rounded-xl border border-border bg-white px-4 text-xs font-semibold text-ink transition hover:bg-muted focus-ring"
                >
                  Save preferences
                </button>
                <button
                  type="button"
                  onClick={() => persist(ACCEPT_ALL)}
                  className="tap-target rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground transition hover:brightness-110 focus-ring"
                >
                  Accept all
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
