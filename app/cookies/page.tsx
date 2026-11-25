import type { Metadata } from "next"
import Link from "next/link"
import { CookiePreferencesButton } from "@/components/cookie-preferences-button"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"

export const metadata: Metadata = {
  title: "Cookie policy",
  description: "How Medlink Expedite uses necessary, preference and analytics cookies, and how to change your choices.",
}

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <div className="section-shell max-w-3xl py-14">
        <p className="eyebrow mb-3">Your choices</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Cookie policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Medlink Expedite Ventures Limited · Nairobi, Kenya · Last updated 25 November 2026
        </p>

        <div className="rte-content mt-8">
          <h2>What cookies are</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. We use them to keep the store
            secure and usable, remember choices you make, and understand how the site is used. We do not sell personal
            data and we do not use advertising or marketing cookies.
          </p>

          <h2>Strictly necessary cookies</h2>
          <p>
            These cookies are required for the site to work and cannot be switched off. They keep you signed in, keep
            track of your cart, and remember the privacy choices you have made.
          </p>
          <ul>
            <li><code>medlink_user_session</code> — keeps customer accounts signed in.</li>
            <li><code>medlink_admin_session</code> — keeps authorised staff signed in to the admin area.</li>
            <li><code>medlink_customer_id</code> — links your cart and quotes to your session.</li>
            <li><code>medlink_cookie_consent</code> — records your cookie preferences so we do not ask again.</li>
          </ul>

          <h2>Preference cookies</h2>
          <p>
            These remember settings that make the site more convenient. They are only used if you allow them. If you
            decline, the site still works, but you may need to choose your division again on your next visit.
          </p>
          <ul>
            <li><code>medlink_module</code> — remembers whether you are viewing Medical or Pharmacy.</li>
            <li><code>sidebar_state</code> — remembers whether the admin sidebar is collapsed.</li>
          </ul>

          <h2>Analytics cookies</h2>
          <p>
            With your permission, we load Vercel Analytics to see aggregated page views and which pages are useful.
            We use this information only to improve the site. Analytics is not loaded until you allow it, and you can
            withdraw permission at any time.
          </p>

          <h2>How long cookies last</h2>
          <p>
            Session cookies expire when you close your browser or sign out. Cart, preference and consent cookies last
            up to one year. You can also clear cookies in your browser settings at any time, although that may sign you
            out or reset your preferences.
          </p>

          <h2>Change your choices</h2>
          <p>
            You can review or update your cookie preferences at any time. Recent choices take effect immediately, and
            optional cookies are removed when you decline them.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <CookiePreferencesButton className="tap-target inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110 focus-ring" />
          <Link href="/privacy" className="text-sm font-semibold text-primary hover:underline">
            Read our privacy &amp; data protection notice
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  )
}
