import { randomUUID } from "crypto"
import type { PoolClient } from "pg"
import { ensureSchema, getSettings, query, withTransaction } from "@/lib/db"
import { nextDocumentNumberIn } from "@/lib/document-numbering"
import type { AppModule } from "@/lib/modules/types"
import type {
  CreateSaleInput,
  SaleChannel,
  SaleCustomerInput,
  SaleItemInput,
  StoredSale,
  StoredSaleItem,
  StoredSalePayment,
} from "@/lib/sales-types"

const PAYMENT_ACCOUNTS: Record<string, string> = {
  cash: "cash",
  mpesa: "mpesa",
  card: "card",
  bank: "bank",
  credit: "accounts_receivable",
}

interface AllocatedLine {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discountAmount: number
  unitCost: number
  batchNumber: string
  expiryDate: string | null
  serialNumber: string
  warranty: string
  requiresPrescription: boolean
  controlledSubstance: boolean
}

interface AllocationResult {
  lines: AllocatedLine[]
  warnings: string[]
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

async function resolveCustomer(client: PoolClient, input: SaleCustomerInput): Promise<string | null> {
  if (input.id) {
    const existing = await client.query<{ id: string }>("SELECT id FROM customers WHERE id = $1", [input.id])
    if (existing.rows[0]) return existing.rows[0].id
  }
  const phone = (input.phone || "").trim()
  const email = (input.email || "").trim().toLowerCase()
  if (!input.id && (phone || email)) {
    const found = await client.query<{ id: string }>(
      `SELECT id FROM customers
       WHERE ($1 <> '' AND phone = $1) OR ($2 <> '' AND lower(email) = $2)
       LIMIT 1`,
      [phone, email]
    )
    if (found.rows[0]) {
      await client.query(
        `UPDATE customers
         SET name = COALESCE(NULLIF($2, ''), name),
             email = COALESCE(NULLIF($3, ''), email),
             address = COALESCE(NULLIF($4, ''), address),
             id_number = COALESCE(NULLIF($5, ''), id_number)
         WHERE id = $1`,
        [found.rows[0].id, input.name || "", email, input.address || "", input.idNumber || ""]
      )
      return found.rows[0].id
    }
  }
  if (!input.name && !phone && !email) return null

  const id = randomUUID()
  await client.query(
    `INSERT INTO customers (id, name, phone, email, address, id_number)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, input.name || "Walk-in customer", phone, email, input.address || "", input.idNumber || ""]
  )
  return id
}

async function allocateStock(
  client: PoolClient,
  input: CreateSaleInput,
  reserve: boolean
): Promise<AllocationResult> {
  const lines: AllocatedLine[] = []
  const warnings: string[] = []
  const today = new Date()
  const nearExpiryCutoff = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  for (const item of input.items) {
    if (item.quantity <= 0) throw new Error("Item quantities must be greater than zero.")
    const result = await client.query<{
      id: string
      name: string
      module: AppModule
      price: string | number
      cost_price: string | number
      stock_quantity: number | null
      in_stock: boolean
      requires_prescription: boolean
      controlled_substance: boolean
      warranty: string
      model: string
      expiry_date: string | Date | null
    }>(
      `SELECT id, name, module, price, cost_price, stock_quantity, in_stock,
              requires_prescription, controlled_substance, warranty, model, expiry_date
       FROM products WHERE id = $1 FOR UPDATE OF products`,
      [item.productId]
    )
    const product = result.rows[0]
    if (!product) throw new Error("One of the selected products no longer exists.")
    if (product.module !== input.module) throw new Error("A selected product belongs to another division.")
    if (!product.in_stock && product.stock_quantity === 0) {
      throw new Error(`${product.name} is out of stock.`)
    }

    if (input.module === "medical" && product.model && !item.serialNumber && reserve) {
      throw new Error(`Serial number is required for ${product.name}.`)
    }

    const unitPrice = Math.max(0, numberOrZero(item.unitPrice ?? product.price))
    const discount = Math.min(Math.max(0, numberOrZero(item.discountAmount)), unitPrice * item.quantity)
    const base: Omit<AllocatedLine, "batchNumber" | "expiryDate" | "unitCost"> = {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
      discountAmount: discount,
      serialNumber: item.serialNumber || "",
      warranty: product.warranty || "",
      requiresPrescription: Boolean(product.requires_prescription),
      controlledSubstance: Boolean(product.controlled_substance),
    }

    if (product.expiry_date && new Date(product.expiry_date) < today && input.module === "pharmacy") {
      throw new Error(`${product.name} has expired and cannot be dispensed.`)
    }

    if (input.module === "pharmacy") {
      const batches = await client.query<{
        id: string
        batch_number: string
        expiry_date: string | Date | null
        quantity_on_hand: string | number
        unit_cost: string | number
      }>(
        `SELECT id, batch_number, expiry_date, quantity_on_hand, unit_cost
         FROM pharmacy_batches
         WHERE product_id = $1 AND quantity_on_hand > 0
           AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
         ORDER BY expiry_date NULLS LAST, created_at ASC
         FOR UPDATE OF pharmacy_batches`,
        [product.id]
      )

      if (batches.rows.length) {
        if (product.stock_quantity != null && item.quantity > product.stock_quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Only ${product.stock_quantity} available.`)
        }
        let remaining = item.quantity
        for (const batch of batches.rows) {
          if (remaining <= 0) break
          const available = numberOrZero(batch.quantity_on_hand)
          if (available <= 0) continue
          const take = Math.min(remaining, available)
          remaining -= take
          const expiry = batch.expiry_date
            ? batch.expiry_date instanceof Date
              ? batch.expiry_date.toISOString().slice(0, 10)
              : String(batch.expiry_date).slice(0, 10)
            : null
          if (expiry && new Date(expiry) <= nearExpiryCutoff) {
            warnings.push(`${product.name} batch ${batch.batch_number} expires on ${expiry}.`)
          }
          lines.push({
            ...base,
            quantity: take,
            batchNumber: batch.batch_number,
            expiryDate: expiry,
            unitCost: numberOrZero(batch.unit_cost),
          })
          if (reserve) {
            await client.query(
              "UPDATE pharmacy_batches SET quantity_on_hand = quantity_on_hand - $2 WHERE id = $1",
              [batch.id, take]
            )
          }
        }
        if (remaining > 0) throw new Error(`Not enough valid stock for ${product.name}.`)
        if (reserve && product.stock_quantity != null) {
          await client.query(
            "UPDATE products SET stock_quantity = stock_quantity - $2 WHERE id = $1",
            [product.id, item.quantity]
          )
        }
        continue
      }
    }

    if (product.stock_quantity != null) {
      if (item.quantity > product.stock_quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Only ${product.stock_quantity} available.`)
      }
      if (reserve) {
        await client.query(
          "UPDATE products SET stock_quantity = stock_quantity - $2 WHERE id = $1",
          [product.id, item.quantity]
        )
      }
    } else if (reserve && !product.in_stock) {
      throw new Error(`${product.name} is marked out of stock.`)
    }

    lines.push({
      ...base,
      batchNumber: "",
      expiryDate: null,
      unitCost: numberOrZero(product.cost_price),
    })
  }

  return { lines, warnings }
}

async function insertLedgerEntry(
  client: PoolClient,
  entry: {
    module: AppModule
    accountCode: string
    description: string
    reference: string
    debit?: number
    credit?: number
    saleId?: string
    returnId?: string
    createdBy?: string
  }
): Promise<void> {
  await client.query(
    `INSERT INTO ledger_entries
       (id, module, account_code, description, reference, debit, credit, sale_id, return_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      randomUUID(),
      entry.module,
      entry.accountCode,
      entry.description,
      entry.reference,
      entry.debit || 0,
      entry.credit || 0,
      entry.saleId || null,
      entry.returnId || null,
      entry.createdBy || null,
    ]
  )
}

interface RestockLine {
  productId: string
  quantity: number
  batchNumber?: string | null
}

async function restockSaleItems(
  client: PoolClient,
  options: {
    module: AppModule
    reference: string
    adminId: string
    reason: string
    lines: RestockLine[]
  }
): Promise<void> {
  for (const line of options.lines) {
    const quantity = numberOrZero(line.quantity)
    if (quantity <= 0) continue

    await client.query(
      "UPDATE products SET stock_quantity = stock_quantity + $2, in_stock = TRUE WHERE id = $1",
      [line.productId, quantity]
    )

    if (line.batchNumber) {
      const batch = await client.query<{ id: string }>(
        "SELECT id FROM pharmacy_batches WHERE product_id = $1 AND batch_number = $2",
        [line.productId, line.batchNumber]
      )
      if (batch.rows[0]) {
        await client.query(
          "UPDATE pharmacy_batches SET quantity_on_hand = quantity_on_hand + $2 WHERE id = $1",
          [batch.rows[0].id, quantity]
        )
      } else {
        await client.query(
          `INSERT INTO pharmacy_batches (id, module, product_id, batch_number, quantity_on_hand, unit_cost)
           VALUES ($1,$2,$3,$4,$5,0)`,
          [randomUUID(), options.module, line.productId, line.batchNumber, quantity]
        )
      }
    }

    await client.query(
      `INSERT INTO stock_adjustments (id, module, product_id, quantity_change, reason, reference, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        randomUUID(),
        options.module,
        line.productId,
        quantity,
        options.reason,
        options.reference,
        options.adminId,
      ]
    )
  }
}

function calculateTotals(lines: AllocatedLine[], settings: Awaited<ReturnType<typeof getSettings>>, deliveryFee = 0, installationFee = 0) {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  const discountAmount = lines.reduce((sum, line) => sum + line.discountAmount, 0)
  const net = Math.max(0, subtotal - discountAmount) + deliveryFee + installationFee
  const rate = settings.vatRegistered ? numberOrZero(settings.vatRate) : 0
  const vatInclusive = settings.vatRegistered && settings.vatInclusive
  const taxAmount = vatInclusive ? net - net / (1 + rate / 100) : (net * rate) / 100
  const total = vatInclusive ? net : net + taxAmount
  const costTotal = lines.reduce((sum, line) => sum + line.unitCost * line.quantity, 0)
  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    taxAmount: Number(Math.max(0, taxAmount).toFixed(2)),
    total: Number(total.toFixed(2)),
    costTotal: Number(costTotal.toFixed(2)),
    profit: Number((total - Math.max(0, taxAmount) - costTotal).toFixed(2)),
    taxRate: settings.vatRegistered ? rate : 0,
  }
}

export interface CreateSaleResult {
  sale: StoredSale
  items: StoredSaleItem[]
  payments: StoredSalePayment[]
  warnings: string[]
}

export async function createSale(input: CreateSaleInput): Promise<CreateSaleResult> {
  await ensureSchema()
  const settings = await getSettings()
  const documentType = input.documentType || "receipt"
  const isQuote = documentType === "quote"

  const result = await withTransaction(async (client) => {
    const { lines, warnings } = await allocateStock(client, input, !isQuote)
    const needsPrescription = lines.some((line) => line.requiresPrescription || line.controlledSubstance)
    if (needsPrescription && !input.prescription) {
      throw new Error("A prescription is required before dispensing these items.")
    }

    let prescriptionId: string | null = null
    if (input.prescription) {
      prescriptionId = randomUUID()
      await client.query(
        `INSERT INTO prescriptions
           (id, module, patient_name, prescriber_name, prescriber_reg_no, reference_number, image_url, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          prescriptionId,
          input.module,
          input.prescription.patientName,
          input.prescription.prescriberName,
          input.prescription.prescriberRegNo || "",
          input.prescription.referenceNumber || "",
          input.prescription.imageUrl || "",
          input.cashierId,
        ]
      )
    }

    const totals = calculateTotals(lines, settings, input.deliveryFee || 0, input.installationFee || 0)
    const saleNumber = await nextDocumentNumberIn(
      client,
      input.module,
      documentType === "quote" ? "quote" : documentType === "invoice" ? "invoice" : "receipt",
      settings
    )
    const saleId = randomUUID()
    const customerId = await resolveCustomer(client, input.customer)
    const paymentSum = input.payments.reduce((sum, payment) => sum + Math.max(0, numberOrZero(payment.amount)), 0)
    if (!isQuote && Math.abs(paymentSum - totals.total) > 0.01) {
      throw new Error(`Payments must add up to ${totals.total.toFixed(2)} KSh.`)
    }

    await client.query(
      `INSERT INTO sales
         (id, module, sale_number, document_type, channel, status, branch_id, shift_id, cashier_id,
          agent_id, customer_id, customer_name, customer_phone, customer_email, online_order_id,
          idempotency_key, subtotal, discount_amount, delivery_fee, installation_fee, tax_rate,
          tax_amount, total, cost_total, profit, notes)
       VALUES
         ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`,
      [
        saleId,
        input.module,
        saleNumber,
        documentType,
        input.channel,
        isQuote ? "quote" : "completed",
        input.branchId || null,
        input.shiftId || null,
        input.cashierId,
        input.agentId || null,
        customerId,
        input.customer.name || "Walk-in customer",
        input.customer.phone || "",
        (input.customer.email || "").trim().toLowerCase(),
        input.onlineOrderId || null,
        input.idempotencyKey || null,
        totals.subtotal,
        totals.discountAmount,
        input.deliveryFee || 0,
        input.installationFee || 0,
        totals.taxRate,
        totals.taxAmount,
        totals.total,
        totals.costTotal,
        totals.profit,
        input.notes || "",
      ]
    )

    const storedItems: StoredSaleItem[] = []
    for (const line of lines) {
      const itemId = randomUUID()
      const lineTotal = Math.max(0, line.unitPrice * line.quantity - line.discountAmount)
      const lineTax = totals.total > 0 ? (lineTotal / Math.max(0.01, totals.total)) * totals.taxAmount : 0
      await client.query(
        `INSERT INTO sale_items
           (id, sale_id, product_id, product_name, quantity, unit_price, discount_amount,
            tax_amount, line_total, unit_cost, batch_number, serial_number, expiry_date,
            prescription_id, warranty, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          itemId,
          saleId,
          line.productId,
          line.productName,
          line.quantity,
          line.unitPrice,
          line.discountAmount,
          Number(lineTax.toFixed(2)),
          Number(lineTotal.toFixed(2)),
          line.unitCost,
          line.batchNumber,
          line.serialNumber,
          line.expiryDate,
          needsPrescription ? prescriptionId : null,
          line.warranty,
          input.notes || "",
        ]
      )
      if (line.serialNumber && input.module === "medical") {
        await client.query(
          `INSERT INTO medical_serials (id, module, product_id, serial_number, warranty, sale_item_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [randomUUID(), input.module, line.productId, line.serialNumber, line.warranty, itemId]
        )
      }
      if (needsPrescription && (line.controlledSubstance || line.requiresPrescription)) {
        await client.query(
          `INSERT INTO dispensing_register
             (id, module, prescription_id, sale_item_id, product_id, patient_name, quantity,
              controlled, dispensed_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            randomUUID(),
            input.module,
            prescriptionId,
            itemId,
            line.productId,
            input.prescription!.patientName,
            line.quantity,
            line.controlledSubstance,
            input.cashierId,
          ]
        )
      }
      storedItems.push({
        id: itemId,
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountAmount: line.discountAmount,
        taxAmount: Number(lineTax.toFixed(2)),
        lineTotal: Number(lineTotal.toFixed(2)),
        unitCost: line.unitCost,
        batchNumber: line.batchNumber,
        serialNumber: line.serialNumber,
        expiryDate: line.expiryDate,
        warranty: line.warranty,
      })
    }

    const storedPayments: StoredSalePayment[] = []
    for (const payment of input.payments) {
      const paymentId = randomUUID()
      const amount = Math.max(0, numberOrZero(payment.amount))
      await client.query(
        `INSERT INTO sale_payments
           (id, sale_id, module, method, amount, reference, amount_tendered, change_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          paymentId,
          saleId,
          input.module,
          payment.method,
          amount,
          payment.reference || "",
          payment.amountTendered ?? null,
          Math.max(0, numberOrZero(payment.changeAmount)),
        ]
      )
      storedPayments.push({
        id: paymentId,
        method: payment.method,
        amount,
        reference: payment.reference || "",
        amountTendered: payment.amountTendered ?? null,
        changeAmount: Math.max(0, numberOrZero(payment.changeAmount)),
      })

      if (customerId && payment.method === "credit") {
        await client.query(
          "UPDATE customers SET credit_balance = credit_balance + $2 WHERE id = $1",
          [customerId, amount]
        )
      }
    }

    if (!isQuote) {
      for (const payment of input.payments) {
        const account = PAYMENT_ACCOUNTS[payment.method] || "cash"
        await insertLedgerEntry(client, {
          module: input.module,
          accountCode: account,
          description: `${saleNumber} ${payment.method} payment`,
          reference: saleNumber,
          debit: Math.max(0, numberOrZero(payment.amount)),
          saleId,
          createdBy: input.cashierId,
        })
      }
      if (totals.taxAmount > 0) {
        await insertLedgerEntry(client, {
          module: input.module,
          accountCode: "vat_payable",
          description: `${saleNumber} VAT collected`,
          reference: saleNumber,
          credit: totals.taxAmount,
          saleId,
          createdBy: input.cashierId,
        })
      }
      const netRevenue = Math.max(0, totals.total - totals.taxAmount)
      if (netRevenue > 0) {
        await insertLedgerEntry(client, {
          module: input.module,
          accountCode: "sales_revenue",
          description: `${saleNumber} sales revenue`,
          reference: saleNumber,
          credit: netRevenue,
          saleId,
          createdBy: input.cashierId,
        })
      }
      if (totals.costTotal > 0) {
        await insertLedgerEntry(client, {
          module: input.module,
          accountCode: "cogs",
          description: `${saleNumber} cost of goods sold`,
          reference: saleNumber,
          debit: totals.costTotal,
          saleId,
          createdBy: input.cashierId,
        })
        await insertLedgerEntry(client, {
          module: input.module,
          accountCode: "inventory",
          description: `${saleNumber} stock issued`,
          reference: saleNumber,
          credit: totals.costTotal,
          saleId,
          createdBy: input.cashierId,
        })
      }
    }

    return {
      sale: {
        id: saleId,
        saleNumber,
        module: input.module,
        documentType,
        channel: input.channel,
        status: isQuote ? "quote" : "completed",
        total: totals.total,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        customerEmail: input.customer.email || "",
        customerName: input.customer.name || "Walk-in customer",
        createdAt: new Date().toISOString(),
      },
      items: storedItems,
      payments: storedPayments,
      warnings,
    }
  })

  return result
}

export interface SaleDetail extends CreateSaleResult {
  sale: StoredSale & {
    cashierName: string
    agentName: string
    customerPhone: string
    isVoid: boolean
    voidReason: string
    notes: string
    taxRate: number
    costTotal: number
    profit: number
    deliveryFee: number
    installationFee: number
  }
  emailStatus: { status: string; attempts: number; last_error: string; sent_at: string | null } | null
}

function mapSaleRow(row: Record<string, unknown>): StoredSale & SaleDetail["sale"] {
  return {
    id: String(row.id),
    saleNumber: String(row.sale_number),
    module: row.module as AppModule,
    documentType: String(row.document_type),
    channel: row.channel as SaleChannel,
    status: String(row.status),
    total: numberOrZero(row.total),
    subtotal: numberOrZero(row.subtotal),
    discountAmount: numberOrZero(row.discount_amount),
    taxAmount: numberOrZero(row.tax_amount),
    customerEmail: String(row.customer_email || ""),
    customerName: String(row.customer_name || "Walk-in customer"),
    createdAt: String(row.created_at),
    cashierName: String(row.cashier_name || ""),
    agentName: String(row.agent_name || ""),
    customerPhone: String(row.customer_phone || ""),
    isVoid: Boolean(row.is_void),
    voidReason: String(row.void_reason || ""),
    notes: String(row.notes || ""),
    taxRate: numberOrZero(row.tax_rate),
    costTotal: numberOrZero(row.cost_total),
    profit: numberOrZero(row.profit),
    deliveryFee: numberOrZero(row.delivery_fee),
    installationFee: numberOrZero(row.installation_fee),
  }
}

export async function getSaleDetail(id: string): Promise<SaleDetail | null> {
  await ensureSchema()
  const saleResult = await query(
    `SELECT s.*, a.name AS cashier_name, ag.id AS agent_id, au.name AS agent_name
     FROM sales s
     LEFT JOIN admin_users a ON a.id = s.cashier_id
     LEFT JOIN agents ag ON ag.id = s.agent_id
     LEFT JOIN admin_users au ON au.id = ag.admin_user_id
     WHERE s.id = $1`,
    [id]
  )
  const saleRow = saleResult.rows[0]
  if (!saleRow) return null

  const [items, payments, email] = await Promise.all([
    query(
      `SELECT id, product_id, product_name, quantity, unit_price, discount_amount, tax_amount,
              line_total, unit_cost, batch_number, serial_number, expiry_date, warranty
       FROM sale_items WHERE sale_id = $1 ORDER BY created_at ASC`,
      [id]
    ),
    query(
      `SELECT id, method, amount, reference, amount_tendered, change_amount
       FROM sale_payments WHERE sale_id = $1 ORDER BY created_at ASC`,
      [id]
    ),
    query<{ status: string; attempts: number; last_error: string; sent_at: string | null }>(
      `SELECT status, attempts, last_error, sent_at FROM email_outbox
       WHERE reference_type = 'sale' AND reference_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    ),
  ])

  return {
    sale: mapSaleRow(saleRow as Record<string, unknown>),
    items: items.rows.map((row) => ({
      id: String(row.id),
      productId: String(row.product_id),
      productName: String(row.product_name),
      quantity: numberOrZero(row.quantity),
      unitPrice: numberOrZero(row.unit_price),
      discountAmount: numberOrZero(row.discount_amount),
      taxAmount: numberOrZero(row.tax_amount),
      lineTotal: numberOrZero(row.line_total),
      unitCost: numberOrZero(row.unit_cost),
      batchNumber: String(row.batch_number || ""),
      serialNumber: String(row.serial_number || ""),
      expiryDate: row.expiry_date ? String(row.expiry_date).slice(0, 10) : null,
      warranty: String(row.warranty || ""),
    })),
    payments: payments.rows.map((row) => ({
      id: String(row.id),
      method: row.method,
      amount: numberOrZero(row.amount),
      reference: String(row.reference || ""),
      amountTendered: row.amount_tendered == null ? null : numberOrZero(row.amount_tendered),
      changeAmount: numberOrZero(row.change_amount),
    })),
    warnings: [],
    emailStatus: email.rows[0] || null,
  }
}

export async function getSaleByNumber(number: string): Promise<SaleDetail | null> {
  await ensureSchema()
  const result = await query<{ id: string }>("SELECT id FROM sales WHERE sale_number = $1", [number])
  return result.rows[0] ? getSaleDetail(result.rows[0].id) : null
}

export async function getSaleByIdempotencyKey(key: string): Promise<SaleDetail | null> {
  await ensureSchema()
  const result = await query<{ id: string }>("SELECT id FROM sales WHERE idempotency_key = $1", [key])
  return result.rows[0] ? getSaleDetail(result.rows[0].id) : null
}

export interface SaleFilters {
  module?: AppModule
  channel?: SaleChannel
  from?: string
  to?: string
  cashierId?: string
  agentId?: string
  customerId?: string
  limit?: number
}

export async function listSales(filters: SaleFilters = {}): Promise<SaleDetail["sale"][]> {
  await ensureSchema()
  const clauses: string[] = []
  const params: unknown[] = []
  const add = (sql: string, value: unknown) => {
    params.push(value)
    clauses.push(sql.replace("$?", `$${params.length}`))
  }
  if (filters.module) add("s.module = $?", filters.module)
  if (filters.channel) add("s.channel = $?", filters.channel)
  if (filters.from) add("s.created_at >= $?", filters.from)
  if (filters.to) add("s.created_at <= $?", filters.to)
  if (filters.cashierId) add("s.cashier_id = $?", filters.cashierId)
  if (filters.agentId) add("s.agent_id = $?", filters.agentId)
  if (filters.customerId) add("s.customer_id = $?", filters.customerId)

  const limit = Math.min(Math.max(filters.limit || 200, 1), 1000)
  const limitPlaceholder = `$${params.length + 1}`
  const result = await query(
    `SELECT s.*, a.name AS cashier_name, au.name AS agent_name
     FROM sales s
     LEFT JOIN admin_users a ON a.id = s.cashier_id
     LEFT JOIN agents ag ON ag.id = s.agent_id
     LEFT JOIN admin_users au ON au.id = ag.admin_user_id
     ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
     ORDER BY s.created_at DESC
     LIMIT ${limitPlaceholder}`,
    [...params, limit]
  )
  return result.rows.map((row) => mapSaleRow(row as Record<string, unknown>))
}

export async function voidSale(
  saleId: string,
  reason: string,
  adminId: string
): Promise<boolean> {
  await ensureSchema()
  await withTransaction(async (client) => {
    const sale = await client.query<{
      module: AppModule
      is_void: boolean
      sale_number: string
      total: string | number
      cost_total: string | number
      tax_amount: string | number
      id: string
      customer_id: string | null
    }>("SELECT * FROM sales WHERE id = $1 FOR UPDATE OF sales", [saleId])
    const row = sale.rows[0]
    if (!row || row.is_void) throw new Error("This sale cannot be voided.")
    if (!reason.trim()) throw new Error("A reason is required to void a sale.")

    await client.query(
      `UPDATE sales SET is_void = TRUE, void_reason = $2, voided_by = $3, voided_at = NOW(), status = 'voided'
       WHERE id = $1`,
      [saleId, reason.trim(), adminId]
    )
    const items = await client.query<{
      product_id: string
      quantity: string | number
      batch_number: string | null
    }>("SELECT product_id, quantity, batch_number FROM sale_items WHERE sale_id = $1", [saleId])
    await restockSaleItems(client, {
      module: row.module,
      reference: row.sale_number,
      adminId,
      reason: "Sale void",
      lines: items.rows.map((item) => ({
        productId: item.product_id,
        quantity: numberOrZero(item.quantity),
        batchNumber: item.batch_number || null,
      })),
    })
    const payments = await client.query<{ method: string; amount: string | number }>(
      "SELECT method, amount FROM sale_payments WHERE sale_id = $1",
      [saleId]
    )
    for (const payment of payments.rows) {
      const account = PAYMENT_ACCOUNTS[payment.method] || "cash"
      await insertLedgerEntry(client, {
        module: row.module,
        accountCode: account,
        description: `${row.sale_number} void reversal`,
        reference: row.sale_number,
        credit: numberOrZero(payment.amount),
        saleId,
        createdBy: adminId,
      })
    }
    const cost = numberOrZero(row.cost_total)
    if (cost > 0) {
      await insertLedgerEntry(client, {
        module: row.module,
        accountCode: "inventory",
        description: `${row.sale_number} void stock return`,
        reference: row.sale_number,
        debit: cost,
        saleId,
        createdBy: adminId,
      })
      await insertLedgerEntry(client, {
        module: row.module,
        accountCode: "cogs",
        description: `${row.sale_number} void COGS reversal`,
        reference: row.sale_number,
        credit: cost,
        saleId,
        createdBy: adminId,
      })
    }
  })
  return true
}

export interface CreateReturnInput {
  saleId: string
  items: { saleItemId: string; quantity: number }[]
  reason: string
  restock: boolean
  refundMethod: string
  refundReference?: string
  storeCredit?: number
  createdBy: string
}

export async function createReturn(input: CreateReturnInput): Promise<{ id: string; creditNoteNumber: string; total: number }> {
  await ensureSchema()
  return withTransaction(async (client) => {
    const sale = await client.query<{
      id: string
      module: AppModule
      sale_number: string
      customer_id: string | null
      customer_email: string
      customer_name: string
    }>("SELECT * FROM sales WHERE id = $1 FOR UPDATE OF sales", [input.saleId])
    if (!sale.rows[0]) throw new Error("Original sale was not found.")
    const saleRow = sale.rows[0]

    let total = 0
    const resolved: {
      itemId: string
      productId: string
      quantity: number
      amount: number
      batchNumber: string | null
    }[] = []
    for (const requested of input.items) {
      const result = await client.query<{
        id: string
        product_id: string
        quantity: string | number
        line_total: string | number
        batch_number: string | null
      }>("SELECT id, product_id, quantity, line_total, batch_number FROM sale_items WHERE id = $1 AND sale_id = $2", [
        requested.saleItemId,
        input.saleId,
      ])
      const item = result.rows[0]
      if (!item) throw new Error("One of the return items was not found on this sale.")
      if (requested.quantity <= 0 || requested.quantity > numberOrZero(item.quantity)) {
        throw new Error("Return quantity is invalid.")
      }
      const ratio = requested.quantity / numberOrZero(item.quantity)
      const amount = Number((numberOrZero(item.line_total) * ratio).toFixed(2))
      total += amount
      resolved.push({
        itemId: item.id,
        productId: item.product_id,
        quantity: requested.quantity,
        amount,
        batchNumber: item.batch_number || null,
      })
    }
    if (!reasonValid(input.reason)) throw new Error("A reason is required for a refund.")
    total = Number(total.toFixed(2))

    const settings = await getSettings()
    const creditNoteNumber = await nextDocumentNumberIn(client, saleRow.module, "credit_note", settings)
    const returnId = randomUUID()
    await client.query(
      `INSERT INTO returns
         (id, module, credit_note_number, sale_id, reason, restock, refund_method,
          refund_reference, store_credit, total, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        returnId,
        saleRow.module,
        creditNoteNumber,
        input.saleId,
        input.reason.trim(),
        input.restock,
        input.refundMethod,
        input.refundReference || "",
        input.storeCredit || 0,
        total,
        input.createdBy,
      ]
    )

    for (const item of resolved) {
      await client.query(
        "INSERT INTO return_items (id, return_id, sale_item_id, quantity, amount) VALUES ($1,$2,$3,$4,$5)",
        [randomUUID(), returnId, item.itemId, item.quantity, item.amount]
      )
    }
    if (input.restock) {
      await restockSaleItems(client, {
        module: saleRow.module,
        reference: creditNoteNumber,
        adminId: input.createdBy,
        reason: "Customer return",
        lines: resolved.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          batchNumber: item.batchNumber,
        })),
      })
    }

    const account = input.storeCredit && input.storeCredit > 0 ? "accounts_receivable" : PAYMENT_ACCOUNTS[input.refundMethod] || "cash"
    await insertLedgerEntry(client, {
      module: saleRow.module,
      accountCode: "sales_revenue",
      description: `${creditNoteNumber} refund`,
      reference: creditNoteNumber,
      debit: total,
      returnId,
      createdBy: input.createdBy,
    })
    await insertLedgerEntry(client, {
      module: saleRow.module,
      accountCode: account,
      description: `${creditNoteNumber} refund paid`,
      reference: creditNoteNumber,
      credit: total,
      returnId,
      createdBy: input.createdBy,
    })

    return { id: returnId, creditNoteNumber, total }
  })
}

function reasonValid(reason: string): boolean {
  return Boolean(reason && reason.trim().length >= 3)
}
