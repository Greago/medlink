"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BadgeCheck, FileText, ShieldCheck, Truck } from "lucide-react"
import { CatalogueDownload } from "@/components/catalogue-download"
import { Button } from "@/components/design-system"
import { getDisplayProducts } from "@/lib/catalogue"
import { getModule } from "@/lib/modules/registry"
import { useStore } from "@/lib/store"

export function Hero() {
  const activeModule = useStore((state) => state.activeModule)
  const products = useStore((state) => state.products)
  const isHydrated = useStore((state) => state.isHydrated)
  const moduleInfo = getModule(activeModule)
  const catalogue = getDisplayProducts(activeModule, products, isHydrated)
  const categoryCount = new Set(catalogue.map((product) => product.category)).size

  const highlights = [
    { icon: BadgeCheck, label: `${catalogue.length} ${moduleInfo.itemLabel} listed` },
    { icon: ShieldCheck, label: "Clear KSh pricing" },
    { icon: Truck, label: "Nationwide delivery in Kenya" },
  ]

  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -right-32 -top-40 size-[520px] rounded-full bg-accent/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-48 -left-40 size-[460px] rounded-full bg-chart-2/20 blur-[130px]" />

      <div className="section-shell relative grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
        <div className="animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide">
            <span className="size-1.5 rounded-full bg-accent" />
            {moduleInfo.eyebrow}
          </span>

          <h1 className="mt-7 text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
            {moduleInfo.heroHeading[0]}
            <br />
            {moduleInfo.heroHeading[1]}
            <br />
            <span className="text-accent">{moduleInfo.heroHeading[2]}</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-primary-foreground/75 sm:text-lg">
            {moduleInfo.heroDescription}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              asChild
              variant="accent"
              size="pill"
              className="text-accent-foreground shadow-[var(--shadow-lift)]"
            >
              <Link href="/inquiry">
                <FileText size={18} />
                Request a quote
                <ArrowRight size={16} />
              </Link>
            </Button>
            <Button
              asChild
              variant="outlineSoft"
              size="pill"
              className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"
            >
              <Link href="/products">
                Explore {moduleInfo.productLabel.toLowerCase()}
                <ArrowRight size={16} />
              </Link>
            </Button>
            <CatalogueDownload
              variant="outlineSoft"
              size="pill"
              triggerClassName="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"
              label="Get PDF catalogue"
            />
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
            {highlights.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <item.icon size={17} className="text-accent" />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative animate-slide-up">
          <div className="relative overflow-hidden rounded-[32px] border border-white/15 shadow-[var(--shadow-lift)]">
            <div className="relative aspect-[4/3]">
              <Image
                src="/hero.jpg"
                alt={moduleInfo.heroImageAlt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/10 to-transparent" />
            </div>

            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/20 bg-card/85 p-5 text-ink backdrop-blur-xl sm:bottom-7 sm:left-7 sm:right-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Live catalogue</p>
                  <p className="mt-1 text-2xl font-bold">{catalogue.length} items</p>
                  <p className="text-xs text-muted-foreground">in the {moduleInfo.shortLabel.toLowerCase()} division</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{categoryCount}</p>
                  <p className="text-xs text-muted-foreground">categories to browse</p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -right-3 -top-4 hidden rounded-2xl bg-accent px-5 py-4 text-center text-accent-foreground shadow-[var(--shadow-lift)] sm:block">
            <p className="text-xs font-semibold uppercase tracking-widest">Pricing</p>
            <p className="text-lg font-bold">KSh</p>
          </div>
        </div>
      </div>
    </section>
  )
}
