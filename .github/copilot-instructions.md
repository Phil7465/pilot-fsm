# Pilot Field Service Pro — Copilot Instructions

## Project Overview
PWA Jobber-style field service management app. Next.js 14.2 App Router + Prisma + PostgreSQL (Supabase) + Tailwind CSS. Role-based (ADMIN/DRIVER) with mobile-first PWA support.

## Tech Stack
- **Framework**: Next.js 14.2 (App Router, Server Components)
- **ORM**: Prisma 5.22 with PostgreSQL
- **Auth**: NextAuth.js (credentials provider)
- **Styling**: Tailwind CSS
- **Payments**: Stripe / GoCardless (strategy pattern in `src/lib/payments`)
- **Accounting**: QuickBooks Online (intuit-oauth, one-way sync)
- **PWA**: next-pwa

## QuickBooks Integration Architecture (CRITICAL)
QuickBooks Online (QBO) is the **financial source of truth**. The app is the operational layer.

### Sync Direction (Bidirectional)
- **QBO → App (Pull)**: Customers, Items/Services, Invoices, Payments (delta sync with high-water marks)
- **App → QBO (Push)**: Customers and Invoices created/updated in the app are auto-pushed to QBO
- **App → QBO (Limited)**: PrivateNote/custom fields/attachments on existing invoices
- **App NEVER**: Recalculates VAT, modifies invoice totals, or changes line Amount values from QBO
- **Invoice Push**: Sends line items with TaxCodeRef, lets QBO calculate VAT, then stores QBO's totals back

### Key Files
- `src/lib/quickbooks/sync.ts` — Pull sync engine (QBO → App: delta sync, rate limiting, retry logic)
- `src/lib/quickbooks/push.ts` — Push sync engine (App → QBO: customers, invoices, bulk push)
- `src/lib/quickbooks/client.ts` — OAuth client management (DO NOT MODIFY)
- `src/lib/quickbooks/settings.ts` — Entity toggle helpers
- `src/lib/quickbooks/helpers.ts` — DisplayName generation, phone formatting

### Data Model
- QB IDs stored directly on main models: `Customer.qbCustomerId`, `ServiceTemplate.qbItemId`, `Invoice.qbInvoiceId`, `Payment.qbPaymentId`
- `SyncLog` table for audit trail
- `QuickBooksSyncSetting` has high-water mark timestamps per entity

### Rate Limiting
Token bucket: 500 requests/minute matching QBO API limits.
Retry: 3 attempts with exponential backoff, 429 handling.

## Development
- Schema changes: `npx prisma db push` (then `npx prisma generate`)
- Dev server: `npm run dev`
- Build: `npx next build`
- Seed login: `admin@pilotfsm.test` / `ChangeMe123!`

## Code Conventions
- Server components by default; `"use client"` only when needed
- Zod schemas for validation (`src/lib/validation.ts`)
- Financial calculations in `src/lib/finance.ts`
- Role guards: `ensureAdmin()` / `ensureDriverOrAdmin()` from `src/lib/permissions.ts`
- Decimal handling via `@prisma/client/runtime/library` Decimal class
