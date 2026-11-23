import { Navigation } from "@/components/navigation"
import { Hero } from "@/components/hero"
import { BrandStrip, CategoryGrid, ModuleCTA, OfferStrip, TrustBar } from "@/components/home-sections"
import { Products } from "@/components/products"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <TrustBar />
      <CategoryGrid />
      <Products />
      <OfferStrip />
      <BrandStrip />
      <ModuleCTA />
      <Footer />
      <WhatsAppButton />
    </main>
  )
}
