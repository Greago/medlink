"use client"

import type React from "react"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Contact form submitted:", formData)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" })
  }

  return (
    <main className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-br from-[#0a3d3d] via-[#0d4f4f] to-[#115e59]">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1576091160550-112173f7f869?w=1200&h=800&fit=crop"
            alt="Professional healthcare team"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a3d3d]/55 via-[#0d4f4f]/50 to-[#115e59]/55" />
        </div>
        
        {/* SVG Pattern Overlay */}
        <div className="absolute inset-0 opacity-10 z-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        </div>
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-20">
          <span className="inline-block px-4 py-1.5 bg-white/10 text-white/90 text-sm font-semibold rounded-full border border-white/20 mb-6 backdrop-blur-sm">
            Get in Touch
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Let&apos;s Connect & Build Solutions Together
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Have questions about our medical equipment or services? Our dedicated team is ready to assist you with expert advice and support.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {/* Contact Card 1 */}
            <div className="group relative bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-xl hover:border-[#0d9488]/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0d9488]/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="w-14 h-14 bg-[#0d9488]/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#0d9488]/20 transition-colors">
                  <Phone className="text-[#0d9488]" size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Call Us</h3>
                <p className="text-[#0d9488] font-semibold text-lg mb-2">+254743325746</p>
                <p className="text-gray-600 text-sm">Monday - Friday, 9AM - 6PM EAT</p>
              </div>
            </div>

            {/* Contact Card 2 */}
            <div className="group relative bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-xl hover:border-[#0d9488]/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0d9488]/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="w-14 h-14 bg-[#0d9488]/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#0d9488]/20 transition-colors">
                  <Mail className="text-[#0d9488]" size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Email Us</h3>
                <p className="text-gray-600 text-sm mb-1">
                  <a href="mailto:info@medlinkexpedite.co.ke" className="text-[#0d9488] font-semibold hover:underline">info@medlinkexpedite.co.ke</a>
                </p>
                <p className="text-gray-600 text-sm">
                  <a href="mailto:sales@medlinkexpedite.co.ke" className="text-[#0d9488] font-semibold hover:underline">sales@medlinkexpedite.co.ke</a>
                </p>
              </div>
            </div>

            {/* Contact Card 3 */}
            <div className="group relative bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-xl hover:border-[#0d9488]/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0d9488]/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="w-14 h-14 bg-[#0d9488]/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#0d9488]/20 transition-colors">
                  <MapPin className="text-[#0d9488]" size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Visit Us</h3>
                <p className="font-semibold text-gray-900 mb-1">Bee Center</p>
                <p className="text-gray-600 text-sm">Embakasi Central, Nairobi, Kenya</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Contact Info Section */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  We&apos;re Here to Help
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Whether you&apos;re looking for specific medical equipment, need technical support, or want to discuss a custom solution, our team is ready to assist you.
                </p>
              </div>

              {/* Hours */}
              <div className="bg-gradient-to-br from-[#f0fdf9] to-[#f0fdf9] border border-[#0d9488]/20 rounded-2xl p-8">
                <div className="flex gap-4 mb-6">
                  <div className="w-12 h-12 bg-[#0d9488]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="text-[#0d9488]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Business Hours</h3>
                    <p className="text-sm text-gray-600">Available for your inquiries</p>
                  </div>
                </div>
                <div className="space-y-3 ml-16">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monday - Friday</span>
                    <span className="font-semibold text-gray-900">9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Saturday</span>
                    <span className="font-semibold text-gray-900">Closed</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sunday</span>
                    <span className="font-semibold text-gray-900">9:00 AM - 6:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="rounded-2xl overflow-hidden border border-gray-200 h-72 shadow-lg hover:shadow-xl transition-shadow">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.7919656117186!2d36.86748!3d-1.30206!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f17d4a1a1a1a1%3A0x1a1a1a1a1a1a1a1a!2sBee%20Center%2C%20Embakasi%20Central!5e0!3m2!1sen!2ske!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Send us a Message</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {submitted && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Thank you! We&apos;ll get back to you soon.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent text-gray-900 placeholder-gray-500 transition-all"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent text-gray-900 placeholder-gray-500 transition-all"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent text-gray-900 placeholder-gray-500 transition-all"
                    placeholder="+254 (700) 000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Subject</label>
                  <select
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent text-gray-900 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select a subject</option>
                    <option value="product-inquiry">Product Inquiry</option>
                    <option value="technical-support">Technical Support</option>
                    <option value="sales">Sales</option>
                    <option value="partnership">Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-transparent text-gray-900 placeholder-gray-500 resize-none transition-all"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#0d9488] to-[#0f766e] text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:from-[#0f766e] hover:to-[#115e59] transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  <Send size={18} className="group-hover:translate-x-1 transition-transform" /> Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
