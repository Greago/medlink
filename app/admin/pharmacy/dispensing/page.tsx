"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/design-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList } from "lucide-react"

interface Entry {
  id: string
  created_at: string
  patient_name: string
  product_name: string
  strength: string | null
  dosage_form: string | null
  quantity: number
  controlled: boolean
  prescriber_name: string | null
  prescriber_reg_no: string | null
  reference_number: string | null
  verified: boolean
  dispensed_by_name: string | null
  sale_number: string | null
}

export default function DispensingPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch("/api/pharmacy/dispensing", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the dispensing register.")
        return response.json() as Promise<{ entries: Entry[] }>
      })
      .then((data) => {
        if (!cancelled) setEntries(data.entries)
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load the register.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Pharmacy</p>
        <h1 className="text-3xl font-bold">Dispensing register</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prescription and controlled-drug dispensing records created from POS sales.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList size={18} /> Dispensing log
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No dispensing records yet. Prescription items sold through POS appear here.
            </p>
          ) : (
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Date</th>
                  <th className="py-2">Patient</th>
                  <th className="py-2">Medicine</th>
                  <th className="py-2">Prescriber</th>
                  <th className="py-2">Document</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2">Flags</th>
                  <th className="py-2">Dispensed by</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3">{new Date(entry.created_at).toLocaleString("en-KE")}</td>
                    <td className="py-3 font-semibold">{entry.patient_name}</td>
                    <td className="py-3">
                      {entry.product_name}
                      {(entry.strength || entry.dosage_form) && (
                        <span className="block text-xs text-muted-foreground">
                          {[entry.strength, entry.dosage_form].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {entry.prescriber_name || "—"}
                      {entry.prescriber_reg_no && (
                        <span className="block text-xs text-muted-foreground">Reg. {entry.prescriber_reg_no}</span>
                      )}
                    </td>
                    <td className="py-3">{entry.sale_number || "—"}</td>
                    <td className="py-3 text-right">{entry.quantity}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {entry.controlled && <Badge variant="danger">Controlled</Badge>}
                        <Badge variant={entry.verified ? "success" : "warning"}>
                          {entry.verified ? "Verified" : "Unverified"}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3">{entry.dispensed_by_name || "—"}</td>
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
