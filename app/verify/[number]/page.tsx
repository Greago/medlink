import Link from "next/link"
import { notFound } from "next/navigation"
import { CheckCircle2, FileCheck2, ShieldCheck, XCircle } from "lucide-react"
import { formatPrice } from "@/lib/catalogue"
import { getSettings } from "@/lib/db"
import { getSaleByNumber } from "@/lib/sales"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface VerifyPageProps {
  params: Promise<{ number: string }>
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-KE", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function VerifyDocumentPage({ params }: VerifyPageProps) {
  const { number } = await params
  const detail = await getSaleByNumber(decodeURIComponent(number))
  if (!detail) notFound()

  const settings = await getSettings()
  const valid = !detail.sale.isVoid && detail.sale.status !== "voided"
  const title =
    detail.sale.documentType === "invoice"
      ? "Invoice"
      : detail.sale.documentType === "quote"
        ? "Quote"
        : "Receipt"

  return (
    <main className="min-h-screen bg-[#f4f6f5] px-4 py-10 text-[#0c1f1d]">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="rounded-3xl bg-[#0c1f1d] px-6 py-8 text-white shadow-xl lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-[rgb(24,188,170)]">
                <FileCheck2 size={24} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(24,188,170)]">
                  Document verification
                </p>
                <h1 className="text-2xl font-semibold">{settings.businessName}</h1>
              </div>
            </div>
            <Link
              href="/"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Back to store
            </Link>
          </div>
        </div>

        <section className="rounded-3xl border border-[#0c1f1d]/10 bg-white p-6 shadow-sm lg:p-8">
          <div
            className={`flex items-start gap-4 rounded-2xl p-5 ${
              valid ? "bg-[rgb(24,188,170)]/10" : "bg-red-50"
            }`}
          >
            {valid ? (
              <CheckCircle2 className="mt-0.5 shrink-0 text-[rgb(24,188,170)]" size={26} />
            ) : (
              <XCircle className="mt-0.5 shrink-0 text-red-600" size={26} />
            )}
            <div>
              <p className="text-lg font-semibold">
                {valid ? "This document is genuine" : "This document has been voided"}
              </p>
              <p className="mt-1 text-sm text-[#0c1f1d]/70">
                {valid
                  ? `The details below match a completed ${title.toLowerCase()} in our records.`
                  : "Please contact us before relying on this document."}
              </p>
            </div>
          </div>

          <dl className="mt-8 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#0c1f1d]/50">Document</dt>
              <dd className="mt-1 font-semibold">{detail.sale.saleNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#0c1f1d]/50">Division</dt>
              <dd className="mt-1 font-semibold capitalize">{detail.sale.module}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#0c1f1d]/50">Issued</dt>
              <dd className="mt-1 font-semibold">{formatDate(detail.sale.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#0c1f1d]/50">Total</dt>
              <dd className="mt-1 text-lg font-bold text-[rgb(18,150,136)]">{formatPrice(detail.sale.total)}</dd>
            </div>
          </dl>

          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#0c1f1d]/50">Items</h2>
            <div className="mt-3 divide-y divide-[#0c1f1d]/10 rounded-2xl border border-[#0c1f1d]/10">
              {detail.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span>
                    <span className="font-semibold">{item.quantity} × </span>
                    {item.productName}
                  </span>
                  <span className="font-semibold">{formatPrice(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 border-t border-[#0c1f1d]/10 pt-6 text-sm text-[#0c1f1d]/70">
            <ShieldCheck size={20} className="shrink-0 text-[rgb(24,188,170)]" />
            <p>
              Verify any {title.toLowerCase()} by scanning the QR code on the PDF or entering its document number.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
