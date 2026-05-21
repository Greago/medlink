"use client"

import { useStore } from "@/lib/store"
import { MessageSquare, Eye, CheckCircle } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

export default function InquiriesPage() {
  const inquiries = useStore((s) => s.inquiries)
  const [selectedInquiry, setSelectedInquiry] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New":
        return "bg-blue-50 text-blue-700"
      case "Quoted":
        return "bg-green-50 text-green-700"
      case "Pending":
        return "bg-yellow-50 text-yellow-700"
      case "Completed":
        return "bg-purple-50 text-purple-700"
      default:
        return "bg-gray-50 text-gray-700"
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inquiries</h1>
          <p className="text-muted-foreground mt-1">Manage customer equipment requests</p>
        </div>
        <div className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold text-lg">
          {inquiries.length} Active
        </div>
      </div>

      {inquiries.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={32} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-lg">No inquiries yet</p>
          <p className="text-muted-foreground text-sm mt-2">Customer inquiries will appear here</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Company</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Contact</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Products</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{inquiry.companyName}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{inquiry.contactPerson}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{inquiry.email}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{inquiry.products.length} items</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(inquiry.status)}`}
                      >
                        {inquiry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(inquiry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedInquiry(selectedInquiry === inquiry.id ? null : inquiry.id)}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                        >
                          <Eye size={16} />
                        </button>
                        <Link
                          href={`/admin/quotes?inquiryId=${inquiry.id}&company=${inquiry.companyName}`}
                          className="p-2 hover:bg-accent/10 rounded-lg transition-colors text-accent"
                        >
                          <CheckCircle size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inquiry Details */}
      {selectedInquiry && (
        <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
          {(() => {
            const inquiry = inquiries.find((i) => i.id === selectedInquiry)
            if (!inquiry) return null

            return (
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">{inquiry.companyName} - Details</h3>

                <div className="grid md:grid-cols-2 gap-8 mb-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Person</p>
                      <p className="font-semibold text-foreground">{inquiry.contactPerson}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-semibold text-foreground">{inquiry.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-semibold text-foreground">{inquiry.phone}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Products Requested</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {inquiry.products.map((product, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                          >
                            {product}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Quantity</p>
                      <p className="font-semibold text-foreground">{inquiry.quantity} unit(s)</p>
                    </div>
                  </div>
                </div>

                {inquiry.additionalNotes && (
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Additional Notes</p>
                    <p className="text-foreground">{inquiry.additionalNotes}</p>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
