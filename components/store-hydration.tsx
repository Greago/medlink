"use client"

import { useEffect } from "react"
import { useStore, type AccountState, type ServerState } from "@/lib/store"

/** Loads all persistent app data from Postgres after mount. */
export function StoreHydration() {
  useEffect(() => {
    let cancelled = false

    fetch("/api/state")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load application data.")
        return response.json() as Promise<ServerState>
      })
      .then((state) => {
        if (!cancelled) useStore.getState().hydrate(state)
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) useStore.setState({ isHydrated: true })
      })

    const accountEpoch = useStore.getState().accountEpoch
    fetch("/api/account/me")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load account.")
        return response.json() as Promise<AccountState>
      })
      .then((state) => {
        if (!cancelled) useStore.getState().hydrateAccount(state, accountEpoch)
      })
      .catch(() => {
        if (!cancelled && useStore.getState().accountEpoch === accountEpoch) {
          useStore.setState({ accountChecked: true })
        }
      })

    fetch("/api/admin/me")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load admin.")
        return response.json() as Promise<{ admin: import("@/lib/store").AdminUser | null }>
      })
      .then((data) => {
        if (!cancelled) useStore.getState().hydrateAdmin(data.admin)
      })
      .catch(() => {
        if (!cancelled) useStore.setState({ adminChecked: true })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
