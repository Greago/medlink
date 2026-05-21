"use client"

import { Zap, Lock, TrendingUp, Truck, Award, Headphones, ArrowRight } from "lucide-react"
import Link from "next/link"

const features = [
  {
    icon: Lock,
    title: "Certified Quality",
    description: "ISO 13485 certified. All products meet international healthcare standards with full traceability.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Truck,
    title: "48h Global Delivery",
    description: "Express shipping with real-time tracking. From our warehouse to your facility in under 48 hours.",
    color: "from-cyan-500 to-blue-600",
  },
  {
    icon: Zap,
    title: "Competitive Pricing",
    description: "Direct manufacturer partnerships mean 20-40% savings. Volume discounts and flexible terms available.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Headphones,
    title: "24/7 Expert Support",
    description: "Dedicated account managers and technical specialists available around the clock via phone or chat.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Award,
    title: "Industry Leader",
    description: "Trusted by 500+ hospitals and clinics across 150 countries. 99.8% customer satisfaction rate.",
    color: "from-rose-500 to-pink-600",
  },
  {
    icon: TrendingUp,
    title: "Scalable Solutions",
    description: "From single devices to complete facility packages. We grow with your healthcare organization.",
    color: "from-teal-500 to-emerald-600",
  },
]

export function Features() {
  return (
    <section className="py-24 bg-[#f5f5f3] relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#0d9488]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#14b8a6]/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0d9488]/10 text-[#0d9488] text-sm font-semibold rounded-full mb-4">
              <span className="w-1.5 h-1.5 bg-[#0d9488] rounded-full" />
              Why Choose Medlink
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1a] mb-4 leading-tight">
              Built for Healthcare
              <br />
              <span className="text-[#0c7f73]">Excellence</span>
            </h2>
            <p className="text-lg text-[#6b7280]">
              Every aspect of our service is designed to support your mission of delivering exceptional patient care.
            </p>
          </div>
          <Link
            href="/about"
            className="group inline-flex items-center gap-2 text-[#0c7f73] font-semibold hover:gap-3 transition-all"
          >
            Learn more about us
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={i}
                className="group relative bg-white rounded-2xl p-8 border border-[#e5e5e3] hover:border-[#0d9488]/30 hover:shadow-xl hover:shadow-[#0d9488]/5 transition-all duration-500"
              >
                {/* Icon with gradient background */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={26} className="text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-[#1a1a1a] mb-3 group-hover:text-[#0c7f73] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-[#6b7280] leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover arrow */}
                <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ArrowRight size={20} className="text-[#0d9488]" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom stats bar */}
        <div className="mt-16 bg-[#0c1f1d] rounded-2xl p-8 md:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "99.8%", label: "Satisfaction Rate" },
              { value: "48h", label: "Average Delivery" },
              { value: "500+", label: "Products Available" },
              { value: "10K+", label: "Orders Fulfilled" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#2dd4bf] mb-2">{stat.value}</div>
                <div className="text-sm text-[#8aa8a5]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
