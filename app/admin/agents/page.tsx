"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Loader2, Plus, UserRoundCog } from "lucide-react"
import { Badge, Button } from "@/components/design-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getModule } from "@/lib/modules/registry"
import { roleLabel, type AdminRole } from "@/lib/roles"
import { useStore } from "@/lib/store"

interface Agent {
  id: string
  adminUserId: string | null
  module: string
  type: string
  territory: string
  status: string
  commissionBasis: string
  commissionValue: number
  monthlyTarget: number
  targetBonus: number
  phone: string
  email: string
  idNumber: string
  adminName?: string
  adminEmail?: string
}

interface AdminOption {
  id: string
  name: string
  email: string
  role: AdminRole
}

interface AgentForm {
  adminUserId: string
  type: string
  territory: string
  status: string
  commissionBasis: string
  commissionValue: string
  monthlyTarget: string
  targetBonus: string
  phone: string
  email: string
  idNumber: string
}

const emptyForm: AgentForm = {
  adminUserId: "",
  type: "field",
  territory: "",
  status: "active",
  commissionBasis: "sales",
  commissionValue: "0",
  monthlyTarget: "0",
  targetBonus: "0",
  phone: "",
  email: "",
  idNumber: "",
}

export default function AgentsPage() {
  const activeModule = useStore((state) => state.activeModule)
  const adminRole = useStore((state) => state.adminRole)
  const moduleInfo = getModule(activeModule)
  const [agents, setAgents] = useState<Agent[]>([])
  const [admins, setAdmins] = useState<AdminOption[]>([])
  const [form, setForm] = useState<AgentForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const [agentsResponse, adminsResponse] = await Promise.all([
        fetch(`/api/agents?module=${activeModule}`, { cache: "no-store" }),
        fetch(`/api/agents/options?module=${activeModule}`, { cache: "no-store" }),
      ])
      if (!agentsResponse.ok) throw new Error("Could not load agents.")
      const agentsData = (await agentsResponse.json()) as { agents: Agent[] }
      setAgents(agentsData.agents)
      if (adminsResponse.ok) {
        const adminsData = (await adminsResponse.json()) as { admins: AdminOption[] }
        setAdmins(adminsData.admins)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load agents.")
    }
  }, [activeModule])

  useEffect(() => {
    void load()
  }, [load])

  // Prefill from the recruitment "Hired → create field agent" shortcut.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const prefillEmail = params.get("prefillEmail")
    const prefillPhone = params.get("prefillPhone")
    if (!prefillEmail && !prefillPhone) return
    setEditingId(null)
    setForm({ ...emptyForm, email: prefillEmail || "", phone: prefillPhone || "" })
    setShowForm(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openEdit = (agent: Agent) => {
    setEditingId(agent.id)
    setForm({
      adminUserId: agent.adminUserId || "",
      type: agent.type,
      territory: agent.territory,
      status: agent.status,
      commissionBasis: agent.commissionBasis,
      commissionValue: String(agent.commissionValue),
      monthlyTarget: String(agent.monthlyTarget),
      targetBonus: String(agent.targetBonus),
      phone: agent.phone,
      email: agent.email,
      idNumber: agent.idNumber,
    })
    setShowForm(true)
    setError("")
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setError("")
  }

  const save = async () => {
    setBusy(true)
    setError("")
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        module: activeModule,
        adminUserId: form.adminUserId || null,
        type: form.type,
        territory: form.territory,
        status: form.status,
        commissionBasis: form.commissionBasis,
        commissionValue: Number(form.commissionValue) || 0,
        monthlyTarget: Number(form.monthlyTarget) || 0,
        targetBonus: Number(form.targetBonus) || 0,
        phone: form.phone,
        email: form.email,
        idNumber: form.idNumber,
      }
      const response = await fetch(editingId ? `/api/agents/${editingId}` : "/api/agents", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not save the agent.")
      toast.success(editingId ? "Agent updated." : "Agent added.")
      setShowForm(false)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the agent.")
    } finally {
      setBusy(false)
    }
  }

  const remove = async (agent: Agent) => {
    if (!window.confirm(`Remove ${agent.adminName || agent.territory || "this agent"}?`)) return
    setBusy(true)
    try {
      const response = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Could not remove the agent.")
      toast.success("Agent removed.")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove the agent.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Team</p>
          <h1 className="text-3xl font-bold">Agents · {moduleInfo.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage shop and field agents, their commission terms and monthly targets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outlineSoft" asChild>
            <Link href="/admin/commissions">Commissions</Link>
          </Button>
          <Button variant="outlineSoft" asChild>
            <Link href="/admin/roles?subject=agent">Capabilities</Link>
          </Button>
          <Button onClick={openCreate}>
            <Plus size={17} /> Add agent
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <p>{error}</p>
          <button type="button" onClick={() => setError("")} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRoundCog size={18} /> Agent list
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {agents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No agents recorded for this division.
            </p>
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Agent</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Territory</th>
                  <th className="py-2">Commission</th>
                  <th className="py-2">Target</th>
                  <th className="py-2">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 font-semibold">
                      {agent.adminName || agent.adminEmail || "Unlinked agent"}
                      {agent.phone && (
                        <span className="block text-xs text-muted-foreground">{agent.phone}</span>
                      )}
                    </td>
                    <td className="py-3 capitalize">{agent.type}</td>
                    <td className="py-3">{agent.territory || "—"}</td>
                    <td className="py-3">
                      {agent.commissionBasis === "flat"
                        ? `KSh ${agent.commissionValue}`
                        : `${agent.commissionValue}% of ${agent.commissionBasis}`}
                    </td>
                    <td className="py-3">{agent.monthlyTarget > 0 ? `KSh ${agent.monthlyTarget}` : "—"}</td>
                    <td className="py-3">
                      <Badge variant={agent.status === "active" ? "success" : "secondary"}>{agent.status}</Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outlineSoft" asChild>
                          <Link href={`/admin/roles?subject=agent&id=${encodeURIComponent(agent.id)}`}>Access</Link>
                        </Button>
                        <Button size="sm" variant="outlineSoft" onClick={() => openEdit(agent)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(agent)} disabled={busy}>
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <ModalShell title={editingId ? "Edit agent" : "Add agent"} onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">Login account (optional)</span>
                <select
                  value={form.adminUserId}
                  onChange={(event) => setForm((current) => ({ ...current, adminUserId: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">No login linked</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name} · {roleLabel(admin.role)} · {admin.email}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
                Select the staff login this agent uses. Create logins under{" "}
                {adminRole === "owner" ? (
                  <Link href="/admin/staff" className="font-semibold text-primary underline">
                    Staff &amp; logins
                  </Link>
                ) : (
                  "Staff & logins"
                )}
                . Leave blank if the agent does not sign in.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">Type</span>
                <select
                  value={form.type}
                  onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="field">Field</option>
                  <option value="shop">Shop</option>
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">Territory</span>
                <input
                  value={form.territory}
                  onChange={(event) => setForm((current) => ({ ...current, territory: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">Phone</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">ID number</span>
                <input
                  value={form.idNumber}
                  onChange={(event) => setForm((current) => ({ ...current, idNumber: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">Basis</span>
                <select
                  value={form.commissionBasis}
                  onChange={(event) => setForm((current) => ({ ...current, commissionBasis: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="sales">Sales</option>
                  <option value="profit">Gross profit</option>
                  <option value="flat">Flat amount</option>
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">
                  Value ({form.commissionBasis === "flat" ? "KSh" : "%"})
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.commissionValue}
                  onChange={(event) => setForm((current) => ({ ...current, commissionValue: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">Monthly target (KSh)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthlyTarget}
                  onChange={(event) => setForm((current) => ({ ...current, monthlyTarget: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold text-muted-foreground">Target bonus (KSh)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.targetBonus}
                  onChange={(event) => setForm((current) => ({ ...current, targetBonus: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={busy}>
                {busy ? <Loader2 size={17} className="animate-spin" /> : null} Save agent
              </Button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-sm font-semibold text-muted-foreground">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
