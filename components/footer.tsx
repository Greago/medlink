import Link from "next/link"
import Image from "next/image"
import { Mail, Phone, MapPin, ArrowRight, Linkedin, Twitter, Facebook } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-[#0c1f1d] text-white">
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold mb-2">Stay in the Loop</h3>
              <p className="text-[#8aa8a5]">Get product updates, industry news, and exclusive offers.</p>
            </div>
            <div className="flex w-full lg:w-auto gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 lg:w-80 px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[#6b8a87] focus:outline-none focus:border-[#0d9488] transition-colors"
              />
              <button className="px-6 py-3.5 bg-[#0d9488] text-white rounded-xl font-semibold hover:bg-[#0f766e] transition-colors flex items-center gap-2 shrink-0">
                Subscribe <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <Image
                src="/logo.png"
                alt="Medlink Logo"
                width={150}
                height={60}
                className="rounded-xl"
              />
              <div>
               
              </div>
            </div>
            <p className="text-[#8aa8a5] text-sm leading-relaxed mb-6 max-w-sm">
              Premium medical equipment and supplies for healthcare professionals worldwide. 
              ISO certified, globally trusted.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Linkedin, href: "#" },
                { icon: Twitter, href: "#" },
                { icon: Facebook, href: "#" },
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-[#8aa8a5] hover:bg-[#0d9488] hover:text-white transition-all"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-6">Quick Links</h4>
            <ul className="space-y-4 text-sm">
              {[
                { label: "Home", href: "/" },
                { label: "Products", href: "/products" },
                { label: "Services", href: "/services" },
                { label: "About Us", href: "/about" },
                { label: "Contact", href: "/contact" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[#8aa8a5] hover:text-[#2dd4bf] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-6">Resources</h4>
            <ul className="space-y-4 text-sm">
              {[
                { label: "Blog", href: "/blog" },
                { label: "Product Guides", href: "/guides" },
                { label: "Careers", href: "/careers" },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[#8aa8a5] hover:text-[#2dd4bf] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-6">Contact</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3 text-[#8aa8a5]">
                <Phone size={16} className="text-[#2dd4bf] shrink-0" />
                <span>+254 743 325 746</span>
              </li>
              <li className="flex items-center gap-3 text-[#8aa8a5]">
                <Mail size={16} className="text-[#2dd4bf] shrink-0" />
                <span>info@medlinkexpedite.co.ke</span>
              </li>
              <li className="flex items-start gap-3 text-[#8aa8a5]">
                <MapPin size={16} className="text-[#2dd4bf] shrink-0 mt-0.5" />
                <span>Bee Center,<br />Nairobi, Kenya</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#6b8a87]">
  © {new Date().getFullYear()} Medlink Expediate Ventures Limited. All rights reserved.
</p>
          <div className="flex items-center gap-6 text-sm text-[#6b8a87]">
            <Link href="/privacy" className="hover:text-[#2dd4bf] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#2dd4bf] transition-colors">Terms</Link>
            <Link href="/cookies" className="hover:text-[#2dd4bf] transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
