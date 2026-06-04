# Sparq — Agent Brief

## Decisions log

**2026-06-04 — Non-MVP features hidden for launch.** Per product owner
decision, non-MVP features are to be hidden from all user-facing UI while
schema, API routes, and background processes are preserved for reversibility.

Investigation finding: this codebase is already at (or below) the intended
launch scope. The large hide-list in the original brief was written against a
larger/future version of Sparq that does not exist in this repository. None of
the following targeted features are present here, so nothing needed hiding:
wishlists/favorites, customer dashboard recommendations + recently-viewed +
spending widgets, artist growth analytics, artist clients (CRM), featured
listings, iCal sync UI, artist waitlist management UI, customer dispute UI, and
the extended admin pages (analytics, audit-log, categories, chargebacks, cron,
featured, fraud-signals, leakage page, notes page, reports, service moderation,
vouchers). Marketing pages /community, /blog, /press also do not exist.

The only overlap with the hide-list was the `/admin/suburbs` route, which
existed solely as an empty `src/app/admin/suburbs/` directory (no `page.tsx`)
and therefore already returned 404. That empty scaffold directory was removed
for cleanliness. No nav entry referenced it.

The current shipped surface already equals the MVP keep-list: home, search
(/providers), provider profiles, booking flow, customer dashboard (overview /
bookings / reviews / settings), provider dashboard (overview / profile /
services / availability / bookings / earnings / reviews / settings), the
minimal admin set (overview / providers / bookings / reviews / settings), the
marketing/legal pages, and auth.

To restore any future-hidden feature: re-add its `page.tsx`, restore nav
entries, and restore dashboard widget JSX. Schema and business logic are
preserved; restoration is a UI-only effort.

TODO if any hide becomes permanent: follow-up session to drop relevant schema,
delete API routes, and remove background processes to prevent schema drift.

### Notes / pre-existing issues flagged during this session (out of scope, not changed)
- Header links to `/register`, but the auth route is `/signup` — broken link.
- Footer links to `/about`, `/services/nails`, `/services/lashes` — no such
  pages exist — broken links.
- Test runner is **vitest** (`npm run test` → `vitest run`), not jest.
