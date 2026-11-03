# Vasati — Indian Real Estate Marketplace

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

**Note on Supabase:** the schema in `prisma/schema.prisma` is written to be PostgreSQL-portable. To deploy on Supabase, change the datasource provider to `postgresql`, set `DATABASE_URL` to the Supabase connection string, and run `prisma db push` (or `prisma migrate dev` to generate SQL migrations). Section 5 includes the row-level-security policy set for direct Postgres usage.

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
EMAIL_FROM="Vasati <no-reply@vasati.in>"
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
-- enable RLS
alter table properties enable row level security;
alter table leads enable row level security;
alter table transactions enable row level security;
alter table commissions enable row level security;

-- public read: only approved, published properties
create policy "public read published properties" on properties
  for select using (status = 'PUBLISHED');

-- sellers manage only their own listings (auth.uid() = seller_id)
create policy "sellers manage own listings" on properties
  for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

-- buyers see their own enquiries
create policy "buyers read own leads" on leads
  for select using (auth.uid() = buyer_id);

-- listing owners see leads on their properties
create policy "owners read own listing leads" on leads
  for select using (
    exists (select 1 from properties p where p.id = leads.property_id and p.seller_id = auth.uid())
  );

-- financial tables: admin-only (use is_admin() helper checking profiles.role = 'ADMIN')
create function is_admin() returns boolean
  language sql stable as $$ select exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN') $$;

create policy "admins manage transactions" on transactions
  for all using (is_admin()) with check (is_admin());
create policy "admins manage commissions" on commissions
  for all using (is_admin()) with check (is_admin());
```

(Extend the same pattern to the remaining tables: favourites, site_visits, notifications, projects, agreements. Service-role keys must remain server-side only.)

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

1. **Database:** create a Supabase project → set `DATABASE_URL` → switch the Prisma provider to `postgresql` → `bunx prisma db push` (or migrate) → apply the RLS policies from section 5.
2. **Storage:** the upload endpoint writes to `public/uploads`; on Supabase, point it at Supabase Storage buckets (property images / documents) using the service-role key server-side.
3. **Build & run:** `bun run build && bun run start` (or deploy to Vercel — set the env vars in the dashboard).
4. **Secrets:** keep `DATABASE_URL`, provider keys out of the repo; rotate the `ADMIN` account password immediately.
5. **Legal (India):** configure your company details in `src/lib/constants.ts` (BRAND), have counsel review `/terms` and `/privacy` copy, and ensure listing rules comply with RERA advertising requirements before go-live.

## 9. Scripts

| Command | Purpose |
|---|---|
| `bun run dev` | Dev server (port 3000) |
| `bun run lint` | ESLint (Next core-web-vitals) |
| `bun run db:push` | Sync schema to database |
| `bun run db:seed` | Reset + seed demo data |
| `scripts/gen-images.sh` | Regenerate the property photography set via image-generation CLI |

## 10. Verified End-to-End (browser-tested)

- Guest: browse, search & filters (URL-synced), property/project details, enquiry submission (unique reference), visit scheduling, contact form, registration (all roles), login (all demo accounts).
- Buyer: dashboard KPIs, favourites, enquiries, visits (cancel).
- Seller: stats, listings CRUD actions, enquiries (mark contacted/lost), visit management.
- Builder: company dashboard, projects, inventory, enquiries, visits.
- Admin: KPI analytics, user verification, listing approval → publication, lead CRM (notes/assignment/status), transactions, commission payment recording (PARTIAL → PAID atomic), agreements, audit log.
- Responsive: mobile menu, filter drawer, sticky footer on short pages, natural push on long pages.
