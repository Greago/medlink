# Medlink Expedites - Medical Equipment Management System

A modern, full-featured platform for medical equipment suppliers to manage products, handle customer inquiries, and generate quotes.

## Features

### Public Website
- **Homepage**: Professional landing page with product showcase
- **Products Page**: Filterable and searchable product catalog
- **Blog**: Knowledge base and industry articles
- **Contact Page**: Direct communication with support team
- **Inquiry Form**: Customers can request equipment with detailed specifications

### Admin Dashboard
- **Authentication**: Secure login system with demo credentials
- **Product Management**: Add, edit, and delete medical equipment
- **Inquiry Management**: View and track customer inquiries
- **Quote Generation**: Create detailed quotes for customer requests
- **Analytics Dashboard**: View trends and activity metrics

## Demo Credentials

**Email**: admin@medlink.com  
**Password**: admin123

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Visit `http://localhost:3000`

## Navigation

- **Public Site**: 
  - Home: `/`
  - Products: `/products`
  - Blog: `/blog`
  - Contact: `/contact`
  - Inquiry: `/inquiry`

- **Admin Portal**:
  - Login: `/admin/login`
  - Dashboard: `/admin/dashboard`
  - Products: `/admin/products`
  - Inquiries: `/admin/inquiries`
  - Quotes: `/admin/quotes`

## Tech Stack

- Next.js 16 with App Router
- React 19
- Tailwind CSS v4
- Zustand for state management
- Recharts for analytics
- Lucide icons

## Notes

- Currently using client-side state management with Zustand
- When ready, integrate with Neon database for persistent storage
- Implement proper authentication (OAuth, email verification)
- Set up email notifications for inquiries and quotes
- Add PDF quote generation and download functionality

## Future Enhancements

- Database integration (Neon)
- Email notifications
- PDF generation for quotes
- Payment processing
- User accounts and order history
- Advanced analytics
- Inventory tracking
