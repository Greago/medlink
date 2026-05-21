"use client"

import { useState } from "react"
import { BookOpen, ChevronLeft, ChevronRight, X, Award, Globe, Users, Target } from "lucide-react"
import Image from "next/image"

const defaultPages = [
  {
    title: "About Medlink Expediate",
    content: "Medlink Expediate Ventures Limited is a global leader in medical equipment supply, dedicated to empowering healthcare facilities with cutting-edge devices and trusted solutions. Founded with a vision to bridge the gap between advanced medical technology and accessible healthcare delivery.",
    highlight: "Serving 150+ countries since 2015",
  },
  {
    title: "Our Mission",
    content: "To deliver premium, certified medical equipment to healthcare providers worldwide, ensuring rapid deployment, competitive pricing, and unmatched after-sales support. We believe every patient deserves access to the best medical technology available.",
    highlight: "Empowering healthcare, one device at a time",
  },
  {
    title: "What We Supply",
    content: "From diagnostic imaging systems and patient monitors to hospital beds, surgical instruments, and respiratory care devices. Our catalog spans over 500 products across 12 categories. Every product meets ISO and CE certification standards.",
    highlight: "500+ products across 12 categories",
  },
  {
    title: "Our Certifications",
    content: "Medlink Expediate holds ISO 13485 certification for medical device quality management. All products undergo rigorous quality assurance, and our supply chain maintains full FDA compliance. We partner only with globally recognized manufacturers.",
    highlight: "ISO 13485 | CE Marked | FDA Compliant",
  },
  {
    title: "Global Reach",
    content: "With distribution centers in North America, Europe, the Middle East, and Asia-Pacific, we ensure 48-hour delivery to most regions. Our dedicated logistics team handles everything from customs clearance to on-site installation.",
    highlight: "4 continents | 48-hour delivery | Full logistics",
  },
  {
    title: "Contact & Partnerships",
    content: "Ready to partner with Medlink Expediate? Our enterprise sales team offers volume discounts, flexible financing, and dedicated account management for hospitals and clinic networks. Reach out to explore how we can serve your facility.",
    highlight: "info@medlink.com | +1 (555) 123-4567",
  },
]

export function CompanyProfile() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  const goNext = () => {
    if (currentPage < defaultPages.length - 1) {
      setCurrentPage((p) => p + 1)
    }
  }

  const goPrev = () => {
    if (currentPage > 0) {
      setCurrentPage((p) => p - 1)
    }
  }

  return (
    <>
      {/* Section on Landing Page */}
      <section className="py-24 bg-[#fafaf8] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#0d9488]/5 rounded-full blur-[150px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left side - Image grid */}
            <div className="relative hidden lg:grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-[#e5e5e3] relative">
                  <Image
                    src="/hospital-medical-facility-equipment.jpg"
                    alt="Medical facility"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="bg-[#0c1f1d] rounded-2xl p-6 text-white">
                  <div className="text-3xl font-bold text-[#2dd4bf] mb-1">10+</div>
                  <div className="text-sm text-[#8aa8a5]">Years of Excellence</div>
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="bg-[#0d9488] rounded-2xl p-6 text-white">
                  <div className="text-3xl font-bold mb-1">150+</div>
                  <div className="text-sm text-white/80">Countries Served</div>
                </div>
                <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-[#e5e5e3] relative">
                  <Image
                    src="/portable-diagnostic-equipment.jpg"
                    alt="Diagnostic equipment"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Right side - Content */}
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0d9488]/10 text-[#0d9488] text-sm font-semibold rounded-full mb-6">
                <span className="w-1.5 h-1.5 bg-[#0d9488] rounded-full" />
                About Us
              </span>
              
              <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1a] mb-6 leading-tight">
                Medlink Expediate
                <br />
                <span className="text-[#0c7f73]">Ventures Limited</span>
              </h2>
              
              <p className="text-lg text-[#6b7280] mb-8 leading-relaxed">
                A global leader in medical equipment supply, we bridge the gap between 
                advanced healthcare technology and accessible delivery. Trusted by leading 
                hospitals and clinics across 150+ countries.
              </p>

              {/* Feature icons */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                {[
                  { icon: Award, label: "ISO 13485 Certified" },
                  { icon: Globe, label: "Global Distribution" },
                  { icon: Users, label: "500+ Clients" },
                  { icon: Target, label: "99.8% Satisfaction" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#e5e5e3]">
                    <div className="w-10 h-10 rounded-lg bg-[#0d9488]/10 flex items-center justify-center">
                      <item.icon size={20} className="text-[#0d9488]" />
                    </div>
                    <span className="text-sm font-medium text-[#1a1a1a]">{item.label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setCurrentPage(0)
                  setIsOpen(true)
                }}
                className="group inline-flex items-center gap-3 bg-[#0c1f1d] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[#1a3330] transition-all duration-300"
              >
                <BookOpen size={20} />
                Read Full Profile
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Flipbook Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0c1f1d]/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-[#e5e5e3] bg-[#fafaf8]">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Medlink Logo"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <div>
                  <h3 className="font-bold text-[#1a1a1a]">Medlink Expediate</h3>
                  <p className="text-xs text-[#6b7280]">Company Profile</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[#6b7280] hover:bg-[#e5e5e3] hover:text-[#1a1a1a] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Page Content */}
            <div className="p-8 md:p-12 min-h-[360px]">
              <div key={currentPage} className="animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1 bg-[#0d9488]/10 text-[#0d9488] text-xs font-semibold rounded-full">
                    {currentPage + 1} / {defaultPages.length}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a1a] mb-6">
                  {defaultPages[currentPage].title}
                </h2>
                <p className="text-[#6b7280] text-lg leading-relaxed mb-8">
                  {defaultPages[currentPage].content}
                </p>
                <div className="inline-block px-5 py-3 bg-[#0c1f1d] rounded-xl">
                  <span className="text-[#2dd4bf] text-sm font-semibold">
                    {defaultPages[currentPage].highlight}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between px-8 py-5 border-t border-[#e5e5e3] bg-[#fafaf8]">
              <button
                onClick={goPrev}
                disabled={currentPage === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white text-[#1a1a1a] hover:bg-[#f5f5f3] border border-[#e5e5e3]"
              >
                <ChevronLeft size={18} /> Previous
              </button>

              <div className="flex gap-2">
                {defaultPages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      i === currentPage
                        ? "bg-[#0d9488] w-6"
                        : "bg-[#e5e5e3] hover:bg-[#d1d1cf]"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={goNext}
                disabled={currentPage === defaultPages.length - 1}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#0d9488] text-white hover:bg-[#0f766e]"
              >
                Next <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
