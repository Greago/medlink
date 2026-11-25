import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { AnalyticsConsent } from "@/components/analytics-consent"
import { CookieManager } from "@/components/cookie-manager"
import { StoreHydration } from "@/components/store-hydration"
import { ThemeSync } from "@/components/theme-sync"
import { ModuleChooser } from "@/components/module-chooser"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://medlinkexpedite.co.ke"),
  title: {
    default: "Medlink Expedite | Medical Equipment & Pharmacy Supplies in Kenya",
    template: "%s | Medlink Expedite",
  },
  description:
    "Shop KSh-priced medical equipment and pharmacy supplies from Medlink Expedite, with dependable delivery and support for healthcare providers across Kenya and East Africa.",
  applicationName: "Medlink Expedite",
  keywords: [
    "medical equipment Kenya",
    "pharmacy supplies Kenya",
    "healthcare products Nairobi",
    "Medlink Expedite",
  ],
  icons: {
    icon: [
      {
        url: "/medlinklogo.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/medlinklogo.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/medlinklogo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeSync />
        <StoreHydration />
        {children}
        <ModuleChooser />
        <CookieManager />
        <Toaster position="top-center" richColors closeButton />
        <AnalyticsConsent />
      </body>
    </html>
  )
}
