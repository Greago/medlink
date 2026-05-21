"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Filter, Search, Grid3X3, List, SlidersHorizontal, X, ChevronDown, Eye, MessageCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import Link from "next/link"

const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "Portable Ultrasound Machine",
    category: "Diagnostic",
    price: 4500,
    image: "/portable-ultrasound-machine.jpg",
    description: "High-resolution portable ultrasound system for point-of-care diagnostics with wireless connectivity.",
    specs: ["15-inch HD display", "Battery: 4hrs", "Weight: 5.2kg"],
    inStock: true,
  },
  {
    id: "2",
    name: "ECG Monitor 12-Lead",
    category: "Monitoring",
    price: 2200,
    image: "/ecg-monitor-12-lead.jpg",
    description: "Advanced 12-lead ECG monitoring system with wireless transmission and cloud connectivity.",
    specs: ["12-lead capability", "WiFi enabled", "Touch screen"],
    inStock: true,
  },
  {
    id: "3",
    name: "Electric Hospital Bed",
    category: "Hospital Furniture",
    price: 3800,
    image: "/electric-patient-hospital-bed.jpg",
    description: "Premium electric hospital bed with multiple positioning options and integrated patient controls.",
    specs: ["4 motors", "450kg capacity", "Side rails included"],
    inStock: true,
  },
  {
    id: "4",
    name: "Medical Oxygen Concentrator",
    category: "Respiratory",
    price: 1200,
    image: "/oxygen-concentrator-medical.jpg",
    description: "Portable oxygen concentrator delivering continuous flow for respiratory therapy patients.",
    specs: ["5L/min flow", "Low noise", "Portable design"],
    inStock: false,
  },
  {
    id: "5",
    name: "LED Surgical Light System",
    category: "Surgical",
    price: 5500,
    image: "/portable-diagnostic-equipment.jpg",
    description: "Shadow-free LED surgical lights with adjustable intensity and color temperature.",
    specs: ["160,000 lux", "Color temp adjust", "Ceiling mount"],
    inStock: true,
  },
  {
    id: "6",
    name: "Digital X-Ray System",
    category: "Diagnostic",
    price: 28000,
    image: "/hospital-medical-facility-equipment.jpg",
    description: "Complete digital radiography system with instant image processing and DICOM compatibility.",
    specs: ["Flat panel detector", "DICOM ready", "AI-assisted"],
    inStock: true,
  },
]

export function ProductsClient() {
  const { products } = useStore()
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<string>("name")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000])
  const [showFilters, setShowFilters] = useState(false)
  const [quickViewProduct, setQuickViewProduct] = useState<typeof MOCK_PRODUCTS[0] | null>(null)

  const allProducts = products.length > 0 ? [...products.map(p => ({ ...p, specs: [], inStock: true }))] : MOCK_PRODUCTS
  const categories = ["All", ...new Set(allProducts.map((p) => p.category))]

  const filtered = allProducts
    .filter((product) => {
      const matchesCategory = selectedCategory === "All" || product.category === selectedCategory
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1]
      return matchesCategory && matchesSearch && matchesPrice
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price
      if (sortBy === "price-high") return b.price - a.price
      return a.name.localeCompare(b.name)
    })

  const generateWhatsAppLink = (product: typeof MOCK_PRODUCTS[0]) => {
    const message = encodeURIComponent(
      `Hi, I'm interested in ordering:\n\n*${product.name}*\nPrice: $${product.price.toLocaleString()}\nCategory: ${product.category}\n\nProduct Link: ${typeof window !== 'undefined' ? window.location.origin : ''}/products/${product.id}\n\nPlease provide more information.`
    )
    return `https://wa.me/+254743325746?text=${message}`
  }

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <Navigation />

      {/* Hero Header */}
      <section className="relative bg-gradient-to-br from-[#0a3d3d] via-[#0d4f4f] to-[#115e59] py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-block px-4 py-1.5 bg-white/10 text-white/90 text-sm font-medium rounded-full border border-white/20 mb-6">
              Professional Medical Equipment
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Product Catalog
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Discover our comprehensive range of certified medical equipment for healthcare facilities worldwide.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search & Controls Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, category, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-gray-900 placeholder-gray-500"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {/* Category Dropdown */}
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="appearance-none pl-4 pr-10 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-gray-700 font-medium cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>

                {/* Sort */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none pl-4 pr-10 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488] text-gray-700 font-medium cursor-pointer"
                  >
                    <option value="name">Sort: Name</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-3 rounded-xl transition-all ${showFilters ? 'bg-[#0d9488] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  <SlidersHorizontal size={20} />
                </button>

                {/* View Mode */}
                <div className="flex bg-gray-50 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? 'bg-white shadow-sm text-[#0d9488]' : 'text-gray-400'}`}
                  >
                    <Grid3X3 size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-all ${viewMode === "list" ? 'bg-white shadow-sm text-[#0d9488]' : 'text-gray-400'}`}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Price Range</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                        className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                        placeholder="Min"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="number"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                        placeholder="Max"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Availability</label>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-[#0d9488] text-white text-sm rounded-lg font-medium">All</button>
                      <button className="px-4 py-2 bg-gray-50 text-gray-600 text-sm rounded-lg font-medium hover:bg-gray-100">In Stock</button>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSelectedCategory("All")
                        setSearchQuery("")
                        setPriceRange([0, 50000])
                        setSortBy("name")
                      }}
                      className="px-4 py-2 text-sm text-[#0d9488] font-medium hover:bg-[#0d9488]/5 rounded-lg transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filtered.length}</span> products
            </p>
            {selectedCategory !== "All" && (
              <button
                onClick={() => setSelectedCategory("All")}
                className="flex items-center gap-1 text-sm text-[#0d9488] hover:underline"
              >
                <X size={14} /> Clear category filter
              </button>
            )}
          </div>

          {/* Products Grid/List */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search or filter criteria</p>
              <button
                onClick={() => {
                  setSelectedCategory("All")
                  setSearchQuery("")
                  setPriceRange([0, 50000])
                }}
                className="px-6 py-2 bg-[#0d9488] text-white rounded-lg font-medium hover:bg-[#0f766e] transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((product, i) => (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-[#0d9488]/20 transition-all duration-500"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {/* Image */}
                  <div className="relative h-56 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setQuickViewProduct(product)}
                          className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors"
                        >
                          <Eye size={16} /> Quick View
                        </button>
                        <a
                          href={generateWhatsAppLink(product)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-[#25D366] text-white rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-[#20bd5a] transition-colors"
                        >
                          <MessageCircle size={16} /> Order
                        </a>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${product.inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                    {/* Category Badge */}
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700">
                        {product.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-[#0d9488] transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{product.description}</p>

                    {/* Specs Preview */}
                    {product.specs && product.specs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.specs.slice(0, 2).map((spec, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md">
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Price & Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Price</p>
                        <p className="text-2xl font-bold text-[#0d9488]">${product.price.toLocaleString()}</p>
                      </div>
                      <Link
                        href={`/products/${product.id}`}
                        className="px-5 py-2.5 bg-[#0d9488] text-white rounded-xl font-semibold text-sm hover:bg-[#0f766e] transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {filtered.map((product, i) => (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-[#0d9488]/20 transition-all duration-300 flex"
                >
                  {/* Image */}
                  <div className="relative w-64 shrink-0 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${product.inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-xs font-semibold text-[#0d9488] uppercase tracking-wide">{product.category}</span>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#0d9488] transition-colors">{product.name}</h3>
                        </div>
                        <p className="text-2xl font-bold text-[#0d9488]">${product.price.toLocaleString()}</p>
                      </div>
                      <p className="text-gray-500 mb-4">{product.description}</p>
                      {product.specs && product.specs.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {product.specs.map((spec, idx) => (
                            <span key={idx} className="px-3 py-1 bg-gray-50 text-gray-600 text-sm rounded-lg">
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                      <Link
                        href={`/products/${product.id}`}
                        className="px-6 py-2.5 bg-[#0d9488] text-white rounded-xl font-semibold text-sm hover:bg-[#0f766e] transition-colors"
                      >
                        View Details
                      </Link>
                      <a
                        href={generateWhatsAppLink(product)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2.5 bg-[#25D366] text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-[#20bd5a] transition-colors"
                      >
                        <MessageCircle size={16} /> Order via WhatsApp
                      </a>
                      <button
                        onClick={() => setQuickViewProduct(product)}
                        className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
                      >
                        Quick View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setQuickViewProduct(null)}>
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="grid md:grid-cols-2">
              {/* Image */}
              <div className="relative h-72 md:h-full bg-gradient-to-br from-gray-50 to-gray-100">
                <img
                  src={quickViewProduct.image || "/placeholder.svg"}
                  alt={quickViewProduct.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setQuickViewProduct(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-[#0d9488]/10 text-[#0d9488] text-xs font-semibold rounded-full">{quickViewProduct.category}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${quickViewProduct.inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {quickViewProduct.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-3">{quickViewProduct.name}</h2>
                <p className="text-gray-500 mb-6">{quickViewProduct.description}</p>

                {quickViewProduct.specs && quickViewProduct.specs.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Key Specifications</h4>
                    <div className="flex flex-wrap gap-2">
                      {quickViewProduct.specs.map((spec, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-500 mb-1">Price</p>
                  <p className="text-3xl font-bold text-[#0d9488]">${quickViewProduct.price.toLocaleString()}</p>
                </div>

                <div className="mt-auto space-y-3">
                  <a
                    href={generateWhatsAppLink(quickViewProduct)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 bg-[#25D366] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-colors"
                  >
                    <MessageCircle size={20} /> Order via WhatsApp
                  </a>
                  <Link
                    href={`/products/${quickViewProduct.id}`}
                    className="w-full py-3.5 bg-[#0d9488] text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#0f766e] transition-colors"
                  >
                    View Full Details
                  </Link>
                  <Link
                    href="/inquiry"
                    className="w-full py-3.5 border border-gray-200 text-gray-700 rounded-xl font-semibold flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    Request Custom Quote
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  )
}
