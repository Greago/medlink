import { Navigation } from "@/components/navigation"
import { Hero } from "@/components/hero"
import { Products } from "@/components/products"
import { Features } from "@/components/features"
import { CompanyProfile } from "@/components/company-profile"
import { CTA } from "@/components/cta"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Features />
      <CompanyProfile />
      <Products />
      <CTA />
      <Footer />
      <WhatsAppButton />
    </main>
  )
}
