# Vasati — Agent Contracts (READ FIRST)

You are building part of **Vasati**, a premium Indian real-estate marketplace SPA.
The app runs on Next.js 16 App Router at the single route `/` (`src/app/page.tsx` → `src/components/marketplace/app.tsx`), using **hash-based routing**: views are switched by `useAppStore` (Zustand). All data comes from real API routes backed by Prisma + SQLite.

## Global rules for every agent

1. **Only create/overwrite the exact files assigned to you.** Never modify shared files (`app.tsx`, `navbar.tsx`, `footer.tsx`, `store/*`, `lib/*`, `shared/*`, `prisma/*`, `layout.tsx`, `globals.css`, `page.tsx`).
2. Every view component: `"use client"` at top; named export exactly as specified; default props match the stub signature.
3. Use **existing shadcn/ui components** from `@/components/ui/*` (button, card, input, label, textarea, select, dialog, sheet, tabs, table, badge, skeleton, dropdown-menu, popover, tooltip, avatar, checkbox, switch, separator, scroll-area, alert, alert-dialog, progress, pagination, sonner toast via `import { toast } from "sonner"`). Do NOT install packages.
4. Styling: Tailwind classes + design tokens (`bg-background`, `text-foreground`, `text-primary`, `bg-card`, `text-muted-foreground`, `bg-muted`, `bg-accent`, `border-border`). Headings use `font-display` (Fraunces serif). Body uses default sans. **No blue/indigo. No gradients except subtle image scrims (`hero-scrim` class exists).**
5. Icons: `lucide-react`. No emojis anywhere.
6. Money: `formatPrice` (₹1.25 Cr / ₹85 Lac), `formatPriceFull` (₹1,45,00,000), `formatPriceRange`, `formatArea`, `formatDate`, `formatDateTime`, `formatRelative`, `formatMonthYear`, `formatNumber`, `formatConfig`, `initials` from `@/lib/format`.
7. Domain constants from `@/lib/constants`: `CITIES` (city/state/localities), `PROPERTY_TYPES`, `FURNISHINGS`, `CONSTRUCTION_STATUSES` ({value,label}), `PROPERTY_STATUSES`, `LEAD_STATUSES` ({value,label,tone}), `VISIT_STATUSES`, `PROJECT_STATUSES`, `TRANSACTION_STATUSES`, `AMENITIES`, `BUDGET_OPTIONS`, `POSSESSION_PERIODS`, `VISIT_TIME_SLOTS`, `BRAND`, `ROLE_LABELS`, `ROLES`.
8. Shared types from `@/lib/types` (DTOs listed below). API client: `api<T>(path, init?)` and `uploadFile(file, onProgress)` from `@/lib/api-client` (throws `ApiError` with `.status`).
9. Navigation: `const navigate = useAppStore((s) => s.navigate); navigate("/properties?city=Mumbai")`. Current route: `const route = useAppStore((s) => s.route)` (`route.query.get("city")`, `route.segments[1]` etc). Auth user: `const user = useAppStore((s) => s.user)` (`user.role` ∈ "BUYER"|"SELLER"|"BUILDER"|"ADMIN", `user.builderProfile`). Favourites ids: `useAppStore((s) => s.favourites)`. If a guest must be signed-in, toast info + `navigate("/login")`.
10. Shared components already built (import, don't recreate): `PropertyCard` (`@/components/marketplace/shared/property-card`, props `{property: PropertyCardDTO, className?, showViews?}`), `ProjectCard` (`shared/project-card`), `SearchBar` (`shared/search-bar`, hero search), `ImageGallery` (`shared/image-gallery`, `{images: {url, caption?}[], title}`), `EnquiryForm` (`shared/enquiry-form`, `{propertyId, propertyTitle}` — self-contained POST to /api/leads incl. success state), `VisitDialog` (`shared/visit-dialog`, `{property: {id,title,city}, children?}` — wraps a trigger), `SectionHeading` (`shared/section`, `{eyebrow?, title, description?, linkText?, linkHref?, className?}`), `EmptyState` (`shared/section`, `{icon?, title, description?, action?, className?}`), `StatCard` (`shared/section`, `{label, value, sub?, icon?}`), `StatusBadge` (`shared/status-badge`, `{status, className?}` — handles all status enums), `VerifiedBadge` (`shared/status-badge`, `{verified, label?}`), `Logo` (`shared/logo`).
11. Layouts: page sections wrapped in `<section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 …">`. Cards: `rounded-xl border bg-card shadow-sm` with `p-4 sm:p-5`. Gaps `gap-4`/`gap-6`. Long scrollable lists: `max-h-96 overflow-y-auto vasati-scroll`.
12. Responsive: mobile-first (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` etc). Touch targets ≥ 40px.
13. Accessibility: semantic `main`-content sections, `aria-label`s on icon-only buttons, `alt` text on images, label/form associations.
14. TypeScript strict. No `any` unless unavoidable; no unused imports (lint runs with `eslint .` and Next core-web-vitals).
15. Images referenced by URL strings from the DB (`/images/properties/*.png`, `/uploads/*`). Use plain `<img>` with `loading="lazy"` (add `{/* eslint-disable-next-line @next/next/no-img-element */}` above the tag).
16. After writing files, run `bun run lint 2>&1 | tail -40` and fix YOUR files' errors only.
17. Seed demo images available at `/images/properties/`: `ap-living, ap-kitchen, ap-bedroom, ap-bathroom, ap-balcony, ap-building, villa-ext, villa-int, house-ext, plot, township, clubhouse, pool, facade` (`.png`), hero at `/images/hero.png`.

## DTOs (from `@/lib/types`)

- `PropertyCardDTO`: `{ id, slug, title, type, price, city, state, locality, bhk, bathrooms, carpetArea, builtUpArea, plotArea, constructionStatus, availability, status, featured, views, createdAt, mainImage, sellerVerified, sellerName, projectName, builderName }`
- `PropertyDetailDTO`: extends card + `{ description, address, latitude, longitude, negotiable, furnishing, parking, floorInfo, facing, possessionDate, ageOfProperty, reraNumber, rejectionReason, images: {id,url,isMain,sortOrder}[], amenities: string[], seller: {id,name,phone,email,isVerified,memberSince,role}, builder: {id,companyName,isVerified}|null, project: {id,name,slug}|null, similar: PropertyCardDTO[] }`
- `ProjectCardDTO`: `{ id, slug, name, city, state, locality, propertyType, configuration, priceMin, priceMax, totalUnits, availableUnits, construction, possessionDate, reraNumber, status, featured, builderName, builderVerified, mainImage, createdAt }`
- `ProjectDetailDTO`: extends card + `{ description, amenities, rejectionReason, images: {id,url,caption}[], units: PropertyCardDTO[], builder: {id, companyName, isVerified, description, city, website} }`
- `LeadDTO`: `{ id, reference, name, phone, email, budget, message, source, status, followUpDate, lastContactedAt, createdAt, consent, assignedTo: {id,name}|null, buyerId, property: {id,slug,title,city,locality,price,mainImage,ownerName,ownerRole}, _count?: {activities, visits} }`
- `LeadActivityDTO`: `{ id, type, note, createdAt, user: {id,name}|null }`
- `SiteVisitDTO`: `{ id, preferredDate, preferredTime, contactName, contactPhone, status, notes, createdAt, buyerId, leadId, property: {id,slug,title,city,locality,mainImage,ownerName} }`
- `NotificationDTO`, `TransactionDTO`, `CommissionDTO` (incl. `payments: {id,amount,paidOn,method,reference}[]`), `AgreementDTO` (`{id, reference, partyType: "SELLER"|"BUILDER", commissionType: "PERCENTAGE"|"FIXED", commissionRate, fixedFee, startDate, endDate, status, notes, partyName, partyId, transactionCount?}`), `AdminUserDTO` (`{id,name,email,phone,role,isVerified,isActive,city,createdAt, builderProfile, _count?: {properties,projects,leads}}`), `AuditLogDTO`, `BuyerStats`, `SellerStats`, `BuilderStats`, `AdminStats`, `Pagination` (`{page,pageSize,total,totalPages}`), `Paginated<T>` (`{data, pagination}`).

## API contracts (all return JSON; errors: `{ error: string }` with 4xx/5xx)

### Auth
- `POST /api/auth/register` `{ name, email, password, phone?, role: "BUYER"|"SELLER"|"BUILDER", companyName? (required for BUILDER) }` → `AuthUser` (200). Sets session cookie.
- `POST /api/auth/login` `{ email, password }` → `AuthUser`
- `POST /api/auth/logout` → `{ ok: true }`
- `GET /api/auth/me` → `AuthUser` (200) or 401. `AuthUser` = `{ id, name, email, phone, role, city, avatarUrl, isVerified, builderProfile: {id, companyName, isVerified, logoUrl, description, website, reraNumber, address, city, state} | null, createdAt }`

### Properties (public)
- `GET /api/properties?scope=public|mine|admin&city&state&locality&type&minPrice&maxPrice&bhk=2,3&bathrooms&furnishing&constructionStatus&verified=1&projectId&featured=1&status(PENDING etc, admin scope)&q&page=1&pageSize=12&sort=recent|price_asc|price_desc` → `Paginated<PropertyCardDTO>`. `scope=mine` (auth: seller/builder) returns own at any status; `scope=admin` (ADMIN) any.
- `GET /api/properties/:idOrSlug` → `PropertyDetailDTO` (published only for guests; owner/admin can view drafts; increments views). Includes `similar[]`.
- `POST /api/properties` (SELLER/BUILDER/ADMIN) `{ title, description, type, price, negotiable?, city, state, locality, address, latitude?, longitude?, bhk?, bathrooms?, carpetArea?, builtUpArea?, plotArea?, furnishing?, parking?, floorInfo?, facing?, constructionStatus?, possessionDate?, ageOfProperty?, reraNumber?, builderId? (BUILDER), projectId? (BUILDER), amenities: string[], images: {url, isMain?}[], draft?: boolean }` → `{ property: PropertyDetailDTO }` (status DRAFT or PENDING).
- `PATCH /api/properties/:id` (owner/admin) — same fields partial + `status?: "PUBLISHED"|"REJECTED"|"DRAFT"|"INACTIVE"` (admin only for PUBLISHED/REJECTED, with `rejectionReason?`), `availability?: "AVAILABLE"|"RESERVED"|"SOLD"`, `featured?: boolean` (admin). Owner edit of a PUBLISHED property → back to PENDING. → `{ property }`
- `DELETE /api/properties/:id` (owner/admin) → `{ ok: true }`

### Projects
- `GET /api/projects?scope=public|mine|admin&city&status&page&pageSize&sort` → `Paginated<ProjectCardDTO>`
- `GET /api/projects/:idOrSlug` → `ProjectDetailDTO` (published for guests)
- `POST /api/projects` (BUILDER/ADMIN) `{ name, description, city, state, locality, propertyType, configuration?, priceMin?, priceMax?, totalUnits?, availableUnits?, reraNumber?, construction, possessionDate?, amenities?, images: {url, caption?}[], draft? }` → `{ project }`
- `PATCH /api/projects/:id` (owner builder/admin) — partial fields + `status?: "PUBLISHED"|"REJECTED"|"INACTIVE"` (admin) → `{ project }`
- `DELETE /api/projects/:id` → `{ ok: true }`

### Uploads
- `POST /api/upload` (auth) multipart `file` (jpeg/png/webp ≤ 5MB) → `{ url: "/uploads/xxx.jpg", name }`. Use `uploadFile()` helper (supports progress callback).

### Leads / Enquiries
- `POST /api/leads` (public, rate-limited) `{ propertyId, name, phone, email?, budget?, message?, consent: true }` → `{ reference: "VAS-2025-xxxxxx", duplicate?: boolean }`
- `GET /api/leads?status&q&assignedTo=me|all&propertyId&page=1&pageSize=20` → role-scoped `Paginated<LeadDTO>` (ADMIN: all; SELLER/BUILDER: leads on own listings; BUYER: own enquiries).
- `GET /api/leads/:id` → `{ lead: LeadDTO, activities: LeadActivityDTO[], visits: SiteVisitDTO[] }` (admin or listing owner or own-buyer).
- `PATCH /api/leads/:id` ADMIN `{ status?, assignedToId?, followUpDate?, note?, markContacted?: true }`; SELLER/BUILDER owner: `{ note?, status?: "CONTACTED"|"LOST" }` → `{ lead: LeadDTO }`

### Site visits
- `POST /api/site-visits` (public rate-limited / auth) `{ propertyId, contactName, contactPhone, preferredDate (yyyy-mm-dd), preferredTime, notes? }` → `{ id }`
- `GET /api/site-visits?status&page&pageSize` → role-scoped `Paginated<SiteVisitDTO>` (buyer: own; seller/builder: own listings; admin: all)
- `PATCH /api/site-visits/:id` (seller/builder/admin owner) `{ status?: "CONFIRMED"|"RESCHEDULED"|"COMPLETED"|"CANCELLED", preferredDate?, preferredTime?, notes? }` → `{ visit }`; buyer may PATCH own visit `{ status: "CANCELLED" }`

### Favourites
- `GET /api/favourites` → `{ favourites: string[] }` (auth)
- `POST /api/favourites` `{ propertyId }` → `{ favourited: boolean }` (toggle, auth)
- `GET /api/favourites/properties` → `{ data: PropertyCardDTO[] }`

### Notifications
- `GET /api/notifications` → `{ data: NotificationDTO[], unreadCount }`
- `PATCH /api/notifications` `{ ids?: string[], all?: true }` → `{ ok: true }`

### Dashboard stats (role-aware)
- `GET /api/stats` → BUYER: `BuyerStats`; SELLER: `SellerStats`; BUILDER: `BuilderStats` (401 if guest)

### Contact
- `POST /api/contact` `{ name, email, phone?, subject?, message }` → `{ ok: true }`

### Admin (ADMIN role only)
- `GET /api/admin/stats` → `AdminStats` (KPIs + `leadsByStatus[]`, `leadsByMonth[]` (last 6 months, `{month: "Feb", count}`), `propertiesByCity[]`)
- `GET /api/admin/users?role&q&page&pageSize` → `Paginated<AdminUserDTO>`
- `PATCH /api/admin/users/:id` `{ action: "verify"|"unverify"|"activate"|"deactivate" }` → `{ user: AdminUserDTO }`
- `GET /api/admin/agreements?partyType&status` → `{ data: AgreementDTO[] }`
- `POST /api/admin/agreements` `{ partyType: "SELLER"|"BUILDER", partyId, commissionType: "PERCENTAGE"|"FIXED", commissionRate? (1.0 = 1%), fixedFee?, startDate, endDate?, notes? }` → `{ agreement }`
- `PATCH /api/admin/agreements/:id` `{ status: "ACTIVE"|"TERMINATED"|"DRAFT" }` → `{ agreement }`
- `GET /api/admin/transactions?status&q` → `{ data: TransactionDTO[] }`
- `POST /api/admin/transactions` `{ leadId, saleValue, bookingDate, agreementRef?, notes? }` → `{ transaction }` (server computes commission from the applicable ACTIVE agreement; 409 if none exists; sets lead → CONVERTED)
- `PATCH /api/admin/transactions/:id` `{ status: "COMPLETED"|"CANCELLED"|"CONFIRMED", completionDate? }` → `{ transaction }`
- `GET /api/admin/commissions?status` → `{ data: CommissionDTO[] }`
- `PATCH /api/admin/commissions/:id` `{ action: "record_payment", amount, paidOn?, method?, reference? }` → `{ commission }` (atomic; recomputes PENDING/PARTIAL/PAID)
- `GET /api/admin/audit-logs?entity&page` → `Paginated<AuditLogDTO>`

## Design language

- Palette: warm ivory `bg-background`, deep navy ink `text-foreground`, sophisticated green `primary` (#1D6B4F feel), warm stone secondaries, amber only for "Featured", soft tone badges per status.
- Typography: `font-display` (Fraunces) for h1/h2/h3 & prices; body Inter. Eyebrow labels: `text-xs font-semibold uppercase tracking-[0.18em] text-primary`.
- Hero: full-bleed image with `hero-scrim` overlay, white text, search bar card overlapping bottom.
- Cards hover: `hover:-translate-y-1 hover:shadow-lg transition-all duration-300`.
- Framer Motion: subtle only (`whileInView` fade/rise with `viewport={{ once: true, margin: "-80px" }}`, `duration: 0.5`). No bounce/parallax.
- Dashboard: left sidebar nav (desktop) / horizontal scrollable tab bar (mobile), KPI `StatCard` grid, tables with `Table` components inside cards, dialogs for forms.
- Empty states always use `EmptyState` with a helpful CTA.

## Demo accounts (seeded; surface on the login screen in a tasteful "Demo access" card)

- `admin@vasati.in` / `Admin@123` — Platform admin
- `buyer@vasati.in` / `Buyer@123` — Buyer (Priya Sharma)
- `seller@vasati.in` / `Seller@123` — Seller (Sunita Rao)
- `builder@vasati.in` / `Builder@123` — Builder (Meridian Developers)
