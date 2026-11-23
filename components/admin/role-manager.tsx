"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowRight, Check, Link2, Loader2, ShieldCheck, UserRoundCog, Users } from "lucide-react"
import { Badge, Button, SectionHeader } from "@/components/design-system"
import { Card, CardContent } from "@/components/ui/card"
import { getModule } from "@/lib/modules/registry"
import {
  ASSIGNABLE_ROLES,
  CAPABILITY_GROUPS,
  getDefaultPermissions,
  PERMISSIONS,
  roleLabel,
  type AdminRole,
  type Permission,
} from "@/lib/roles"
import { useStore } from "@/lib/store"

interface StaffOption {
  id: string
  name: string
  email: string
  role: AdminRole
  status: string
  permissions: Permission[] | null
}

interface AgentOption {
  id: string
  adminUserId: string | null
  adminName?: string
  adminEmail?: string
  email?: string
  territory: string
  type: string
  status: string
  module: string
}

type SubjectType = "staff" | "agent"
type Preset = AdminRole | "custom"

export function RoleManager({
  initialSubject,
  initialId,
}: {
  initialSubject?: string
  initialId?: string
}) {
  const adminRole = useStore((state) => state.adminRole)
  const activeModule = useStore((state) => state.activeModule)
  const moduleInfo = getModule(activeModule)

  const [subjectType, setSubjectType] = useState<SubjectType>(initialSubject === "agent" ? "agent" : "staff")
  const [selectedId, setSelectedId] = useState(initialId || "")
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [listsLoaded, setListsLoaded] = useState(false)
  const [preset, setPreset] = useState<Preset>("custom")
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (initialSubject === "agent" || initialSubject === "staff") setSubjectType(initialSubject)
  }, [initialSubject])

  useEffect(() => {
    if (initialId) setSelectedId(initialId)
  }, [initialId])

  const load = useCallback(async () => {
    if (adminRole && adminRole !== "owner") return
    setListsLoaded(false)
    setError("")
    try {
      const [staffResponse, agentsResponse] = await Promise.all([
        fetch("/api/admin/staff", { cache: "no-store" }),
        fetch(`/api/agents?module=${activeModule}`, { cache: "no-store" }),
      ])
      const staffData = (await staffResponse.json().catch(() => ({}))) as {
        staff?: StaffOption[]
        error?: string
      }
      const agentsData = (await agentsResponse.json().catch(() => ({}))) as {
        agents?: AgentOption[]
        error?: string
      }
      if (!staffResponse.ok) throw new Error(staffData.error || "Could not load staff logins.")
      if (!agentsResponse.ok) throw new Error(agentsData.error || "Could not load agents.")
      setStaff(staffData.staff || [])
      setAgents(agentsData.agents || [])
      setListsLoaded(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load roles.")
      setListsLoaded(true)
    }
  }, [adminRole, activeModule])

  useEffect(() => {
    void load()
  }, [load])

  const options = useMemo(
    () => (subjectType === "staff" ? staff : agents),
    [subjectType, staff, agents]
  )

  useEffect(() => {
    if (!listsLoaded) return
    if (!options.some((option) => option.id === selectedId)) {
      setSelectedId(options[0]?.id || "")
    }
  }, [listsLoaded, options, selectedId])

  const selectedStaff = subjectType === "staff" ? staff.find((item) => item.id === selectedId) : undefined
  const selectedAgent = subjectType === "agent" ? agents.find((item) => item.id === selectedId) : undefined
  const targetAdminId = subjectType === "staff" ? selectedStaff?.id : selectedAgent?.adminUserId || ""
  const targetAdmin = staff.find((item) => item.id === targetAdminId)

  const targetName =
    subjectType === "staff"
      ? selectedStaff?.name || ""
      : selectedAgent?.adminName || selectedAgent?.territory || "Unnamed agent"
  const targetEmail =
    subjectType === "staff"
      ? selectedStaff?.email || ""
      : selectedAgent?.adminEmail || selectedAgent?.email || ""

  const isOwner = targetAdmin?.role === "owner"
  const needsLoginLink = subjectType === "agent" && !selectedAgent?.adminUserId

  const targetKey = targetAdmin?.id || ""
  const targetRole = targetAdmin?.role
  const targetPermissionsKey = JSON.stringify(targetAdmin?.permissions || null)

  useEffect(() => {
    if (!targetAdmin) {
      setPermissions([])
      setPreset("custom")
      return
    }
    setPermissions(targetAdmin.permissions ?? getDefaultPermissions(targetAdmin.role))
    setPreset(targetAdmin.permissions ? "custom" : targetAdmin.role)
  }, [targetKey, targetRole, targetPermissionsKey])

  const changeSubjectType = (type: SubjectType) => {
    setSubjectType(type)
    setSelectedId("")
    setError("")
  }

  const applyPreset = (value: Preset) => {
    setPreset(value)
    if (value !== "custom") setPermissions(getDefaultPermissions(value))
  }

  const toggleCapability = (permission: Permission) => {
    setPreset("custom")
    setPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]
    )
  }

  const setGroupCapabilities = (groupPermissions: Permission[], enabled: boolean) => {
    setPreset("custom")
    setPermissions((current) => {
      const withoutGroup = current.filter((item) => !groupPermissions.includes(item))
      return enabled ? [...withoutGroup, ...groupPermissions] : withoutGroup
    })
  }

  const setAllCapabilities = (enabled: boolean) => {
    setPreset("custom")
    setPermissions(enabled ? [...PERMISSIONS] : [])
  }

  const save = async () => {
    if (!targetAdminId || isOwner || needsLoginLink) return
    setBusy(true)
    setError("")
    try {
      const roleUpdate =
        preset !== "custom" && targetAdmin && preset !== targetAdmin.role ? { role: preset } : {}
      const response = await fetch(`/api/admin/staff/${targetAdminId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...roleUpdate, permissions }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        staff?: StaffOption
        error?: string
      }
      if (!response.ok) throw new Error(data.error || "Could not save capabilities.")
      if (data.staff) {
        const updated = data.staff
        setStaff((current) =>
          current.map((item) =>
            item.id === updated.id
              ? { ...item, role: updated.role, permissions: updated.permissions }
              : item
          )
        )
      }
      toast.success(`Capabilities saved for ${targetName || "this login"}.`)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not save capabilities."
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  if (adminRole && adminRole !== "owner") {
    return (
      <div className="p-4 lg:p-7">
        <Card className="mx-auto max-w-lg p-7 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck size={24} />
          </span>
          <h1 className="mt-4 text-xl font-bold">Owner access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Only the owner can change roles and individual capabilities.
          </p>
          <Button asChild className="mt-5">
            <Link href="/admin/dashboard">Back to dashboard</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 lg:p-7">
      <SectionHeader
        eyebrow="Team"
        title="Roles & capabilities"
        description="Pick a staff login or an agent, then assign each capability individually. Nothing is bundled unless you choose a preset to start from."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outlineSoft">
              <Link href="/admin/staff">Staff & logins</Link>
            </Button>
            <Button asChild variant="outlineSoft">
              <Link href="/admin/agents">Agents</Link>
            </Button>
          </div>
        }
      />

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <p>{error}</p>
          <button type="button" onClick={() => setError("")} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Assign to</p>
              <div className="flex rounded-xl border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => changeSubjectType("staff")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    subjectType === "staff" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <Users size={16} /> Staff user
                </button>
                <button
                  type="button"
                  onClick={() => changeSubjectType("agent")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    subjectType === "agent" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <UserRoundCog size={16} /> Agent
                </button>
              </div>
            </div>

            <label className="block text-xs">
              <span className="mb-2 block font-semibold text-muted-foreground">
                {subjectType === "staff" ? "Choose staff login" : `Choose agent · ${moduleInfo.label}`}
              </span>
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              >
                {options.length === 0 && <option value="">No {subjectType === "staff" ? "staff logins" : "agents"} available</option>}
                {options.map((option) => {
                  const label =
                    subjectType === "staff"
                      ? `${(option as StaffOption).name} · ${(option as StaffOption).email}`
                      : `${(option as AgentOption).adminName || (option as AgentOption).territory || "Unnamed agent"}${
                          (option as AgentOption).adminUserId ? "" : " · no login linked"
                        }`
                  return (
                    <option key={option.id} value={option.id}>
                      {label}
                    </option>
                  )
                })}
              </select>
            </label>
          </div>

          {targetAdmin && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-primary/5 px-4 py-3">
              <Badge variant="soft">{targetAdmin.status === "active" ? "Active login" : "Inactive login"}</Badge>
              <span className="text-sm font-semibold">{targetName}</span>
              <span className="text-xs text-muted-foreground">{targetEmail}</span>
              <ArrowRight size={14} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-primary">{roleLabel(targetAdmin.role)}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {targetAdmin.permissions ? "Custom capability set" : "Using role defaults"}
              </span>
            </div>
          )}

          {needsLoginLink && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
              <Link2 size={16} />
              <span>This agent has no staff login linked. Link a login in Agents before assigning capabilities.</span>
              <Button asChild variant="outlineSoft" size="sm">
                <Link href="/admin/agents">Open agents</Link>
              </Button>
            </div>
          )}

          {isOwner && (
            <div className="rounded-2xl border border-info/30 bg-info/5 px-4 py-3 text-sm text-info">
              The owner account keeps every capability and cannot be edited here.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <label className="block text-xs">
              <span className="mb-2 block font-semibold text-muted-foreground">Start from</span>
              <select
                value={preset}
                onChange={(event) => applyPreset(event.target.value as Preset)}
                disabled={!targetAdminId || isOwner}
                className="h-11 min-w-64 rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25 disabled:opacity-60"
              >
                <option value="custom">Custom — choose capabilities below</option>
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)} defaults
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={permissions.length ? "success" : "warning"}>
                {permissions.length} / {PERMISSIONS.length} capabilities
              </Badge>
              <Button variant="outlineSoft" size="sm" onClick={() => setAllCapabilities(true)} disabled={!targetAdminId || isOwner}>
                Select all
              </Button>
              <Button variant="outlineSoft" size="sm" onClick={() => setAllCapabilities(false)} disabled={!targetAdminId || isOwner}>
                Clear all
              </Button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {CAPABILITY_GROUPS.map((group) => {
              const groupPermissions = group.capabilities.map((capability) => capability.permission)
              const selectedCount = groupPermissions.filter((permission) => permissions.includes(permission)).length
              return (
                <div key={group.label} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold">{group.label}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{group.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {selectedCount}/{groupPermissions.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setGroupCapabilities(groupPermissions, true)}
                        disabled={!targetAdminId || isOwner}
                        className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
                      >
                        Select
                      </button>
                      <button
                        type="button"
                        onClick={() => setGroupCapabilities(groupPermissions, false)}
                        disabled={!targetAdminId || isOwner}
                        className="text-[11px] font-semibold text-muted-foreground hover:underline disabled:opacity-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {group.capabilities.map((capability) => {
                      const checked = permissions.includes(capability.permission)
                      return (
                        <label
                          key={capability.permission}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                            checked ? "border-primary/30 bg-primary/5" : "border-border/70 hover:bg-muted/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={checked}
                            disabled={!targetAdminId || isOwner}
                            onChange={() => toggleCapability(capability.permission)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-sm font-semibold">
                              {capability.label}
                              {checked && <Check size={13} className="text-primary" />}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{capability.description}</span>
                            <code className="mt-1 block text-[10px] text-muted-foreground">{capability.permission}</code>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">{targetName || "No target selected"}</p>
              <p>
                {permissions.length} of {PERMISSIONS.length} capabilities will be enforced by the menu and the APIs.
              </p>
            </div>
            <Button
              onClick={() => void save()}
              disabled={busy || !targetAdminId || isOwner || needsLoginLink}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {busy ? "Saving…" : "Save capabilities"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
