"use client"

import type React from "react"
import { useState } from "react"
import { Check, Download, Loader2, Mail } from "lucide-react"
import { Button, Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/design-system"
import { getModule } from "@/lib/modules/registry"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"

type Status = "idle" | "loading" | "success" | "error"

interface CatalogueResponse {
  pdfBase64: string
  emailSent: boolean
  count: number
  warning?: string
}

interface CatalogueDownloadProps {
  label?: string
  triggerClassName?: string
  variant?: "primary" | "accent" | "soft" | "outlineSoft" | "secondary"
  size?: "default" | "lg" | "touch" | "pill" | "sm"
}

export function CatalogueDownload({
  label,
  triggerClassName,
  variant = "primary",
  size = "lg",
}: CatalogueDownloadProps) {
  const activeModule = useStore((state) => state.activeModule)
  const moduleInfo = getModule(activeModule)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus("loading")
    setMessage("")

    try {
      const response = await fetch("/api/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not prepare the catalogue.")

      const { pdfBase64, emailSent, count, warning } = data as CatalogueResponse
      const binary = atob(pdfBase64)
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
      const blob = new Blob([bytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `medlink-${activeModule}-catalogue.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      setStatus("success")
      setMessage(
        emailSent
          ? `Your ${count}-item ${moduleInfo.label.toLowerCase()} catalogue is downloading and has been emailed to ${email}.`
          : `Your ${count}-item ${moduleInfo.label.toLowerCase()} catalogue is downloading. ${warning || "Email delivery could not be completed."}`
      )
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    }
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={cn(triggerClassName)}
      >
        <Download size={18} />
        {label || `Download ${moduleInfo.shortLabel} Catalogue`}
      </Button>

      <ModalContent className="max-w-lg gap-0 overflow-hidden p-0">
        <ModalHeader className="p-6 pb-0 pr-14">
          <ModalTitle>Get the {moduleInfo.label} catalogue</ModalTitle>
          <ModalDescription>
            Enter your email to receive the image-rich PDF catalogue. Your download starts immediately; switch
            divisions in the navigation to request the other catalogue.
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
          <label htmlFor="catalogue-email" className="sr-only">
            Email address
          </label>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="catalogue-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.co.ke"
              className="h-11 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </div>

          {message && (
            <div
              className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
                status === "error" ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
              }`}
            >
              {status === "success" && <Check size={16} className="mt-0.5 shrink-0" />}
              <span>{message}</span>
            </div>
          )}

          <Button type="submit" variant="primary" size="touch" disabled={status === "loading" || !email.trim()} className="w-full">
            {status === "loading" ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {status === "loading" ? "Preparing catalogue…" : "Email & download PDF"}
          </Button>
        </form>
      </ModalContent>
    </Modal>
  )
}
