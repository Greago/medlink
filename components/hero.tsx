"use client"

import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  Play,
  ShieldCheck,
  Truck,
  HeartPulse,
  CheckCircle2,
} from "lucide-react"

export function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-[#071412]">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1d1b] via-[#081614] to-[#06100f]" />

        {/* Glow Effects */}
        <div className="absolute top-10 right-0 w-[500px] h-[500px] bg-[#14b8a6]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-10 w-[400px] h-[400px] bg-[#0d9488]/10 rounded-full blur-[100px]" />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* LEFT CONTENT */}
          <div>
            {/* Top Badge */}
            

            {/* Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-white mb-6">
              Reliable Medical
              <br />
              Equipment for
              <br />
              <span className="bg-gradient-to-r from-[#2dd4bf] to-[#14b8a6] bg-clip-text text-transparent">
                Hospitals & Clinics
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg leading-relaxed text-[#9fb5b2] max-w-xl mb-8">
              Medlink Expedite supplies high-quality diagnostic, laboratory,
              surgical, and patient care equipment across Kenya and East Africa.
              We help healthcare facilities access trusted medical solutions with
              fast delivery and dependable support.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link
                href="/inquiry"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#0d9488] px-8 py-4 font-semibold text-white shadow-lg shadow-[#0d9488]/30 transition-all duration-300 hover:bg-[#0f766e]"
              >
                Request a Quote
                <ArrowRight
                  size={20}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10"
              >
                <Play size={18} className="text-[#2dd4bf]" />
                Explore Products
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-6">
              {[
                {
                  icon: ShieldCheck,
                  label: "Quality Assured Equipment",
                },
                {
                  icon: Truck,
                  label: "Fast Nationwide Delivery",
                },
                {
                  icon: HeartPulse,
                  label: "Healthcare Focused Support",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-[#9fb5b2]"
                >
                  <item.icon size={18} className="text-[#2dd4bf]" />
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT CONTENT */}
          <div className="relative hidden lg:block">
            {/* Main Image */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/50">
              <div className="relative aspect-[4/3]">
                <Image
                  src="/hero.jpg"
                  alt="Medical Equipment Supplier Kenya"
                  fill
                  priority
                  className="object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#071412] via-transparent to-transparent" />
              </div>

              {/* Floating Stats */}
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    {
                      value: "500+",
                      label: "Medical Products",
                    },
                    {
                      value: "47",
                      label: "Counties Served",
                    },
                    {
                      value: "1000+",
                      label: "Healthcare Deliveries",
                    },
                  ].map((item, index) => (
                    <div key={index}>
                      <div className="text-2xl font-bold text-white">
                        {item.value}
                      </div>
                      <div className="mt-1 text-xs text-[#9fb5b2]">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Approval Badge */}
            <div className="absolute -top-5 -right-5 rounded-2xl bg-[#0d9488] px-5 py-4 shadow-xl shadow-[#0d9488]/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-white" />
                <span className="text-sm font-semibold text-white">
                  Trusted Healthcare Partner
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Fade */}
      {/* <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#fafaf8] to-transparent" /> */}
    </section>
  )
}