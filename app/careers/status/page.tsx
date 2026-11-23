import type { Metadata } from "next"
import { Suspense } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { StatusClient } from "@/components/careers/status-client"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Application status",
  description: "Track your Medlink Expedite job application with your reference number.",
  robots: { index: false, follow: false },
}

export default function StatusPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="careers-theme-company">
        <section className="careers-hero">
          <div className="section-shell py-10">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Application status</h1>
            <p className="mt-2 max-w-xl text-sm text-white/85">
              Track your application securely — no account needed.
            </p>
          </div>
        </section>
        <section className="section-shell py-10">
          <Suspense fallback={<div className="mx-auto h-48 max-w-2xl animate-pulse rounded-2xl bg-muted/50" />}>
            <StatusClient />
          </Suspense>
        </section>
      </div>
      <Footer />
    </main>
  )
}