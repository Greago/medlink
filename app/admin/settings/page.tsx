"use client"

import { useStore } from "@/lib/store"
import { useState, useEffect } from "react"
import { Settings, MessageCircle, Mail, Phone, MapPin, Save, Check } from "lucide-react"

export default function SettingsPage() {
  const { whatsappNumber, companyEmail, companyPhone, companyAddress, setWhatsappNumber, setCompanyInfo } = useStore()
  
  const [formData, setFormData] = useState({
    whatsapp: whatsappNumber,
    email: companyEmail,
    phone: companyPhone,
    address: companyAddress,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setFormData({
      whatsapp: whatsappNumber,
      email: companyEmail,
      phone: companyPhone,
      address: companyAddress,
    })
  }, [whatsappNumber, companyEmail, companyPhone, companyAddress])

  const handleSave = () => {
    setWhatsappNumber(formData.whatsapp)
    setCompanyInfo({
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-[#f0fdfa] rounded-xl flex items-center justify-center">
          <Settings size={24} className="text-[#0d9488]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0f2b2e]">Settings</h1>
          <p className="text-[#5f7a7d]">Manage your business contact information</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#d1e8e5] overflow-hidden">
        {/* WhatsApp Section */}
        <div className="p-6 border-b border-[#d1e8e5]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#25D366]/10 rounded-lg flex items-center justify-center">
              <MessageCircle size={20} className="text-[#25D366]" />
            </div>
            <div>
              <h2 className="font-semibold text-[#0f2b2e]">WhatsApp Business Number</h2>
              <p className="text-sm text-[#5f7a7d]">This number will be used for WhatsApp orders from the product catalog</p>
            </div>
          </div>
          <input
            type="tel"
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            placeholder="Enter WhatsApp number (e.g., 1234567890)"
            className="w-full px-4 py-3 border border-[#d1e8e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all text-[#0f2b2e]"
          />
          <p className="text-xs text-[#5f7a7d] mt-2">Enter the number without + or spaces (e.g., 1234567890 for US numbers)</p>
        </div>

        {/* Email Section */}
        <div className="p-6 border-b border-[#d1e8e5]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#0d9488]/10 rounded-lg flex items-center justify-center">
              <Mail size={20} className="text-[#0d9488]" />
            </div>
            <div>
              <h2 className="font-semibold text-[#0f2b2e]">Company Email</h2>
              <p className="text-sm text-[#5f7a7d]">Primary contact email displayed on the website</p>
            </div>
          </div>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter company email"
            className="w-full px-4 py-3 border border-[#d1e8e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all text-[#0f2b2e]"
          />
        </div>

        {/* Phone Section */}
        <div className="p-6 border-b border-[#d1e8e5]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#0891b2]/10 rounded-lg flex items-center justify-center">
              <Phone size={20} className="text-[#0891b2]" />
            </div>
            <div>
              <h2 className="font-semibold text-[#0f2b2e]">Company Phone</h2>
              <p className="text-sm text-[#5f7a7d]">Primary phone number for customer inquiries</p>
            </div>
          </div>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter company phone number"
            className="w-full px-4 py-3 border border-[#d1e8e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all text-[#0f2b2e]"
          />
        </div>

        {/* Address Section */}
        <div className="p-6 border-b border-[#d1e8e5]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#f59e0b]/10 rounded-lg flex items-center justify-center">
              <MapPin size={20} className="text-[#f59e0b]" />
            </div>
            <div>
              <h2 className="font-semibold text-[#0f2b2e]">Company Address</h2>
              <p className="text-sm text-[#5f7a7d]">Business address displayed in contact sections</p>
            </div>
          </div>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Enter company address"
            rows={3}
            className="w-full px-4 py-3 border border-[#d1e8e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all text-[#0f2b2e] resize-none"
          />
        </div>

        {/* Save Button */}
        <div className="p-6 bg-[#f0fdfa]/50">
          <button
            onClick={handleSave}
            className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              saved
                ? "bg-green-500 text-white"
                : "bg-[#0d9488] text-white hover:bg-[#0f766e]"
            }`}
          >
            {saved ? (
              <>
                <Check size={20} />
                Settings Saved!
              </>
            ) : (
              <>
                <Save size={20} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-6 p-5 bg-blue-50 border border-blue-100 rounded-xl">
        <h3 className="font-semibold text-blue-900 mb-2">How WhatsApp Orders Work</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>- When customers click "Order via WhatsApp" on product pages, they will be redirected to WhatsApp with your number</li>
          <li>- The message will include product details, quantity, and a link back to the product</li>
          <li>- Make sure to use a valid WhatsApp Business number for best results</li>
        </ul>
      </div>
    </div>
  )
}
