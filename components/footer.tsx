"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowRight, Check, Loader2, Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import { ModuleSwitcher } from "@/components/module-switcher"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

export function Footer() {
  const activeModule = useStore((state) => state.activeModule)
  const whatsappNumber = useStore((state) => state.whatsappNumber)
  const companyEmail = useStore((state) => state.companyEmail)
  const companyPhone = useStore((state) => state.companyPhone)
  const companyAddress = useStore((state) => state.companyAddress)
  const ppbRegistrationNumber = useStore((state) => state.ppbRegistrationNumber)
  const moduleInfo = getModule(activeModule)
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  const whatsappDigits = whatsappNumber.replace(/[^\d]/g, "")
  const whatsappHref = `https://wa.me/${whatsappDigits || "254743325746"}`

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not subscribe.")
      setSubscribed(true)
      setEmail("")
      toast.success("You are on the list")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not subscribe.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <footer className="mt-20 overflow-hidden rounded-t-[32px] bg-primary text-primary-foreground">
      <div className="section-shell py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="relative h-12 w-36">
              <Image src="/logo.png" alt="Medlink Logo" fill sizes="144px" className="object-contain object-left" />
            </div>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/80">
              {moduleInfo.footerDescriptor} for hospitals, clinics, pharmacies and healthcare professionals across
              Kenya and East Africa. Quality-assured products, clear KSh pricing and dependable support.
            </p>
            {activeModule === "pharmacy" && ppbRegistrationNumber && (
              <p className="mt-3 text-xs font-semibold text-accent">PPB registration: {ppbRegistrationNumber}</p>
            )}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm hover:bg-white/15">
                <MessageCircle size={17} className="text-accent" /> WhatsApp us
              </a>
              <a href={`mailto:${companyEmail}`} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm hover:bg-white/15">
                <Mail size={17} className="text-accent" /> {companyEmail}
              </a>
              <a href={`tel:${companyPhone.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm hover:bg-white/15">
                <Phone size={17} className="text-accent" /> {companyPhone}
              </a>
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm">
                <MapPin size={17} className="shrink-0 text-accent" /> {companyAddress}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white">Stay in the loop</h2>
            <p className="mt-2 text-sm leading-6 text-white/80">
              Product updates and useful supply-chain notes. No spam, no filler.
            </p>
            <form onSubmit={handleSubscribe} className="mt-5 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.co.ke"
                className="h-11 min-w-0 flex-1 rounded-xl border border-white/30 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/60 focus:border-accent focus:ring-2 focus:ring-accent/40"
              />
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : subscribed ? <Check size={16} /> : <ArrowRight size={16} />}
                {subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </form>
            <div className="mt-6 border-t border-white/15 pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/80">
                Switch division
              </p>
              <ModuleSwitcher tone="inverse" />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Medlink Expedite Ventures Limited. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/products" className="hover:text-accent">Catalogue</Link>
            <Link href="/inquiry" className="hover:text-accent">Request a quote</Link>
            <Link href="/careers" className="hover:text-accent">Careers</Link>
            <Link href="/contact" className="hover:text-accent">Contact</Link>
            <span>Payment by arrangement: M-Pesa, bank transfer or card where available</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
