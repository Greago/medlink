/**
 * Additive schema for POS, agents, finance, documents and email outbox.
 *
 * Every statement here is safe to run repeatedly. Existing rows keep their
 * data; new columns receive defaults. Nothing is dropped or rewritten.
 */
export const EXTENDED_SCHEMA = `
  -- Branches come first so admin/agent branch references can be added safely.
  CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    name TEXT NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS branches_module_code_idx
    ON branches (module, code) WHERE code <> '';

  -- Staff identity is the existing admin_users table. These are additive.
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner';
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS modules TEXT[] NOT NULL DEFAULT ARRAY['medical','pharmacy']::text[];
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS id_number TEXT NOT NULL DEFAULT '';
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS photo_url TEXT NOT NULL DEFAULT '';
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS max_discount_percent NUMERIC(6,2) NOT NULL DEFAULT 100;
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS permissions TEXT[];
  ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
  CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users (role);

  -- Self-service password resets for staff logins. Tokens are SHA-256 hashed.
  CREATE TABLE IF NOT EXISTS admin_password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_admin_password_reset_admin ON admin_password_reset_tokens (admin_id);

  -- Customer records for POS, credit accounts and online account linkage.
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_number TEXT NOT NULL DEFAULT '';
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(12,2) NOT NULL DEFAULT 0;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;
  CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_idx
    ON customers (phone) WHERE phone <> '';
  CREATE UNIQUE INDEX IF NOT EXISTS customers_email_idx
    ON customers (lower(email)) WHERE email <> '';

  -- Business settings used by receipts, VAT and document numbering.
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS business_name TEXT NOT NULL DEFAULT 'Medlink Expedite Ventures Limited';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS kra_pin TEXT NOT NULL DEFAULT '';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(6,3) NOT NULL DEFAULT 16.000;
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS vat_inclusive BOOLEAN NOT NULL DEFAULT TRUE;
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_footer TEXT NOT NULL DEFAULT 'Thank you for shopping with us.';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_return_policy TEXT NOT NULL DEFAULT 'Returns accepted within 7 days with proof of purchase.';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_warranty_note TEXT NOT NULL DEFAULT 'Warranty terms are shown on the receipt where applicable.';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS medical_prefix TEXT NOT NULL DEFAULT 'MED';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS pharmacy_prefix TEXT NOT NULL DEFAULT 'PHA';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_prefix TEXT NOT NULL DEFAULT 'INV';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS quote_prefix TEXT NOT NULL DEFAULT 'QUO';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS credit_note_prefix TEXT NOT NULL DEFAULT 'CN';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS etims_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS sales_from_email TEXT NOT NULL DEFAULT 'sales@medlinkexpedite.co.ke';
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipts_from_email TEXT NOT NULL DEFAULT 'receipts@medlinkexpedite.co.ke';

  -- Cost and controlled-drug flags for POS profit and dispensing rules.
  ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) NOT NULL DEFAULT 0;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS controlled_substance BOOLEAN NOT NULL DEFAULT FALSE;


  -- Agents and commission configuration.
  CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY,
    admin_user_id UUID UNIQUE REFERENCES admin_users(id) ON DELETE SET NULL,
    module TEXT NOT NULL DEFAULT 'medical',
    type TEXT NOT NULL DEFAULT 'shop',
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    territory TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    commission_basis TEXT NOT NULL DEFAULT 'sales',
    commission_value NUMERIC(8,3) NOT NULL DEFAULT 0,
    monthly_target NUMERIC(12,2) NOT NULL DEFAULT 0,
    target_bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
    photo_url TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    id_number TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_agents_module_status ON agents (module, status);
  CREATE INDEX IF NOT EXISTS idx_agents_user ON agents (admin_user_id);

  CREATE TABLE IF NOT EXISTS commission_rules (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    module TEXT NOT NULL DEFAULT 'medical',
    category_id TEXT,
    basis TEXT NOT NULL DEFAULT 'sales',
    percentage NUMERIC(8,3) NOT NULL DEFAULT 0,
    flat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_commission_rules_agent ON commission_rules (agent_id, active);

  CREATE TABLE IF NOT EXISTS commission_statements (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    module TEXT NOT NULL DEFAULT 'medical',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    sales_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    gross_profit NUMERIC(14,2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    approved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    paid_at TIMESTAMPTZ,
    pdf_path TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_commission_statements_agent_period
    ON commission_statements (agent_id, period_start, period_end);

  -- Suppliers and purchases.
  CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    kra_pin TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS supplier_purchases (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    reference TEXT NOT NULL DEFAULT '',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total NUMERIC(14,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS supplier_payments (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    purchase_id UUID REFERENCES supplier_purchases(id) ON DELETE SET NULL,
    amount NUMERIC(14,2) NOT NULL,
    method TEXT NOT NULL DEFAULT 'bank',
    reference TEXT NOT NULL DEFAULT '',
    paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Shifts/tills.
  CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    cashier_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    shift_number TEXT NOT NULL,
    opening_float NUMERIC(12,2) NOT NULL DEFAULT 0,
    expected_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
    counted_cash NUMERIC(12,2),
    variance NUMERIC(12,2),
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
  );
  CREATE UNIQUE INDEX IF NOT EXISTS shifts_number_idx ON shifts (module, shift_number);
  CREATE INDEX IF NOT EXISTS idx_shifts_cashier ON shifts (cashier_id, opened_at DESC);

  -- Prescriptions and dispensing records must exist before sale_items.
  CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'pharmacy',
    patient_name TEXT NOT NULL,
    prescriber_name TEXT NOT NULL,
    prescriber_reg_no TEXT NOT NULL DEFAULT '',
    reference_number TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS dispensing_register (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'pharmacy',
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    sale_item_id UUID,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
    controlled BOOLEAN NOT NULL DEFAULT FALSE,
    dispensed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Pharmacy batch tracking for FEFO.
  CREATE TABLE IF NOT EXISTS pharmacy_batches (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'pharmacy',
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    expiry_date DATE,
    quantity_on_hand NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_batches_product_batch_idx
    ON pharmacy_batches (product_id, batch_number);
  CREATE INDEX IF NOT EXISTS idx_pharmacy_batches_fefo
    ON pharmacy_batches (product_id, expiry_date NULLS LAST);

  CREATE TABLE IF NOT EXISTS medical_serials (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    serial_number TEXT NOT NULL,
    warranty TEXT NOT NULL DEFAULT '',
    sale_item_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS medical_serials_product_serial_idx
    ON medical_serials (product_id, serial_number);

  -- Core sales/document records. Receipts, invoices and quotes share this model.
  CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    sale_number TEXT NOT NULL UNIQUE,
    document_type TEXT NOT NULL DEFAULT 'receipt',
    channel TEXT NOT NULL DEFAULT 'in_shop',
    status TEXT NOT NULL DEFAULT 'completed',
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    cashier_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL DEFAULT 'Walk-in customer',
    customer_phone TEXT NOT NULL DEFAULT '',
    customer_email TEXT NOT NULL DEFAULT '',
    online_order_id TEXT,
    idempotency_key TEXT UNIQUE,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
    installation_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    total NUMERIC(14,2) NOT NULL DEFAULT 0,
    cost_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    profit NUMERIC(14,2) NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    is_void BOOLEAN NOT NULL DEFAULT FALSE,
    void_reason TEXT NOT NULL DEFAULT '',
    voided_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    voided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  -- Additive columns introduced after the first extended migration.
  ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(14,2) NOT NULL DEFAULT 0;
  ALTER TABLE sales ADD COLUMN IF NOT EXISTS installation_fee NUMERIC(14,2) NOT NULL DEFAULT 0;
  ALTER TABLE sales ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
  CREATE UNIQUE INDEX IF NOT EXISTS sales_idempotency_key_idx
    ON sales (idempotency_key) WHERE idempotency_key IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS sales_online_order_idx
    ON sales (online_order_id) WHERE online_order_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_sales_module_created ON sales (module, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sales_channel ON sales (channel, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales (cashier_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sales_agent ON sales (agent_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales (customer_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    batch_number TEXT NOT NULL DEFAULT '',
    serial_number TEXT NOT NULL DEFAULT '',
    expiry_date DATE,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    warranty TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items (sale_id);
  CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items (product_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS sale_payments (
    id UUID PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    module TEXT NOT NULL DEFAULT 'medical',
    method TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    reference TEXT NOT NULL DEFAULT '',
    amount_tendered NUMERIC(14,2),
    change_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments (sale_id);
  CREATE INDEX IF NOT EXISTS idx_sale_payments_method ON sale_payments (method, created_at DESC);

  CREATE TABLE IF NOT EXISTS held_sales (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    cashier_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    customer JSONB NOT NULL DEFAULT '{}'::jsonb,
    cart JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    credit_note_number TEXT NOT NULL UNIQUE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    restock BOOLEAN NOT NULL DEFAULT TRUE,
    refund_method TEXT NOT NULL DEFAULT 'cash',
    refund_reference TEXT NOT NULL DEFAULT '',
    store_credit NUMERIC(14,2) NOT NULL DEFAULT 0,
    total NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY,
    return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
    quantity NUMERIC(12,3) NOT NULL,
    amount NUMERIC(14,2) NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_change NUMERIC(12,3) NOT NULL,
    reason TEXT NOT NULL,
    reference TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Operating expenses recorded by the accountant. Additive-only extensions
  -- keep existing expense rows intact.
  CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    category TEXT NOT NULL DEFAULT 'general',
    amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    payee TEXT NOT NULL DEFAULT '',
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL DEFAULT '',
    receipt_url TEXT NOT NULL DEFAULT '',
    paid_from_account TEXT NOT NULL DEFAULT 'cash',
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
  ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reference TEXT NOT NULL DEFAULT '';
  ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_void BOOLEAN NOT NULL DEFAULT FALSE;
  CREATE INDEX IF NOT EXISTS idx_expenses_module_date ON expenses (module, expense_date DESC);

  -- Double-entry-lite ledger.
  CREATE TABLE IF NOT EXISTS ledger_accounts (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    module TEXT NOT NULL DEFAULT 'all',
    active BOOLEAN NOT NULL DEFAULT TRUE
  );

  INSERT INTO ledger_accounts (code, name, type, module) VALUES
    ('cash', 'Cash', 'asset', 'all'),
    ('mpesa', 'M-Pesa', 'asset', 'all'),
    ('bank', 'Bank', 'asset', 'all'),
    ('card', 'Card', 'asset', 'all'),
    ('accounts_receivable', 'Accounts Receivable', 'asset', 'all'),
    ('inventory', 'Inventory', 'asset', 'all'),
    ('accounts_payable', 'Accounts Payable', 'liability', 'all'),
    ('vat_payable', 'VAT Payable', 'liability', 'all'),
    ('commission_payable', 'Commission Payable', 'liability', 'all'),
    ('sales_revenue', 'Sales Revenue', 'revenue', 'all'),
    ('cogs', 'Cost of Goods Sold', 'expense', 'all'),
    ('expenses', 'Expenses', 'expense', 'all'),
    ('commission_expense', 'Commission Expense', 'expense', 'all')
  ON CONFLICT (code) DO NOTHING;

  CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    account_code TEXT NOT NULL REFERENCES ledger_accounts(code) ON DELETE RESTRICT,
    description TEXT NOT NULL DEFAULT '',
    reference TEXT NOT NULL DEFAULT '',
    debit NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(16,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    return_id UUID REFERENCES returns(id) ON DELETE SET NULL,
    expense_id UUID,
    supplier_payment_id UUID REFERENCES supplier_payments(id) ON DELETE SET NULL,
    commission_statement_id UUID REFERENCES commission_statements(id) ON DELETE SET NULL,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_ledger_entries_module_date ON ledger_entries (module, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries (account_code, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ledger_entries_sale ON ledger_entries (sale_id);

  CREATE TABLE IF NOT EXISTS field_stock_issues (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_issued NUMERIC(12,3) NOT NULL DEFAULT 0,
    quantity_returned NUMERIC(12,3) NOT NULL DEFAULT 0,
    quantity_sold NUMERIC(12,3) NOT NULL DEFAULT 0,
    remitted_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'issued',
    issued_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reconciled_at TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS idx_field_stock_agent ON field_stock_issues (agent_id, issued_at DESC);

  CREATE TABLE IF NOT EXISTS reconciliation_days (
    module TEXT NOT NULL DEFAULT 'medical',
    business_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    notes TEXT NOT NULL DEFAULT '',
    locked_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    locked_at TIMESTAMPTZ,
    reopened_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    reopened_at TIMESTAMPTZ,
    PRIMARY KEY (module, business_date)
  );

  -- Gap-free numbering. The application locks the row while allocating.
  CREATE TABLE IF NOT EXISTS document_sequences (
    module TEXT NOT NULL,
    document_type TEXT NOT NULL,
    prefix TEXT NOT NULL,
    next_number INTEGER NOT NULL DEFAULT 1 CHECK (next_number > 0),
    PRIMARY KEY (module, document_type)
  );

  INSERT INTO document_sequences (module, document_type, prefix, next_number) VALUES
    ('medical', 'receipt', 'MED', 1),
    ('medical', 'invoice', 'INV', 1),
    ('medical', 'quote', 'QUO', 1),
    ('medical', 'credit_note', 'CN', 1),
    ('medical', 'shift', 'SFT', 1),
    ('pharmacy', 'receipt', 'PHA', 1),
    ('pharmacy', 'invoice', 'INV', 1),
    ('pharmacy', 'quote', 'QUO', 1),
    ('pharmacy', 'credit_note', 'CN', 1),
    ('pharmacy', 'shift', 'SFT', 1)
  ON CONFLICT (module, document_type) DO NOTHING;

  -- Reliable asynchronous email delivery.
  CREATE TABLE IF NOT EXISTS email_outbox (
    id UUID PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'medical',
    kind TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    from_address TEXT NOT NULL DEFAULT '',
    html TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL DEFAULT '',
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    idempotency_key TEXT NOT NULL UNIQUE,
    reference_type TEXT NOT NULL DEFAULT '',
    reference_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT NOT NULL DEFAULT '',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  -- from_address was added after the first extended migration.
  ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS from_address TEXT NOT NULL DEFAULT '';
  CREATE INDEX IF NOT EXISTS idx_email_outbox_pending ON email_outbox (status, next_attempt_at);
  CREATE INDEX IF NOT EXISTS idx_email_outbox_reference ON email_outbox (reference_type, reference_id);

  CREATE TABLE IF NOT EXISTS email_preferences (
    email TEXT PRIMARY KEY,
    marketing_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY,
    admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    module TEXT NOT NULL DEFAULT 'medical',
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL DEFAULT '',
    before JSONB NOT NULL DEFAULT '{}'::jsonb,
    after JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_audit_log_module_date ON audit_log (module, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON audit_log (admin_id, created_at DESC);
`
