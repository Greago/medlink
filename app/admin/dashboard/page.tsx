"use client"

import { useStore } from "@/lib/store"
import { Package, MessageSquare, FileText, TrendingUp, ArrowRight, Clock } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { products, inquiries, quotes } = useStore()

  const newInquiries = inquiries.filter((i) => i.status === "New").length
  const stats = [
    {
      label: "Total Products",
      value: products.length,
      icon: Package,
      bg: "bg-[#f0fdfa]",
      iconColor: "text-[#0d9488]",
      href: "/admin/products",
    },
    {
      label: "Inquiries",
      value: inquiries.length,
      icon: MessageSquare,
      bg: "bg-[#ecfeff]",
      iconColor: "text-[#0891b2]",
      href: "/admin/inquiries",
    },
    {
      label: "Quotes Generated",
      value: quotes.length,
      icon: FileText,
      bg: "bg-[#f0fdf4]",
      iconColor: "text-[#16a34a]",
      href: "/admin/quotes",
    },
    {
      label: "New This Month",
      value: newInquiries,
      icon: TrendingUp,
      bg: "bg-[#fefce8]",
      iconColor: "text-[#ca8a04]",
      href: "/admin/inquiries",
    },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-[#0f2b2e]">Welcome back</h1>
        <p className="text-[#5f7a7d] mt-1">Here is an overview of your business activity.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Link
              key={i}
              href={stat.href}
              className="bg-white rounded-xl border border-[#d1e8e5] p-6 hover:shadow-md hover:border-[#99f6e4] transition-all group"
            >
              <div className={`w-11 h-11 ${stat.bg} rounded-xl flex items-center justify-center mb-4`}>
                <Icon size={22} className={stat.iconColor} />
              </div>
              <p className="text-sm text-[#5f7a7d] font-medium">{stat.label}</p>
              <div className="flex items-end justify-between mt-1">
                <span className="text-3xl font-bold text-[#0f2b2e]">{stat.value}</span>
                <ArrowRight size={16} className="text-[#5f7a7d] group-hover:text-[#0d9488] group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-5">
        <Link
          href="/admin/products"
          className="bg-[#0d9488] text-white rounded-xl p-6 hover:bg-[#0f766e] transition-colors"
        >
          <Package size={24} className="mb-3" />
          <h3 className="font-bold text-lg mb-1">Add Product</h3>
          <p className="text-white/70 text-sm">Add new medical equipment to your catalog</p>
        </Link>
        <Link
          href="/admin/inquiries"
          className="bg-white border border-[#d1e8e5] rounded-xl p-6 hover:border-[#99f6e4] hover:shadow-md transition-all"
        >
          <MessageSquare size={24} className="mb-3 text-[#0891b2]" />
          <h3 className="font-bold text-lg text-[#0f2b2e] mb-1">View Inquiries</h3>
          <p className="text-[#5f7a7d] text-sm">Review and respond to customer requests</p>
        </Link>
        <Link
          href="/admin/quotes"
          className="bg-white border border-[#d1e8e5] rounded-xl p-6 hover:border-[#99f6e4] hover:shadow-md transition-all"
        >
          <FileText size={24} className="mb-3 text-[#16a34a]" />
          <h3 className="font-bold text-lg text-[#0f2b2e] mb-1">Generate Quote</h3>
          <p className="text-[#5f7a7d] text-sm">Create quotes for customer inquiries</p>
        </Link>
      </div>

      {/* Recent Inquiries */}
      <div className="bg-white rounded-xl border border-[#d1e8e5] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#d1e8e5] flex justify-between items-center">
          <h3 className="font-bold text-[#0f2b2e] text-lg">Recent Inquiries</h3>
          <Link href="/admin/inquiries" className="text-sm text-[#0d9488] font-medium hover:underline">
            View All
          </Link>
        </div>

        {inquiries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-[#f0fdfa] rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} className="text-[#5f7a7d]" />
            </div>
            <p className="text-[#5f7a7d] font-medium">No inquiries yet</p>
            <p className="text-[#5f7a7d] text-sm mt-1">Customer inquiries will appear here when submitted.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#d1e8e5]">
            {inquiries.slice(0, 5).map((inquiry) => (
              <div key={inquiry.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#f0fdfb] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#f0fdfa] rounded-lg flex items-center justify-center shrink-0">
                    <MessageSquare size={18} className="text-[#0d9488]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#0f2b2e] text-sm">{inquiry.companyName}</p>
                    <p className="text-xs text-[#5f7a7d]">{inquiry.contactPerson} - {inquiry.products.length} item(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      inquiry.status === "New"
                        ? "bg-[#ecfeff] text-[#0891b2]"
                        : inquiry.status === "Quoted"
                          ? "bg-[#f0fdf4] text-[#16a34a]"
                          : "bg-[#f0fdfa] text-[#5f7a7d]"
                    }`}
                  >
                    {inquiry.status}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[#5f7a7d]">
                    <Clock size={12} />
                    {new Date(inquiry.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Products */}
      <div className="bg-white rounded-xl border border-[#d1e8e5] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#d1e8e5] flex justify-between items-center">
          <h3 className="font-bold text-[#0f2b2e] text-lg">Recent Products</h3>
          <Link href="/admin/products" className="text-sm text-[#0d9488] font-medium hover:underline">
            Manage
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-[#f0fdfa] rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={24} className="text-[#5f7a7d]" />
            </div>
            <p className="text-[#5f7a7d] font-medium">No products added yet</p>
            <p className="text-[#5f7a7d] text-sm mt-1">Head to Products to add your first item.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#d1e8e5]">
            {products.slice(0, 5).map((product) => (
              <div key={product.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#f0fdfb] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#f0fdfa] rounded-lg overflow-hidden shrink-0">
                    {product.image ? (
                      <img src={product.image || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={18} className="text-[#0d9488]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#0f2b2e] text-sm">{product.name}</p>
                    <p className="text-xs text-[#5f7a7d]">{product.category}</p>
                  </div>
                </div>
                <span className="font-bold text-[#0d9488] text-sm">${product.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
