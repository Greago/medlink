import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Application received",
  robots: { index: false, follow: false },
}

export default async function ApplicationReceivedPage({ searchParams }: { searchParams: Promise<{ ref?: string; job?: string }> }) {
  const params = await searchParams
  const reference = params.ref || ""
  const jobTitle = params.job || ""

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="careers-theme-company">
        <section className="section-shell flex min-h-[60vh] items-center justify-center py-16">
          <div className="careers-card w-full max-w-lg p-8 text-center">
            <CheckCircle2 size={44} className="mx-auto text-accent" />
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Application received</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Thank you{jobTitle ? ` for applying for ${jobTitle}` : ""}. A confirmation email is on its way to you.
            </p>
            {reference && (
              <div className="mt-5 rounded-2xl bg-muted/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your reference number</p>
                <p className="mt-1 font-mono text-xl font-bold tracking-wide">{reference}</p>
                <p className="mt-1 text-xs text-muted-foreground">Keep it safe — you will need it to track your application.</p>
              </div>
            )}
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/careers/status" className="tap-target inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 focus-ring">
                Track my application
              </Link>
              <Link href="/careers" className="tap-target inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted focus-ring">
                Back to careers
              </Link>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}