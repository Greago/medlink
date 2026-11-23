"use client"

import { useEffect } from "react"
import { useStore } from "@/lib/store"

/** Marks the document root with the active module for scoped styling and hooks. */
export function ThemeSync() {
  const activeModule = useStore((state) => state.activeModule)

  useEffect(() => {
    document.documentElement.dataset.module = activeModule
  }, [activeModule])

  return null
}
