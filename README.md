# Medlink Expedites - Medical Equipment & Pharmacy Management System

A modern, full-featured platform for healthcare suppliers to manage two storefront divisions - medical equipment and pharmacy - from one app, one database, and one admin portal.

## Features

### Public Website
- **Two Divisions**: Choose between **Medical Equipment** and **Pharmacy** on the first visit. A first-run chooser explains each division, and the navigation bar keeps a compact switcher plus a **Compare** view available at any time.
- **Module-Scoped Storefront**: Products, categories, pricing copy, hero content, catalogue PDFs, cart, saved items, and newsletter signups follow the division selected by the visitor.
- **Homepage**: Professional landing page with product showcase
- **Products Page**: Filterable and searchable product catalog
- **Blog**: Knowledge base and industry articles
- **Contact Page**: Direct communication with support team
- **Inquiry Form**: Customers can request equipment or pharmacy supplies with detailed specifications
- **Cart & Saved Items**: Add products to a cart, manage quantities, and save favourites. Data is persisted in PostgreSQL per anonymous visitor cookie.
- **Customer Accounts**: Register, sign in, and place orders from the cart.
- **Password Reset**: Request a secure, expiring reset link by email and set a new password.
- **Order History**: Signed-in customers can review previous orders at `/orders`.
- **Catalogue Download**: Email and download a PDF of the full product catalogue

### Admin Dashboard
- **Authentication**: Secure login system with demo credentials
- **Division Switcher**: The admin header switches the active division, so catalogue, category, order, and catalogue-email views stay scoped to the selected storefront
- **Product Management**: Add, edit, and delete products for the active division, with photo uploads stored alongside the product
- **Category Management**: Create, rename, and remove categories from `/admin/categories`
- **Inquiry Management**: View and track customer inquiries
- **Quote Generation**: Create detailed quotes for customer requests
- **Quote Emailing**: Email quotes as PDF attachments from the dashboard or quote manager
- **Order Management**: Review customer orders and update their status
- **Bulk Email**: Send updates or the catalogue PDF to multiple recipients from the admin portal
- **Admin Profile**: Update the administrator name, email, and password
- **Staff & Logins**: Owner-only screen to create cashier, field-agent, manager and accountant logins with division access, individual capability permissions, discount limits and an optional welcome email
- **Roles & Capabilities**: Owner-only screen to select a staff login or an agent and assign every capability individually, with optional role presets and audited changes
- **Analytics Dashboard**: View trends and activity metrics

## Initial Admin Credentials

**Email**: admin@medlinkexpedite.co.ke  
**Password**: @medlinkadmin

Change these under **Admin → My Account** after signing in. You can also set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before the first request to seed different initial credentials.

### Staff logins and agents

A staff login and an agent record are separate:

1. **Admin → Staff & logins** creates the email/password used at `/admin/login`, with a role and division access.
2. **Admin → Agents** creates the commission/target record. Select the staff login under **Login account (optional)** to link them.

Creating a staff login does not automatically create an agent record. Only the owner can manage staff accounts.

New staff logins are created with a temporary password and must change it at first sign-in. The owner can optionally email the temporary password; if email is unavailable, the account is still created and the credentials can be shared manually. Staff can reset a forgotten password from `/admin/forgot-password`, and can change their password at any time from **Admin → My Account**.

By default a role supplies its standard page permissions. On the Staff & logins form you can switch on **Assign individual capabilities** to override every capability separately. The dedicated **Roles & capabilities** screen lets the owner choose either a staff user or an agent, start from a role preset or from scratch, and save a fine-grained capability set. Agents must have a linked staff login before capabilities can be assigned. Both the menu and the API enforce the selected access, and changes are written to the audit log.

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env.local` in the project root:
   ```env
   RESEND_API_KEY=your_resend_api_key
   CATALOGUE_FROM_EMAIL=Medlink Expedites <catalogue@medlinkexpedite.co.ke>
   QUOTE_FROM_EMAIL=Medlink Expedites <quotes@medlinkexpedite.co.ke>
   BULK_FROM_EMAIL=Medlink Expedites <bulk@medlinkexpedite.co.ke>
   ACCOUNT_FROM_EMAIL=Medlink Expedites <catalogue@medlinkexpedite.co.ke>
   DATABASE_URL=postgresql://user:password@host/db?sslmode=require

   # Optional: initial admin credentials, used only when the admin table is empty
   ADMIN_EMAIL=admin@medlinkexpedite.co.ke
   ADMIN_PASSWORD=choose-a-strong-password
   ```
   All sender addresses use the verified `medlinkexpedite.co.ke` domain, so emails can be delivered to any recipient.
4. Run the development server: `npm run dev`
5. Visit `http://localhost:3000`. On the first visit, pick **Medical Equipment** or **Pharmacy**. Your choice is saved in the `medlink_module` cookie and can be changed from the navigation bar.

## Navigation

Both divisions share the same routes. The selected division is read from the `medlink_module` cookie and controls which data is shown.

- **Public Site**: 
  - Division chooser: shown on first visit; reopen with **Compare** in the header
  - Home: `/`
  - Products: `/products`
  - Blog: `/blog`
  - Contact: `/contact`
  - Inquiry: `/inquiry`
  - Cart: `/cart`
  - Saved items: `/likes`
  - Sign in: `/account/login`
  - Create account: `/account/register`
  - Forgot password: `/account/forgot-password`
  - Reset password: `/account/reset-password`
  - My account: `/account`
  - Order history: `/orders`

- **Admin Portal**:
  - Login: `/admin/login`
  - Dashboard: `/admin/dashboard`
  - My Account: `/admin/account`
  - Products: `/admin/products`
  - Categories: `/admin/categories`
  - Inquiries: `/admin/inquiries`
  - Quotes: `/admin/quotes`
  - Orders: `/admin/orders`
  - Bulk Email: `/admin/bulk-email`

## Tech Stack

- Next.js 16 with App Router
- React 19
- Tailwind CSS v4
- Zustand for client-side state cache
- Module registry for the medical and pharmacy storefronts
- Neon PostgreSQL with `pg` for persistent storage
- Resend for catalogue, quote, bulk and account email delivery
- Recharts for analytics
- Lucide icons

## Notes

- Zustand is a client-side cache; PostgreSQL is the source of truth.
- The database schema and seed data are created automatically on the first API request.
- Product photos uploaded in the admin portal are stored in PostgreSQL and served through `/api/images` (JPG/PNG, up to 4 MB).
- Cart and saved items are keyed by an anonymous, HTTP-only cookie.
- Customer passwords are scrypt-hashed; sessions use an HTTP-only cookie backed by PostgreSQL.
- Password reset tokens are SHA-256 hashed, expire after 1 hour, and are single-use; resetting a password signs out all existing sessions.
- Admin accounts are stored in PostgreSQL with hashed passwords and HTTP-only session cookies; change the seeded password before production.
- Both divisions are seeded into PostgreSQL, but only the active division's records are returned to the storefront and admin catalogue views.
- Products, categories, orders, cart items, saved items, catalogue requests, and newsletter signups carry a module tag. Customer accounts, inquiries, and quotes are shared across both divisions.
- The division is a client-readable cookie (`medlink_module`) so page content and API requests can select the right catalogue without a page reload.

## Future Enhancements

- Email notifications for new inquiries
- Payment processing
- Email verification
- Advanced analytics
- Inventory tracking
