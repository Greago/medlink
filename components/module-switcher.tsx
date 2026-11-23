"use client"

import { useState } from "react"
import { Columns2, Loader2, Pill, Stethoscope } from "lucide-react"
import { MODULE_IDS, MODULE_REGISTRY } from "@/lib/modules/registry"
import { OPEN_MODULE_CHOOSER_EVENT, type AppModule } from "@/lib/modules/types"
import { useStore } from "@/lib/store"

const moduleIcons: Record<AppModule, typeof Stethoscope> = {
  medical: Stethoscope,
  pharmacy: Pill,
}

interface ModuleSwitcherProps {
  variant?: "public" | "admin"
  showCompare?: boolean
  /** Use on dark surfaces such as the footer. */
  tone?: "default" | "inverse"
}

/** Segmented module control used by both the storefront and admin shell. */
export function ModuleSwitcher({ variant = "public", showCompare = true, tone = "default" }: ModuleSwitcherProps) {
  const activeModule = useStore((state) => state.activeModule)
  const setActiveModule = useStore((state) => state.setActiveModule)
  const [busyModule, setBusyModule] = useState<AppModule | null>(null)
  const isAdmin = variant === "admin"
  const inverse = tone === "inverse"

  const choose = async (module: AppModule) => {
    if (module === activeModule || busyModule) return
    setBusyModule(module)
    try {
      await setActiveModule(module)
    } catch (error) {
      console.error("Could not switch module:", error)
    } finally {
      setBusyModule(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Switch division"
        className={`inline-flex items-center rounded-full border p-1 ${
          inverse ? "border-white/25 bg-white/10" : "border-border/70 bg-muted/70"
        } ${isAdmin ? "shadow-sm" : ""}`}
      >
        {MODULE_IDS.map((module) => {
          const info = MODULE_REGISTRY[module]
          const Icon = moduleIcons[module]
          const selected = module === activeModule
          const busy = busyModule === module

          return (
            <button
              key={module}
              type="button"
              onClick={() => choose(module)}
              disabled={Boolean(busyModule)}
              aria-pressed={selected}
              title={info.label}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm ${
                selected
                  ? inverse
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-primary text-primary-foreground shadow-sm"
                  : inverse
                    ? "text-white/80 hover:bg-white/15 hover:text-white"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
              }`}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
              <span>{info.shortLabel}</span>
            </button>
          )
        })}
      </div>

      {showCompare && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_MODULE_CHOOSER_EVENT))}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
            inverse ? "text-white/80 hover:bg-white/15 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          aria-label="Compare both divisions"
        >
          <Columns2 size={14} />
          <span className="hidden lg:inline">Compare</span>
        </button>
      )}
    </div>
  )
}
