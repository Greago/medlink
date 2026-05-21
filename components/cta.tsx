import Link from "next/link"
import { ArrowRight, Phone, Mail, MapPin } from "lucide-react"

export function CTA() {
  return (
    <section className="py-24 bg-gradient-to-br from-[#0c1f1d] via-[#0a1816] to-[#071412] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#0d9488]/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#14b8a6]/8 rounded-full blur-[120px]" />
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0d9488]/10 text-[#2dd4bf] text-sm font-semibold rounded-full border border-[#0d9488]/20 mb-6">
              <span className="w-1.5 h-1.5 bg-[#2dd4bf] rounded-full animate-pulse" />
              Get Started Today
            </span>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Ready to Upgrade
              <br />
              Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2dd4bf] to-[#14b8a6]">Equipment?</span>
            </h2>
            
            <p className="text-lg text-[#8aa8a5] mb-8 leading-relaxed max-w-lg">
              From single devices to complete facility outfitting, our team provides personalized solutions with competitive pricing and rapid deployment.
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                "Free Consultation",
                "Volume Discounts",
                "48h Delivery",
                "24/7 Support",
                "Financing Options",
                "Installation Help",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#2dd4bf] rounded-full" />
                  <span className="text-sm text-white/90">{item}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/inquiry"
                className="group inline-flex items-center justify-center gap-2 bg-[#0d9488] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[#0f766e] transition-all duration-300 shadow-lg shadow-[#0d9488]/25"
              >
                Request a Quote
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-white/5 text-white border border-white/10 px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all backdrop-blur-sm"
              >
                <Phone size={18} />
                Schedule a Call
              </Link>
            </div>
          </div>

          {/* Right Side - Contact Card */}
          <div className="bg-white/[0.03] backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/[0.06]">
            <h3 className="text-2xl font-bold text-white mb-8">Quick Contact</h3>
            
            <div className="space-y-6">
              {[
                { icon: Phone, label: "Sales Hotline", value: "+1 (555) 123-4567", sublabel: "24/7 Available" },
                { icon: Mail, label: "Email Us", value: "sales@medlink.com", sublabel: "Response within 2h" },
                { icon: MapPin, label: "Headquarters", value: "123 Medical Ave, NY 10001", sublabel: "Visit by appointment" },
              ].map((contact, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.05] transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-[#0d9488]/20 flex items-center justify-center shrink-0">
                    <contact.icon size={22} className="text-[#2dd4bf]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#8aa8a5] uppercase tracking-wider mb-1">{contact.label}</p>
                    <p className="text-white font-semibold mb-1">{contact.value}</p>
                    <p className="text-xs text-[#6b8a87]">{contact.sublabel}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="mt-8 pt-8 border-t border-white/[0.06] grid grid-cols-3 gap-4">
              {[
                { value: "2h", label: "Avg Response" },
                { value: "99%", label: "Resolution" },
                { value: "4.9", label: "Rating" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-[#2dd4bf]">{stat.value}</div>
                  <div className="text-xs text-[#8aa8a5] mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
