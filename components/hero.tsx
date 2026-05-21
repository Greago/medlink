"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Play, Shield, Truck, HeartPulse, CheckCircle } from "lucide-react"

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1f1d] via-[#0a1816] to-[#071412]" />
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[60%] h-full">
          <div className="absolute inset-0 bg-gradient-to-l from-[#0d9488]/10 to-transparent" />
          <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-[#0d9488]/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-20 right-40 w-[400px] h-[400px] bg-[#14b8a6]/6 rounded-full blur-[100px]" />
        </div>
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className="animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-[#0d9488]/10 rounded-full border border-[#0d9488]/20 backdrop-blur-sm">
              <span className="w-2 h-2 bg-[#2dd4bf] rounded-full animate-pulse" />
              <span className="text-[#2dd4bf] text-sm font-medium">Trusted by 500+ Healthcare Facilities</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1]">
              Premium Medical
              <br />
              Equipment for
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2dd4bf] to-[#14b8a6]">
                Modern Healthcare
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg text-[#8aa8a5] max-w-lg mb-8 leading-relaxed">
              Enterprise-grade diagnostic, surgical, and patient care equipment. 
              ISO-certified, competitively priced, delivered within 48 hours worldwide.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link
                href="/inquiry"
                className="group inline-flex items-center justify-center gap-2 bg-[#0d9488] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[#0f766e] transition-all duration-300 shadow-lg shadow-[#0d9488]/25"
              >
                Request Quote 
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 bg-white/5 text-white border border-white/10 px-8 py-4 rounded-xl font-semibold hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
              >
                <Play size={18} className="text-[#2dd4bf]" />
                Watch Demo
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-8">
              {[
                { icon: Shield, label: "ISO 13485 Certified" },
                { icon: Truck, label: "48h Global Delivery" },
                { icon: HeartPulse, label: "24/7 Support" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[#8aa8a5]">
                  <item.icon size={18} className="text-[#2dd4bf]" />
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Featured Image + Stats */}
          <div className="relative hidden lg:block animate-slide-up">
            {/* Main image container */}
            <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
              <div className="aspect-[4/3] relative">
                <Image
                  src="/portable-ultrasound-machine.jpg"
                  alt="Advanced Medical Equipment"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1816] via-transparent to-transparent" />
              </div>
              
              {/* Floating stats card */}
              <div className="absolute bottom-6 left-6 right-6 bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: "500+", label: "Products" },
                    { value: "150+", label: "Countries" },
                    { value: "10K+", label: "Delivered" },
                  ].map((stat, i) => (
                    <div key={i} className="text-center">
                      <div className="text-2xl font-bold text-white">{stat.value}</div>
                      <div className="text-xs text-[#8aa8a5] mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating badge top-right */}
            <div className="absolute -top-4 -right-4 bg-[#0d9488] rounded-2xl p-4 shadow-xl shadow-[#0d9488]/30">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-white" />
                <span className="text-white text-sm font-semibold">FDA Approved</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#fafaf8] to-transparent" />
    </section>
  )
}
