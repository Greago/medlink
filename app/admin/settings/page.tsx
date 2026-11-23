"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useShallow } from "zustand/react/shallow"
import {
  BadgePercent,
  Check,
  FileText,
  Hash,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ReceiptText,
  Save,
  Settings2,
  ShieldCheck,
  Truck,
} from "lucide-react"
import { Button, Card, SectionHeader } from "@/components/design-system"
import { formatPrice } from "@/lib/catalogue"
import { useStore, type CompanySettings } from "@/lib/store"

const DEFAULT_SETTINGS: CompanySettings = {
  whatsappNumber: "+254743325746",
  companyEmail: "info@medlinkexpedite.co.ke",
  companyPhone: "+254 743 325 746",
  companyAddress: "Nairobi, Kenya",
  deliveryThreshold: 0,
  ppbRegistrationNumber: "",
  businessName: "Medlink Expedite Ventures Limited",
  kraPin: "",
  vatRegistered: false,
  vatRate: 16,
  vatInclusive: true,
  receiptFooter: "Thank you for shopping with us.",
  receiptReturnPolicy: "Returns accepted within 7 days with proof of purchase.",
  receiptWarrantyNote: "Warranty terms are shown on the receipt where applicable.",
  medicalPrefix: "MED",
  pharmacyPrefix: "PHA",
  invoicePrefix: "INV",
  quotePrefix: "QUO",
  creditNotePrefix: "CN",
  etimsEnabled: false,
  salesFromEmail: "sales@medlinkexpedite.co.ke",
  receiptsFromEmail: "receipts@medlinkexpedite.co.ke",
}

export default function SettingsPage() {
  const settings = useStore(
    useShallow((state) => ({
      whatsappNumber: state.whatsappNumber,
      companyEmail: state.companyEmail,
      companyPhone: state.companyPhone,
      companyAddress: state.companyAddress,
      deliveryThreshold: state.deliveryThreshold,
      ppbRegistrationNumber: state.ppbRegistrationNumber,
      businessName: state.businessName,
      kraPin: state.kraPin,
      vatRegistered: state.vatRegistered,
      vatRate: state.vatRate,
      vatInclusive: state.vatInclusive,
      receiptFooter: state.receiptFooter,
      receiptReturnPolicy: state.receiptReturnPolicy,
      receiptWarrantyNote: state.receiptWarrantyNote,
      medicalPrefix: state.medicalPrefix,
      pharmacyPrefix: state.pharmacyPrefix,
      invoicePrefix: state.invoicePrefix,
      quotePrefix: state.quotePrefix,
      creditNotePrefix: state.creditNotePrefix,
      etimsEnabled: state.etimsEnabled,
      salesFromEmail: state.salesFromEmail,
      receiptsFromEmail: state.receiptsFromEmail,
    }))
  )
  const saveSettings = useStore((state) => state.saveSettings)
  const [form, setForm] = useState<CompanySettings>({ ...DEFAULT_SETTINGS, ...settings })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({ ...DEFAULT_SETTINGS, ...settings })
  }, [
    settings.whatsappNumber,
    settings.companyEmail,
    settings.companyPhone,
    settings.companyAddress,
    settings.deliveryThreshold,
    settings.ppbRegistrationNumber,
    settings.businessName,
    settings.kraPin,
    settings.vatRegistered,
    settings.vatRate,
    settings.vatInclusive,
    settings.receiptFooter,
    settings.receiptReturnPolicy,
    settings.receiptWarrantyNote,
    settings.medicalPrefix,
    settings.pharmacyPrefix,
    settings.invoicePrefix,
    settings.quotePrefix,
    settings.creditNotePrefix,
    settings.etimsEnabled,
    settings.salesFromEmail,
    settings.receiptsFromEmail,
  ])

  const update = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSettings({
        ...form,
        deliveryThreshold: Number(form.deliveryThreshold) || 0,
        vatRate: Number(form.vatRate) || 0,
      })
      toast.success("Settings saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings.")
    } finally {
      setSaving(false)
    }
  }

  const contactFields = [
    { key: "whatsappNumber" as const, label: "WhatsApp number", hint: "Used for order and receipt links.", icon: MessageCircle, type: "tel" },
    { key: "companyEmail" as const, label: "Company email", hint: "Shown in the storefront, catalogue and emails.", icon: Mail, type: "email" },
    { key: "companyPhone" as const, label: "Company phone", hint: "Primary customer contact number.", icon: Phone, type: "tel" },
    { key: "ppbRegistrationNumber" as const, label: "PPB registration number", hint: "Optional. Leave blank if not verified.", icon: Check, type: "text" },
  ]

  return (
    <div className="space-y-7 p-5 lg:p-8">
      <SectionHeader
        eyebrow="Management"
        title="Settings"
        description="Business, tax, receipt and document settings are saved to your shared database."
        action={
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : <><Save size={16} /> Save changes</>}
          </Button>
        }
      />

      <Card className="surface-card gap-0 p-5 lg:p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Settings2 size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Business profile</h2>
            <p className="text-sm text-muted-foreground">Shown across both divisions and on receipts.</p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">Registered business name</span>
            <input
              value={form.businessName}
              onChange={(event) => update("businessName", event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </label>
          {contactFields.map((field) => {
            const Icon = field.icon
            return (
              <label key={field.key} className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Icon size={15} className="text-primary" /> {field.label}
                </span>
                <input
                  type={field.type}
                  value={form[field.key]}
                  onChange={(event) => update(field.key, event.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                />
                <span className="mt-1.5 block text-xs text-muted-foreground">{field.hint}</span>
              </label>
            )
          })}
          <label className="block md:col-span-2">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <MapPin size={15} className="text-primary" /> Company address
            </span>
            <textarea
              rows={3}
              value={form.companyAddress}
              onChange={(event) => update("companyAddress", event.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">KRA PIN</span>
            <input
              value={form.kraPin}
              onChange={(event) => update("kraPin", event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </label>
        </div>
      </Card>

      <Card className="surface-card gap-0 p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-accent/15 text-warning">
            <BadgePercent size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Tax and delivery</h2>
            <p className="text-sm text-muted-foreground">VAT configuration used by POS and document totals.</p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <label className="flex items-center gap-3 rounded-xl border border-border p-4">
            <input
              type="checkbox"
              checked={form.vatRegistered}
              onChange={(event) => update("vatRegistered", event.target.checked)}
              className="size-4 accent-[rgb(24,188,170)]"
            />
            <span className="text-sm font-medium">Business is VAT registered</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-border p-4">
            <input
              type="checkbox"
              checked={form.vatInclusive}
              onChange={(event) => update("vatInclusive", event.target.checked)}
              className="size-4 accent-[rgb(24,188,170)]"
            />
            <span className="text-sm font-medium">Product prices include VAT</span>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">VAT rate (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.001"
              value={form.vatRate}
              onChange={(event) => update("vatRate", Number(event.target.value))}
              className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </label>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold"><Truck size={15} className="text-primary" /> Free delivery above</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">KSh</span>
              <input
                type="number"
                min="0"
                step="100"
                value={form.deliveryThreshold}
                onChange={(event) => update("deliveryThreshold", Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-input bg-background pl-14 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              />
            </div>
            <span className="mt-2 block text-xs text-muted-foreground">
              {form.deliveryThreshold > 0
                ? `Storefront shows: free delivery over ${formatPrice(form.deliveryThreshold)}`
                : "No free-delivery claim shown."}
            </span>
          </label>
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">eTIMS: {form.etimsEnabled ? "enabled (manual setting)" : "not enabled"}</p>
            <p className="mt-1">
              No KRA eTIMS integration is claimed. Confirm tax-compliance requirements with your accountant before enabling VAT.
            </p>
          </div>
        </div>
      </Card>

      <Card className="surface-card gap-0 p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ReceiptText size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Receipts and documents</h2>
            <p className="text-sm text-muted-foreground">Footer copy and numbering prefixes for each division.</p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { key: "medicalPrefix" as const, label: "Medical receipt prefix" },
            { key: "pharmacyPrefix" as const, label: "Pharmacy receipt prefix" },
            { key: "invoicePrefix" as const, label: "Invoice prefix" },
            { key: "quotePrefix" as const, label: "Quote prefix" },
            { key: "creditNotePrefix" as const, label: "Credit note prefix" },
          ].map((field) => (
            <label key={field.key} className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold"><Hash size={15} className="text-primary" /> {field.label}</span>
              <input
                value={form[field.key]}
                onChange={(event) => update(field.key, event.target.value.toUpperCase())}
                maxLength={10}
                className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm uppercase outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 grid gap-5">
          {[
            { key: "receiptFooter" as const, label: "Receipt footer", icon: ReceiptText },
            { key: "receiptReturnPolicy" as const, label: "Return policy", icon: FileText },
            { key: "receiptWarrantyNote" as const, label: "Warranty note", icon: ShieldCheck },
          ].map((field) => {
            const Icon = field.icon
            return (
              <label key={field.key} className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold"><Icon size={15} className="text-primary" /> {field.label}</span>
                <textarea
                  rows={2}
                  value={form[field.key]}
                  onChange={(event) => update(field.key, event.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                />
              </label>
            )
          })}
        </div>
      </Card>

      <Card className="surface-card gap-0 p-5 lg:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Mail size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Email senders</h2>
            <p className="text-sm text-muted-foreground">Addresses must use the medlinkexpedite.co.ke domain.</p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Sales email</span>
            <input
              type="email"
              value={form.salesFromEmail}
              onChange={(event) => update("salesFromEmail", event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Receipts email</span>
            <input
              type="email"
              value={form.receiptsFromEmail}
              onChange={(event) => update("receiptsFromEmail", event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </label>
        </div>
      </Card>
    </div>
  )
}
