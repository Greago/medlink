"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, Loader2 } from "lucide-react"

export function TalentPoolForm() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [interest, setInterest] = useState("")
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState("") // honeypot
  const [cv, setCv] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!consent) {
      toast.error("Please accept the data protection consent to join the talent pool.")
      return
    }
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.set("fullName", fullName)
      formData.set("email", email)
      formData.set("phone", phone)
      formData.set("interest", interest)
      formData.set("consent", "true")
      formData.set("website", website)
      if (cv) formData.set("cv", cv)
      const response = await fetch("/api/careers/talent-pool", { method: "POST", body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not join the talent pool.")
      setDone(true)
      toast.success("You have joined our talent pool")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not join the talent pool.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-muted/40 p-5 text-center">
        <Check size={22} className="mx-auto text-accent" />
        <p className="mt-2 text-sm font-semibold">Thank you — you are in our talent pool.</p>
        <p className="mt-1 text-xs text-muted-foreground">We will contact you when a suitable role opens. You can request deletion of your data at any time.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-background p-5">
      <h4 className="text-sm font-bold">Join our talent pool</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted-foreground">
          Full name *
          <input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal text-foreground outline-none focus:border-primary" />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Email *
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal text-foreground outline-none focus:border-primary" />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Phone
          <input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal text-foreground outline-none focus:border-primary" />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Area of interest
          <input value={interest} onChange={(event) => setInterest(event.target.value)} placeholder="e.g. Pharmacy, sales, operations" className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-normal text-foreground outline-none focus:border-primary" />
        </label>
      </div>
      <label className="block text-xs font-semibold text-muted-foreground">
        CV (optional, PDF/DOC/DOCX, max 5 MB)
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(event) => setCv(event.target.files?.[0] || null)}
          className="mt-1 block w-full text-xs text-muted-foreground file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:text-xs file:font-semibold file:text-foreground"
        />
      </label>
      <input type="text" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
        <span>
          I consent to Medlink Expedite storing my details for future recruitment, in line with the Kenya Data Protection Act, 2019. See our <a href="/privacy" className="underline">privacy policy</a>. I can request deletion at any time.
        </span>
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
      >
        {submitting && <Loader2 size={15} className="animate-spin" />} Join talent pool
      </button>
    </form>
  )
}