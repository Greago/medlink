"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Download, KanbanSquare, LayoutList, Loader2, Mail, Search, Tags, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RichTextEditor } from "@/components/rich-text-editor-lazy"
import { APPLICATION_STAGES, STAGE_LABELS, formatEatDate, type Application, type ApplicationStage, type Job } from "@/lib/careers"
import { hasPermission } from "@/lib/roles"
import { useStore } from "@/lib/store"
import { StageBadge, Stars, fetchJson, inputCls, labelCls } from "@/components/admin/recruitment/shared"
import { NotifyStageDialog } from "@/components/admin/recruitment/notify-stage-dialog"
import type { ComposerTemplate } from "@/components/admin/recruitment/email-composer"

interface Row extends Application {
  emailBadge: { stage: string; createdAt: string } | null
  tags: string[]
  rating?: number | null
}

interface BulkResult { id: string; name: string; ok: boolean; skipped?: boolean; error?: string }

const PAGE_SIZE = 25

export default function RecruitmentApplicantsPage() {
  const role = useStore((state) => state.adminRole)
  const permissions = useStore((state) => state.adminPermissions)
  const canManage = role ? hasPermission({ role, permissions }, "recruitment.manage") : false
  const canEmail = role ? hasPermission({ role, permissions }, "recruitment.email") : false

  const [view, setView] = useState<"table" | "kanban">("table")
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [templates, setTemplates] = useState<ComposerTemplate[]>([])
  const [jobId, setJobId] = useState("")
  const [stage, setStage] = useState<ApplicationStage | "all">("all")
  const [search, setSearch] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [minRating, setMinRating] = useState("")
  const [location, setLocation] = useState("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const [pendingMove, setPendingMove] = useState<{ row: Row; toStage: ApplicationStage } | null>(null)
  const [dragOverStage, setDragOverStage] = useState("")
  const [bulkStageOpen, setBulkStageOpen] = useState(false)
  const [bulkStage, setBulkStage] = useState<ApplicationStage>("screening")
  const [bulkNotify, setBulkNotify] = useState(false)
  const [bulkTagOpen, setBulkTagOpen] = useState(false)
  const [bulkTags, setBulkTags] = useState("")
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false)
  const [bulkSubject, setBulkSubject] = useState("")
  const [bulkBody, setBulkBody] = useState("")
  const [results, setResults] = useState<BulkResult[] | null>(null)

  // Read ?jobId= from the URL without useSearchParams (keeps the page static-shell friendly).
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("jobId")
    if (initial) setJobId(initial)
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadMeta = async () => {
      try {
        const [jobData, templateData] = await Promise.all([
          fetchJson<{ jobs: Job[] }>("/api/admin/recruitment/jobs?pageSize=100"),
          fetchJson<{ templates: ComposerTemplate[] }>("/api/admin/recruitment/templates"),
        ])
        if (cancelled) return
        setJobs(jobData.jobs)
        setTemplates(templateData.templates)
      } catch { /* filters still usable without these */ }
    }
    void loadMeta()
    return () => { cancelled = true }
  }, [])

  const filterParams = useMemo(() => {
    const params = new URLSearchParams()
    if (jobId) params.set("jobId", jobId)
    if (stage !== "all") params.set("stage", stage)
    if (search.trim()) params.set("search", search.trim())
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    if (minRating) params.set("minRating", minRating)
    if (location.trim()) params.set("location", location.trim())
    return params
  }, [jobId, stage, search, from, to, minRating, location])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(filterParams)
      params.set("page", String(page))
      params.set("pageSize", view === "kanban" ? "200" : String(PAGE_SIZE))
      const data = await fetchJson<{ applications: Row[]; total: number }>(`/api/admin/recruitment/applications?${params}`)
      setRows(data.applications)
      setTotal(data.total)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load applicants.")
    } finally {
      setLoading(false)
    }
  }, [filterParams, page, view])

  useEffect(() => {
    const timer = setTimeout(() => { void load() }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  const toggleSelected = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const runBulk = async (payload: Record<string, unknown>) => {
    setBusy(true)
    try {
      const data = await fetchJson<{ results: BulkResult[] }>("/api/admin/recruitment/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], ...payload }),
      })
      setResults(data.results)
      const okCount = data.results.filter((item) => item.ok).length
      toast.success(`${okCount} of ${data.results.length} applicants processed.`)
      setSelected(new Set())
      setBulkStageOpen(false)
      setBulkTagOpen(false)
      setBulkEmailOpen(false)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk action failed.")
    } finally {
      setBusy(false)
    }
  }

  const onDrop = (toStage: ApplicationStage, event: React.DragEvent) => {
    event.preventDefault()
    setDragOverStage("")
    const id = event.dataTransfer.getData("text/plain")
    const row = rows.find((item) => item.id === id)
    if (!row || row.stage === toStage) return
    if (!canManage) {
      toast.error("You do not have permission to move applicants.")
      return
    }
    setPendingMove({ row, toStage })
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id))

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Applicants <span className="text-sm font-semibold text-muted-foreground">({total})</span></h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border p-0.5" role="tablist" aria-label="View">
            <button type="button" role="tab" aria-selected={view === "table"} onClick={() => { setView("table"); setPage(1) }} className={`tap-target inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold focus-ring ${view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <LayoutList size={13} /> Table
            </button>
            <button type="button" role="tab" aria-selected={view === "kanban"} onClick={() => { setView("kanban"); setPage(1) }} className={`tap-target inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold focus-ring ${view === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <KanbanSquare size={13} /> Kanban
            </button>
          </div>
          <a href={`/api/admin/recruitment/export?${filterParams}`} className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted focus-ring">
            <Download size={13} /> Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={labelCls}>Search
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value) }} className={`${inputCls} pl-9`} placeholder="Name, email, reference…" />
          </div>
        </label>
        <label className={labelCls}>Job
          <select value={jobId} onChange={(event) => { setPage(1); setJobId(event.target.value) }} className={inputCls}>
            <option value="">All jobs</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
        </label>
        <label className={labelCls}>Stage
          <select value={stage} onChange={(event) => { setPage(1); setStage(event.target.value as ApplicationStage | "all") }} className={inputCls}>
            <option value="all">All stages</option>
            {APPLICATION_STAGES.map((item) => <option key={item} value={item}>{STAGE_LABELS[item]}</option>)}
          </select>
        </label>
        <label className={labelCls}>Location
          <input value={location} onChange={(event) => { setPage(1); setLocation(event.target.value) }} className={inputCls} placeholder="e.g. Nairobi" />
        </label>
        <label className={labelCls}>Applied from
          <input type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value) }} className={inputCls} />
        </label>
        <label className={labelCls}>Applied to
          <input type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value) }} className={inputCls} />
        </label>
        <label className={labelCls}>Minimum rating
          <select value={minRating} onChange={(event) => { setPage(1); setMinRating(event.target.value) }} className={inputCls}>
            <option value="">Any rating</option>
            {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}+ stars</option>)}
          </select>
        </label>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && canManage && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-card p-3 shadow-sm" role="toolbar" aria-label="Bulk actions">
          <span className="text-sm font-bold">{selected.size} selected</span>
          <button type="button" onClick={() => setBulkStageOpen(true)} className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted focus-ring"><Users size={13} /> Move stage</button>
          <button type="button" onClick={() => setBulkTagOpen(true)} className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted focus-ring"><Tags size={13} /> Add tags</button>
          {canEmail && (
            <button type="button" onClick={() => setBulkEmailOpen(true)} className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted focus-ring"><Mail size={13} /> Send email</button>
          )}
          <button type="button" onClick={() => setSelected(new Set())} className="tap-target ml-auto rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted focus-ring">Clear selection</button>
        </div>
      )}

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Users size={28} className="mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No applicants match these filters</p>
        </div>
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                {canManage && (
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))}
                      aria-label="Select all on this page"
                      className="size-4 accent-[var(--primary)]"
                    />
                  </th>
                )}
                <th className="px-4 py-3 font-bold">Candidate</th>
                <th className="px-4 py-3 font-bold">Job</th>
                <th className="px-4 py-3 font-bold">Stage</th>
                <th className="px-4 py-3 font-bold">Experience</th>
                <th className="px-4 py-3 font-bold">Tags</th>
                <th className="px-4 py-3 font-bold">Last email</th>
                <th className="px-4 py-3 font-bold">Applied (EAT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30">
                  {canManage && (
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelected(row.id)} aria-label={`Select ${row.fullName}`} className="size-4 accent-[var(--primary)]" />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link href={`/admin/recruitment/applicants/${row.id}`} className="font-semibold hover:underline">{row.fullName}</Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{row.referenceNumber} · {row.currentLocation || "—"}</p>
                  </td>
                  <td className="max-w-44 truncate px-4 py-3 text-xs font-semibold">{row.jobTitle || "—"}</td>
                  <td className="px-4 py-3"><StageBadge stage={row.stage} /></td>
                  <td className="px-4 py-3 text-xs">{row.yearsExperience} yr{row.yearsExperience === 1 ? "" : "s"}</td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-40 flex-wrap gap-1">
                      {row.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">{tag}</span>)}
                      {row.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{row.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.emailBadge ? (
                      <span className="text-[11px] text-muted-foreground"><span className="font-semibold capitalize">{row.emailBadge.stage.replace(/_/g, " ")}</span> · {formatEatDate(row.emailBadge.createdAt)}</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatEatDate(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Kanban board — drag cards between stages (or use the per-card stage select). */
        <div className="flex gap-3 overflow-x-auto pb-3">
          {APPLICATION_STAGES.map((columnStage) => {
            const columnRows = rows.filter((row) => row.stage === columnStage)
            return (
              <div
                key={columnStage}
                className={`kanban-column w-64 shrink-0 rounded-2xl border border-border bg-muted/30 p-2.5 ${dragOverStage === columnStage ? "kanban-drop-target" : ""}`}
                onDragOver={(event) => { event.preventDefault(); setDragOverStage(columnStage) }}
                onDragLeave={() => setDragOverStage((current) => (current === columnStage ? "" : current))}
                onDrop={(event) => onDrop(columnStage, event)}
                aria-label={`${STAGE_LABELS[columnStage]} column, ${columnRows.length} applicants`}
              >
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{STAGE_LABELS[columnStage]}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{columnRows.length}</span>
                </div>
                <div className="space-y-2">
                  {columnRows.map((row) => (
                    <div
                      key={row.id}
                      draggable={canManage}
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", row.id)}
                      className="kanban-card rounded-xl border border-border bg-card p-3 shadow-sm"
                    >
                      <Link href={`/admin/recruitment/applicants/${row.id}`} className="block truncate text-sm font-semibold hover:underline">{row.fullName}</Link>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{row.jobTitle}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">{formatEatDate(row.createdAt)}</span>
                        {typeof row.rating === "number" && row.rating > 0 && <Stars value={row.rating} size={11} />}
                      </div>
                      {canManage && (
                        <select
                          value={row.stage}
                          onChange={(event) => setPendingMove({ row, toStage: event.target.value as ApplicationStage })}
                          aria-label={`Move ${row.fullName} to another stage`}
                          className="mt-2 h-8 w-full rounded-lg border border-border bg-background px-1.5 text-[11px] font-semibold"
                        >
                          {APPLICATION_STAGES.map((item) => <option key={item} value={item}>{STAGE_LABELS[item]}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                  {columnRows.length === 0 && <p className="px-1 py-3 text-center text-[11px] text-muted-foreground">Drop applicants here</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === "table" && pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="tap-target rounded-xl border border-border px-4 py-2 font-semibold hover:bg-muted disabled:opacity-40 focus-ring">Previous</button>
          <span className="text-xs text-muted-foreground">Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)} className="tap-target rounded-xl border border-border px-4 py-2 font-semibold hover:bg-muted disabled:opacity-40 focus-ring">Next</button>
        </div>
      )}
      {view === "kanban" && total > rows.length && (
        <p className="text-xs text-muted-foreground">Showing the first {rows.length} of {total} applicants — narrow the filters to see the rest.</p>
      )}

      {/* Stage move (single, from Kanban) */}
      {pendingMove && (
        <NotifyStageDialog
          open
          onOpenChange={(open) => { if (!open) setPendingMove(null) }}
          applicationId={pendingMove.row.id}
          candidateName={pendingMove.row.fullName}
          fromStage={pendingMove.row.stage}
          toStage={pendingMove.toStage}
          templates={templates}
          onDone={(moved) => { if (moved) void load() }}
        />
      )}

      {/* Bulk stage */}
      <Dialog open={bulkStageOpen} onOpenChange={setBulkStageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Move {selected.size} applicants</DialogTitle></DialogHeader>
          <label className={labelCls}>New stage
            <select value={bulkStage} onChange={(event) => setBulkStage(event.target.value as ApplicationStage)} className={inputCls}>
              {APPLICATION_STAGES.map((item) => <option key={item} value={item}>{STAGE_LABELS[item]}</option>)}
            </select>
          </label>
          {canEmail && (
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={bulkNotify} onChange={(event) => setBulkNotify(event.target.checked)} className="size-4 accent-[var(--primary)]" />
              Email each candidate the stage template (already-sent emails are skipped)
            </label>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setBulkStageOpen(false)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Cancel</button>
            <button type="button" disabled={busy} onClick={() => void runBulk({ action: "stage", stage: bulkStage, notify: bulkNotify })} className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring">
              {busy && <Loader2 size={14} className="animate-spin" />} Move all
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk tags */}
      <Dialog open={bulkTagOpen} onOpenChange={setBulkTagOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tag {selected.size} applicants</DialogTitle></DialogHeader>
          <label className={labelCls}>Tags (comma separated)
            <input value={bulkTags} onChange={(event) => setBulkTags(event.target.value)} className={inputCls} placeholder="e.g. strong-cv, Nairobi" />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setBulkTagOpen(false)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Cancel</button>
            <button
              type="button"
              disabled={busy || !bulkTags.trim()}
              onClick={() => void runBulk({ action: "tag", tags: bulkTags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20) })}
              className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring"
            >
              {busy && <Loader2 size={14} className="animate-spin" />} Add tags
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk email */}
      <Dialog open={bulkEmailOpen} onOpenChange={setBulkEmailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Email {selected.size} applicants</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Each candidate gets a personalised copy. Variables like {"{{candidate_name}}"} and {"{{job_title}}"} are filled automatically.</p>
          <label className={`${labelCls} mt-2`}>Subject
            <input value={bulkSubject} onChange={(event) => setBulkSubject(event.target.value)} className={inputCls} placeholder="Update on your application — {{job_title}}" />
          </label>
          <div className="mt-3">
            <RichTextEditor value={bulkBody} onChange={setBulkBody} mode="email" minHeight={180} placeholder="Write the message…" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setBulkEmailOpen(false)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Cancel</button>
            <button
              type="button"
              disabled={busy || !bulkSubject.trim() || !bulkBody.trim()}
              onClick={() => void runBulk({ action: "email", subject: bulkSubject, body: bulkBody })}
              className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Send to all
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk results report */}
      <Dialog open={Boolean(results)} onOpenChange={(open) => { if (!open) setResults(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Action report</DialogTitle></DialogHeader>
          <ul className="max-h-72 space-y-1.5 overflow-y-auto">
            {(results || []).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-semibold">{item.name || item.id}</span>
                {item.ok ? (
                  <span className="shrink-0 text-xs font-bold text-emerald-700">Done</span>
                ) : (
                  <span className="shrink-0 text-xs font-bold text-red-600">{item.skipped ? "Skipped: " : ""}{item.error || "Failed"}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={() => setResults(null)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Close</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}