# Sparq

A two-sided marketplace for independent nail and lash artists in Melbourne CBD and inner suburbs.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL (via Docker)
- **ORM:** Prisma
- **Auth:** Auth.js (NextAuth v5) with credentials
- **Payments:** Stripe (manual capture + Connect Express)
- **Images:** Cloudinary
- **Email:** Resend
- **Testing:** Vitest

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Stripe account (test mode)
- Cloudinary account
- Resend account

## Getting Started

### 1. Clone and install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- **DATABASE_URL** — pre-configured for Docker
- **AUTH_SECRET** — generate with `openssl rand -base64 32`
- **STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY** — from Stripe dashboard (test keys)
- **STRIPE_WEBHOOK_SECRET** — from Stripe CLI (see below)
- **CLOUDINARY_\*** — from Cloudinary dashboard
- **RESEND_API_KEY** — from Resend dashboard

### 3. Start the database

```bash
docker-compose up -d
```

### 4. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 5. Generate Prisma client

```bash
npm run db:generate
```

### 6. Seed the database

```bash
npm run db:seed
```

This creates:
- Admin user: `admin@sparq.com.au` / `admin123!`
- Customer: `customer@example.com` / `customer123!`
- 3 approved providers with services
- 1 provider pending approval

### 7. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stripe Webhooks (Local Development)

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and forward events:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret (`whsec_...`) to your `.env` as `STRIPE_WEBHOOK_SECRET`.

### Key Stripe events handled:
- `payment_intent.amount_capturable_updated` — payment authorized
- `payment_intent.succeeded` — payment captured
- `payment_intent.canceled` — authorization released
- `payment_intent.payment_failed` — payment failed
- `account.updated` — Connect account status change

## Project Structure

```
src/
  app/
    (public)/           # Public pages (home, how-it-works, services, etc.)
    (auth)/              # Login, signup, forgot-password, verify-email
    customer/            # Customer dashboard (protected)
    provider/            # Provider dashboard + onboarding (protected)
    admin/               # Admin dashboard (protected)
    api/                 # API route handlers
  components/
    ui/                  # shadcn/ui components
    layout/              # Header, Footer, SessionProvider
    providers/           # ProviderCard, FilterBar
  lib/                   # Config: auth, prisma, stripe, cloudinary, email, constants
  server/
    services/            # Business logic (booking, payment, provider, review, admin)
    permissions/         # Role-based access control
    validation/          # Zod schemas
  types/                 # Shared TypeScript types
prisma/
  schema.prisma          # Database schema
  seed.ts                # Seed data
```

## Key Features

### Booking Flow
1. Customer selects provider, service, date, and time
2. Customer submits booking request with payment method
3. Platform creates payment authorization (hold)
4. Provider has 24h to accept or decline
5. Accept: payment captured, booking confirmed
6. Decline: authorization released
7. No response: booking expires, authorization released
8. After service: provider marks complete
9. Customer can leave verified review

### Anti-Off-Platform Protections
- No public contact details before confirmed booking
- Verified reviews only from completed platform bookings
- One-click rebook from booking history
- Refunds/disputes only for platform transactions
- Anti-circumvention acknowledgment in provider onboarding
- Admin leakage monitoring (expiry rates, cancellation patterns, response rates)

### Roles
- **Customer:** browse, book, pay, review
- **Provider:** onboard, manage services/availability, accept bookings, earn
- **Admin:** approve providers, manage bookings, moderate reviews, monitor leakage

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # ESLint
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:push      # Push schema changes (no migration)
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

## Launch Suburbs

Melbourne CBD, Southbank, Docklands, Carlton, Fitzroy, Richmond, South Yarra, Brunswick

## Service Categories

Nails, Lashes

## Seed Accounts

| Role     | Email                    | Password       |
|----------|--------------------------|----------------|
| Admin    | admin@sparq.com.au       | admin123!      |
| Customer | customer@example.com     | customer123!   |
| Provider | lisa@example.com         | provider123!   |
| Provider | sarah@example.com        | provider123!   |
| Provider | emma@example.com         | provider123!   |
| Provider | mia@example.com (pending)| provider123!   |

## Booking Expiry Cron

To expire stale bookings (pending requests past their response window), set up a cron job to POST to:

```
POST /api/bookings/expire
Authorization: Bearer YOUR_CRON_SECRET
```

Set `CRON_SECRET` in your `.env` for production. On Vercel, use [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs).

## Deployment

1. Deploy PostgreSQL (Neon, Supabase, or any managed Postgres)
2. Set all environment variables in your hosting platform
3. Run `npx prisma migrate deploy` for production migrations
4. Run `npm run db:seed` for initial data
5. Deploy to Vercel or similar:

```bash
vercel deploy
```
