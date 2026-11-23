import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, Banknote, Briefcase, Building2, CalendarClock, Clock, MapPin, Users } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { RichText } from "@/components/rich-text"
import { ShareButtons } from "@/components/careers/share-buttons"
import { JobCard } from "@/components/careers/job-list"
import { getJobBySlug, listPublicJobs } from "@/lib/careers-jobs"
import { richTextToPlainText } from "@/lib/rich-text"
import { daysUntil, formatEatDate, formatEatDateTime, formatKshRange, jobIsLive, jobTheme, siteUrl, type Job } from "@/lib/careers"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

function descriptionFor(job: Job): string {
  const text = richTextToPlainText(job.purposeStatement || job.description)
  return text.slice(0, 160) || `${job.title} at Medlink Expedite — apply online.`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const job = await getJobBySlug(slug)
  if (!job || job.status === "draft" || job.status === "archived") return { title: "Job not found" }
  const live = jobIsLive(job)
  const description = descriptionFor(job)
  return {
    title: job.title,
    description,
    alternates: { canonical: `${siteUrl()}/careers/${job.slug}` },
    robots: live ? undefined : { index: false, follow: true },
    openGraph: {
      title: `${job.title} | Careers at Medlink Expedite`,
      description,
      url: `${siteUrl()}/careers/${job.slug}`,
      type: "website",
    },
  }
}

function OverviewRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}

export default async function JobDetailPage({ params }: PageProps) {
  const { slug } = await params
  const job = await getJobBySlug(slug)
  if (!job || job.status === "draft" || job.status === "archived") notFound()

  const live = jobIsLive(job)
  const theme = jobTheme(job.module)
  const days = daysUntil(job.expiresAt)
  const related = live
    ? (await listPublicJobs()).filter((item) => item.id !== job.id && (item.module === job.module || item.department === job.department)).slice(0, 3)
    : (await listPublicJobs()).slice(0, 3)

  const jsonLd = live
    ? {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description: richTextToPlainText(job.description || job.purposeStatement),
        datePosted: job.publishedAt || job.createdAt,
        ...(job.expiresAt ? { validThrough: job.expiresAt } : {}),
        employmentType: job.employmentType.toUpperCase().replace("-", "_"),
        hiringOrganization: {
          "@type": "Organization",
          name: "Medlink Expedite",
          sameAs: siteUrl(),
          logo: `${siteUrl()}/logo.png`,
        },
        jobLocation: {
          "@type": "Place",
          address: { "@type": "PostalAddress", addressLocality: job.location || "Nairobi", addressCountry: "KE" },
        },
        ...(job.workMode === "Remote" ? { jobLocationType: "TELECOMMUTE" } : {}),
        ...(job.salaryVisible && (job.salaryMin !== null || job.salaryMax !== null)
          ? {
              baseSalary: {
                "@type": "MonetaryAmount",
                currency: "KES",
                value: {
                  "@type": "QuantitativeValue",
                  ...(job.salaryMin !== null ? { minValue: job.salaryMin } : {}),
                  ...(job.salaryMax !== null ? { maxValue: job.salaryMax } : {}),
                  unitText: "MONTH",
                },
              },
            }
          : {}),
      }
    : null

  const sections: { title: string; html: string }[] = [
    { title: "Purpose of the role", html: job.purposeStatement },
    { title: "About the role", html: job.description },
    { title: "Key responsibilities", html: job.responsibilities },
    { title: "Required qualifications", html: job.qualificationsRequired },
    { title: "Preferred qualifications", html: job.qualificationsPreferred },
    { title: "Benefits", html: job.benefits },
  ]

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <div className={`careers-theme-${theme.name}`}>
        <section className="careers-hero">
          <div className="section-shell py-12 lg:py-16">
            <Link href="/careers" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white focus-ring rounded">
              <ArrowLeft size={14} /> All careers
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold text-white">{theme.label}</span>
              {live ? (
                <span className="rounded-full bg-emerald-400/90 px-3 py-1 text-xs font-bold text-emerald-950">Active</span>
              ) : (
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">Closed</span>
              )}
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{job.title}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/85">
              {job.department && <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {job.department}</span>}
              {job.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {job.location}</span>}
              <span className="inline-flex items-center gap-1.5"><Briefcase size={14} /> {job.employmentType} · {job.workMode}</span>
            </p>
            {live && (
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link
                  href={`/careers/${job.slug}/apply`}
                  className="tap-target inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[color:var(--c-primary)] transition hover:bg-white/90 focus-ring"
                >
                  Apply Now <ArrowRight size={16} />
                </Link>
                {job.expiresAt && days !== null && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90">
                    <Clock size={15} />
                    {days > 0 ? `Job expiry: ${days} day${days === 1 ? "" : "s"} remaining` : "Closes today"}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="section-shell grid gap-8 py-12 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            {!live && (
              <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
                <p className="text-sm font-bold">This position is no longer accepting applications.</p>
                <p className="mt-1 text-sm">
                  The role has {job.status === "expired" ? "expired" : "closed"}. Browse our{" "}
                  <Link href="/careers#open-positions" className="font-semibold underline">other open roles</Link>.
                </p>
              </div>
            )}
            {sections.filter((section) => section.html && section.html.trim()).map((section) => (
              <section key={section.title} className="mb-9">
                <h2 className="text-xl font-bold tracking-tight">{section.title}</h2>
                <div className="mt-3">
                  <RichText html={section.html} />
                </div>
              </section>
            ))}
            <div className="mt-10 border-t border-border pt-6">
              <ShareButtons title={job.title} url={`${siteUrl()}/careers/${job.slug}`} />
            </div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="careers-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Job Overview</h2>
              <div className="mt-2 divide-y divide-border/70">
                {job.department && <OverviewRow icon={Building2} label="Department" value={job.department} />}
                <OverviewRow icon={Briefcase} label="Employment type" value={job.employmentType} />
                <OverviewRow icon={Users} label="Work mode" value={job.workMode} />
                {job.location && <OverviewRow icon={MapPin} label="Location" value={job.location} />}
                <OverviewRow icon={Users} label="Openings" value={String(job.openings)} />
                {job.salaryVisible && (job.salaryMin !== null || job.salaryMax !== null) && (
                  <OverviewRow icon={Banknote} label="Salary (KSh)" value={formatKshRange(job.salaryMin, job.salaryMax)} />
                )}
                {job.expiresAt ? (
                  <OverviewRow icon={CalendarClock} label="Closing date" value={`${formatEatDateTime(job.expiresAt)} (EAT)`} />
                ) : (
                  <OverviewRow icon={CalendarClock} label="Closing date" value="Open until filled" />
                )}
                {job.publishedAt && <OverviewRow icon={Clock} label="Posted" value={formatEatDate(job.publishedAt)} />}
              </div>
              {live && (
                <Link
                  href={`/careers/${job.slug}/apply`}
                  className="tap-target mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110 focus-ring"
                >
                  Apply Now <ArrowRight size={15} />
                </Link>
              )}
            </div>

            {job.howToApply && job.howToApply.trim() && (
              <div className="careers-card p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">How to Apply</h2>
                <div className="mt-3 text-sm">
                  <RichText html={job.howToApply} />
                </div>
              </div>
            )}
          </aside>
        </section>

        {related.length > 0 && (
          <section className="section-shell pb-16">
            <h2 className="text-xl font-extrabold tracking-tight">{live ? "Related roles" : "Other open roles"}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {related.map((item) => <JobCard key={item.id} job={item} />)}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </main>
  )
}