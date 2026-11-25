"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ArrowRight, Check, Pill, ShieldCheck, Stethoscope, Truck, X } from "lucide-react"
import { OPEN_MODULE_CHOOSER_EVENT, type AppModule } from "@/lib/modules/types"
import { MODULE_IDS, MODULE_REGISTRY } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

const moduleIcons = {
  medical: Stethoscope,
  pharmacy: Pill,
}

const moduleHighlights: Record<AppModule, string[]> = {
  medical: [
    "Diagnostic, surgical & patient care equipment",
    "Certified devices from trusted manufacturers",
    "Installation, training & after-sales support",
  ],
  pharmacy: [
    "Medicines, vaccines & clinical consumables",
    "Quality-assured pharmaceutical sourcing",
    "Careful handling & reliable delivery",
  ],
}

const cardTheme = {
  icon: "bg-[#0c1f1d]/10 text-[#0c1f1d]",
  accent: "from-[#081614] to-[#0c1f1d]",
  button: "bg-[#0c1f1d] hover:bg-[#123b38]",
  ring: "group-hover:border-[#0c1f1d] group-hover:shadow-[0_18px_45px_-20px_rgba(12,31,29,0.55)]",
}

const moduleThemes: Record<AppModule, typeof cardTheme> = {
  medical: cardTheme,
  pharmacy: cardTheme,
}

export function ModuleChooser() {
  const pathname = usePathname()
  const isHydrated = useStore((state) => state.isHydrated)
  const moduleChosen = useStore((state) => state.moduleChosen)
  const activeModule = useStore((state) => state.activeModule)
  const setActiveModule = useStore((state) => state.setActiveModule)

  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<AppModule | null>(null)
  const [errorModule, setErrorModule] = useState<AppModule | null>(null)
  const firstVisit = isHydrated && !moduleChosen

  useEffect(() => {
    if (isHydrated && !moduleChosen && pathname !== "/admin/login") setOpen(true)
  }, [isHydrated, moduleChosen, pathname])

  useEffect(() => {
    const handleOpen = () => setOpen(true)
    window.addEventListener(OPEN_MODULE_CHOOSER_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_MODULE_CHOOSER_EVENT, handleOpen)
  }, [])

  // Keep the login screen clean; the chooser still opens there via the event.
  if (pathname === "/admin/login" && !open) return null
  if (!open) return null

  const choose = async (module: AppModule) => {
    if (busy) return
    setBusy(module)
    setErrorModule(null)
    try {
      await setActiveModule(module)
      setOpen(false)
    } catch (error) {
      console.error("Could not switch module:", error)
      setErrorModule(module)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#111827]/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="module-chooser-title"
    >
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-white/60">
        <div className="relative px-6 pt-8 pb-6 sm:px-10 border-b border-[#e5e7eb]">
          {!firstVisit && (
            <button
              onClick={() => setOpen(false)}
              aria-label="Close module chooser"
              className="absolute top-5 right-5 p-2 rounded-full text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors"
            >
              <X size={20} />
            </button>
          )}

          <div className="flex items-center gap-3 mb-6">
            <div className="relative w-16 h-10">
              <Image src="/colorlogo.png" alt="Medlink Expedites" fill sizes="64px" className="object-contain" />
            </div>
            <span className="h-6 w-px bg-[#e5e7eb]" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0c1f1d]">One platform, two divisions</span>
          </div>

          {errorModule && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
            >
              Couldn't load {MODULE_REGISTRY[errorModule].label} right now. Please try again.
            </div>
          )}

          <h2 id="module-chooser-title" className="text-3xl sm:text-4xl font-bold text-[#111827] tracking-tight">
            What brings you to Medlink today?
          </h2>
          <p className="mt-3 text-[#6b7280] max-w-2xl">
            Choose a division to explore a catalogue tailored to your needs. You can switch between them at any time
            from the menu in the navigation bar.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 p-6 sm:p-8">
          {MODULE_IDS.map((module) => {
            const info = MODULE_REGISTRY[module]
            const Icon = moduleIcons[module]
            const theme = moduleThemes[module]
            const selected = activeModule === module

            return (
              <button
                key={module}
                onClick={() => choose(module)}
                disabled={Boolean(busy)}
                className={`group relative text-left rounded-2xl border-2 border-[#e5e7eb] bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed ${theme.ring}`}
              >
                <div className={`h-2 w-full bg-gradient-to-r ${theme.accent}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${theme.icon}`}>
                      <Icon size={28} strokeWidth={1.8} />
                    </div>
                    {selected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0c1f1d] bg-[#eef1f6] px-2.5 py-1 rounded-full">
                        <Check size={12} /> Current
                      </span>
                    )}
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-[#111827]">{info.label}</h3>
                  <p className="mt-2 text-sm text-[#6b7280] leading-relaxed min-h-[64px]">{info.heroDescription}</p>

                  <ul className="mt-5 space-y-2.5">
                    {moduleHighlights[module].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] text-[#4b5563]">
                        <Check size={15} className="mt-0.5 shrink-0 text-[#0c1f1d]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-3 rounded-lg transition-colors ${theme.button}`}>
                    {busy === module ? "Opening…" : `Explore ${info.shortLabel}`}
                    <ArrowRight size={16} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 px-6 pb-7 text-xs text-[#6b7280]">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#0c1f1d]" /> Trusted quality
          </span>
          <span className="inline-flex items-center gap-2">
            <Truck size={15} className="text-[#0c1f1d]" /> East Africa delivery
          </span>
          <span className="inline-flex items-center gap-2">
            <Check size={15} className="text-[#0c1f1d]" /> One account for both divisions
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-xs font-semibold text-[#111827] transition-colors hover:bg-[#f3f4f6]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
