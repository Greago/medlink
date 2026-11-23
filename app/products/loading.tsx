import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { ProductCardSkeleton, SectionHeader } from "@/components/design-system"

export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <section className="section-shell py-12 lg:py-16">
        <SectionHeader
          eyebrow="Loading catalogue"
          title="Preparing your products"
          description="Fetching the live catalogue for your selected division…"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </section>
      <Footer />
    </main>
  )
}
