"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2, Plus, ShieldCheck, UserRoundCog } from "lucide-react"
import { Badge, Button, SectionHeader } from "@/components/design-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getModule } from "@/lib/modules/registry"
import type { AppModule } from "@/lib/modules/types"
import {
  CAPABILITY_GROUPS,
  getDefaultPermissions,
  roleLabel,
  type AdminRole,
  type Permission,
} from "@/lib/roles"
import { useStore } from "@/lib/store"

const MODULE_OPTIONS: AppModule[] = ["medical", "pharmacy"]
const ROLE_OPTIONS: AdminRole[] = ["manager", "hr_manager", "interviewer", "cashier", "field_agent", "accountant"]

interface StaffMember {
  id: string
  name: string
  email: string
  role: AdminRole
  modules: AppModule[]
  status: "active" | "inactive"
  maxDiscountPercent: number
  permissions: Permission[] | null
  mustChangePassword: boolean
  phone: string
  idNumber: string
  createdAt: string
}

interface StaffForm {
  name: string
  email: string
  password: string
  role: AdminRole
  modules: AppModule[]
  status: "active" | "inactive"
  maxDiscountPercent: string
  customAccess: boolean
  permissions: Permission[]
  sendEmail: boolean
  phone: string
  idNumber: string
}

const emptyForm: StaffForm = {
  name: "",
  email: "",
  password: "",
  role: "field_agent",
  modules: ["medical"],
  status: "active",
  maxDiscountPercent: "0",
  customAccess: false,
  permissions: [],
  sendEmail: true,
  phone: "",
  idNumber: "",
}

export default function StaffPage() {
  const adminRole = useStore((state) => state.adminRole)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [form, setForm] = useState<StaffForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/staff", { cache: "no-store" })
      const data = (await response.json().catch(() => ({}))) as { staff?: StaffMember[]; error?: string }
      if (!response.ok) throw new Error(data.error || "Could not load staff accounts.")
      setStaff(data.staff || [])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load staff accounts.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (adminRole === "owner") void load()
    else setLoading(false)
  }, [adminRole, load])

  // Prefill from the recruitment "Hired → create staff login" shortcut.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const prefillName = params.get("prefillName")
    const prefillEmail = params.get("prefillEmail")
    if (!prefillName && !prefillEmail) return
    setEditingId(null)
    setForm({
      ...emptyForm,
      name: prefillName || "",
      email: prefillEmail || "",
      phone: params.get("prefillPhone") || "",
    })
    setShowForm(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowPassword(false)
    setError("")
    setShowForm(true)
  }

  const openEdit = (member: StaffMember) => {
    setEditingId(member.id)
    setForm({
      name: member.name,
      email: member.email,
      password: "",
      role: member.role,
      modules: member.modules.length ? member.modules : ["medical"],
      status: member.status,
      maxDiscountPercent: String(member.maxDiscountPercent),
      customAccess: Boolean(member.permissions),
      permissions: member.permissions || getDefaultPermissions(member.role),
      sendEmail: false,
      phone: member.phone,
      idNumber: member.idNumber,
    })
    setShowPassword(false)
    setError("")
    setShowForm(true)
  }

  const toggleModule = (module: AppModule) => {
    setForm((current) => ({
      ...current,
      modules: current.modules.includes(module)
        ? current.modules.filter((item) => item !== module)
        : [...current.modules, module],
    }))
  }

  const changeRole = (role: AdminRole) => {
    setForm((current) => ({
      ...current,
      role,
      permissions: current.customAccess ? current.permissions : getDefaultPermissions(role),
    }))
  }

  const toggleCustomAccess = (customAccess: boolean) => {
    setForm((current) => ({
      ...current,
      customAccess,
      permissions: customAccess
        ? current.permissions.length
          ? current.permissions
          : getDefaultPermissions(current.role)
        : [],
    }))
  }

  const togglePermission = (permission: Permission) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }))
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (form.modules.length === 0) {
      toast.error("Choose at least one division.")
      return
    }
    if (!editingId && form.password.length < 8) {
      toast.error("Use a password of at least 8 characters.")
      return
    }

    setBusy(true)
    setError("")
    try {
      const base = {
        name: form.name,
        email: form.email,
        role: form.role,
        modules: form.modules,
        status: form.status,
        maxDiscountPercent: Number(form.maxDiscountPercent) || 0,
        permissions: form.customAccess ? form.permissions : null,
        phone: form.phone,
        idNumber: form.idNumber,
      }
      const payload = editingId
        ? { ...base, ...(form.password ? { newPassword: form.password } : {}) }
        : { ...base, password: form.password, sendEmail: form.sendEmail }

      const response = await fetch(editingId ? `/api/admin/staff/${editingId}` : "/api/admin/staff", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        emailSent?: boolean
        emailError?: string
      }
      if (!response.ok) throw new Error(data.error || "Could not save the staff account.")

      if (editingId) {
        toast.success(
          form.password
            ? "Staff account updated. They must change the new password at next login."
            : "Staff account updated."
        )
      } else if (form.sendEmail && data.emailSent) {
        toast.success("Staff account created and welcome email sent.")
      } else {
        toast.success(
          form.sendEmail && data.emailError
            ? `Staff account created, but the email failed: ${data.emailError}`
            : "Staff account created. Share the credentials securely."
        )
      }
      setShowForm(false)
      setForm(emptyForm)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the staff account.")
    } finally {
      setBusy(false)
    }
  }

  const toggleStatus = async (member: StaffMember) => {
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: member.status === "active" ? "inactive" : "active" }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not update the staff account.")
      toast.success(member.status === "active" ? "Staff account deactivated." : "Staff account reactivated.")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the staff account.")
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
            Only the owner can create staff logins and change their roles or passwords.
          </p>
          <Button asChild className="mt-5">
            <Link href="/admin/dashboard">Back to dashboard</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const inputClass =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"

  return (
    <div className="space-y-6 p-4 lg:p-7">
      <SectionHeader
        eyebrow="Team"
        title="Staff & logins"
        description="Create the login an agent or cashier uses to sign in, then link it to their agent record for commissions."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outlineSoft">
              <Link href="/admin/roles?subject=staff">
                <ShieldCheck size={16} /> Roles & capabilities
              </Link>
            </Button>
            <Button onClick={openCreate}>
              <Plus size={17} /> Add staff login
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-start gap-3 rounded-2xl bg-primary/5 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserRoundCog size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Staff login and agent record are different things</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                A <strong>staff login</strong> is the email and password used at /admin/login. An{" "}
                <strong>agent record</strong> holds territory, commission and targets. Create the login here, then select
                it in Agents → Login account. New logins must change their password at first sign-in, and staff can
                reset a forgotten password from the admin login page.
              </p>
            </div>
            <Button asChild variant="outlineSoft" size="sm">
              <Link href="/admin/agents">Open agents</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

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
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Loading staff accounts…
            </div>
          ) : staff.length === 0 ? (
            <p className="py-10 text-sm text-muted-foreground">No staff accounts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2">Staff</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Page access</th>
                    <th className="py-2">Divisions</th>
                    <th className="py-2">Discount limit</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Password</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => {
                    const isOwner = member.role === "owner"
                    return (
                      <tr key={member.id} className="border-b border-border/60 last:border-0">
                        <td className="py-3 font-semibold">
                          {member.name}
                          <span className="block text-xs font-normal text-muted-foreground">{member.email}</span>
                          {member.phone && (
                            <span className="block text-xs font-normal text-muted-foreground">{member.phone}</span>
                          )}
                        </td>
                        <td className="py-3">{roleLabel(member.role)}</td>
                        <td className="py-3">
                          {member.permissions ? (
                            <Badge variant="warning">{member.permissions.length} custom</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Role defaults</span>
                          )}
                        </td>
                        <td className="py-3">
                          {member.modules.map((module) => getModule(module).label).join(", ") || "—"}
                        </td>
                        <td className="py-3">{member.maxDiscountPercent}%</td>
                        <td className="py-3">
                          <Badge variant={member.status === "active" ? "success" : "secondary"}>
                            {member.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-3">
                          {member.mustChangePassword ? (
                            <Badge variant="warning">Change required</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Set</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {isOwner ? (
                            <span className="text-xs text-muted-foreground">Managed in My account</span>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outlineSoft" asChild>
                                <Link href={`/admin/roles?subject=staff&id=${encodeURIComponent(member.id)}`}>
                                  Access
                                </Link>
                              </Button>
                              <Button size="sm" variant="outlineSoft" onClick={() => openEdit(member)} disabled={busy}>
                                Edit / reset
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => toggleStatus(member)} disabled={busy}>
                                {member.status === "active" ? "Deactivate" : "Reactivate"}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{editingId ? "Edit staff login" : "Add staff login"}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {editingId
                    ? "Change access, reset the password, or deactivate this login."
                    : "These credentials are used at /admin/login."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close"
                className="text-sm font-semibold text-muted-foreground"
              >
                Close
              </button>
            </div>

            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  <span className="mb-1 block font-semibold text-muted-foreground">Full name</span>
                  <input
                    required
                    minLength={2}
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className={inputClass}
                    placeholder="e.g. Jane Wanjiku"
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-semibold text-muted-foreground">Email / login</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className={inputClass}
                    placeholder="jane@medlinkexpedite.co.ke"
                    autoComplete="off"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  <span className="mb-1 block font-semibold text-muted-foreground">Role</span>
                  <select
                    value={form.role}
                    onChange={(event) => changeRole(event.target.value as AdminRole)}
                    className={inputClass}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-semibold text-muted-foreground">Status</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as "active" | "inactive",
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="text-xs">
                <span className="mb-2 block font-semibold text-muted-foreground">Division access</span>
                <div className="flex flex-wrap gap-3">
                  {MODULE_OPTIONS.map((module) => (
                    <label
                      key={module}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.modules.includes(module)}
                        onChange={() => toggleModule(module)}
                      />
                      {getModule(module).label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={form.customAccess}
                      onChange={(event) => toggleCustomAccess(event.target.checked)}
                    />
                    Assign individual capabilities instead of role defaults
                  </label>
                  {form.customAccess && (
                    <Link href="/admin/roles?subject=staff" className="text-[11px] font-semibold text-primary hover:underline">
                      Open full role manager
                    </Link>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  Every capability is stored and enforced separately by the APIs. Leave this off to use the standard
                  permissions for the selected role.
                </p>
                {form.customAccess && (
                  <div className="mt-3 space-y-3">
                    {CAPABILITY_GROUPS.map((group) => (
                      <div key={group.label} className="rounded-xl border border-border/70 p-3">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-primary">{group.label}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {group.capabilities.map((capability) => (
                            <label
                              key={capability.permission}
                              className="flex items-start gap-2 text-xs"
                              title={capability.description}
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={form.permissions.includes(capability.permission)}
                                onChange={() => togglePermission(capability.permission)}
                              />
                              <span>
                                <span className="block font-semibold">{capability.label}</span>
                                <span className="block text-[10px] text-muted-foreground">{capability.permission}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  <span className="mb-1 block font-semibold text-muted-foreground">
                    {editingId ? "New password (optional)" : "Temporary password"}
                  </span>
                  <div className="relative">
                    <input
                      required={!editingId}
                      minLength={8}
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                      className={`${inputClass} pr-10`}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
                    {editingId
                      ? "Leave blank to keep the current password. Changing it signs them out."
                      : "Share this securely. It will not be shown again."}
                  </span>
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-semibold text-muted-foreground">Max discount (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.maxDiscountPercent}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, maxDiscountPercent: event.target.value }))
                    }
                    className={inputClass}
                  />
                  <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">
                    Use 0 to block discounts. Cashiers need a value above 0 to discount.
                  </span>
                </label>
              </div>

              {!editingId && (
                <label className="flex items-start gap-2 rounded-2xl bg-primary/5 p-3 text-xs">
                  <input
                    type="checkbox"
                    checked={form.sendEmail}
                    onChange={(event) => setForm((current) => ({ ...current, sendEmail: event.target.checked }))}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-semibold">Email the login details with the temporary password</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                      They will be required to change the password on first sign-in. If email fails, the account is
                      still created and you can share the credentials manually.
                    </span>
                  </span>
                </label>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  <span className="mb-1 block font-semibold text-muted-foreground">Phone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className={inputClass}
                    placeholder="07…"
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block font-semibold text-muted-foreground">ID number</span>
                  <input
                    value={form.idNumber}
                    onChange={(event) => setForm((current) => ({ ...current, idNumber: event.target.value }))}
                    className={inputClass}
                    placeholder="Optional"
                  />
                </label>
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editingId ? "Save changes" : "Create login"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
