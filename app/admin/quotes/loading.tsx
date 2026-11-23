import { TableSkeleton } from "@/components/design-system"

export default function Loading() {
  return (
    <div className="space-y-6 p-4 lg:p-7">
      <div>
        <p className="eyebrow mb-2">Quotes</p>
        <h2 className="text-2xl font-bold">Loading quotes…</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preparing the quote manager for the active division.
        </p>
      </div>
      <TableSkeleton rows={8} columns={7} />
    </div>
  )
}
