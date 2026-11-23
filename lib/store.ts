import { create } from "zustand"
import type { CatalogueProduct } from "@/lib/catalogue"
import { DEFAULT_MODULE, type AppModule } from "@/lib/modules/types"
import type { AdminRole, Permission } from "@/lib/roles"

export type Product = CatalogueProduct

export interface CartItem {
  product: CatalogueProduct
  quantity: number
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

export interface CompanySettings {
  whatsappNumber: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
  deliveryThreshold: number
  ppbRegistrationNumber: string
  businessName: string
  kraPin: string
  vatRegistered: boolean
  vatRate: number
  vatInclusive: boolean
  receiptFooter: string
  receiptReturnPolicy: string
  receiptWarrantyNote: string
  medicalPrefix: string
  pharmacyPrefix: string
  invoicePrefix: string
  quotePrefix: string
  creditNotePrefix: string
  etimsEnabled: boolean
  salesFromEmail: string
  receiptsFromEmail: string
}

export interface AccountUser {
  id: string
  name: string
  email: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  modules: AppModule[]
  branchId: string | null
  maxDiscountPercent: number
  permissions: Permission[] | null
  mustChangePassword: boolean
  status: "active" | "inactive"
}

export interface AdminProfileUpdate {
  name?: string
  email?: string
  currentPassword?: string
  newPassword?: string
}

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Order {
  id: string
  module: AppModule
  orderNumber: string
  customerName: string
  customerEmail: string
  items: OrderItem[]
  subtotal: number
  total: number
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled"
  notes: string
  createdAt: string
}

export interface AccountState {
  user: AccountUser | null
  orders: Order[]
}

export interface ServerState {
  module: AppModule
  moduleChosen: boolean
  products: CatalogueProduct[]
  cart: CartItem[]
  likes: string[]
  inquiries: Inquiry[]
  quotes: Quote[]
  profilePages: ProfilePage[]
  settings: CompanySettings
}

interface Store {
  isLoggedIn: boolean
  adminEmail: string
  adminName: string
  adminRole: AdminRole | null
  adminModules: AppModule[]
  adminBranchId: string | null
  adminMaxDiscountPercent: number
  adminPermissions: Permission[] | null
  adminMustChangePassword: boolean
  adminChecked: boolean
  currentUser: AccountUser | null
  orders: Order[]
  accountChecked: boolean
  accountEpoch: number
  isHydrated: boolean
  activeModule: AppModule
  moduleChosen: boolean
  setActiveModule: (module: AppModule) => Promise<void>
  whatsappNumber: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
  deliveryThreshold: number
  ppbRegistrationNumber: string
  businessName: string
  kraPin: string
  vatRegistered: boolean
  vatRate: number
  vatInclusive: boolean
  receiptFooter: string
  receiptReturnPolicy: string
  receiptWarrantyNote: string
  medicalPrefix: string
  pharmacyPrefix: string
  invoicePrefix: string
  quotePrefix: string
  creditNotePrefix: string
  etimsEnabled: boolean
  salesFromEmail: string
  receiptsFromEmail: string
  login: (email: string) => void
  logout: () => void
  hydrateAdmin: (admin: AdminUser | null) => void
  loginAdmin: (email: string, password: string) => Promise<AdminUser>
  logoutAdmin: () => Promise<void>
  updateAdminProfile: (updates: AdminProfileUpdate) => Promise<AdminUser>
  hydrateAccount: (state: AccountState, epoch?: number) => void
  registerAccount: (name: string, email: string, password: string) => Promise<AccountUser>
  loginAccount: (email: string, password: string) => Promise<AccountUser>
  logoutAccount: () => Promise<void>
  loadOrders: () => Promise<void>
  placeOrder: (notes?: string) => Promise<Order>
  saveSettings: (settings: CompanySettings) => Promise<void>
  products: CatalogueProduct[]
  inquiries: Inquiry[]
  quotes: Quote[]
  profilePages: ProfilePage[]
  cart: CartItem[]
  likes: string[]
  hydrate: (state: ServerState) => void
  addToCart: (product: CatalogueProduct, quantity?: number) => Promise<void>
  removeFromCart: (productId: string) => Promise<void>
  updateCartQuantity: (productId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  toggleLike: (productId: string) => Promise<void>
  addProduct: (product: Product) => Promise<void>
  updateProduct: (id: string, product: Product) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  addInquiry: (inquiry: Inquiry) => Promise<void>
  updateInquiryStatus: (id: string, status: Inquiry["status"]) => Promise<void>
  deleteInquiry: (id: string) => Promise<void>
  addQuote: (quote: Quote) => Promise<void>
  sendQuoteEmail: (id: string, email?: string) => Promise<Quote>
  getInquiryQuotes: (inquiryId: string) => Quote[]
  setProfilePages: (pages: ProfilePage[]) => Promise<void>
  addProfilePage: (page: ProfilePage) => Promise<void>
  updateProfilePage: (index: number, page: ProfilePage) => Promise<void>
  deleteProfilePage: (index: number) => Promise<void>
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Request failed.")
  }
  return data as T
}

export const useStore = create<Store>((set, get) => ({
  isLoggedIn: false,
  adminEmail: "",
  adminName: "",
  adminRole: null,
  adminModules: [],
  adminBranchId: null,
  adminMaxDiscountPercent: 0,
  adminPermissions: null,
  adminMustChangePassword: false,
  adminChecked: false,
  currentUser: null,
  orders: [],
  accountChecked: false,
  accountEpoch: 0,
  isHydrated: false,
  activeModule: DEFAULT_MODULE,
  moduleChosen: false,
  whatsappNumber: "+254743325746",
  companyEmail: "info@medlinkexpedite.co.ke",
  companyPhone: "+254 743 325 746",
  companyAddress: "Nairobi, Kenya",
  deliveryThreshold: 0,
  ppbRegistrationNumber: "",
  businessName: "Medlink Expedite Ventures Limited",
  kraPin: "",
  vatRegistered: false,
  vatRate: 16,
  vatInclusive: true,
  receiptFooter: "Thank you for shopping with us.",
  receiptReturnPolicy: "Returns accepted within 7 days with proof of purchase.",
  receiptWarrantyNote: "Warranty terms are shown on the receipt where applicable.",
  medicalPrefix: "MED",
  pharmacyPrefix: "PHA",
  invoicePrefix: "INV",
  quotePrefix: "QUO",
  creditNotePrefix: "CN",
  etimsEnabled: false,
  salesFromEmail: "sales@medlinkexpedite.co.ke",
  receiptsFromEmail: "receipts@medlinkexpedite.co.ke",

  login: (email) => set({ isLoggedIn: true, adminEmail: email, adminChecked: true }),
  logout: () =>
    set({
      isLoggedIn: false,
      adminEmail: "",
      adminName: "",
      adminRole: null,
      adminModules: [],
      adminBranchId: null,
      adminMaxDiscountPercent: 0,
      adminPermissions: null,
      adminMustChangePassword: false,
      adminChecked: true,
    }),

  hydrateAdmin: (admin) =>
    set({
      isLoggedIn: Boolean(admin),
      adminEmail: admin?.email || "",
      adminName: admin?.name || "",
      adminRole: admin?.role || null,
      adminModules: admin?.modules || [],
      adminBranchId: admin?.branchId || null,
      adminMaxDiscountPercent: admin?.maxDiscountPercent || 0,
      adminPermissions: admin?.permissions ?? null,
      adminMustChangePassword: Boolean(admin?.mustChangePassword),
      adminChecked: true,
    }),

  loginAdmin: async (email, password) => {
    const data = await apiRequest<{ admin: AdminUser }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    set({
      isLoggedIn: true,
      adminEmail: data.admin.email,
      adminName: data.admin.name,
      adminRole: data.admin.role,
      adminModules: data.admin.modules,
      adminBranchId: data.admin.branchId,
      adminMaxDiscountPercent: data.admin.maxDiscountPercent,
      adminPermissions: data.admin.permissions ?? null,
      adminMustChangePassword: Boolean(data.admin.mustChangePassword),
      adminChecked: true,
    })
    return data.admin
  },

  logoutAdmin: async () => {
    await apiRequest("/api/admin/logout", { method: "POST" })
    set({
      isLoggedIn: false,
      adminEmail: "",
      adminName: "",
      adminRole: null,
      adminModules: [],
      adminBranchId: null,
      adminMaxDiscountPercent: 0,
      adminPermissions: null,
      adminMustChangePassword: false,
      adminChecked: true,
    })
  },

  updateAdminProfile: async (updates) => {
    const data = await apiRequest<{ admin: AdminUser }>("/api/admin/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    })
    set({
      adminEmail: data.admin.email,
      adminName: data.admin.name,
      adminRole: data.admin.role,
      adminModules: data.admin.modules,
      adminBranchId: data.admin.branchId,
      adminMaxDiscountPercent: data.admin.maxDiscountPercent,
      adminPermissions: data.admin.permissions ?? null,
      adminMustChangePassword: Boolean(data.admin.mustChangePassword),
      adminChecked: true,
    })
    return data.admin
  },

  hydrateAccount: (state, epoch) => {
    if (epoch !== undefined && epoch !== get().accountEpoch) return
    set({
      currentUser: state.user,
      orders: state.orders,
      accountChecked: true,
    })
  },

  registerAccount: async (name, email, password) => {
    const data = await apiRequest<{ user: AccountUser }>("/api/account/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    })
    set((state) => ({ accountEpoch: state.accountEpoch + 1 }))
    const account = await apiRequest<AccountState>("/api/account/me")
    const user = account.user || data.user
    set({ currentUser: user, orders: account.orders, accountChecked: true })
    return user
  },

  loginAccount: async (email, password) => {
    const data = await apiRequest<{ user: AccountUser }>("/api/account/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    set((state) => ({ accountEpoch: state.accountEpoch + 1 }))
    const account = await apiRequest<AccountState>("/api/account/me")
    const user = account.user || data.user
    set({ currentUser: user, orders: account.orders, accountChecked: true })
    return user
  },

  logoutAccount: async () => {
    await apiRequest("/api/account/logout", { method: "POST" })
    set((state) => ({
      currentUser: null,
      orders: [],
      accountChecked: true,
      accountEpoch: state.accountEpoch + 1,
    }))
  },

  loadOrders: async () => {
    const data = await apiRequest<{ orders: Order[] }>("/api/orders")
    set({ orders: data.orders, accountChecked: true })
  },

  placeOrder: async (notes = "") => {
    const data = await apiRequest<{ order: Order }>("/api/orders", {
      method: "POST",
      body: JSON.stringify({ notes }),
    })
    set({ orders: [data.order, ...get().orders], cart: [] })
    return data.order
  },

  saveSettings: async (settings) => {
    const previous = get()
    set(settings)
    try {
      const data = await apiRequest<{ settings: CompanySettings }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      })
      set(data.settings)
    } catch (error) {
      set({
        whatsappNumber: previous.whatsappNumber,
        companyEmail: previous.companyEmail,
        companyPhone: previous.companyPhone,
        companyAddress: previous.companyAddress,
        deliveryThreshold: previous.deliveryThreshold,
        ppbRegistrationNumber: previous.ppbRegistrationNumber,
        businessName: previous.businessName,
        kraPin: previous.kraPin,
        vatRegistered: previous.vatRegistered,
        vatRate: previous.vatRate,
        vatInclusive: previous.vatInclusive,
        receiptFooter: previous.receiptFooter,
        receiptReturnPolicy: previous.receiptReturnPolicy,
        receiptWarrantyNote: previous.receiptWarrantyNote,
        medicalPrefix: previous.medicalPrefix,
        pharmacyPrefix: previous.pharmacyPrefix,
        invoicePrefix: previous.invoicePrefix,
        quotePrefix: previous.quotePrefix,
        creditNotePrefix: previous.creditNotePrefix,
        etimsEnabled: previous.etimsEnabled,
        salesFromEmail: previous.salesFromEmail,
        receiptsFromEmail: previous.receiptsFromEmail,
      })
      throw error
    }
  },

  products: [],
  inquiries: [],
  quotes: [],
  profilePages: [],
  cart: [],
  likes: [],

  hydrate: (state) =>
    set({
      ...state,
      activeModule: state.module,
      moduleChosen: state.moduleChosen,
      whatsappNumber: state.settings.whatsappNumber,
      companyEmail: state.settings.companyEmail,
      companyPhone: state.settings.companyPhone,
      companyAddress: state.settings.companyAddress,
      deliveryThreshold: state.settings.deliveryThreshold,
      ppbRegistrationNumber: state.settings.ppbRegistrationNumber,
      businessName: state.settings.businessName,
      kraPin: state.settings.kraPin,
      vatRegistered: state.settings.vatRegistered,
      vatRate: state.settings.vatRate,
      vatInclusive: state.settings.vatInclusive,
      receiptFooter: state.settings.receiptFooter,
      receiptReturnPolicy: state.settings.receiptReturnPolicy,
      receiptWarrantyNote: state.settings.receiptWarrantyNote,
      medicalPrefix: state.settings.medicalPrefix,
      pharmacyPrefix: state.settings.pharmacyPrefix,
      invoicePrefix: state.settings.invoicePrefix,
      quotePrefix: state.settings.quotePrefix,
      creditNotePrefix: state.settings.creditNotePrefix,
      etimsEnabled: state.settings.etimsEnabled,
      salesFromEmail: state.settings.salesFromEmail,
      receiptsFromEmail: state.settings.receiptsFromEmail,
      isHydrated: true,
    }),

  setActiveModule: async (module) => {
    await apiRequest<{ module: AppModule }>("/api/module", {
      method: "POST",
      body: JSON.stringify({ module }),
    })

    // Reload module-scoped products, cart and likes from Postgres.
    const state = await apiRequest<ServerState>("/api/state")
    get().hydrate(state)
    set({ moduleChosen: true })

    if (get().currentUser) {
      try {
        const account = await apiRequest<AccountState>("/api/account/me")
        get().hydrateAccount(account)
      } catch {
        // Keep the existing account view if the refresh fails.
      }
    }
  },

  addToCart: async (product, quantity = 1) => {
    const previous = get().cart
    const safeQuantity = Math.max(1, Math.floor(quantity))
    const existing = previous.find((item) => item.product.id === product.id)
    const optimistic = existing
      ? previous.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + safeQuantity }
            : item
        )
      : [...previous, { product, quantity: safeQuantity }]

    set({ cart: optimistic })
    try {
      const data = await apiRequest<{ cart: CartItem[] }>("/api/cart", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity: safeQuantity }),
      })
      set({ cart: data.cart })
    } catch (error) {
      set({ cart: previous })
      throw error
    }
  },

  removeFromCart: async (productId) => {
    const previous = get().cart
    set({ cart: previous.filter((item) => item.product.id !== productId) })
    try {
      const data = await apiRequest<{ cart: CartItem[] }>("/api/cart", {
        method: "PATCH",
        body: JSON.stringify({ productId, quantity: 0 }),
      })
      set({ cart: data.cart })
    } catch (error) {
      set({ cart: previous })
      throw error
    }
  },

  updateCartQuantity: async (productId, quantity) => {
    const previous = get().cart
    const safeQuantity = Math.max(0, Math.floor(quantity))
    const optimistic =
      safeQuantity === 0
        ? previous.filter((item) => item.product.id !== productId)
        : previous.map((item) =>
            item.product.id === productId ? { ...item, quantity: safeQuantity } : item
          )

    set({ cart: optimistic })
    try {
      const data = await apiRequest<{ cart: CartItem[] }>("/api/cart", {
        method: "PATCH",
        body: JSON.stringify({ productId, quantity: safeQuantity }),
      })
      set({ cart: data.cart })
    } catch (error) {
      set({ cart: previous })
      throw error
    }
  },

  clearCart: async () => {
    const previous = get().cart
    set({ cart: [] })
    try {
      await apiRequest("/api/cart", { method: "DELETE" })
    } catch (error) {
      set({ cart: previous })
      throw error
    }
  },

  toggleLike: async (productId) => {
    const previous = get().likes
    const optimistic = previous.includes(productId)
      ? previous.filter((id) => id !== productId)
      : [...previous, productId]

    set({ likes: optimistic })
    try {
      const data = await apiRequest<{ likes: string[] }>("/api/likes", {
        method: "POST",
        body: JSON.stringify({ productId }),
      })
      set({ likes: data.likes })
    } catch (error) {
      set({ likes: previous })
      throw error
    }
  },

  addProduct: async (product) => {
    const previous = get().products
    const fullProduct: CatalogueProduct = {
      ...product,
      module: product.module || get().activeModule,
      specs: product.specs ?? [],
      features: product.features ?? [],
      inStock: product.inStock ?? true,
    }
    set({ products: [...previous, fullProduct] })
    try {
      const data = await apiRequest<{ product: CatalogueProduct }>("/api/products", {
        method: "POST",
        body: JSON.stringify(fullProduct),
      })
      set({
        products: get().products.map((p) => (p.id === fullProduct.id ? data.product : p)),
      })
    } catch (error) {
      set({ products: previous })
      throw error
    }
  },

  updateProduct: async (id, product) => {
    const previous = get().products
    let updated: CatalogueProduct | undefined

    const optimistic = previous.map((p) => {
      if (p.id !== id) return p
      updated = {
        ...p,
        ...product,
        specs: product.specs ?? p.specs,
        features: product.features ?? p.features,
        inStock: product.inStock ?? p.inStock,
      }
      return updated
    })

    set({ products: optimistic })
    try {
      const data = await apiRequest<{ product: CatalogueProduct }>(`/api/products/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(updated || product),
      })
      set({
        products: get().products.map((p) => (p.id === id ? data.product : p)),
      })
    } catch (error) {
      set({ products: previous })
      throw error
    }
  },

  deleteProduct: async (id) => {
    const previous = get().products
    const previousCart = get().cart
    const previousLikes = get().likes
    set({
      products: previous.filter((p) => p.id !== id),
      cart: previousCart.filter((item) => item.product.id !== id),
      likes: previousLikes.filter((productId) => productId !== id),
    })
    try {
      await apiRequest(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" })
    } catch (error) {
      set({ products: previous, cart: previousCart, likes: previousLikes })
      throw error
    }
  },

  addInquiry: async (inquiry) => {
    const previous = get().inquiries
    set({ inquiries: [inquiry, ...previous] })
    try {
      const data = await apiRequest<{ inquiry: Inquiry }>("/api/inquiries", {
        method: "POST",
        body: JSON.stringify(inquiry),
      })
      set({
        inquiries: get().inquiries.map((i) => (i.id === inquiry.id ? data.inquiry : i)),
      })
    } catch (error) {
      set({ inquiries: previous })
      throw error
    }
  },

  updateInquiryStatus: async (id, status) => {
    const previous = get().inquiries
    set({
      inquiries: previous.map((i) => (i.id === id ? { ...i, status } : i)),
    })
    try {
      await apiRequest(`/api/inquiries/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
    } catch (error) {
      set({ inquiries: previous })
      throw error
    }
  },

  deleteInquiry: async (id) => {
    const previous = get().inquiries
    set({ inquiries: previous.filter((i) => i.id !== id) })
    try {
      await apiRequest(`/api/inquiries/${encodeURIComponent(id)}`, { method: "DELETE" })
    } catch (error) {
      set({ inquiries: previous })
      throw error
    }
  },

  addQuote: async (quote) => {
    const previous = get().quotes
    set({ quotes: [quote, ...previous] })
    try {
      const data = await apiRequest<{ quote: Quote }>("/api/quotes", {
        method: "POST",
        body: JSON.stringify(quote),
      })
      set({ quotes: get().quotes.map((q) => (q.id === quote.id ? data.quote : q)) })
    } catch (error) {
      set({ quotes: previous })
      throw error
    }
  },

  sendQuoteEmail: async (id, email) => {
    const data = await apiRequest<{ quote: Quote }>(`/api/quotes/${encodeURIComponent(id)}/email`, {
      method: "POST",
      body: JSON.stringify(email ? { email } : {}),
    })

    const sentQuote = data.quote
    set({
      quotes: get().quotes.map((quote) => (quote.id === id ? sentQuote : quote)),
      inquiries: get().inquiries.map((inquiry) =>
        inquiry.id === sentQuote.inquiryId ? { ...inquiry, status: "Quoted" } : inquiry
      ),
    })

    return sentQuote
  },

  getInquiryQuotes: (inquiryId) => get().quotes.filter((q) => q.inquiryId === inquiryId),

  setProfilePages: async (pages) => {
    const previous = get().profilePages
    set({ profilePages: pages })
    try {
      const data = await apiRequest<{ pages: ProfilePage[] }>("/api/profile-pages", {
        method: "PUT",
        body: JSON.stringify({ pages }),
      })
      set({ profilePages: data.pages })
    } catch (error) {
      set({ profilePages: previous })
      throw error
    }
  },

  addProfilePage: async (page) => {
    const pages = [...get().profilePages, page]
    await get().setProfilePages(pages)
  },

  updateProfilePage: async (index, page) => {
    const pages = get().profilePages.map((p, i) => (i === index ? page : p))
    await get().setProfilePages(pages)
  },

  deleteProfilePage: async (index) => {
    const pages = get().profilePages.filter((_, i) => i !== index)
    await get().setProfilePages(pages)
  },
}))
