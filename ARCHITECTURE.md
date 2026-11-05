# Gwalior Property Hub — System Architecture & Data Flow Guide

This document provides a comprehensive technical overview of the architecture, component hierarchy, data models, state machines, and end-to-end business workflows powering **Gwalior Property Hub**.

---

## 1. High-Level Infrastructure & Topology

The application is architected as an edge-accelerated, serverless full-stack web application hosted on **Vercel** and backed by **Supabase Cloud Infrastructure** (PostgreSQL + S3 Storage).

```mermaid
flowchart TD
    subgraph Client["Client Tier (Browser / Mobile)"]
        UI["React 19 SPA (Zustand Store + Hash Router)"]
        Cache["Browser In-Memory State & Image Cache"]
    end

    subgraph Edge["Vercel Edge Network (Global CDN)"]
        CDN["Edge Caching Layer (stale-while-revalidate 120s)"]
        AssetCDN["Next.js Image Optimization CDN (WebP / AVIF)"]
    end

    subgraph Serverless["Serverless Compute Tier (Mumbai - bom1)"]
        NextAPI["Next.js 16 App Router Serverless Functions"]
        AuthGuard["Auth & Role-Based Access Control (RBAC)"]
        ZodValidator["Zod Input Schema Validation"]
        BundleHandler["Bundled Query Resolvers (/api/home)"]
        PrismaClient["Prisma ORM (Connection Pool = 1)"]
    end

    subgraph SupabaseTier["Supabase Cloud Platform"]
        PgBouncer["PgBouncer Transaction Pooler (:6543)"]
        PostgresDB[("PostgreSQL Database (23 Tables, Relational Indexes)")]
        StorageBucket["Supabase Public Storage Bucket ('uploads')"]
    end

    UI -->|"HTTPS Requests"| Edge
    CDN -->|"Cache Hit (Instant)"| UI
    CDN -->|"Cache Miss / Dynamic Mutate"| NextAPI
    AssetCDN -->|"Optimized Media"| UI
    
    NextAPI --> AuthGuard
    AuthGuard --> ZodValidator
    ZodValidator --> BundleHandler
    BundleHandler --> PrismaClient
    
    PrismaClient -->|"Low-Latency TCP"| PgBouncer
    PgBouncer --> PostgresDB
    NextAPI -->|"Multipart File Upload (Magic Bytes Check)"| StorageBucket
```

---

## 2. End-to-End Business Workflows

Gwalior Property Hub handles the complete Indian real estate brokerage lifecycle in code, strictly enforced server-side.

### A. Property Listing & Verification Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Seller / Builder creates draft
    DRAFT --> PENDING: Submitted for Approval
    PENDING --> REJECTED: Admin rejects (Reason supplied)
    REJECTED --> PENDING: Lister edits & resubmits
    PENDING --> PUBLISHED: Admin approves listing
    PUBLISHED --> RESERVED: Buyer deal in progress
    RESERVED --> PUBLISHED: Deal fell through
    RESERVED --> SOLD: Deal finalized & commission recorded
    PUBLISHED --> SOLD: Direct sale recorded
    SOLD --> [*]
```

---

### B. Lead Generation, Negotiation & Commission Settlement Flow

```mermaid
sequenceDiagram
    autonumber
    actor Buyer
    actor Platform as Gwalior Property Hub (Team/Admin)
    actor Seller as Property Seller / Builder
    participant API as /api Serverless Backend
    participant DB as Supabase PostgreSQL

    Buyer->>API: Enquire / Request Site Visit (/api/leads or /api/site-visits)
    API->>DB: Create Lead & Audit Log (30-day deduplication)
    API-->>Buyer: Booking Reference & Team Contact
    
    Platform->>API: Review Lead CRM & Assign Field Agent
    Platform->>Buyer: Confirm & Conduct Physical Site Visit
    Platform->>Seller: Negotiate Offer & Coordinate Legal Verification
    
    Platform->>API: Create Commission Agreement (e.g., 1.5% of ₹75L)
    API->>DB: Store SellerAgreement with terms
    
    Platform->>API: Record Deal Transaction (/api/admin/transactions)
    API->>DB: Atomically update Property status to 'SOLD'
    API->>DB: Generate Commission Record (Pending settlement)
    
    Seller->>Platform: Pay Platform Brokerage / Commission
    Platform->>API: Record Commission Payment (/api/admin/commissions)
    API->>DB: Verify payment <= balance, update status to 'PAID'
    API->>DB: Log immutable financial audit record
```

---

## 3. Database Entity-Relationship (ER) Architecture

The platform utilizes a structured 23-table relational schema managed through Prisma ORM.

```mermaid
erDiagram
    User ||--o{ Property : "owns / lists"
    User ||--o| Builder : "represents (if builder)"
    User ||--o{ Session : "authenticates with"
    User ||--o{ Lead : "buyer identity"
    User ||--o{ SiteVisit : "schedules"
    User ||--o{ AuditLog : "initiates actions"

    Builder ||--o{ Project : "constructs / manages"
    Project ||--o{ Property : "contains inventory units"
    Project ||--o{ ProjectImage : "showcases"

    Property ||--o{ PropertyImage : "displays"
    Property ||--o{ PropertyAmenity : "features"
    Property ||--o{ Favourite : "saved by buyers"
    Property ||--o{ Lead : "receives enquiries"
    Property ||--o{ SiteVisit : "visited in person"
    Property ||--o| Transaction : "sold via"

    Lead ||--o{ LeadActivity : "timeline notes & calls"
    Lead ||--o| Transaction : "closes deal"
    
    Transaction ||--|| Commission : "accrues brokerage"
    Commission ||--o{ CommissionPayment : "settled through"
```

---

## 4. API & Route Architecture

All business logic and security policies reside strictly on the server across 30+ serverless endpoints:

### Core Route Clusters

| Cluster | Key Routes | Capabilities | Security & Performance |
|---|---|---|---|
| **Public Marketplace** | `GET /api/home`<br>`GET /api/properties`<br>`GET /api/properties/[id]`<br>`GET /api/projects`<br>`GET /api/insights` | Bundled discovery, multi-city filtering (21 cities), ₹/sq.ft price intelligence, full listing details | Edge CDN cached (`s-maxage=60`), bundled parallel DB queries, rate-limited |
| **Authentication & Profile** | `POST /api/auth/register`<br>`POST /api/auth/login`<br>`POST /api/auth/logout`<br>`GET /api/auth/me`<br>`POST /api/auth/change-password` | Scrypt password hashing, session tokens, role issuance, profile management | HttpOnly partitioned CHIPS cookies, constant-time validation |
| **Lister Dashboard** | `POST /api/properties`<br>`PATCH /api/properties/[id]`<br>`DELETE /api/properties/[id]`<br>`POST /api/upload` | Listing builder, image manager with sorting, unit inventory linked to projects | Role-guarded (`SELLER`, `BUILDER`, `ADMIN`), magic byte upload sniffing |
| **CRM & Site Visits** | `POST /api/leads`<br>`PATCH /api/leads/[id]`<br>`POST /api/site-visits`<br>`PATCH /api/site-visits/[id]` | Multi-stage pipeline (`NEW` → `QUALIFIED` → `NEGOTIATION` → `CONVERTED`), visit scheduler | 30-day duplicate lead protection, WhatsApp API notifications |
| **Admin Command Centre** | `GET/POST /api/admin/users`<br>`GET/POST /api/admin/transactions`<br>`GET/POST /api/admin/agreements`<br>`GET/POST /api/admin/commissions`<br>`GET /api/admin/audit-logs` | User verification, listing approval/rejection, transaction records, commission reconciliation | Strictly Admin role-guarded (`requireUser(['ADMIN'])`), immutable audit logging |

---

## 5. Performance Engineering Highlights

1. **Mumbai Serverless Execution (`bom1`):**  
   Configured in `vercel.json` to ensure serverless lambdas run in Mumbai, cutting cross-continental latency for Indian users by **200–300ms**.
2. **Bundle Aggregation (`/api/home`):**  
   Consolidates 5 independent homepage API calls into a single endpoint running parallel database queries in one TCP roundtrip.
3. **Connection Pooling Guard (`connection_limit=1`):**  
   Every serverless function instance is capped to a single connection to prevent connection exhaustion on Supabase's transaction pooler under traffic spikes.
4. **Edge CDN Stale-While-Revalidate:**  
   Public search and discovery payloads are cached at Vercel's global edge network for 60 seconds and served stale for up to 120 seconds while revalidating in the background.

---

## 6. Security & Compliance Measures

- **No Plaintext Secrets:** Passwords hashed with scrypt + salt. Session cookies configured with `HttpOnly`, `SameSite=None`, `Secure`, and `Partitioned` (CHIPS) for iframe/preview compatibility.
- **Strict Role Boundaries:**
  - `BUYER`: Can browse, save favourites, submit requirements, book site visits.
  - `SELLER`: Can manage own property listings and view enquiries.
  - `BUILDER`: Can manage company profile, projects, and unit inventories.
  - `ADMIN`: Full access to moderation, financial records, audit logs, and user verification.
- **Upload Hardening:** Multipart uploads validate MIME headers, file extensions, and inspect binary magic bytes (JPEG `FF D8`, PNG `89 50 4E 47`, WebP `RIFF...WEBP`).
