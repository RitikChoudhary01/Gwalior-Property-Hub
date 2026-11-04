# Gwalior Property Hub — System Architecture & Workflow Specification

This document details the architectural foundation, role workflows, database relationships, and deployment procedures for **Gwalior Property Hub** — an assisted real estate marketplace localized for Gwalior, Madhya Pradesh.

---

## 1. High-Level System Architecture

- **Frontend Core**: Next.js 16.1.3 App Router with Turbopack, React 19, TypeScript (strict mode), and Tailwind CSS v4.
- **Routing Paradigm**: Single-Page Application (SPA) with Hash-Based Navigation (`window.location.hash`), preserving fast client-side tab and view transitions without route reloading (`/#/properties`, `/#/projects`, `/#/dashboard?tab=...`).
- **State Management**: Zustand store (`useAppStore`) managing user sessions, search filter parameters, cached property data, and dynamic UI modals.
- **Backend API Routes**: Next.js App Router API handlers (`src/app/api/*`) executing asynchronous validation and database transactions.
- **Database Layer**: Supabase PostgreSQL accessed via Prisma ORM 6.19.2 using connection pooler (`aws-0-ap-southeast-2.pooler.supabase.com:6543`) with direct fallback for migrations.
- **Security & Authentication**: Scrypt password hashing (`s1:salt:hash`), secure `HttpOnly` `SameSite=none` partitioned cookies, and role-based middleware guards (`ADMIN`, `BUILDER`, `SELLER`, `BUYER`).

---

## 2. Platform Role Workflows

### 2.1 Buyer Workflow
1. **Discovery**: Search residential properties and new builder developments across 8 Gwalior localities:
   - City Centre, Thatipur, Morar, Lashkar, Alkapuri, Patel Nagar, Maharaj Bada, DD Nagar.
2. **Filters**: Cascading dropdowns filtering by Property Type (Apartment, Independent House, Villa, Plot), BHK (1 to 5+ BHK), Price Budget Min/Max, and Possession status.
3. **Registration & Login**: Direct self-service registration and login.
4. **Engagement**:
   - Save properties to personal favourites list.
   - Submit property enquiries with preferred contact times.
   - Request physical site visits with preferred dates and notes.
   - Track inquiry status in Buyer Dashboard (`NEW` -> `CONTACTED` -> `SITE_VISIT_SCHEDULED`).

### 2.2 Seller Workflow
1. **Registration & Login**: Direct self-service registration as Individual Seller.
2. **Listing Management**:
   - Add residential properties with photos, pricing, area in sq.ft, locality, amenities, and ownership verification documents.
   - Fresh listings enter `status: "PENDING"`.
   - Admin moderation publishes or requests revisions.
   - Once published, listings appear in public search and Gwalior listings feed.

### 2.3 Builder Workflow
1. **Registration with Approval Gate**:
   - Builders register providing Company Name, RERA Registration Number, Contact, and Experience.
   - New builders are saved with `isVerified: false`.
   - Login attempts before approval display: *"Your builder registration is pending administrator approval."*
2. **Post-Approval Builder Dashboard**:
   - Create Master Projects (e.g. multi-tower residential complexes, gated townships).
   - Add and manage Project Units (specific configurations, pricing, inventory status: `AVAILABLE`, `BOOKED`, `SOLD`).
   - Monitor aggregate lead interest for developments.

### 2.4 Admin Command Centre & CRM
1. **Authentication**: Admin credentials (`admin@vasati.in`).
2. **User Moderation**:
   - Approve or reject pending Builder accounts.
   - Verify or suspend Buyer and Seller accounts.
3. **Listing & Project Moderation**:
   - Review pending property listings and projects.
   - Approve for public publishing or reject with structured feedback.
4. **Assisted Marketplace CRM**:
   - Review all buyer enquiries and site visit requests.
   - Assign internal relationship managers.
   - Update lifecycle stages: `NEW` -> `CONTACTED` -> `SITE_VISIT_SCHEDULED` -> `NEGOTIATION` -> `CLOSED`.
5. **Commission & Transaction Engine**:
   - Log closed property deals.
   - Automatically calculate platform commission (1.5% for individual resale, 2.0% for primary builder projects).
   - Record and reconcile commission payments.

---

## 3. Database Schema Overview (Prisma)

- **`User`**: Core identity table storing roles (`BUYER`, `SELLER`, `BUILDER`, `ADMIN`), hashed credentials, contact details, and `isVerified` flag.
- **`BuilderProfile`**: 1-to-1 extension of `User` holding RERA credentials, company registration, and developer bio.
- **`Property`**: Residential property listings linked to `sellerId`, with geo-coordinates, locality, pricing, BHK, area, amenities, and status (`PENDING`, `APPROVED`, `REJECTED`, `SOLD`).
- **`PropertyImage`**: Multi-image attachments per property with ordering and `isMain` thumbnail designation.
- **`Project`**: Master builder projects linked to `builderId`, containing launch dates, RERA ID, brochure URLs, and project status.
- **`ProjectUnit`**: Individual inventory unit configurations under a master project.
- **`Enquiry`**: Buyer leads and site visit requests linking `buyerId` to `propertyId` or `projectId`.
- **`Commission`**: Financial records tracking deal value, platform percentage, commission amounts, and payment clearance.

---

## 4. Production Build & Deployment

### Build Command:
```bash
bun run build
# OR
npm run build
```

This compiles the Next.js standalone application into `.next/standalone` and executes `scripts/copy-standalone.mjs` to synchronize static assets and public assets into the standalone bundle.

### Running in Production:
```bash
node .next/standalone/server.js
```
The application listens by default on port `3000` (or the port defined by `$PORT`).

