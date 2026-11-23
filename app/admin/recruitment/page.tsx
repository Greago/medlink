"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Briefcase, CalendarClock, Inbox, TrendingUp, Users } from "lucide-react"
import { StatCard } from "@/components/design-system"
import { APPLICATION_STAGES, STAGE_LABELS, daysUntil, formatEatDate, formatEatDateTime, type ApplicationStage } from "@/lib/careers"
import { fetchJson, StageBadge } from "@/components/admin/recruitment/shared"

interface Stats {
  openJobs: number
  totalApplicants: number
  newThisWeek: number
  interviewsToday: number
  stages: Record<string, number>
  byDepartment: { department: string; count: number }[]
  timeline: { day: string; count: number }[]
  expiringSoon: { id: string; title: string; slug: string; expiresAt: string }[]
  recentActivity: { id: string; kind: string; label: string; createdAt: string }[]
}

interface RestrictedData {
  jobs: { id: string; title: string; status: string; expiresAt: string | null }[]
  applications: { id: string; fullName: string; jobTitle?: string; stage: string; createdAt: string }[]
}

export default function RecruitmentOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [restricted, setRestricted] = useState<RestrictedData | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchJson<{ restricted: boolean; stats?: Stats } & Partial<RestrictedData>>("/api/admin/recruitment/stats")
        if (cancelled) return
        if (data.restricted) {
          setRestricted({ jobs: data.jobs || [], applications: data.applications || [] })
        } else if (data.stats) {
          setStats(data.stats)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load recruitment stats.")
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  if (error) {
    return <div className="p-6"><p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p></div>
  }

  if (restricted) {
    return (
      <div className="space-y-5 p-4 lg:p-6">
        <p className="text-sm text-muted-foreground">You only see the jobs and applicants assigned to you.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Assigned jobs" value={restricted.jobs.length} icon={Briefcase} />
          <StatCard label="Applicants in your jobs" value={restricted.applications.length} icon={Users} />
        </div>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Recent applicants</h2>
          {restricted.applications.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No applicants yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {restricted.applications.slice(0, 12).map((application) => (
                <li key={application.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/admin/recruitment/applicants/${application.id}`} className="min-w-0 hover:underline">
                    <span className="block truncate text-sm font-semibold">{application.fullName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{application.jobTitle} · {formatEatDate(application.createdAt)}</span>
                  </Link>
                  <StageBadge stage={application.stage} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    )
  }

  if (!stats) {
    return <div className="space-y-4 p-4 lg:p-6"><div className="h-28 animate-pulse rounded-2xl bg-muted/50" /><div className="h-64 animate-pulse rounded-2xl bg-muted/50" /></div>
  }

  const stageMax = Math.max(1, ...APPLICATION_STAGES.map((stage) => stats.stages[stage] || 0))
  const timelineMax = Math.max(1, ...stats.timeline.map((point) => point.count))
  const departmentMax = Math.max(1, ...stats.byDepartment.map((item) => item.count))

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Recruitment overview</h1>
        <Link href="/admin/recruitment/jobs/new" className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 focus-ring">
          <Briefcase size={15} /> Post a job
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open jobs" value={stats.openJobs} icon={Briefcase} hint="Published and accepting applications" />
        <StatCard label="Total applicants" value={stats.totalApplicants} icon={Users} />
        <StatCard label="New this week" value={stats.newThisWeek} icon={TrendingUp} />
        <StatCard label="Interviews today (EAT)" value={stats.interviewsToday} icon={CalendarClock} />
      </div>

      {stats.expiringSoon.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5" aria-label="Jobs expiring soon">
          <h2 className="text-sm font-bold text-amber-800">Closing within 3 days</h2>
          <ul className="mt-2 space-y-1.5">
            {stats.expiringSoon.map((job) => {
              const daysLeft = daysUntil(job.expiresAt) ?? 0
              return (
                <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <Link href={`/admin/recruitment/jobs/${job.id}`} className="font-semibold text-amber-900 hover:underline">{job.title}</Link>
                  <span className="text-xs font-semibold text-amber-800">
                    {daysLeft <= 0 ? "Expires today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`} · {formatEatDateTime(job.expiresAt)} EAT
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Pipeline */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Applicant pipeline</h2>
            <Link href="/admin/recruitment/applicants" className="text-xs font-semibold text-primary hover:underline">View applicants</Link>
          </div>
          <div className="relative mt-4">
            <div className="dashboard-chart-grid pointer-events-none absolute inset-0" />
            <div className="relative flex h-44 items-end gap-2">
              {APPLICATION_STAGES.map((stage) => {
                const count = stats.stages[stage] || 0
                return (
                  <div key={stage} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground">{count || ""}</span>
                    <div
                      className="w-full max-w-10 rounded-t-lg bg-primary/80"
                      style={{ height: `${Math.max(count > 0 ? 6 : 2, (count / stageMax) * 100)}%` }}
                      title={`${STAGE_LABELS[stage]}: ${count}`}
                    />
                    <span className="w-full truncate text-center text-[9px] font-semibold text-muted-foreground">{STAGE_LABELS[stage]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Applications over time */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Applications — last 14 days</h2>
          <div className="relative mt-4">
            <div className="dashboard-chart-grid pointer-events-none absolute inset-0" />
            <div className="relative flex h-44 items-end gap-1.5">
              {stats.timeline.map((point) => (
                <div key={point.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground">{point.count || ""}</span>
                  <div
                    className="w-full max-w-8 rounded-t-lg bg-accent/80"
                    style={{ height: `${Math.max(point.count > 0 ? 6 : 2, (point.count / timelineMax) * 100)}%` }}
                    title={`${point.day}: ${point.count}`}
                  />
                  <span className="text-[9px] font-semibold text-muted-foreground">{point.day.slice(8)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* By department */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Applicants by department</h2>
          {stats.byDepartment.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Inbox size={15} /> No applications yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.byDepartment.map((item) => (
                <li key={item.department}>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="truncate">{item.department}</span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="mt-1 h-2.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(item.count / departmentMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Recent activity</h2>
          {stats.recentActivity.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Inbox size={15} /> Nothing yet — publish a job to get started.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {stats.recentActivity.map((activity) => (
                <li key={`${activity.kind}-${activity.id}`} className="flex items-center justify-between gap-3 py-2.5">
                  {activity.kind === "application" ? (
                    <Link href={`/admin/recruitment/applicants/${activity.id}`} className="min-w-0 truncate text-sm font-semibold hover:underline">{activity.label}</Link>
                  ) : (
                    <span className="min-w-0 truncate text-sm font-semibold capitalize">{activity.label.replace(/_/g, " ")}</span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">{formatEatDate(activity.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}