# Vasati — Premium Indian Residential Real Estate Marketplace

Vasati (वासति — "dwelling") is a full-stack, production-grade property marketplace for India, covering the complete brokerage business loop: **listing → moderation → discovery → enquiry CRM → site visits → transaction → commission settlement**.

![Vasati home](agent-ctx/final-home-desktop.png)

---

## Demo accounts

| Role | Email | Password | What to try |
|------|-------|----------|-------------|
| **Admin** | `admin@vasati.in` | `Admin@123` | Command Centre: KPIs, approvals, Leads CRM, transactions, commissions, agreements, audit log |
| **Buyer** | `buyer@vasati.in` | `Buyer@123` | Favourites, enquiries, site-visit booking, profile |
| **Seller** | `seller@vasati.in` | `Seller@123` | Listings CRUD with photo upload, enquiry inbox, visit scheduling |
| **Builder** | `builder@vasati.in` | `Builder@123` | Projects, inventory units, RERA profile, enquiries |

The login screen includes one-click demo account fill buttons.

---

## Architecture

```
Next.js 16 (App Router, single "/" SPA with hash routing)
├─ Frontend  React 19 · TypeScript · Tailwind 4 · shadcn/ui · Framer Motion · Recharts · Zustand
├─ API       30+ route handlers under /api (all business logic server-side)
├─ Data      Prisma ORM · SQLite (dev) — schema ported 1:1 to PostgreSQL for production
└─ Auth      scrypt password hashing · httpOnly cookie sessions · role guards
```

### Why hash routing in a single route?

The sandbox exposes one port/route. The app is a classic SPA at `/` using `#/properties`, `#/dashboard?tab=leads`, etc. All views live in `src/components/marketplace/views/`. To deploy as a traditional multi-page app, map each hash path to its view component — no logic changes needed.

---

## Feature map

### Public marketplace
- **Home** — hero, city-wise search, featured properties, trending listings, featured builder projects, city explorer, testimonials
- **Properties** — search + filters (city, locality, type, BHK, budget range, furnishing, construction status, RERA), URL-synced state, sorting, pagination
- **Property detail** — photo gallery with lightbox, specs, amenities, map coordinates, RERA panel, similar homes, enquiry form, site-visit booking, share/save
- **Projects** — developer projects with unit inventories, price bands, amenities, construction status
- **About / Contact / Legal** (privacy + terms), **Partner** (builder onboarding), **List your property** (seller onboarding)

### Role dashboards
- **Buyer** — favourites, enquiries with status timeline, site visits, profile
- **Seller** — listings manager (draft → submit → approved/rejected → resubmit), KPI stats, enquiry inbox with reply notes, visit scheduler, property form with multi-photo upload (drag-drop, main image, reordering)
- **Builder** — project portfolio, unit inventory, enquiries, company profile
- **Admin Command Centre** — 10 tabs: Overview (Recharts KPIs), Users (verify/suspend), Property approvals, Project approvals, Leads CRM (pipeline board, status workflow, follow-ups, assignment), Site visits, Transactions, Commissions (payment recording), Agreements, Audit log

### Business workflow (enforced server-side)

The platform implements the brokerage operating model end-to-end — listing → moderation → discovery → enquiry CRM → site visits → transaction → commission settlement:

1. Owners & builders submit listings/projects → held as `PENDING` until an admin approves (rejection carries a reason; drafts supported)
2. Buyers browse and enquire for **free** — enquiry creates a lead with unique reference (30-day de-dup, rate-limited, consent required); site-visit requests link to the lead by phone
3. The Vasati team works the lead in the CRM: `NEW → QUALIFIED → NEGOTIATION → BOOKING → CONVERTED`, with assignment, follow-up dates, contact logging, and the buyer's phone/email surfaced for outreach
4. The team connects the buyer with the owner/builder (contact details on both sides: sellers/builders see enquiries in their dashboards, admins see owner contacts in the CRM)
5. Site visits are coordinated in the Visits tab: confirm, reschedule (buyer is notified), complete, or cancel
6. A transaction can only be recorded for a negotiation/booking/converted lead **with an active agreement** — the signed commission agreement (percentage or fixed fee) is created against the seller/builder first
7. Commission is computed server-side from the agreement (percentage of sale value or fixed fee) — never trusted from the client
8. Partial/full commission payments recorded atomically; status auto-transitions `PENDING → PARTIAL → PAID` (e.g. ₹50 L deal @ 1% → ₹50,000 revenue; rate varies per agreement)
9. Every mutation lands in the audit log

---

## API surface (selected)

```
POST /api/auth/{register,login,logout}     GET /api/auth/me
GET  /api/properties                       (search, filters, pagination)
GET  /api/properties/[slugOrId]            POST /api/properties (seller)
PATCH/DELETE /api/properties/[id]          (owner)
POST /api/properties/[id]/approve|reject   (admin moderation)
GET/POST /api/projects                     POST /api/projects/[id]/approve|reject
GET/POST /api/leads                        PATCH /api/leads/[id] (pipeline)
GET/POST /api/site-visits                  PATCH /api/site-visits/[id]
GET/POST/DELETE /api/favourites/[propertyId]
GET /api/stats                             (role-aware dashboard stats)
GET/POST /api/notifications                POST /api/notifications/read-all
POST /api/contact                          POST /api/upload (magic-number validated)
GET/POST /api/admin/users                  PATCH /api/admin/users/[id]
GET/POST /api/admin/transactions           PATCH /api/admin/transactions/[id]
GET/POST /api/admin/agreements             PATCH /api/admin/agreements/[id]
GET /api/admin/commissions                 PATCH /api/admin/commissions/[id] (record payment)
GET /api/admin/audit-logs                  GET /api/admin/stats
```

All endpoints return `{ data }` or `{ error }` with proper HTTP codes, are rate-limited where appropriate, and validate input with Zod.

---

## Data model (23 tables)

`User`, `Session`, `Builder`, `Project`, `ProjectImage`, `Property`, `PropertyImage`, `PropertyAmenity`, `PropertyDocument`, `Favourite`, `Lead`, `LeadActivity`, `SiteVisit`, `SellerAgreement`, `BuilderAgreement`, `Transaction`, `Commission`, `CommissionPayment`, `FeaturedListing`, `Notification`, `AuditLog`, `ContactMessage`, `Setting`

Key constraints: unique property/project slugs, unique lead references, one transaction per lead, payment ≤ outstanding enforced in a DB transaction.

---

## Local development

```bash
bun install
bun run db:push        # sync Prisma schema to SQLite
bun run db:seed        # demo data (8 users, 2 builders, 4 projects, 17 properties, leads, 1 closed deal)
bun run dev            # http://localhost:3000
bun run lint
```

## Production deployment (Vercel + Supabase)

The app is **Supabase-ready** — database, storage and (data-level) authentication all move to Supabase by setting env vars. No code changes:

```bash
# 1. Create a project at supabase.com (free tier works)
# 2. Put the following in .env (see .env.example for annotated templates):
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 3. One-command switch (flips Prisma to PostgreSQL, pushes the 23-table
#    schema, optionally seeds demo data — skip with --no-seed):
bun scripts/use-supabase.mjs

# 4. Deploy
vercel   # set the same env vars in the Vercel dashboard
```

What each piece does on Supabase:

- **Database** — Supabase Postgres via Prisma. The PostgreSQL schema is kept in `db/supabase/schema.prisma` with generated DDL in `db/supabase/migration.sql` (a manual fallback if you prefer running SQL in the Supabase editor). Zero raw SQL in the codebase — the app is 100% portable between SQLite and Postgres.
- **Storage** — with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set, `/api/upload` transparently switches from local disk to the public `uploads` bucket in Supabase Storage (bucket auto-created; override the name with `SUPABASE_BUCKET`). The same validation (type allowlist, 5 MB cap, magic-number sniffing) applies to both backends.
- **Authentication** — accounts and sessions live in your Supabase Postgres (`User` + `Session` tables) behind scrypt hashing and httpOnly cookies. This keeps the marketplace fully functional with zero external dependencies (and works in iframe/embed contexts via CHIPS cookies). Supabase Auth (GoTrue) can be layered on later if you want social login / OTP — the `User` table maps 1:1 onto `auth.users` in that migration.

Other production notes:
- **Environment** — `NEXT_PUBLIC_SITE_URL` (canonical URL for metadata/OG images).
- **Seed admin** — run the seed script against production, then change the demo passwords.

## Security notes

- Passwords: scrypt with per-user salt (never stored in plain text)
- Sessions: opaque tokens in httpOnly cookies, 30-day expiry, revoked on logout
- Session cookie: `SameSite=None; Secure; Partitioned` (CHIPS) — required so
  the app works when embedded in cross-site iframes (e.g. web preview panels).
  `SameSite=Lax` cookies are rejected by browsers in third-party iframe
  contexts, which silently breaks every authenticated API call. Chrome accepts
  `Secure` cookies on localhost, and production is always HTTPS.
- API responses carry `Cache-Control: no-store` so a pre-login 401 can never
  be served from browser cache after signing in
- Every API route validates session + role; object-level ownership checks on all mutations
- Uploads validated by file extension **and** magic-number sniffing, 5 MB cap
- Rate limiting on auth, enquiry, and contact endpoints
- Admin financial mutations are audit-logged with actor, entity, and detail

---

## Design system

- Warm ivory background, deep navy text, premium green primary (`oklch` tokens in `globals.css`)
- Fraunces display serif + Inter body
- Fully responsive (mobile-first), 44px touch targets, focus-visible rings, ARIA-labelled interactive elements, semantic landmarks, sticky-footer layout (`min-h-screen flex-col` + `flex-1` main)
- Loading skeletons, empty states, toast feedback, Framer Motion transitions
