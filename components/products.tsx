"use client"

import { ArrowRight, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const featuredProducts = [
  {
    id: 1,
    name: "Advanced Ultrasound System",
    category: "Diagnostic Equipment",
    price: "Ksh 900,500",
    image: "/portable-ultrasound-machine.jpg",
    tag: "Best Seller",
  },
  {
    id: 2,
    name: "12-Lead ECG Monitor",
    category: "Patient Monitoring",
    price: "ksh 231,200",
    image: "/ecg-monitor-12-lead.jpg",
    tag: "New",
  },
  {
    id: 3,
    name: "Electric Hospital Bed",
    category: "Furniture",
    price: "Ksh300,800",
    image: "/electric-patient-hospital-bed.jpg",
    tag: "Popular",
  },
  {
    id: 4,
    name: "Oxygen Concentrator",
    category: "Respiratory Care",
    price: "Ksh234,100",
    image: "/oxygen-concentrator-medical.jpg",
    tag: "In Stock",
  },
]

const categories = [
  "All Products",
  "Diagnostic",
  "Monitoring",
  "Surgical",
  "Respiratory",
  "Furniture",
]

export function Products() {
  return (
    <section className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0d9488]/10 text-[#0d9488] text-sm font-semibold rounded-full mb-4">
              <span className="w-1.5 h-1.5 bg-[#0d9488] rounded-full" />
              Our Catalog
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1a] mb-4">
              Featured <span className="text-[#0c7f73]">Equipment</span>
            </h2>
            <p className="text-lg text-[#6b7280] max-w-xl">
              Premium medical devices from globally recognized manufacturers, all ISO and CE certified.
            </p>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat, i) => (
            <button
              key={cat}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                i === 0
                  ? "bg-[#0c1f1d] text-white"
                  : "bg-[#f5f5f3] text-[#6b7280] hover:bg-[#e5e5e3]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group relative bg-[#fafaf8] rounded-2xl overflow-hidden border border-[#e5e5e3] hover:border-[#0d9488]/30 hover:shadow-xl transition-all duration-500"
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-[#f0f0ee]">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                {/* Tag */}
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-[#1a1a1a] text-xs font-semibold rounded-full">
                    {product.tag}
                  </span>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-[#0c1f1d]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="px-6 py-3 bg-white text-[#1a1a1a] font-semibold rounded-xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    View Details <ArrowUpRight size={18} />
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <p className="text-xs font-semibold text-[#0d9488] uppercase tracking-wider mb-2">
                  {product.category}
                </p>
                <h3 className="font-bold text-[#1a1a1a] text-lg mb-3 group-hover:text-[#0c7f73] transition-colors line-clamp-1">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-[#1a1a1a]">{product.price}</span>
                  <span className="text-xs text-[#6b7280]">Starting from</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-12 text-center">
          <Link
            href="/products"
            className="group inline-flex items-center gap-3 bg-[#0c1f1d] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[#1a3330] transition-all duration-300"
          >
            Browse Full Catalog
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  )
}
