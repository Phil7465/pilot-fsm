# Pilot Field Service Pro

A production-ready Jobber-style field service management PWA for small service businesses. Built with Next.js 14 App Router, Prisma, PostgreSQL, and Tailwind. Supports office admins and field staff with role-based access, offline-friendly UI, invoice automation, payment provider abstraction (Stripe/GoCardless), and QuickBooks Online syncing.

## System Architecture Overview

```
┌─────────────┐        ┌─────────────┐        ┌──────────────┐
│  Next.js    │  API   │  Prisma     │  SQL   │  PostgreSQL   │
│  App Router │◄──────►│  ORM        │◄──────►│  (Supabase)   │
└─────────────┘        └─────────────┘        └──────────────┘
      │                         │                       │
      │  Server actions /       │ Prisma adapters       │
      │  API routes             │ for NextAuth          │
      ▼                         ▼                       ▼
┌─────────────┐        ┌────────────────┐        ┌──────────────┐
│ React UI    │        │ Payment Layer  │        │ QuickBooks   │
│ (web/PWA)   │        │ Stripe/GCD SDK │        │ REST API     │
└─────────────┘        └────────────────┘        └──────────────┘
```

Key pieces:

- **Frontend**: Next.js App Router, Server Components, React Hook Form, Tailwind UI kit.
- **Backend**: Next.js API routes (REST-ish) plus Prisma for data, NextAuth for auth.
- **Payments**: Strategy/factory pattern in `src/lib/payments` with interchangeable providers.
- **Accounting**: QuickBooks OAuth + sync helpers (`src/lib/quickbooks`).
- **PWA**: `next-pwa` generating service worker, manifest + icon ready for install/offline caching.

## Database Schema (Prisma)

Main entities:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `User` | Admin & driver accounts | `role`, `passwordHash`, NextAuth relations |
| `Customer` | CRM records with VAT status | `address`, `vatStatus`, `qbCustomerId`, `qbSyncToken` |
| `Job` | Work orders linked to customers | `reference`, `serviceDate`, `status`, `assignedStaffId` |
| `JobLineItem` | Scoped services per job | `quantity`, `unitPrice`, `vatCode` |
| `ServiceTemplate` | Reusable service catalog | `name`, `unitPrice`, `qbItemId`, `qbItemType` |
| `Invoice` | Generated invoices | `number`, `status`, `subtotal`, `vatTotal`, `balanceDue`, `qbInvoiceId` |
| `InvoiceLineItem` | Line items with VAT + income account | `quantity`, `vatCode`, `total`, `qbLineId` |
| `Payment` | Partial/ full payments | `method`, `providerPaymentId`, `qbPaymentId` |
| `RecurringInvoice` | Subscription templates | `interval`, `nextRunDate`, `lineItems` |
| `PaymentProviderSetting` | Active provider + secrets | `activeProvider`, `stripeSecret` |
| `QuickBooksCredential` | OAuth tokens | `realmId`, `accessToken`, `refreshToken` |
| `QuickBooksSyncSetting` | Sync config + high-water marks | `syncCustomers`, `syncItems`, `lastCustomerSync`, `lastInvoiceSync` |
| `SyncLog` | Audit trail for all sync ops | `entity`, `direction`, `action`, `message` |
| `GlobalSetting` | VAT + currency defaults | `isVatRegistered`, `defaultNetTerms` |

Run `npx prisma migrate dev` after configuring `DATABASE_URL` to create the schema.

## API Design

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth credential login |
| `/api/customers` | GET/POST | List/create customers (admin create) |
| `/api/customers/:id` | PUT | Update customer (admin) |
| `/api/jobs` | GET/POST | Job list & creation |
| `/api/jobs/:id` | PATCH | Update status/notes (driver/admin) |
| `/api/jobs/:id/invoice` | POST | Generate invoice from job |
| `/api/invoices` | GET/POST | Invoice list & creation |
| `/api/invoices/:id` | PATCH | Update invoice metadata |
| `/api/payments` | GET/POST | Record payments + trigger provider |
| `/api/reports` | GET | Revenue/outstanding summary |
| `/api/recurring` | GET/POST | Manage recurring templates |
| `/api/recurring/run` | POST | Run billing cycle |
| `/api/settings/company` | GET/POST | VAT + currency settings |
| `/api/settings/payments` | GET/POST | Payment provider secrets |
| `/api/integrations/quickbooks/connect` | GET | Fetch OAuth URL |
| `/api/integrations/quickbooks/callback` | GET | Handle OAuth redirect |
| `/api/integrations/quickbooks/sync` | POST | Sync entity (customer/invoice/payment) |

All mutating routes enforce role guards via `ensureAdmin` / `ensureDriverOrAdmin`.

## QuickBooks Integration Flow

**QBO is the financial source of truth.** The app is the operational layer (jobs, drivers, dispatch, delivery notes).

### Sync Direction
- **QBO → App**: Customers, Items/Services, Invoices, Payments (delta sync with high-water marks)
- **App → QBO**: ONLY PrivateNote / custom fields / attachments on existing invoices
- **App NEVER**: Recalculates VAT, modifies invoice totals, or changes line Amount values from QBO

### How It Works
1. Admin hits **Connect to QuickBooks** → OAuth flow via `intuit-oauth` stores tokens in `QuickBooksCredential`.
2. Auto-sync (configurable interval) or manual sync calls `runFullSync()` which syncs in order: Customers → Items → Invoices → Payments.
3. Each entity sync uses **delta queries** (`MetaData.LastUpdatedTime > ?`) with high-water marks stored in `QuickBooksSyncSetting`.
4. **Rate limiting**: Token bucket (500 req/min) matching QBO API limits. Retry: 3 attempts with exponential backoff, 429 handling.
5. All sync operations logged to `SyncLog` for audit trail. Errors are caught/logged so workflows keep moving.
6. QB IDs stored directly on main models (`Customer.qbCustomerId`, `ServiceTemplate.qbItemId`, `Invoice.qbInvoiceId`, `Payment.qbPaymentId`) — no separate mapping tables.

## Payment Provider Abstraction

`src/lib/payments` contains:

- `base.ts`: shared interface + payload/response types.
- `stripe.ts`: card payments via Stripe PaymentIntents API.
- `gocardless.ts`: direct debit payments via GoCardless Node SDK.
- `factory.ts`: reads `PaymentProviderSetting` or env vars to return the active provider.

The `/api/payments` route delegates CARD / DIRECT_DEBIT methods to `getPaymentProvider()`, keeping invoice logic independent of specific processors.

## Invoice Logic

`src/lib/finance.ts` centralizes all totals:

```ts
const totals = calculateInvoiceTotals(input, isVatRegistered);
// → { subtotal, vatTotal, total }
```

Amounts are derived from line items; the UI (InvoiceBuilder) shows read-only subtotal/VAT/total to prevent manual edits. Payments subtract from `balanceDue` with helper `remainingBalance`.

## PWA & Offline Support

- `next-pwa` wraps `next.config.mjs`, generating a service worker and precache manifest in production builds.
- `public/manifest.webmanifest` + SVG icon enable install prompts.
- App shell uses responsive layout, large touch targets, and works well on mobile (see `/mobile/jobs`).

## Getting Started

1. **Install deps**
   ```bash
   npm install
   ```
2. **Copy env**
   ```bash
   cp .env.example .env
   # edit DATABASE_URL, NEXTAUTH_SECRET, Stripe/GoCardless/QBO keys
   ```
3. **Database setup**
   ```bash
   npx prisma migrate dev
   npm run prisma:seed
   ```
4. **Run dev server**
   ```bash
   npm run dev
   ```
5. **Login** with seeded admin `admin@pilotfsm.test` / `ChangeMe123!`.

## Testing & Quality

- **Type-safe validation**: Zod schemas reused by API + forms.
- **ESLint**: Next.js default rules.
- **React Query**: Provider ready for data fetching (future real-time sync).
- **Security**: NextAuth sessions, middleware restricting `/dashboard`, `/customers`, etc., server-only Prisma client, hashed passwords.

## Roadmap / Next Steps

- Implement QBO webhook listener for real-time push notifications.
- Expand driver mobile PWA with offline caching of assigned jobs & note uploads.
- Add Stripe + GoCardless webhook endpoints for async status updates.
- Build reporting dashboard charts (Revenue, AR aging) with a charting lib.
- Driver-safe view: hide financial data from DRIVER role users.

---

Built by GitHub Copilot (GPT-5.1-Codex) as a reference implementation for a modern FSM platform.
