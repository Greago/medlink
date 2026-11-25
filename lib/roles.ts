import type { AppModule } from "@/lib/modules/types"

export const ADMIN_ROLES = [
  "owner",
  "manager",
  "hr_manager",
  "interviewer",
  "cashier",
  "field_agent",
  "accountant",
] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export const PERMISSIONS = [
  "pos.access",
  "pos.sell",
  "pos.discount",
  "pos.void",
  "pos.refund",
  "pos.shift.manage",
  "products.read",
  "products.manage",
  "stock.manage",
  "orders.manage",
  "customers.manage",
  "sales.read.all",
  "sales.read.own",
  "profit.read",
  "agents.manage",
  "commission.manage",
  "finance.read",
  "finance.manage",
  "reports.read",
  "reports.export",
  "settings.manage",
  "staff.manage",
  "audit.read",
  "recruitment.read",
  "recruitment.manage",
  "recruitment.email",
  "recruitment.salary",
  "blog.manage",
] as const

export type Permission = (typeof PERMISSIONS)[number]

export interface RoleSubject {
  role: AdminRole
  modules?: AppModule[] | string[] | null
  maxDiscountPercent?: number
  /** null means use the role defaults; an array is an explicit per-staff override. */
  permissions?: Permission[] | null
}

const ALL_PERMISSIONS = new Set<Permission>(PERMISSIONS)

const ROLE_PERMISSIONS: Record<AdminRole, Set<Permission>> = {
  owner: ALL_PERMISSIONS,
  manager: new Set<Permission>([
    "pos.access",
    "pos.sell",
    "pos.discount",
    "pos.void",
    "pos.refund",
    "pos.shift.manage",
    "products.read",
    "products.manage",
    "stock.manage",
    "orders.manage",
    "customers.manage",
    "sales.read.all",
    "profit.read",
    "agents.manage",
    "commission.manage",
    "finance.read",
    "reports.read",
    "reports.export",
    "recruitment.read",
    "recruitment.manage",
    "recruitment.email",
    "recruitment.salary",
    "blog.manage",
  ]),
  cashier: new Set<Permission>([
    "pos.access",
    "pos.sell",
    "pos.discount",
    "pos.shift.manage",
    "products.read",
    "sales.read.own",
  ]),
  field_agent: new Set<Permission>([
    "pos.access",
    "pos.sell",
    "products.read",
    "customers.manage",
    "sales.read.own",
  ]),
  accountant: new Set<Permission>([
    "finance.read",
    "finance.manage",
    "reports.read",
    "reports.export",
    "sales.read.all",
    "profit.read",
    "audit.read",
  ]),
  hr_manager: new Set<Permission>([
    "recruitment.read",
    "recruitment.manage",
    "recruitment.email",
    "recruitment.salary",
    "customers.manage",
    "reports.read",
  ]),
  interviewer: new Set<Permission>([
    "recruitment.read",
  ]),
}

export interface CapabilityOption {
  permission: Permission
  label: string
  description: string
}

export interface CapabilityGroup {
  label: string
  description: string
  capabilities: CapabilityOption[]
}

/** Every individual capability, grouped for readability but stored separately. */
export const CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    label: "Point of sale",
    description: "Selling, tills, discounts and document adjustments.",
    capabilities: [
      { permission: "pos.access", label: "Open POS", description: "Open the New sale screen." },
      { permission: "pos.sell", label: "Record sales", description: "Complete receipts and invoices." },
      { permission: "pos.discount", label: "Apply discounts", description: "Discount a sale within the staff limit." },
      { permission: "pos.void", label: "Void sales", description: "Cancel a recorded sale with a reason." },
      { permission: "pos.refund", label: "Refund and return", description: "Issue returns, refunds and credit notes." },
      { permission: "pos.shift.manage", label: "Tills and shifts", description: "Open, close and count a till." },
    ],
  },
  {
    label: "Catalogue and stock",
    description: "Products, categories, batches and inventory movements.",
    capabilities: [
      { permission: "products.read", label: "View products", description: "Browse the catalogue." },
      { permission: "products.manage", label: "Manage products", description: "Create, edit and remove products." },
      { permission: "stock.manage", label: "Manage stock", description: "Adjust stock, batches and expiries." },
    ],
  },
  {
    label: "Orders and customers",
    description: "Online orders and customer records.",
    capabilities: [
      { permission: "orders.manage", label: "Manage online orders", description: "Review and update customer orders." },
      { permission: "customers.manage", label: "Manage customers", description: "Add and edit customer details." },
    ],
  },
  {
    label: "Sales visibility",
    description: "Which sales and margins a person can see.",
    capabilities: [
      { permission: "sales.read.own", label: "View own sales", description: "See documents created by this login." },
      { permission: "sales.read.all", label: "View all sales", description: "See every document in the division." },
      { permission: "profit.read", label: "View profit", description: "See cost price and margin figures." },
    ],
  },
  {
    label: "Team and agents",
    description: "Staff logins, agents and commission statements.",
    capabilities: [
      { permission: "staff.manage", label: "Manage staff logins", description: "Create and edit staff accounts and roles." },
      { permission: "agents.manage", label: "Manage agents", description: "Maintain agents and their linked logins." },
      { permission: "commission.manage", label: "Manage commissions", description: "Configure and approve agent commissions." },
    ],
  },
  {
    label: "Finance and reports",
    description: "Ledger, expenses and reporting.",
    capabilities: [
      { permission: "finance.read", label: "View finance", description: "Read the ledger and operating expenses." },
      { permission: "finance.manage", label: "Manage finance", description: "Record expenses, purchases and payments." },
      { permission: "reports.read", label: "View reports", description: "Open sales and performance reports." },
      { permission: "reports.export", label: "Export reports", description: "Download report files and PDFs." },
    ],
  },
  {
    label: "System",
    description: "Settings, email delivery and the audit trail.",
    capabilities: [
      { permission: "settings.manage", label: "Manage settings", description: "Change company settings and email outbox." },
      { permission: "audit.read", label: "Read audit log", description: "Review sensitive action history." },
    ],
  },
  {
    label: "Recruitment",
    description: "Careers vacancies, applicants, interviews and candidate emails.",
    capabilities: [
      { permission: "recruitment.read", label: "View recruitment", description: "See assigned jobs and applicants." },
      { permission: "recruitment.manage", label: "Manage recruitment", description: "Create jobs, move stages and schedule interviews." },
      { permission: "recruitment.email", label: "Email candidates", description: "Send stage and interview emails." },
      { permission: "recruitment.salary", label: "View salary expectations", description: "See expected salary figures for applicants." },
    ],
  },
  {
    label: "Content",
    description: "Editorial articles, categories and scheduled publishing.",
    capabilities: [
      { permission: "blog.manage", label: "Manage blog", description: "Write articles, manage categories, schedule posts and moderate comments." },
    ],
  },
]

/** Kept for older imports; the full granular list is CAPABILITY_GROUPS. */
export const PAGE_ACCESS_OPTIONS: { permission: Permission; label: string }[] = CAPABILITY_GROUPS.flatMap((group) =>
  group.capabilities.map((capability) => ({
    permission: capability.permission,
    label: capability.label,
  }))
)

export const ASSIGNABLE_ROLES: AdminRole[] = [
  "manager",
  "hr_manager",
  "interviewer",
  "cashier",
  "field_agent",
  "accountant",
]

export function getDefaultPermissions(role: AdminRole): Permission[] {
  return Array.from(ROLE_PERMISSIONS[role] ?? [])
}

export function normalizePermissions(value: unknown): Permission[] | null {
  if (value === null || value === undefined) return null
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value
          .replace(/[{}]/g, "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : []
  const allowed = new Set<string>(PERMISSIONS)
  return items.filter((item): item is Permission => typeof item === "string" && allowed.has(item))
}

export function hasPermission(subject: RoleSubject | null | undefined, permission: Permission): boolean {
  if (!subject) return false
  if (subject.permissions) return subject.permissions.includes(permission)
  return ROLE_PERMISSIONS[subject.role]?.has(permission) ?? false
}

export function canAccessModule(subject: RoleSubject | null | undefined, module: AppModule): boolean {
  if (!subject) return false
  if (subject.role === "owner") return true
  const modules = subject.modules || []
  return modules.includes(module)
}

export function canApplyDiscount(subject: RoleSubject | null | undefined, percent: number): boolean {
  if (!subject || !hasPermission(subject, "pos.discount")) return false
  const limit = Number(subject.maxDiscountPercent ?? 0)
  return percent >= 0 && percent <= limit
}

export function roleLabel(role: AdminRole): string {
  switch (role) {
    case "owner":
      return "Owner / Super Admin"
    case "manager":
      return "Manager"
    case "cashier":
      return "Shop Cashier"
    case "field_agent":
      return "Field Sales Agent"
    case "accountant":
      return "Accountant"
    case "hr_manager":
      return "HR / Hiring Manager"
    case "interviewer":
      return "Interviewer / Reviewer"
  }
}

export function normalizeRole(value: unknown): AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value)
    ? (value as AdminRole)
    : "cashier"
}

export function normalizeModules(value: unknown): AppModule[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is AppModule => item === "medical" || item === "pharmacy")
  }
  if (typeof value === "string") {
    return value
      .replace(/[{}]/g, "")
      .split(",")
      .map((item) => item.trim())
      .filter((item): item is AppModule => item === "medical" || item === "pharmacy")
  }
  return []
}
