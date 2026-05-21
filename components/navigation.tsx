"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#d1e8e5] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#0d9488] rounded-xl flex items-center justify-center text-white font-bold text-sm">
              ML
            </div>
            <span className="font-bold text-lg text-[#0f2b2e] hidden sm:inline">Medlink Expedites</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-[#5f7a7d] hover:text-[#0d9488] transition-colors text-sm font-medium">
              Home
            </Link>
            <Link href="/products" className="text-[#5f7a7d] hover:text-[#0d9488] transition-colors text-sm font-medium">
              Products
            </Link>
            <Link href="/blog" className="text-[#5f7a7d] hover:text-[#0d9488] transition-colors text-sm font-medium">
              Blog
            </Link>
            <Link href="/contact" className="text-[#5f7a7d] hover:text-[#0d9488] transition-colors text-sm font-medium">
              Contact
            </Link>
            <Link
              href="/admin/login"
              className="bg-[#0d9488] text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-[#0f766e] transition-colors"
            >
              Admin
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 hover:bg-[#f0fdfa] rounded-lg transition-colors text-[#0f2b2e]"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 border-t border-[#d1e8e5] animate-fade-in bg-white">
            <Link href="/" className="block py-3 px-4 text-[#0f2b2e] hover:bg-[#f0fdfa] rounded transition-colors">
              Home
            </Link>
            <Link href="/products" className="block py-3 px-4 text-[#0f2b2e] hover:bg-[#f0fdfa] rounded transition-colors">
              Products
            </Link>
            <Link href="/blog" className="block py-3 px-4 text-[#0f2b2e] hover:bg-[#f0fdfa] rounded transition-colors">
              Blog
            </Link>
            <Link href="/contact" className="block py-3 px-4 text-[#0f2b2e] hover:bg-[#f0fdfa] rounded transition-colors">
              Contact
            </Link>
            <Link
              href="/admin/login"
              className="block py-3 px-4 mt-2 bg-[#0d9488] text-white rounded-lg font-medium text-center hover:bg-[#0f766e] transition-colors mx-4"
            >
              Admin Login
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
