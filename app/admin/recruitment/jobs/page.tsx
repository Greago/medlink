"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Archive, Briefcase, Copy, ExternalLink, Infinity as InfinityIcon, Loader2, Pencil, Plus, Search } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { daysUntil, eatLocalToUtc, formatEatDateTime, JOB_MODULES, JOB_STATUSES, jobTheme, utcToEatLocal, type Job, type JobModule, type JobStatus } from "@/lib/careers"
import { fetchJson, inputCls, JobStatusBadge, labelCls } from "@/components/admin/recruitment/shared"
import { useStore } from "@/lib/store"
import { hasPermission } from "@/lib/roles"

type JobAction = "publish" | "close" | "reopen" | "extend" | "archive" | "no-expiry" | "duplicate"

export default function RecruitmentJobsPage() {
  const router = useRouter()
  const role = useStore((state) => state.adminRole)
  const permissions = useStore((state) => state.adminPermissions)
  const canManage = role ? hasPermission({ role, permissions }, "recruitment.manage") : false

  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<JobStatus | "all">("all")
  const [module, setModule] = useState<JobModule | "all">("all")
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState("")
  const [extendJob, setExtendJob] = useState<Job | null>(null)
  const [extendValue, setExtendValue] = useState("")
  const [confirmArchive, setConfirmArchive] = useState<Job | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" })
      if (search.trim()) params.set("search", search.trim())
      if (status !== "all") params.set("status", status)
      if (module !== "all") params.set("module", module)
      const data = await fetchJson<{ jobs: Job[]; total: number }>(`/api/admin/recruitment/jobs?${params}`)
      setJobs(data.jobs)
      setTotal(data.total)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load jobs.")
    } finally {
      setLoading(false)
    }
  }, [page, search, status, module])

  useEffect(() => {
    const timer = setTimeout(() => { void load() }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  const act = async (job: Job, action: JobAction, expiresAt?: string | null) => {
    setBusyId(job.id)
    try {
      const data = await fetchJson<{ job: Job | null }>(`/api/admin/recruitment/jobs/${job.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(expiresAt !== undefined ? { expiresAt } : {}) }),
      })
      if (action === "duplicate" && data.job) {
        toast.success("Job duplicated as a draft.")
        router.push(`/admin/recruitment/jobs/${data.job.id}`)
        return
      }
      const labels: Record<JobAction, string> = {
        publish: "Job published.", close: "Job closed — no new applications.", reopen: "Job reopened.",
        extend: "Expiry extended.", archive: "Job archived.", "no-expiry": "Expiry removed — open until filled.", duplicate: "Job duplicated.",
      }
      toast.success(labels[action])
      setExtendJob(null)
      setConfirmArchive(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.")
    } finally {
      setBusyId("")
    }
  }

  const pages = Math.max(1, Math.ceil(total / 20))

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Jobs</h1>
        {canManage && (
          <Link href="/admin/recruitment/jobs/new" className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 focus-ring">
            <Plus size={15} /> New job
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={labelCls}>Search
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value) }} className={`${inputCls} pl-9`} placeholder="Title, department, location…" />
          </div>
        </label>
        <label className={labelCls}>Status
          <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value as JobStatus | "all") }} className={inputCls}>
            <option value="all">All statuses</option>
            {JOB_STATUSES.map((item) => <option key={item} value={item} className="capitalize">{item}</option>)}
          </select>
        </label>
        <label className={labelCls}>Division
          <select value={module} onChange={(event) => { setPage(1); setModule(event.target.value as JobModule | "all") }} className={inputCls}>
            <option value="all">All divisions</option>
            {JOB_MODULES.map((item) => <option key={item} value={item}>{jobTheme(item).label}</option>)}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Briefcase size={28} className="mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No jobs found</p>
          <p className="mt-1 text-xs text-muted-foreground">{canManage ? "Create your first job posting to start receiving applications." : "No jobs are assigned to you yet."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-bold">Job</th>
                <th className="px-4 py-3 font-bold">Division</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Applicants</th>
                <th className="px-4 py-3 font-bold">Expiry (EAT)</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((job) => {
                const daysLeft = job.expiresAt ? daysUntil(job.expiresAt) : null
                const warning = job.status === "published" && daysLeft !== null && daysLeft <= 3
                const expired = job.expiresAt !== null && daysLeft !== null && daysLeft < 0
                const busy = busyId === job.id
                return (
                  <tr key={job.id} className="align-middle hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/recruitment/jobs/${job.id}`} className="font-semibold hover:underline">{job.title}</Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">{[job.department, job.location, job.employmentType].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">{jobTheme(job.module).label}</td>
                    <td className="px-4 py-3"><JobStatusBadge status={job.status} /></td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/recruitment/applicants?jobId=${job.id}`} className="font-semibold text-primary hover:underline">
                        {job.applicantCount ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {job.expiresAt ? (
                        <span className={`text-xs font-semibold ${warning ? "text-amber-700" : "text-muted-foreground"}`}>
                          {formatEatDateTime(job.expiresAt)}
                          {warning && !expired && <span className="block text-[10px]">{daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}</span>}
                          {expired && <span className="block text-[10px] text-red-600">Past expiry</span>}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><InfinityIcon size={12} /> No expiry</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {busy && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                        <Link href={`/admin/recruitment/jobs/${job.id}`} title="Edit job" aria-label={`Edit ${job.title}`} className="rounded-lg p-2 hover:bg-muted focus-ring"><Pencil size={14} /></Link>
                        {job.status === "published" && (
                          <a href={`/careers/${job.slug}`} target="_blank" rel="noopener noreferrer" title="View public page" aria-label={`View ${job.title} public page`} className="rounded-lg p-2 hover:bg-muted focus-ring"><ExternalLink size={14} /></a>
                        )}
                        {canManage && !busy && (
                          <>
                            {(job.status === "draft" || job.status === "closed") && (
                              <button type="button" onClick={() => void act(job, job.status === "closed" ? "reopen" : "publish")} className="tap-target rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 focus-ring">
                                {job.status === "closed" ? "Reopen" : "Publish"}
                              </button>
                            )}
                            {job.status === "expired" && (
                              <button type="button" onClick={() => { setExtendJob(job); setExtendValue("") }} className="tap-target rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 focus-ring">
                                Extend &amp; reopen
                              </button>
                            )}
                            {job.status === "published" && (
                              <>
                                <button type="button" onClick={() => { setExtendJob(job); setExtendValue(job.expiresAt ? utcToEatLocal(job.expiresAt) : "") }} className="tap-target rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold hover:bg-muted focus-ring">Extend</button>
                                <button type="button" onClick={() => void act(job, "close")} className="tap-target rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold hover:bg-muted focus-ring">Close</button>
                              </>
                            )}
                            <button type="button" onClick={() => void act(job, "duplicate")} title="Duplicate as draft" className="tap-target rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold hover:bg-muted focus-ring"><Copy size={12} className="mr-1 inline" />Copy</button>
                            {job.status !== "archived" && (
                              <button type="button" onClick={() => setConfirmArchive(job)} title="Archive job" aria-label={`Archive ${job.title}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50 focus-ring"><Archive size={14} /></button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="tap-target rounded-xl border border-border px-4 py-2 font-semibold hover:bg-muted disabled:opacity-40 focus-ring">Previous</button>
          <span className="text-xs text-muted-foreground">Page {page} of {pages} · {total} jobs</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)} className="tap-target rounded-xl border border-border px-4 py-2 font-semibold hover:bg-muted disabled:opacity-40 focus-ring">Next</button>
        </div>
      )}

      {/* Extend expiry dialog */}
      <Dialog open={Boolean(extendJob)} onOpenChange={(open) => { if (!open) setExtendJob(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Extend expiry — {extendJob?.title}</DialogTitle></DialogHeader>
          <label className={labelCls}>New expiry date &amp; time (EAT)
            <input type="datetime-local" value={extendValue} onChange={(event) => setExtendValue(event.target.value)} className={inputCls} />
          </label>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => extendJob && void act(extendJob, "no-expiry")} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Remove expiry</button>
            <button
              type="button"
              disabled={!extendValue}
              onClick={() => extendJob && void act(extendJob, "extend", eatLocalToUtc(extendValue))}
              className="tap-target rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50 focus-ring"
            >
              Save new expiry
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation */}
      <Dialog open={Boolean(confirmArchive)} onOpenChange={(open) => { if (!open) setConfirmArchive(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Archive this job?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            &quot;{confirmArchive?.title}&quot; will be hidden from the careers site and the active jobs list. Existing applications are kept.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmArchive(null)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Cancel</button>
            <button type="button" onClick={() => confirmArchive && void act(confirmArchive, "archive")} className="tap-target rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 focus-ring">Archive job</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}