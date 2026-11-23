"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { History, ImagePlus, Loader2, Plus, RotateCcw, Save, Send, Trash2, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RichTextEditor } from "@/components/rich-text-editor-lazy"
import { RichText } from "@/components/rich-text"
import { APPLICATION_STAGES, STAGE_LABELS, formatEatDateTime, type ApplicationStage, type CareersSettings } from "@/lib/careers"
import { fetchJson, inputCls, labelCls } from "@/components/admin/recruitment/shared"
import { useStore } from "@/lib/store"

interface Template { id: string; stage: string; subject: string; body: string; enabled: boolean; autoSend: boolean; version: number }
interface TemplateVersion { id: string; version: number; subject: string; body: string; createdAt: string }
interface TalentEntry { id: string; fullName: string; email: string; phone: string; interest: string; hasCv: boolean; cvFilename: string; createdAt: string }

/** Keep in sync with EMAIL_VARIABLES in lib/careers-emails.ts. */
const VARIABLE_OPTIONS = [
  "candidate_name", "first_name", "job_title", "reference_number", "company_name", "module_name",
  "stage", "interview_date", "interview_time", "interview_location_or_link", "interviewers",
  "closing_date", "status_page_link", "recruiter_name", "recruiter_email", "recruiter_phone",
  "salary_offer", "start_date",
].map((token) => ({ token: `{{${token}}}`, label: token.replace(/_/g, " ") }))

export default function RecruitmentSettingsPage() {
  const adminEmail = useStore((state) => state.adminEmail)
  const [settings, setSettings] = useState<CareersSettings | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [savingSettings, setSavingSettings] = useState(false)
  const [error, setError] = useState("")

  // Template editor state
  const [editing, setEditing] = useState<Template | null>(null)
  const [editSubject, setEditSubject] = useState("")
  const [editBody, setEditBody] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [versionsFor, setVersionsFor] = useState<Template | null>(null)
  const [versions, setVersions] = useState<TemplateVersion[]>([])
  const [confirmReset, setConfirmReset] = useState<Template | null>(null)
  const [busy, setBusy] = useState(false)

  // Talent pool state
  const [talent, setTalent] = useState<TalentEntry[]>([])
  const [talentTotal, setTalentTotal] = useState(0)
  const [talentSearch, setTalentSearch] = useState("")
  const [talentLoading, setTalentLoading] = useState(false)
  const [confirmTalentDelete, setConfirmTalentDelete] = useState<TalentEntry | null>(null)

  const collageFileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const loadTemplates = useCallback(async () => {
    const data = await fetchJson<{ templates: Template[] }>("/api/admin/recruitment/templates")
    setTemplates(data.templates)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [settingsData] = await Promise.all([
          fetchJson<{ settings: CareersSettings }>("/api/admin/recruitment/settings"),
          loadTemplates(),
        ])
        if (!cancelled) setSettings(settingsData.settings)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load settings.")
      }
    }
    void load()
    return () => { cancelled = true }
  }, [loadTemplates])

  const loadTalent = useCallback(async () => {
    setTalentLoading(true)
    try {
      const params = new URLSearchParams({ pageSize: "50" })
      if (talentSearch.trim()) params.set("search", talentSearch.trim())
      const data = await fetchJson<{ entries: TalentEntry[]; total: number }>(`/api/admin/recruitment/talent-pool?${params}`)
      setTalent(data.entries)
      setTalentTotal(data.total)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load the talent pool.")
    } finally {
      setTalentLoading(false)
    }
  }, [talentSearch])

  useEffect(() => {
    const timer = setTimeout(() => { void loadTalent() }, talentSearch ? 300 : 0)
    return () => clearTimeout(timer)
  }, [loadTalent, talentSearch])

  const saveSettings = async () => {
    if (!settings) return
    setSavingSettings(true)
    try {
      const data = await fetchJson<{ settings: CareersSettings }>("/api/admin/recruitment/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      setSettings(data.settings)
      toast.success("Careers settings saved.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings.")
    } finally {
      setSavingSettings(false)
    }
  }

  const uploadCollageImage = async (file: File) => {
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const response = await fetch("/api/uploads", { method: "POST", body })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error((data as { error?: string }).error || "Upload failed.")
      setSettings((current) => current ? { ...current, collage: [...current.collage, { url: (data as { url: string }).url, alt: "" }].slice(0, 8) } : current)
      toast.success("Image uploaded — remember to save.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const openTemplate = (template: Template) => {
    setEditing(template)
    setEditSubject(template.subject)
    setEditBody(template.body)
  }

  const saveTemplate = async () => {
    if (!editing) return
    setSavingTemplate(true)
    try {
      await fetchJson(`/api/admin/recruitment/templates/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, body: editBody }),
      })
      toast.success("Template saved.")
      setEditing(null)
      await loadTemplates()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the template.")
    } finally {
      setSavingTemplate(false)
    }
  }

  const toggleTemplate = async (template: Template, key: "enabled" | "autoSend", value: boolean) => {
    try {
      await fetchJson(`/api/admin/recruitment/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      })
      await loadTemplates()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the template.")
    }
  }

  const testTemplate = async (template: Template) => {
    setBusy(true)
    try {
      await fetchJson(`/api/admin/recruitment/templates/${template.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", testTo: adminEmail }),
      })
      toast.success(`Test email queued to ${adminEmail}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test send failed.")
    } finally {
      setBusy(false)
    }
  }

  const resetTemplate = async () => {
    if (!confirmReset) return
    setBusy(true)
    try {
      await fetchJson(`/api/admin/recruitment/templates/${confirmReset.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      })
      toast.success("Template restored to the default.")
      setConfirmReset(null)
      setEditing(null)
      await loadTemplates()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset the template.")
    } finally {
      setBusy(false)
    }
  }

  const openVersions = async (template: Template) => {
    setVersionsFor(template)
    setVersions([])
    try {
      const data = await fetchJson<{ versions: TemplateVersion[] }>(`/api/admin/recruitment/templates/${template.id}`)
      setVersions(data.versions)
    } catch {
      toast.error("Could not load the version history.")
    }
  }

  const deleteTalent = async () => {
    if (!confirmTalentDelete) return
    setBusy(true)
    try {
      await fetchJson(`/api/admin/recruitment/talent-pool?id=${confirmTalentDelete.id}`, { method: "DELETE" })
      toast.success("Talent pool entry deleted.")
      setConfirmTalentDelete(null)
      await loadTalent()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the entry.")
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return <div className="p-6"><p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p></div>
  }
  if (!settings) {
    return <div className="space-y-4 p-4 lg:p-6"><div className="h-24 animate-pulse rounded-2xl bg-muted/50" /><div className="h-96 animate-pulse rounded-2xl bg-muted/50" /></div>
  }

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Recruitment settings</h1>
        <button type="button" onClick={() => void saveSettings()} disabled={savingSettings} className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring">
          {savingSettings ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save careers settings
        </button>
      </div>

      <Tabs defaultValue="content">
        <TabsList className="flex-wrap">
          <TabsTrigger value="content">Careers page content</TabsTrigger>
          <TabsTrigger value="templates">Email templates</TabsTrigger>
          <TabsTrigger value="automation">Automation &amp; retention</TabsTrigger>
          <TabsTrigger value="talent">Talent pool ({talentTotal})</TabsTrigger>
        </TabsList>

        {/* Content */}
        <TabsContent value="content" className="mt-4 space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Hero</h2>
            <label className={`${labelCls} mt-3`}>Hero title
              <input value={settings.heroTitle} onChange={(event) => setSettings({ ...settings, heroTitle: event.target.value })} className={inputCls} />
            </label>
            <div className="mt-3">
              <span className={labelCls}>Hero introduction</span>
              <div className="mt-1"><RichTextEditor value={settings.heroBody} onChange={(html) => setSettings({ ...settings, heroBody: html })} minHeight={120} placeholder="Shown under the hero title on /careers…" /></div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Why join us</h2>
            <div className="mt-3"><RichTextEditor value={settings.whyJoinUs} onChange={(html) => setSettings({ ...settings, whyJoinUs: html })} minHeight={150} placeholder="What makes Medlink Expedite a great place to work…" /></div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Perks &amp; benefits</h2>
              <button type="button" onClick={() => setSettings({ ...settings, perks: [...settings.perks, { title: "", description: "" }].slice(0, 12) })} className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted focus-ring">
                <Plus size={13} /> Add perk
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {settings.perks.map((perk, index) => (
                <div key={index} className="flex flex-wrap items-start gap-2 rounded-xl border border-border p-3">
                  <input
                    value={perk.title}
                    onChange={(event) => setSettings({ ...settings, perks: settings.perks.map((item, i) => i === index ? { ...item, title: event.target.value } : item) })}
                    placeholder="Perk title"
                    aria-label={`Perk ${index + 1} title`}
                    className="h-10 min-w-40 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <input
                    value={perk.description}
                    onChange={(event) => setSettings({ ...settings, perks: settings.perks.map((item, i) => i === index ? { ...item, description: event.target.value } : item) })}
                    placeholder="Short description"
                    aria-label={`Perk ${index + 1} description`}
                    className="h-10 min-w-52 flex-[2] rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <button type="button" aria-label={`Remove perk ${index + 1}`} onClick={() => setSettings({ ...settings, perks: settings.perks.filter((_, i) => i !== index) })} className="rounded-lg p-2.5 text-red-600 hover:bg-red-50 focus-ring"><Trash2 size={14} /></button>
                </div>
              ))}
              {settings.perks.length === 0 && <p className="text-sm text-muted-foreground">No perks yet.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Team photo collage</h2>
              <button type="button" onClick={() => collageFileRef.current?.click()} disabled={uploading || settings.collage.length >= 8} className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50 focus-ring">
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />} Upload image
              </button>
              <input ref={collageFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCollageImage(file); event.target.value = "" }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">JPG or PNG, up to 4 MB, maximum 8 images. Only images uploaded here can be shown.</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {settings.collage.map((image, index) => (
                <div key={`${image.url}-${index}`} className="overflow-hidden rounded-xl border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.alt || "Team photo"} className="h-28 w-full object-cover" />
                  <div className="flex items-center gap-1 p-2">
                    <input
                      value={image.alt}
                      onChange={(event) => setSettings({ ...settings, collage: settings.collage.map((item, i) => i === index ? { ...item, alt: event.target.value } : item) })}
                      placeholder="Alt text"
                      aria-label={`Image ${index + 1} alt text`}
                      className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-[11px] outline-none focus:border-primary"
                    />
                    <button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => setSettings({ ...settings, collage: settings.collage.filter((_, i) => i !== index) })} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 focus-ring"><X size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Applicant privacy notice</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Shown on the apply form and the privacy page. Explain what data you collect and how long you keep it.</p>
            <div className="mt-3"><RichTextEditor value={settings.privacyText} onChange={(html) => setSettings({ ...settings, privacyText: html })} minHeight={180} placeholder="Privacy notice for applicants…" /></div>
          </section>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Stage templates are used by the notify dialog and bulk emails. &quot;Auto-send&quot; marks the default choice when moving stages; nothing is sent without a recruiter confirming.
          </p>
          {templates.map((template) => (
            <section key={template.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold capitalize">{template.stage.replace(/_/g, " ")} <span className="text-[10px] font-semibold text-muted-foreground">v{template.version}</span></p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{template.subject}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                    <input type="checkbox" checked={template.enabled} onChange={(event) => void toggleTemplate(template, "enabled", event.target.checked)} className="size-4 accent-[var(--primary)]" /> Enabled
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                    <input type="checkbox" checked={template.autoSend} onChange={(event) => void toggleTemplate(template, "autoSend", event.target.checked)} className="size-4 accent-[var(--primary)]" /> Auto-send
                  </label>
                  <button type="button" onClick={() => openTemplate(template)} className="tap-target rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted focus-ring">Edit</button>
                  <button type="button" disabled={busy} onClick={() => void testTemplate(template)} className="tap-target inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted focus-ring"><Send size={11} /> Test</button>
                  <button type="button" onClick={() => void openVersions(template)} title="Version history" className="tap-target rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted focus-ring"><History size={12} /></button>
                  <button type="button" onClick={() => setConfirmReset(template)} title="Restore default" className="tap-target rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted focus-ring"><RotateCcw size={12} /></button>
                </div>
              </div>
            </section>
          ))}
        </TabsContent>

        {/* Automation & retention */}
        <TabsContent value="automation" className="mt-4 space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Stage email defaults</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Preselect &quot;email the candidate&quot; in the move dialog for these stages.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {APPLICATION_STAGES.map((stage) => (
                <label key={stage} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.autoSend[stage as ApplicationStage])}
                    onChange={(event) => setSettings({ ...settings, autoSend: { ...settings.autoSend, [stage]: event.target.checked } })}
                    className="size-4 accent-[var(--primary)]"
                  />
                  {STAGE_LABELS[stage]}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Expiry digest</h2>
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={settings.digestEnabled} onChange={(event) => setSettings({ ...settings, digestEnabled: event.target.checked })} className="size-4 accent-[var(--primary)]" />
              Email recruiters a daily digest of jobs closing within 3 days (requires the cron endpoint)
            </label>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Data retention</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              When enabled, rejected/withdrawn applications older than this many months are anonymised by the cron job (names, contact details and CVs removed; statistics kept). Off by default.
            </p>
            <label className={`${labelCls} mt-3 max-w-52`}>Retention period (months, 0 = off)
              <input
                type="number" min={0} max={120}
                value={settings.retentionMonths}
                onChange={(event) => setSettings({ ...settings, retentionMonths: Math.max(0, Math.min(120, Number(event.target.value) || 0)) })}
                className={inputCls}
              />
            </label>
            {settings.retentionMonths > 0 && (
              <p role="alert" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Retention is ON — old rejected/withdrawn applications will be anonymised after {settings.retentionMonths} month{settings.retentionMonths === 1 ? "" : "s"}.
              </p>
            )}
          </section>
        </TabsContent>

        {/* Talent pool */}
        <TabsContent value="talent" className="mt-4 space-y-3">
          <label className={`${labelCls} max-w-sm`}>Search talent pool
            <input value={talentSearch} onChange={(event) => setTalentSearch(event.target.value)} className={inputCls} placeholder="Name, email or interest…" />
          </label>
          {talentLoading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-muted/50" />
          ) : talent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No talent pool signups yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-bold">Name</th>
                    <th className="px-4 py-3 font-bold">Contact</th>
                    <th className="px-4 py-3 font-bold">Interest</th>
                    <th className="px-4 py-3 font-bold">CV</th>
                    <th className="px-4 py-3 font-bold">Signed up (EAT)</th>
                    <th className="px-4 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {talent.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold">{entry.fullName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{entry.email}<br />{entry.phone}</td>
                      <td className="max-w-48 truncate px-4 py-3 text-xs">{entry.interest || "—"}</td>
                      <td className="px-4 py-3 text-xs">{entry.hasCv ? entry.cvFilename : "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatEatDateTime(entry.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setConfirmTalentDelete(entry)} title="Delete entry" aria-label={`Delete ${entry.fullName}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50 focus-ring"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template editor */}
      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="capitalize">Edit template — {editing?.stage.replace(/_/g, " ")}</DialogTitle></DialogHeader>
          <label className={labelCls}>Subject
            <input value={editSubject} onChange={(event) => setEditSubject(event.target.value)} className={inputCls} />
          </label>
          <div className="mt-3">
            <RichTextEditor value={editBody} onChange={setEditBody} mode="email" variables={VARIABLE_OPTIONS} minHeight={220} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Cancel</button>
            <button type="button" onClick={() => void saveTemplate()} disabled={savingTemplate} className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring">
              {savingTemplate && <Loader2 size={14} className="animate-spin" />} Save template
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version history */}
      <Dialog open={Boolean(versionsFor)} onOpenChange={(open) => { if (!open) setVersionsFor(null) }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Version history</DialogTitle></DialogHeader>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No earlier versions saved yet.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {versions.map((version) => (
                <li key={version.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold">Version {version.version}</span>
                    <span className="text-muted-foreground">{formatEatDateTime(version.createdAt)} EAT</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold">{version.subject}</p>
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-muted/30 p-2"><RichText html={version.body} /></div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset confirmation */}
      <Dialog open={Boolean(confirmReset)} onOpenChange={(open) => { if (!open) setConfirmReset(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Restore the default template?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Your edits will be kept in the version history, but the active template returns to the built-in default.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmReset(null)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Cancel</button>
            <button type="button" disabled={busy} onClick={() => void resetTemplate()} className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 focus-ring">
              {busy && <Loader2 size={14} className="animate-spin" />} Restore default
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Talent delete confirmation */}
      <Dialog open={Boolean(confirmTalentDelete)} onOpenChange={(open) => { if (!open) setConfirmTalentDelete(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete talent pool entry?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This permanently removes {confirmTalentDelete?.fullName}&apos;s signup and CV.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmTalentDelete(null)} className="tap-target rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-ring">Cancel</button>
            <button type="button" disabled={busy} onClick={() => void deleteTalent()} className="tap-target inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 focus-ring">
              {busy && <Loader2 size={14} className="animate-spin" />} Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}