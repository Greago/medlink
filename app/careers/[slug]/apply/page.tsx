import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { ApplyForm } from "@/components/careers/apply-form"
import { getJobBySlug, getScreeningQuestions } from "@/lib/careers-jobs"
import { daysUntil, jobIsLive, jobTheme } from "@/lib/careers"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const job = await getJobBySlug(slug)
  return {
    title: job ? `Apply — ${job.title}` : "Apply",
    robots: { index: false, follow: false },
  }
}

export default async function ApplyPage({ params }: PageProps) {
  const { slug } = await params
  const job = await getJobBySlug(slug)
  if (!job || job.status === "draft" || job.status === "archived") notFound()
  const live = jobIsLive(job)
  const theme = jobTheme(job.module)
  const questions = live ? await getScreeningQuestions(job.id) : []
  const days = daysUntil(job.expiresAt)

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className={`careers-theme-${theme.name}`}>
        <section className="careers-hero">
          <div className="section-shell py-10">
            <Link href={`/careers/${job.slug}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white focus-ring rounded">
              <ArrowLeft size={14} /> Back to job details
            </Link>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Apply: {job.title}</h1>
            {live && job.expiresAt && days !== null && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/85">
                <Clock size={14} /> {days > 0 ? `Closes in ${days} day${days === 1 ? "" : "s"}` : "Closes today"} — submit before the deadline.
              </p>
            )}
          </div>
        </section>
        <section className="section-shell py-10">
          {live ? (
            <ApplyForm job={job} questions={questions} />
          ) : (
            <div className="mx-auto max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center text-amber-900">
              <p className="text-base font-bold">This position is no longer accepting applications.</p>
              <p className="mt-2 text-sm">
                Browse our <Link href="/careers#open-positions" className="font-semibold underline">other open roles</Link> or{" "}
                <Link href="/careers/status" className="font-semibold underline">check an existing application</Link>.
              </p>
            </div>
          )}
        </section>
      </div>
      <Footer />
    </main>
  )
}