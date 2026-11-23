import type { AppModule } from "@/lib/modules/types"

export type SaleChannel = "in_shop" | "field" | "online"
export type PaymentMethod = "cash" | "mpesa" | "card" | "bank" | "credit"
export type SaleDocumentType = "receipt" | "invoice" | "quote"

export interface SaleCustomerInput {
  id?: string | null
  name: string
  phone?: string
  email?: string
  address?: string
  idNumber?: string
}

export interface SaleItemInput {
  productId: string
  quantity: number
  unitPrice?: number
  discountAmount?: number
  serialNumber?: string
  prescriptionId?: string | null
  notes?: string
}

export interface SalePaymentInput {
  method: PaymentMethod
  amount: number
  reference?: string
  amountTendered?: number
  changeAmount?: number
}

export interface PrescriptionInput {
  patientName: string
  prescriberName: string
  prescriberRegNo?: string
  referenceNumber?: string
  imageUrl?: string
}

export interface CreateSaleInput {
  module: AppModule
  channel: SaleChannel
  cashierId: string
  agentId?: string | null
  branchId?: string | null
  shiftId?: string | null
  customer: SaleCustomerInput
  items: SaleItemInput[]
  payments: SalePaymentInput[]
  notes?: string
  documentType?: SaleDocumentType
  prescription?: PrescriptionInput | null
  idempotencyKey?: string
  onlineOrderId?: string | null
  deliveryFee?: number
  installationFee?: number
}

export interface StoredSale {
  id: string
  saleNumber: string
  module: AppModule
  documentType: string
  channel: SaleChannel
  status: string
  total: number
  subtotal: number
  discountAmount: number
  taxAmount: number
  customerEmail: string
  customerName: string
  createdAt: string
}

export interface StoredSaleItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
  lineTotal: number
  unitCost: number
  batchNumber: string
  serialNumber: string
  expiryDate: string | null
  warranty: string
}

export interface StoredSalePayment {
  id: string
  method: PaymentMethod
  amount: number
  reference: string
  amountTendered: number | null
  changeAmount: number
}
