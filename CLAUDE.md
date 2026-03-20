# Sparq — Development Guidelines

## Project Overview
Full-stack marketplace app — Australia's curated beauty & lifestyle services platform.
**Tech:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma, PostgreSQL, Stripe, NextAuth.js v4

## UI Rules

### Design principles
- Premium, minimal, high-trust
- Mobile-first
- Clear visual hierarchy
- Avoid visual clutter
- Prefer whitespace over borders
- Use concise copy
- Feel closer to Airbnb/ClassPass — NOT a task marketplace or admin panel

### Layout
- Use consistent spacing scale (4/8/12/16/24/32/48/64)
- Avoid crowded cards
- Prefer 1 primary CTA per section
- Keep forms short and easy to scan
- Max content width: `max-w-[1600px]`

### Typography
- Headlines: `font-headline` (Noto Serif)
- Body/UI: `font-jakarta` (Plus Jakarta Sans)
- Clear heading hierarchy (h1 > h2 > h3)
- Avoid too many font sizes
- Keep line length readable

### Color System
- Primary coral: `#E96B56`
- Primary dark: `#a63a29`
- Ink (text): `#1A1A1A`
- Muted text: `#717171`
- Cream background: `#FDFBF7`
- Surface containers: `#f9f2ef`, `#f3ece9`, `#e8e1de`
- **Never use** raw Tailwind gray-*, stone-*, slate-* classes
- **Never use** hardcoded hex like #999, #ACACAC, #E0E0E0, #EBEBEB

### Components
- Buttons should have consistent radius, padding, and states
- Inputs should have consistent height and error styles
- Cards should use one unified structure
- Empty states should include next-step guidance
- Use shared components from `src/components/ui/` (Button, Input, Textarea, Modal, Avatar, etc.)

### Coding constraints
- Do not change backend logic unless explicitly asked
- Reuse shared components where possible
- Keep accessibility in mind (labels, aria attributes, contrast)
- All user-facing copy should feel warm, human, and premium — not clinical or generic
- Terminology: Provider → Artist, Customer → Client, Session → Appointment

## Brand Terminology
| Internal | User-facing |
|----------|-------------|
| Provider | Artist |
| Customer | Client |
| Service session | Appointment / visit |
| Platform fee | Booking fee |

## Test Accounts (after seeding)
- Admin: admin@sparq.com.au / admin123456
- Provider: lily.nguyen@example.com / provider123
- Customer: emma@customer.com / password123
