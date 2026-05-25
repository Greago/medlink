"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { useStore } from "@/lib/store"
import { Heart, Share2, ShoppingCart, MessageCircle, Check, ChevronRight, Truck, Shield, RefreshCw, Phone } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"

const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "Portable Ultrasound Machine",
    category: "Diagnostic",
    price: 4500,
    image: "/portable-ultrasound-machine.jpg",
    description: "High-resolution portable ultrasound system for point-of-care diagnostics with wireless connectivity. This advanced system provides exceptional image quality in a compact, mobile design perfect for clinical and field use.",
    specs: ["15-inch HD display", "Battery: 4hrs", "Weight: 5.2kg", "Wireless connectivity", "DICOM compatible"],
    features: [
      "High-resolution B-mode imaging with advanced signal processing",
      "Wireless data transmission and cloud storage capability",
      "Battery-powered with up to 4 hours continuous operation",
      "Compatible with multiple transducer types",
      "Intuitive touch-screen interface",
      "Portable design with ergonomic carry handle"
    ],
    inStock: true,
  },
  {
    id: "2",
    name: "ECG Monitor 12-Lead",
    category: "Monitoring",
    price: 2200,
    image: "/ecg-monitor-12-lead.jpg",
    description: "Advanced 12-lead ECG monitoring system with wireless transmission and cloud connectivity. Professional-grade cardiac monitoring solution for hospitals and clinics.",
    specs: ["12-lead capability", "WiFi enabled", "Touch screen", "PDF export", "Rechargeable"],
    features: [
      "Simultaneous 12-lead ECG acquisition",
      "WiFi and Bluetooth connectivity",
      "Real-time data transmission to central station",
      "Advanced arrhythmia detection algorithms",
      "Built-in thermal printer",
      "Long-lasting rechargeable battery"
    ],
    inStock: true,
  },
  {
    id: "3",
    name: "Electric Hospital Bed",
    category: "Hospital Furniture",
    price: 3800,
    image: "/electric-patient-hospital-bed.jpg",
    description: "Premium electric hospital bed with multiple positioning options and integrated patient controls. Designed for maximum patient comfort and caregiver efficiency.",
    specs: ["4 motors", "450kg capacity", "Side rails included", "CPR release", "Trendelenburg"],
    features: [
      "Four independent motor controls",
      "High weight capacity up to 450kg",
      "Integrated side rails with easy-release mechanism",
      "One-touch CPR release function",
      "Trendelenburg and reverse Trendelenburg positions",
      "Lockable casters for stability"
    ],
    inStock: true,
  },
  {
    id: "4",
    name: "Medical Oxygen Concentrator",
    category: "Respiratory",
    price: 1200,
    image: "/oxygen-concentrator-medical.jpg",
    description: "Portable oxygen concentrator delivering continuous flow for respiratory therapy patients. Quiet operation and reliable performance for home or clinical use.",
    specs: ["5L/min flow", "Low noise", "Portable design", "Auto-shutoff", "LCD display"],
    features: [
      "Continuous flow up to 5 liters per minute",
      "Ultra-quiet operation under 40dB",
      "Lightweight portable design",
      "Automatic safety shutoff",
      "Easy-to-read LCD display",
      "Low maintenance requirements"
    ],
    inStock: false,
  },
  {
    id: "5",
    name: "LED Surgical Light System",
    category: "Surgical",
    price: 5500,
    image: "/portable-diagnostic-equipment.jpg",
    description: "Shadow-free LED surgical lights with adjustable intensity and color temperature. Professional operating room illumination system with excellent color rendering.",
    specs: ["160,000 lux", "Color temp adjust", "Ceiling mount", "Sterilizable handles", "10yr LED life"],
    features: [
      "Maximum illumination of 160,000 lux",
      "Adjustable color temperature 3,500K - 5,000K",
      "Shadow-free illumination design",
      "Sterilizable central handles",
      "10-year LED lifespan",
      "Flexible arm positioning"
    ],
    inStock: true,
  },
  {
    id: "6",
    name: "Digital X-Ray System",
    category: "Diagnostic",
    price: 28000,
    image: "/hospital-medical-facility-equipment.jpg",
    description: "Complete digital radiography system with instant image processing and DICOM compatibility. State-of-the-art imaging technology for modern healthcare facilities.",
    specs: ["Flat panel detector", "DICOM ready", "AI-assisted", "Auto-positioning", "Remote access"],
    features: [
      "High-resolution flat panel detector",
      "Full DICOM compatibility",
      "AI-assisted image analysis",
      "Automatic patient positioning",
      "Remote access and telemedicine ready",
      "Low radiation dose technology"
    ],
    inStock: true,
  },
]

export default function ProductDetailPage() {
  const params = useParams()
  const { products } = useStore()
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<"description" | "specs" | "shipping">("description")

  const allProducts = products.length > 0 
    ? products.map(p => ({ 
        ...p, 
        specs: [], 
        features: [], 
        inStock: true 
      })) 
    : MOCK_PRODUCTS

  const product = allProducts.find(p => p.id === params.id) || MOCK_PRODUCTS[0]
  const relatedProducts = allProducts.filter(p => p.category === product.category && p.id !== product.id).slice(0, 3)

  const generateWhatsAppLink = () => {
    const productUrl = typeof window !== 'undefined' ? `${window.location.origin}/products/${product.id}` : ''
    const message = encodeURIComponent(
      `Hi, I would like to order:\n\n*Product:* ${product.name}\n*Quantity:* ${quantity}\n*Unit Price:* $${product.price.toLocaleString()}\n*Total:* $${(product.price * quantity).toLocaleString()}\n\n*Product Link:* ${productUrl}\n\nPlease confirm availability and proceed with my order.`
    )
    return `https://wa.me/+254743325746?text=${message}`
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        })
      } catch (err) {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <Navigation />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-[#0d9488]">Home</Link>
            <ChevronRight size={14} className="text-gray-300" />
            <Link href="/products" className="text-gray-500 hover:text-[#0d9488]">Products</Link>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="text-gray-900 font-medium">{product.name}</span>
          </div>
        </div>
      </div>

      {/* Product Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            {/* Product Image */}
            <div className="space-y-4">
              <div className="relative bg-white rounded-3xl overflow-hidden border border-gray-100 aspect-square">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {!product.inStock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-full">Out of Stock</span>
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-4 py-1.5 bg-[#0d9488]/10 text-[#0d9488] text-sm font-semibold rounded-full">
                  {product.category}
                </span>
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${product.inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">{product.description}</p>

              {/* Price Box */}
              <div className="bg-gradient-to-br from-[#0d9488]/5 to-[#0891b2]/5 rounded-2xl p-6 mb-8 border border-[#0d9488]/10">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Unit Price</p>
                    <p className="text-4xl font-bold text-[#0d9488]">${product.price.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Total</p>
                    <p className="text-2xl font-bold text-gray-900">${(product.price * quantity).toLocaleString()}</p>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-sm font-medium text-gray-700">Quantity:</span>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors font-semibold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center py-2 border-x border-gray-200 focus:outline-none font-semibold"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={generateWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-4 bg-[#25D366] text-white rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-[#20bd5a] transition-all hover:shadow-lg hover:shadow-[#25D366]/20"
                  >
                    <MessageCircle size={22} />
                    Order via WhatsApp
                  </a>
                  <Link
                    href="/inquiry"
                    className="flex-1 py-4 bg-[#0d9488] text-white rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-[#0f766e] transition-all hover:shadow-lg hover:shadow-[#0d9488]/20"
                  >
                    <ShoppingCart size={22} />
                    Request Quote
                  </Link>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-8">
                <button className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                  <Heart size={20} /> Save
                </button>
                <button onClick={handleShare} className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                  <Share2 size={20} /> Share
                </button>
                <Link href="/contact" className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                  <Phone size={20} /> Contact Sales
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                  <Truck size={20} className="text-[#0d9488]" />
                  <span className="text-sm text-gray-600">Fast Delivery</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                  <Shield size={20} className="text-[#0d9488]" />
                  <span className="text-sm text-gray-600">Warranty</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                  <RefreshCw size={20} className="text-[#0d9488]" />
                  <span className="text-sm text-gray-600">Support</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-100">
              {[
                { key: "description", label: "Features" },
                { key: "specs", label: "Specifications" },
                { key: "shipping", label: "Shipping & Returns" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex-1 py-5 text-center font-semibold transition-colors ${
                    activeTab === tab.key
                      ? 'text-[#0d9488] border-b-2 border-[#0d9488] bg-[#0d9488]/5'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-8">
              {activeTab === "description" && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Key Features</h3>
                  <ul className="grid md:grid-cols-2 gap-4">
                    {(product.features || []).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#0d9488]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={14} className="text-[#0d9488]" />
                        </div>
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === "specs" && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Technical Specifications</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {(product.specs || []).map((spec, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-[#0d9488]" />
                        <span className="text-gray-700 font-medium">{spec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "shipping" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Shipping Information</h3>
                    <p className="text-gray-600">We offer worldwide shipping on all medical equipment. Delivery times vary based on your location and the equipment ordered. Most orders ship within 2-5 business days. Contact our sales team for specific delivery estimates.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Returns & Warranty</h3>
                    <p className="text-gray-600">All products come with manufacturer warranty. Equipment can be returned within 30 days if unopened and in original packaging. For defective items, we offer full replacement or repair services. Extended warranty options are available.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="mt-16">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Related Products</h2>
                <Link href="/products" className="text-[#0d9488] font-semibold hover:underline">View All</Link>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedProducts.map((related) => (
                  <Link
                    key={related.id}
                    href={`/products/${related.id}`}
                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all"
                  >
                    <div className="h-48 bg-gray-50 overflow-hidden">
                      <img
                        src={related.image || "/placeholder.svg"}
                        alt={related.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-semibold text-[#0d9488] uppercase tracking-wide mb-1">{related.category}</p>
                      <h3 className="font-bold text-gray-900 mb-3 group-hover:text-[#0d9488] transition-colors">{related.name}</h3>
                      <p className="text-2xl font-bold text-[#0d9488]">${related.price.toLocaleString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
