"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CheckCircle, ChevronDown, Eye, FileText, Mail, MessageSquare, Search } from "lucide-react"
import {
  Badge,
  Button,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  EmptyState,
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  SectionHeader,
  StatCard,
} from "@/components/design-system"
import { useStore, type Inquiry } from "@/lib/store"

const statuses: Array<Inquiry["status"] | "All"> = ["All", "New", "Quoted", "Pending", "Completed"]
const PAGE_SIZE = 10

const statusVariant: Record<Inquiry["status"], "info" | "success" | "warning" | "soft"> = {
  New: "info",
  Quoted: "success",
  Pending: "warning",
  Completed: "soft",
}

export default function InquiriesPage() {
  const inquiries = useStore((state) => state.inquiries)
  const quotes = useStore((state) => state.quotes)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<Inquiry["status"] | "All">("All")
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return inquiries
      .filter((inquiry) => {
        const matchesStatus = status === "All" || inquiry.status === status
        const matchesQuery =
          !needle ||
          [inquiry.companyName, inquiry.contactPerson, inquiry.email, inquiry.phone, ...inquiry.products]
            .join(" ")
            .toLowerCase()
            .includes(needle)
        return matchesStatus && matchesQuery
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [inquiries, query, status])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selected = inquiries.find((inquiry) => inquiry.id === selectedId) || null
  const newCount = inquiries.filter((inquiry) => inquiry.status === "New").length

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
      toast.success("Email address copied")
    } catch {
      toast.error("Could not copy the email address.")
    }
  }

  return (
    <div className="space-y-6 p-4 lg:p-7">
      <SectionHeader
        eyebrow="Customer requests"
        title="Inquiries"
        description="Quote requests are shared across both divisions. Create a quote from any inquiry and email it to the customer."
        action={
          <Badge variant="soft" className="rounded-full px-3 py-1.5">
            {inquiries.length} total
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="All inquiries" value={inquiries.length} icon={MessageSquare} hint="Both divisions" />
        <StatCard label="New" value={newCount} icon={Mail} hint="Awaiting a quote" />
        <StatCard label="Quoted" value={inquiries.filter((item) => item.status === "Quoted").length} icon={FileText} hint="Quote created" />
      </div>

      <Card className="gap-0 p-4 lg:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1) }}
              placeholder="Search company, contact, email or product"
              className="h-11 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </div>
          <label className="relative">
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(event) => { setStatus(event.target.value as Inquiry["status"] | "All"); setPage(1) }}
              className="h-11 appearance-none rounded-xl border border-input bg-background pl-4 pr-10 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            >
              {statuses.map((item) => <option key={item} value={item}>{item === "All" ? "All statuses" : item}</option>)}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </label>
        </div>
      </Card>

      {inquiries.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No inquiries yet" description="Customer quote requests will appear here when submitted." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matching inquiries" description="Try a different search term or status." action={<Button variant="soft" onClick={() => { setQuery(""); setStatus("All") }}>Clear filters</Button>} />
      ) : (
        <>
          <Card className="gap-0 overflow-hidden p-0">
            <div className="overflow-x-auto">
              <DataTable>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>Company</DataTableHead>
                    <DataTableHead>Contact</DataTableHead>
                    <DataTableHead>Products</DataTableHead>
                    <DataTableHead>Status</DataTableHead>
                    <DataTableHead>Date</DataTableHead>
                    <DataTableHead className="text-right">Actions</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {visible.map((inquiry) => {
                    const quote = quotes.find((item) => item.inquiryId === inquiry.id)
                    return (
                      <DataTableRow key={inquiry.id}>
                        <DataTableCell className="font-semibold">{inquiry.companyName}</DataTableCell>
                        <DataTableCell>
                          <span className="block text-xs">{inquiry.contactPerson}</span>
                          <button type="button" onClick={() => void copyEmail(inquiry.email)} className="block text-xs text-muted-foreground hover:text-primary hover:underline">
                            {inquiry.email}
                          </button>
                        </DataTableCell>
                        <DataTableCell>{inquiry.products.length} item(s)</DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={statusVariant[inquiry.status]}>{inquiry.status}</Badge>
                            {quote && <Badge variant="soft">{quote.quoteNumber}</Badge>}
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-xs text-muted-foreground">
                          {new Date(inquiry.createdAt).toLocaleDateString()}
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon-sm" onClick={() => setSelectedId(inquiry.id)} aria-label={`View ${inquiry.companyName}`}>
                              <Eye size={16} />
                            </Button>
                            <Button asChild variant="soft" size="sm">
                              <Link href={`/admin/quotes?inquiryId=${encodeURIComponent(inquiry.id)}&company=${encodeURIComponent(inquiry.companyName)}`}>
                                <CheckCircle size={14} /> {quote ? "View quote" : "Create quote"}
                              </Link>
                            </Button>
                          </div>
                        </DataTableCell>
                      </DataTableRow>
                    )
                  })}
                </DataTableBody>
              </DataTable>
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-2">
              <Button variant="outlineSoft" size="sm" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
              <span className="font-semibold text-ink">Page {currentPage} of {pageCount}</span>
              <Button variant="outlineSoft" size="sm" disabled={currentPage >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}

      <Modal open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <ModalContent className="max-w-2xl">
          {selected && (
            <>
              <ModalHeader>
                <ModalTitle>{selected.companyName}</ModalTitle>
                <ModalDescription>Submitted {new Date(selected.createdAt).toLocaleString("en-KE")}</ModalDescription>
              </ModalHeader>
              <div className="space-y-5 px-6 pb-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
                    <p className="mt-1 text-sm font-semibold">{selected.contactPerson}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
                    <p className="mt-1 break-all text-sm">{selected.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</p>
                    <p className="mt-1 text-sm">{selected.phone}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Products requested</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selected.products.map((product, index) => (
                      <Badge key={`${product}-${index}`} variant="soft">{product}</Badge>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Quantity: {selected.quantity} unit(s)</p>
                </div>
                {selected.additionalNotes && (
                  <div className="rounded-xl bg-muted/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Additional notes</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{selected.additionalNotes}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button variant="outlineSoft" onClick={() => setSelectedId(null)}>Close</Button>
                  <Button asChild variant="primary">
                    <Link href={`/admin/quotes?inquiryId=${encodeURIComponent(selected.id)}&company=${encodeURIComponent(selected.companyName)}`}>
                      <FileText size={16} /> Create quote
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
