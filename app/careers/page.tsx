import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, HeartHandshake, Sparkles } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { RichText } from "@/components/rich-text"
import { CareersJobList } from "@/components/careers/job-list"
import { TalentPoolForm } from "@/components/careers/talent-pool-form"
import { getCareersSettings, listPublicJobs } from "@/lib/careers-jobs"
import { siteUrl } from "@/lib/careers"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Careers & opportunities",
  description:
    "Explore open roles at Medlink Expedite — medical equipment supplies and pharmacy careers across Kenya. Apply online and track your application.",
  alternates: { canonical: `${siteUrl()}/careers` },
  openGraph: {
    title: "Careers & opportunities | Medlink Expedite",
    description: "Build your career with Medlink Expedite. View open roles in pharmacy, medical equipment and company-wide teams.",
    url: `${siteUrl()}/careers`,
    type: "website",
  },
}

export default async function CareersPage() {
  const [settings, jobs] = await Promise.all([getCareersSettings(), listPublicJobs()])

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="careers-theme-company">
        {/* Hero */}
        <section className="careers-hero">
          <div className="section-shell py-16 lg:py-24">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
              <Sparkles size={13} /> We are hiring
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {settings.heroTitle}
            </h1>
            <div className="mt-4 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
              <RichText html={settings.heroBody} className="text-white/85 [&_*]:text-inherit" />
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#open-positions"
                className="tap-target inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0c1f1d] transition hover:bg-white/90 focus-ring"
              >
                View open positions <ArrowRight size={16} />
              </a>
              <Link
                href="/careers/status"
                className="tap-target inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20 focus-ring"
              >
                Check application status
              </Link>
            </div>
          </div>
        </section>

        {/* Build your career + collage */}
        <section className="section-shell py-14 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Build your career with Medlink</h2>
              <div className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                <RichText html={settings.whyJoinUs} />
              </div>
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <HeartHandshake size={22} className="shrink-0 text-accent" />
                <p className="text-sm text-muted-foreground">
                  Meaningful work in healthcare supply — with clear growth paths, supportive teams and KSh-transparent compensation.
                </p>
              </div>
            </div>
            {settings.collage.length > 0 && (
              <div className="grid grid-cols-2 gap-3" aria-label="Life at Medlink">
                {settings.collage.slice(0, 4).map((photo, index) => (
                  <div key={`${photo.url}-${index}`} className={`relative overflow-hidden rounded-2xl ${index === 0 ? "row-span-2 min-h-64" : "min-h-32"}`}>
                    <Image src={photo.url} alt={photo.alt || "Medlink team"} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Perks */}
          {settings.perks.length > 0 && (
            <div className="mt-12">
              <h3 className="text-lg font-bold">What we offer</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {settings.perks.map((perk, index) => (
                  <div key={`${perk.title}-${index}`} className="careers-card p-5">
                    <p className="text-sm font-bold">{perk.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{perk.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Open positions */}
        <section id="open-positions" className="section-shell scroll-mt-24 pb-16">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Current vacancies</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {jobs.length > 0 ? `${jobs.length} open role${jobs.length === 1 ? "" : "s"} — apply online in minutes.` : "No open roles at the moment."}
              </p>
            </div>
          </div>
          <CareersJobList initialJobs={jobs} />
        </section>

        {/* Talent pool */}
        <section id="talent-pool" className="scroll-mt-24 border-t border-border bg-muted/30">
          <div className="section-shell grid gap-8 py-14 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Not seeing the right role?</h2>
              <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                Join our talent pool and we will keep your profile on file for future openings that match your experience.
                Your data is handled under the Kenya Data Protection Act, 2019 and you can request deletion at any time.
              </p>
            </div>
            <TalentPoolForm />
          </div>
        </section>
      </div>
      <Footer />
    </main>
  )
}