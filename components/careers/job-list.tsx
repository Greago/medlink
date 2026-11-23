"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Briefcase, CalendarClock, Clock, MapPin, Search, SlidersHorizontal } from "lucide-react"
import type { Job } from "@/lib/careers"
import { daysUntil, formatEatDate, jobTheme } from "@/lib/careers"

function plainText(html: string): string {
  if (typeof window === "undefined") return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  const doc = new DOMParser().parseFromString(html, "text/html")
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim()
}

export function JobCard({ job }: { job: Job }) {
  const theme = jobTheme(job.module)
  const days = daysUntil(job.expiresAt)
  const expiringSoon = days !== null && days <= 3
  const summary = plainText(job.purposeStatement || job.description).slice(0, 160)
  return (
    <article className="careers-card flex flex-col p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="careers-chip rounded-full px-2.5 py-1 text-[11px] font-bold">{theme.label}</span>
        <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{job.employmentType}</span>
        <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{job.workMode}</span>
        {expiringSoon && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">Expiring soon</span>
        )}
      </div>
      <h3 className="mt-3 text-lg font-bold leading-snug text-foreground">
        <Link href={`/careers/${job.slug}`} className="hover:underline focus-ring rounded">
          {job.title}
        </Link>
      </h3>
      {job.department && <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{job.department}</p>}
      {summary && <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{summary}{summary.length >= 160 ? "…" : ""}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {job.location && <span className="inline-flex items-center gap-1"><MapPin size={13} /> {job.location}</span>}
        {job.publishedAt && <span className="inline-flex items-center gap-1"><CalendarClock size={13} /> Posted {formatEatDate(job.publishedAt)}</span>}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <div className="text-xs">
          {job.expiresAt ? (
            <span className={`inline-flex items-center gap-1 font-semibold ${expiringSoon ? "text-amber-700" : "text-muted-foreground"}`}>
              <Clock size={13} />
              {days !== null && days > 0 ? `Closes in ${days} day${days === 1 ? "" : "s"}` : "Closing today"}
              <span className="sr-only"> on {formatEatDate(job.expiresAt)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Open until filled</span>
          )}
        </div>
        <Link
          href={`/careers/${job.slug}/apply`}
          className="tap-target inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 focus-ring"
        >
          Apply Now <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  )
}

export function CareersJobList({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [loading, setLoading] = useState(false)
  const [module, setModule] = useState<string>("all")
  const [department, setDepartment] = useState("")
  const [location, setLocation] = useState("")
  const [employmentType, setEmploymentType] = useState("")
  const [workMode, setWorkMode] = useState("")
  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const departments = useMemo(() => [...new Set(initialJobs.map((job) => job.department).filter(Boolean))].sort(), [initialJobs])
  const locations = useMemo(() => [...new Set(initialJobs.map((job) => job.location).filter(Boolean))].sort(), [initialJobs])
  const types = useMemo(() => [...new Set(initialJobs.map((job) => job.employmentType))].sort(), [initialJobs])
  const modes = useMemo(() => [...new Set(initialJobs.map((job) => job.workMode))].sort(), [initialJobs])
  const modulesPresent = useMemo(() => [...new Set(initialJobs.map((job) => job.module))], [initialJobs])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (module !== "all") params.set("module", module)
      if (department) params.set("department", department)
      if (location) params.set("location", location)
      if (employmentType) params.set("employmentType", employmentType)
      if (workMode) params.set("workMode", workMode)
      if (search.trim()) params.set("search", search.trim())
      const response = await fetch(`/api/careers/jobs?${params.toString()}`)
      const data = await response.json()
      if (response.ok) setJobs(data.jobs || [])
    } catch {
      // keep previous results on network failure
    } finally {
      setLoading(false)
    }
  }, [module, department, location, employmentType, workMode, search])

  useEffect(() => {
    const timer = setTimeout(() => { void load() }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  const tabs = [
    { key: "all", label: "All roles" },
    ...(modulesPresent.includes("pharmacy") ? [{ key: "pharmacy", label: "Pharmacy" }] : []),
    ...(modulesPresent.includes("medical") ? [{ key: "medical", label: "Medical Equipment" }] : []),
    ...(modulesPresent.includes("company-wide") ? [{ key: "company-wide", label: "Company-wide" }] : []),
  ]

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Job categories" className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={module === tab.key}
              onClick={() => setModule(tab.key)}
              className={`tap-target rounded-full px-4 py-2 text-sm font-semibold transition focus-ring ${
                module === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="relative flex-1 lg:w-64">
            <span className="sr-only">Search jobs</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, department…"
              className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            aria-expanded={showFilters}
            className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted focus-ring"
          >
            <SlidersHorizontal size={15} /> Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mt-3 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-muted-foreground">
            Department
            <select value={department} onChange={(event) => setDepartment(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground">
              <option value="">All departments</option>
              {departments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Location
            <select value={location} onChange={(event) => setLocation(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground">
              <option value="">All locations</option>
              {locations.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Employment type
            <select value={employmentType} onChange={(event) => setEmploymentType(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground">
              <option value="">All types</option>
              {types.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Work mode
            <select value={workMode} onChange={(event) => setWorkMode(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground">
              <option value="">All modes</option>
              {modes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      )}

      <div aria-live="polite" className="mt-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-2xl border border-border bg-muted/40" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
            <Briefcase size={28} className="mx-auto text-muted-foreground" />
            <h3 className="mt-3 text-lg font-bold">No open roles match right now</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              New positions are posted regularly. Join our talent pool and we will reach out when a suitable role opens.
            </p>
            <Link
              href="#talent-pool"
              className="tap-target mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110 focus-ring"
            >
              Join our talent pool <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </div>
    </div>
  )
}