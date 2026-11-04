# Gwalior Property Hub — Indian Real Estate Marketplace

A full-stack property marketplace connecting buyers, property owners (sellers), builders/developers, and a platform administration team — with lead CRM, site-visit management, transaction attribution, and commission tracking.

---

## 1. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router) + TypeScript 5** | SEO-friendly SSR, API route handlers for server-side business logic, type safety |
| UI | **Tailwind CSS 4 + shadcn/ui + Lucide icons + Framer Motion** | Premium, consistent design system with accessible primitives |
| Database | **Prisma ORM** (PostgreSQL-portable schema; SQLite in this environment) | Normalized relational model with FKs, indexes, unique constraints; UUID PKs map 1:1 to Supabase PostgreSQL |
| Auth | Custom session auth (scrypt hashing, httpOnly cookies, DB-backed sessions) | No external dependency; secure, revocable sessions |
| State | **Zustand** (client) + fetch-based API layer | Lightweight, predictable |
| Charts | Recharts | Admin analytics from live data |
| Notifications | In-app (persisted) + email/WhatsApp adapters | Modular channel service, graceful fallback when unconfigured |

**Note on Supabase:** the schema in `prisma/schema.prisma` is written to be PostgreSQL-portable. The one-command switch is `bun scripts/use-supabase.mjs` — it flips the provider to `postgresql`, pushes the 24-table schema to your Supabase project, and **carries over every existing row from `db/custom.db`** (see §8). `db/supabase/migration.sql` contains the equivalent DDL as a manual fallback. Section 5 includes the row-level-security policy set for direct Postgres usage.

## 2. Local Development

```bash
bun install                 # install dependencies
bun run db:push             # create the database schema
bun run db:seed             # seed demo data (users, properties, projects, leads, transactions)
bun run dev                 # start on http://localhost:3000
bun run lint                # code quality
```

Environment variables (`.env`):

```ini
DATABASE_URL=file:/home/z/my-project/db/custom.db   # or: postgresql://... for Supabase

# Optional external notification channels (integrations skip gracefully when unset)
EMAIL_PROVIDER_URL=          # transactional email API endpoint
EMAIL_PROVIDER_KEY=
EMAIL_FROM="Gwalior Property Hub <no-reply@gwaliorpropertyhub.in>"
WHATSAPP_TOKEN=              # WhatsApp Business Cloud API token
WHATSAPP_PHONE_ID=
```

## 3. Demo Accounts (seeded)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@vasati.in` | `Admin@123` |
| Buyer | `buyer@vasati.in` | `Buyer@123` |
| Seller (owner) | `seller@vasati.in` | `Seller@123` |
| Builder | `builder@vasati.in` | `Builder@123` |

Additional seeded users (buyers/owners) share the same passwords by role. The login screen includes one-click demo fill.

## 4. Application Map

The app is served at the single route `/` as a hash-routed SPA (sandbox constraint) — every view maps to the SEO URL structure:

| Hash route | View |
|---|---|
| `#/` | Homepage (hero search, featured, cities, recent, projects, categories, how-it-works, CTAs) |
| `#/properties` | Search + filters (URL-synced query params, pagination, sort, mobile filter drawer) |
| `#/properties/[slug]` | Property detail (gallery, specs, amenities, map link, seller card, WhatsApp, visit scheduler, enquiry form, similar homes) |
| `#/projects`, `#/projects/[slug]` | Builder projects + detail with available units |
| `#/about`, `#/contact`, `#/privacy`, `#/terms` | Content pages |
| `#/login`, `#/register` | Auth (role-selecting registration; `?role=seller` preselects) |
| `#/list-property`, `#/partner` | Seller & builder acquisition pages |
| `#/dashboard` | Role-aware dashboard (tabs: overview, listings/projects/inventory, enquiries, visits, profile) |
| `#/dashboard?tab=…` | Admin: users, properties, projects, leads, visits, transactions, commissions, agreements, audit |

## 5. Security Model

### Server-side authorization (enforced on every API route)

| Capability | Buyer | Seller | Builder | Admin |
|---|---|---|---|---|
| Browse PUBLISHED listings | ✓ | ✓ | ✓ | ✓ |
| Create/edit own listings | — | ✓ | ✓ (own projects/units) | ✓ |
| Approve/reject/feature listings | — | — | — | ✓ |
| View leads | own enquiries | leads on own listings | leads on own listings | all |
| Change lead status | — | CONTACTED, LOST | CONTACTED, LOST | all + assign + follow-up |
| Manage site visits | cancel own | manage on own listings | manage on own listings | all |
| Transactions / commissions / agreements | — | — | — | ✓ (atomic, server-computed) |
| User verification / activation | — | — | — | ✓ (self-lockout blocked) |

Additional protections: scrypt password hashing, httpOnly SameSite cookies, per-IP rate limiting on auth/enquiry/visit/contact endpoints, zod validation on every body, file-type + size + magic-number validation on uploads, duplicate-enquiry window (30 days per phone/property), immutable audit log for all sensitive actions, commission math never trusted from the client, financial mutations wrapped in atomic `$transaction`s.

### Supabase RLS policies (when deploying to Postgres)

```sql
-- enable RLS on the sensitive tables (identifiers are quoted camelCase,
-- exactly as created by db/supabase/migration.sql)
alter table "Property" enable row level security;
alter table "Lead" enable row level security;
alter table "Transaction" enable row level security;
alter table "Commission" enable row level security;

-- public read: only approved, published listings
create policy "public read published properties" on "Property"
  for select using ("status" = 'PUBLISHED');

-- sellers manage only their own listings
create policy "sellers manage own listings" on "Property"
  for all using ("sellerId" = auth.uid()::text) with check ("sellerId" = auth.uid()::text);

-- buyers see their own enquiries
create policy "buyers read own leads" on "Lead"
  for select using ("buyerId" = auth.uid()::text);

-- listing owners see leads on their properties
create policy "owners read own listing leads" on "Lead"
  for select using (
    exists (select 1 from "Property" p where p."id" = "Lead"."propertyId" and p."sellerId" = auth.uid()::text)
  );

-- financial tables: admin-only (checks the app's own "User" table)
create function is_admin() returns boolean
  language sql stable as $$
  select exists (select 1 from "User" where "id" = auth.uid()::text and "role" = 'ADMIN')
  $$;

create policy "admins manage transactions" on "Transaction"
  for all using (is_admin()) with check (is_admin());
create policy "admins manage commissions" on "Commission"
  for all using (is_admin()) with check (is_admin());
```

(Extend the same pattern to the remaining tables: "Favourite", "SiteVisit", "Notification", "Project", agreements. The application itself connects with the service-role key from the server only and enforces authorization in the API routes — RLS is defence-in-depth for direct Postgres access.)

## 6. Revenue Workflow (commission integrity)

1. Buyer submits enquiry → **lead created** with unique reference (e.g. `VAS-2026-380112`), duplicate window enforced, seller + admins notified.
2. Admin works the lead through the CRM (statuses: New → Contacted → Qualified → Site visit → Negotiation → Booking → Converted / Lost).
3. **Agreements** (percentage or fixed fee) are signed with sellers/builders and stored with references — commission rates are never hardcoded.
4. Admin records a transaction against an eligible lead → the server locates the applicable ACTIVE agreement, **computes the commission server-side**, and atomically: creates the transaction, the commission record (due +30 days), marks the lead CONVERTED, and the property SOLD.
5. **Payments** are recorded against commissions with outstanding-amount validation; status flows PENDING → PARTIAL → PAID atomically.
6. Every financial mutation writes an audit-log entry; cancellations atomically reverse commission, lead, and property state.

## 7. Notification Channels

- **In-app** — persisted per-user notifications (bell menu, unread badge), written on enquiry, visit, approval, transaction, and commission events.
- **Email / WhatsApp Business Cloud API** — adapters in `src/lib/notifications.ts` wire to your provider via the env vars above; they log-and-skip when unconfigured (documented integration point, no external workflow tools).

## 8. Production Deployment

### 8a. Supabase project + data preservation (the one-command switch)

The switch **never loses data**. What `bun scripts/use-supabase.mjs` does:

1. Flips the Prisma provider to PostgreSQL (24 identical models) with the official **dual-pooler datasource**: `url = DATABASE_URL` (transaction pooler, `:6543`, `?pgbouncer=true`) for runtime queries and `directUrl = DIRECT_URL` (session pooler, `:5432`) for `db push` / migrations. `DIRECT_URL` is **auto-derived** from `DATABASE_URL` (port swap + pgbouncer param stripped) when not set.
2. `prisma db push` via `DIRECT_URL` — creates every table on Supabase.
3. `scripts/migrate-data.mjs` — connects via `DIRECT_URL` (its single big transaction is exactly what session mode is for) and copies **every existing row** from `db/custom.db` into Supabase using `INSERT … ON CONFLICT ("id") DO NOTHING`. Nothing is ever deleted or overwritten — on either side. The SQLite file itself is opened read-only and remains in the repo, so the demo data is always present in the downloaded project.

Step-by-step:

```bash
# 1. Create a project at https://supabase.com (free tier works)
# 2. Copy the values into .env (see .env.example):
#      Project Settings → API       → SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
#      Project Settings → Database  → DATABASE_URL  (transaction pooler URI, :6543)
#                                     DIRECT_URL    (session pooler URI, :5432 —
#                                     optional, auto-derived when omitted)
#      Replace [YOUR-PASSWORD] with the database password.
# 3. Run the switch:
bun scripts/use-supabase.mjs
# 4. Preview without touching anything: bun scripts/migrate-data.mjs --dry
```

Seeding is opt-in (`--seed`) because the seed script resets the database first — by default your existing data is migrated instead. Re-running the switch is safe: rows already present in Postgres are skipped (`ON CONFLICT DO NOTHING`).

### 8b. VPS deployment (proper server setup)

```bash
# on the server (Ubuntu 22.04+, Node 20+ or Bun 1.1+):
git clone <your-repo> gwalior-property-hub && cd gwalior-property-hub
cp .env.example .env      # fill in Supabase values
bun install
bun scripts/use-supabase.mjs   # schema + data → Supabase (first time only)
bun run build                   # next build → .next/standalone
bun run start                   # serves on :3000 (NODE_ENV=production)
```

Put a TLS reverse proxy in front (Caddy shown — two lines, automatic HTTPS):

```
gwaliorpropertyhub.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

Keep it alive with systemd:

```ini
# /etc/systemd/system/gph.service
[Unit]
Description=Gwalior Property Hub
After=network.target
[Service]
WorkingDirectory=/opt/gwalior-property-hub
ExecStart=/usr/bin/bun run start
Restart=always
Environment=NODE_ENV=production
[Install]
WantedBy=multi-user.target
```

### 8c. Vercel option

`vercel deploy` with the same env vars set in the dashboard (DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Run `bun scripts/use-supabase.mjs` once from your machine to prepare the database — Vercel only needs the env vars.

### 8d. Storage, secrets & backups

1. **Storage:** with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set, `/api/upload` automatically writes listing images to a Supabase Storage bucket (public, name `uploads`, overridable via `SUPABASE_BUCKET`).
2. **Secrets:** keep `DATABASE_URL` and service-role keys out of the repo (`.env` is git-ignored); rotate the `ADMIN` account password immediately after first login.
3. **Backups:** nightly `pg_dump` on the Supabase database, e.g. cron: `0 2 * * * pg_dump "$DATABASE_URL" -Fc -f /var/backups/gph-$(date +\%F).dump`. Your original `db/custom.db` stays in the repo as the demo-data snapshot.
4. **Legal (India):** configure company details in `src/lib/constants.ts` (BRAND), have counsel review `/terms` and `/privacy` copy, and ensure listing rules comply with RERA advertising requirements before go-live.

## 9. Scripts

| Command | Purpose |
|---|---|
| `bun run dev` | Dev server (port 3000) |
| `bun run lint` | ESLint (Next core-web-vitals) |
| `bun run db:push` | Sync schema to database |
| `bun run db:seed` | Reset + seed demo data (destructive — wipes existing rows) |
| `scripts/use-supabase.mjs` | One-command switch to Supabase: schema push + full data carry-over |
| `scripts/migrate-data.mjs` | Copy every row from `db/custom.db` into Postgres (`--dry` to preview) |
| `scripts/gen-images.sh` | Regenerate the property photography set via image-generation CLI |

## 10. Verified End-to-End (browser-tested)

- Guest: browse, search & filters (URL-synced), property/project details, enquiry submission (unique reference), visit scheduling, contact form, registration (all roles), login (all demo accounts).
- Buyer: dashboard KPIs, favourites, enquiries, visits (cancel).
- Seller: stats, listings CRUD actions, enquiries (mark contacted/lost), visit management.
- Builder: company dashboard, projects, inventory, enquiries, visits.
- Admin: KPI analytics, user verification, listing approval → publication, lead CRM (notes/assignment/status), transactions, commission payment recording (PARTIAL → PAID atomic), agreements, audit log.
- Responsive: mobile menu, filter drawer, sticky footer on short pages, natural push on long pages.
