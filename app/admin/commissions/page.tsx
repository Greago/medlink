"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Calculator, CheckCircle2, FileText, Loader2, Wallet } from "lucide-react"
import { Badge, Button } from "@/components/design-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

interface Statement {
  id: string
  agentId: string
  module: string
  periodStart: string
  periodEnd: string
  salesTotal: number
  grossProfit: number
  commissionAmount: number
  bonusAmount: number
  status: string
  agentName?: string
  paidAt: string | null
}

interface AgentOption {
  id: string
  adminName?: string
  adminEmail?: string
  territory: string
}

function monthRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const iso = (date: Date) => date.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

export default function CommissionsPage() {
  const activeModule = useStore((state) => state.activeModule)
  const moduleInfo = getModule(activeModule)
  const initial = monthRange()
  const [statements, setStatements] = useState<Statement[]>([])
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [agentId, setAgentId] = useState("")
  const [periodStart, setPeriodStart] = useState(initial.start)
  const [periodEnd, setPeriodEnd] = useState(initial.end)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const [statementResponse, agentsResponse] = await Promise.all([
        fetch(`/api/commissions/statements?module=${activeModule}`, { cache: "no-store" }),
        fetch(`/api/agents?module=${activeModule}`, { cache: "no-store" }),
      ])
      if (!statementResponse.ok) throw new Error("Could not load commission statements.")
      const statementData = (await statementResponse.json()) as { statements: Statement[] }
      setStatements(statementData.statements)
      if (agentsResponse.ok) {
        const agentData = (await agentsResponse.json()) as { agents: AgentOption[] }
        setAgents(agentData.agents)
        if (!agentId && agentData.agents.length) setAgentId(agentData.agents[0].id)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load commission statements.")
    }
  }, [activeModule, agentId])

  useEffect(() => {
    void load()
  }, [load])

  const generate = async () => {
    if (!agentId) {
      setError("Choose an agent first.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/commissions/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, periodStart, periodEnd }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not generate the statement.")
      toast.success("Commission statement generated.")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate the statement.")
    } finally {
      setBusy(false)
    }
  }

  const updateStatus = async (statement: Statement, action: "approve" | "pay") => {
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/commissions/statements/${statement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error || "Could not update the statement.")
      toast.success(action === "approve" ? "Statement approved." : "Statement marked as paid.")
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the statement.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Team</p>
          <h1 className="text-3xl font-bold">Commissions · {moduleInfo.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate, approve and pay agent commission statements from recorded sales.
          </p>
        </div>
        <Button variant="outlineSoft" asChild>
          <Link href="/admin/agents">Manage agents</Link>
        </Button>
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
            <Calculator size={18} /> Generate statement
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs">
            <span className="mb-1 block font-semibold text-muted-foreground">Agent</span>
            <select
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">Choose agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.adminName || agent.adminEmail || agent.territory || "Agent"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-semibold text-muted-foreground">Period start</span>
            <input
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-semibold text-muted-foreground">Period end</span>
            <input
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <div className="flex items-end">
            <Button onClick={generate} disabled={busy} className="w-full">
              {busy ? <Loader2 size={17} className="animate-spin" /> : <FileText size={17} />} Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statements</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {statements.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No commission statements generated yet.
            </p>
          ) : (
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Agent</th>
                  <th className="py-2">Period</th>
                  <th className="py-2 text-right">Sales</th>
                  <th className="py-2 text-right">Profit</th>
                  <th className="py-2 text-right">Commission</th>
                  <th className="py-2 text-right">Bonus</th>
                  <th className="py-2">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {statements.map((statement) => (
                  <tr key={statement.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 font-semibold">{statement.agentName || "Agent"}</td>
                    <td className="py-3">
                      {statement.periodStart} – {statement.periodEnd}
                    </td>
                    <td className="py-3 text-right">{formatPrice(statement.salesTotal)}</td>
                    <td className="py-3 text-right">{formatPrice(statement.grossProfit)}</td>
                    <td className="py-3 text-right font-semibold">{formatPrice(statement.commissionAmount)}</td>
                    <td className="py-3 text-right">{formatPrice(statement.bonusAmount)}</td>
                    <td className="py-3">
                      <Badge
                        variant={
                          statement.status === "paid" ? "success" : statement.status === "approved" ? "info" : "warning"
                        }
                      >
                        {statement.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outlineSoft" asChild>
                          <a href={`/api/commissions/statements/${statement.id}/pdf`} target="_blank" rel="noreferrer">
                            <FileText size={15} /> PDF
                          </a>
                        </Button>
                        {statement.status === "draft" && (
                          <Button size="sm" onClick={() => updateStatus(statement, "approve")} disabled={busy}>
                            <CheckCircle2 size={15} /> Approve
                          </Button>
                        )}
                        {statement.status === "approved" && (
                          <Button size="sm" onClick={() => updateStatus(statement, "pay")} disabled={busy}>
                            <Wallet size={15} /> Pay
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
