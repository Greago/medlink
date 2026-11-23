import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, ClipboardList, PackageCheck, ShieldCheck } from "lucide-react"
import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"

const benefits = [
  {
    icon: ClipboardList,
    title: "Track every order",
    body: "See order numbers, dates, items and current status in one place.",
  },
  {
    icon: PackageCheck,
    title: "Review your purchases",
    body: "Keep a clear record of everything you have purchased from Medlink across both divisions.",
  },
  {
    icon: ShieldCheck,
    title: "Secure, private access",
    body: "Your account details and order history stay protected on this device.",
  },
]

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f8fa]">
      <Navigation />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:py-12">
        <section className="relative min-h-[460px] overflow-hidden rounded-[32px] bg-[#081614] p-8 text-white shadow-[0_30px_80px_-40px_rgba(12,31,29,0.55)] sm:p-10 lg:min-h-[660px] lg:p-12">
          <Image src="/hero.jpg" alt="" fill priority className="object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#081614]/95 via-[#0c1f1d]/90 to-[#0c1f1d]/85" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full border border-white/10" />

          <div className="relative flex h-full flex-col">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e5e7eb] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#18bcaa]" />
              Customer Portal
            </div>

            <div className="mt-12 max-w-xl lg:mt-16">
              <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[42px]">
                Your Medlink order history, always within reach.
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-white/75 sm:text-base">
                Sign in to review previous orders, check what you purchased and stay ready for your next request.
              </p>
            </div>

            <div className="mt-10 space-y-4 lg:mt-12">
              {benefits.map((benefit) => {
                const Icon = benefit.icon
                return (
                  <div key={benefit.title} className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#18bcaa] backdrop-blur-sm">
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{benefit.title}</p>
                      <p className="mt-0.5 text-sm leading-6 text-white/65">{benefit.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-auto pt-10">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">Need a quote or delivery plan?</p>
                    <p className="mt-1 text-sm text-white/65">
                      Our team can help with product selection, pricing and installation.
                    </p>
                  </div>
                  <Link
                    href="/contact"
                    aria-label="Contact Medlink"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#0c1f1d] transition-transform hover:translate-x-0.5"
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center py-4 lg:py-0">{children}</section>
      </div>

      <Footer />
    </main>
  )
}
