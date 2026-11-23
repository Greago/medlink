"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/design-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck } from "lucide-react"

interface Serial {
  id: string
  created_at: string
  product_name: string
  model: string | null
  serial_number: string
  warranty: string
  sale_number: string | null
  customer_name: string | null
  sale_date: string | null
}

export default function WarrantiesPage() {
  const [serials, setSerials] = useState<Serial[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch("/api/medical/serials", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load serials.")
        return response.json() as Promise<{ serials: Serial[] }>
      })
      .then((data) => {
        if (!cancelled) setSerials(data.serials)
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load serials.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Medical</p>
        <h1 className="text-3xl font-bold">Serials &amp; warranties</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track serialized equipment sold through POS and the warranty terms recorded on each sale.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} /> Registered serials
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {serials.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No serialized sales recorded yet. Enter a serial number on the POS cart to register one.
            </p>
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Product</th>
                  <th className="py-2">Serial number</th>
                  <th className="py-2">Warranty</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Document</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {serials.map((serial) => (
                  <tr key={serial.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 font-semibold">
                      {serial.product_name}
                      {serial.model && (
                        <span className="block text-xs text-muted-foreground">{serial.model}</span>
                      )}
                    </td>
                    <td className="py-3">
                      <Badge variant="soft">{serial.serial_number}</Badge>
                    </td>
                    <td className="py-3">{serial.warranty || "—"}</td>
                    <td className="py-3">{serial.customer_name || "Walk-in customer"}</td>
                    <td className="py-3">{serial.sale_number || "—"}</td>
                    <td className="py-3">
                      {serial.sale_date
                        ? new Date(serial.sale_date).toLocaleDateString("en-KE")
                        : new Date(serial.created_at).toLocaleDateString("en-KE")}
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
