import { create } from "zustand"

export interface Product {
  id: string
  name: string
  category: string
  price: number
  image: string
  description: string
}

export interface Inquiry {
  id: string
  companyName: string
  contactPerson: string
  email: string
  phone: string
  products: string[]
  quantity: number
  additionalNotes: string
  status: "New" | "Quoted" | "Pending" | "Completed"
  createdAt: string
}

export interface Quote {
  id: string
  quoteNumber: string
  inquiryId?: string
  clientName: string
  clientCompany: string
  clientEmail: string
  clientPhone: string
  clientAddress: string
  items: QuoteItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  totalPrice: number
  validUntil: string
  paymentTerms: string
  notes: string
  status: "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired"
  createdAt: string
}

export interface QuoteItem {
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

export interface ProfilePage {
  title: string
  content: string
  highlight: string
}

interface Store {
  isLoggedIn: boolean
  adminEmail: string
  whatsappNumber: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
  login: (email: string) => void
  logout: () => void
  setWhatsappNumber: (number: string) => void
  setCompanyInfo: (info: { email?: string; phone?: string; address?: string }) => void
  products: Product[]
  inquiries: Inquiry[]
  quotes: Quote[]
  profilePages: ProfilePage[]
  addProduct: (product: Product) => void
  updateProduct: (id: string, product: Product) => void
  deleteProduct: (id: string) => void
  addInquiry: (inquiry: Inquiry) => void
  updateInquiryStatus: (id: string, status: Inquiry["status"]) => void
  deleteInquiry: (id: string) => void
  addQuote: (quote: Quote) => void
  getInquiryQuotes: (inquiryId: string) => Quote[]
  setProfilePages: (pages: ProfilePage[]) => void
  addProfilePage: (page: ProfilePage) => void
  updateProfilePage: (index: number, page: ProfilePage) => void
  deleteProfilePage: (index: number) => void
}

export const useStore = create<Store>((set, get) => ({
  isLoggedIn: false,
  adminEmail: "",
  whatsappNumber: "1234567890",
  companyEmail: "info@medlinkexpediate.com",
  companyPhone: "+1 (555) 123-4567",
  companyAddress: "123 Medical Ave, Healthcare District, NY 10001",
  login: (email) => set({ isLoggedIn: true, adminEmail: email }),
  logout: () => set({ isLoggedIn: false, adminEmail: "" }),
  setWhatsappNumber: (number) => set({ whatsappNumber: number }),
  setCompanyInfo: (info) => set((state) => ({
    companyEmail: info.email ?? state.companyEmail,
    companyPhone: info.phone ?? state.companyPhone,
    companyAddress: info.address ?? state.companyAddress,
  })),

  products: [],
  inquiries: [],
  quotes: [],
  profilePages: [],

  addProduct: (product) =>
    set((state) => ({
      products: [...state.products, product],
    })),

  updateProduct: (id, product) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? product : p)),
    })),

  deleteProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),

  addInquiry: (inquiry) =>
    set((state) => ({
      inquiries: [...state.inquiries, inquiry],
    })),

  updateInquiryStatus: (id, status) =>
    set((state) => ({
      inquiries: state.inquiries.map((i) => (i.id === id ? { ...i, status } : i)),
    })),

  deleteInquiry: (id) =>
    set((state) => ({
      inquiries: state.inquiries.filter((i) => i.id !== id),
    })),

  addQuote: (quote) =>
    set((state) => ({
      quotes: [...state.quotes, quote],
    })),

  getInquiryQuotes: (inquiryId) => {
    const state = get()
    return state.quotes.filter((q) => q.inquiryId === inquiryId)
  },

  setProfilePages: (pages) => set({ profilePages: pages }),

  addProfilePage: (page) =>
    set((state) => ({
      profilePages: [...state.profilePages, page],
    })),

  updateProfilePage: (index, page) =>
    set((state) => ({
      profilePages: state.profilePages.map((p, i) => (i === index ? page : p)),
    })),

  deleteProfilePage: (index) =>
    set((state) => ({
      profilePages: state.profilePages.filter((_, i) => i !== index),
    })),
}))
