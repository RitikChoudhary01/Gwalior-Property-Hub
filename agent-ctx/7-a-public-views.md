# Task 7-a — Public Website + Auth Views (Vasati)

## Scope completed

Created exactly 8 view files under `src/components/marketplace/views/` (replaced stubs, nothing else touched):

| File | Export | Summary |
|---|---|---|
| `home-view.tsx` | `HomeView()` | Hero (`/images/hero.png` + `hero-scrim`, min-h 560px) with overlapping shared `<SearchBar/>` (-mt-20/24); Featured properties (`GET /api/properties?featured=1&pageSize=6`, PropertyCard grid, skip-when-empty); Explore locations (6 city cards, per-city count via parallel `pageSize=1` fetch using `pagination.total`); Recently added (`sort=recent`, eyebrow "Fresh on the market"); Featured projects (`GET /api/projects?pageSize=3`, ProjectCard); Browse by category (5 tiles: Apartment/Flat/Independent House/Villa/Plot with Building2, DoorOpen, Home, Landmark, Map icons); How it works (Buyers 3 steps / Sellers+Builders 4 steps, numbered, icons); Seller CTA band (`bg-foreground text-background`, "List your property" + "Talk to our team"); Builder CTA band (`bg-accent` rounded-2xl). Framer-motion `whileInView` fade-ups (once, -80px margin). All data sections: skeleton loading + silent error fallback (section hidden). No fabricated stats/testimonials. |
| `about-view.tsx` | `AboutView()` | Warm-neutral page hero; "Our mission" prose (curated marketplace, verified listings, transparent commissions — no invented history); 3 value cards (Trust & verification / Buyer-first experience / Transparent business); "How Vasati works" per audience (Buyers/Owners/Builders); CTA band. |
| `contact-view.tsx` | `ContactView()` | Two-column: 4 info cards (BRAND.supportEmail/Phone as mailto/tel links, office Bengaluru Karnataka, hours Mon–Sat 9:30 AM – 6:30 PM) + response-time note; validated form (name, email, phone optional, subject Select: Buying/Selling/Builder partnership/Other, message) → `POST /api/contact`; sonner toasts on success/error; inline API error shown verbatim (covers 429 rate-limit messages); success resets form. |
| `legal-view.tsx` | `LegalView({ kind }: { kind: "privacy" \| "terms" })` | Shared layout: header with last-updated date, intro paragraph, numbered prose sections (max-w-3xl), cross-link card + contact CTA. Privacy: 7 sections (collect / use / sharing with property representatives / cookies / security / rights / contact). Terms: 10 sections (platform-not-broker, account responsibilities, listing rules, RERA compliance incl. independent verification advice, enquiry & consent, commissions & business model, liability, termination, governing law India, contact). |
| `login-view.tsx` | `LoginView()` | Centered max-w-md card with `<Logo/>`, "Welcome back", email + password with show/hide (aria-labelled icon button); `POST /api/auth/login` → `useAppStore.getState().setUser(user)` + `loadNotifications()` + `loadFavourites()` → toast "Signed in" → navigate `route.query.get("next") ?? "/dashboard"` (only accepts paths starting with "/"); "Forgot password?" mailto; "New to Vasati? Create an account"; "Demo access" dashed card with 4 click-to-fill accounts (admin/buyer/seller/builder with ROLE_LABELS); 401 → inline "Invalid email or password". |
| `register-view.tsx` | `RegisterView()` | 3 selectable role cards (Buyer/Search, Property Owner/Home, Builder/Building2) → form: name, email, phone, city (Select over CITIES), password + confirm with min-8-letter+number hint, conditional required "Company name" for BUILDER; `POST /api/auth/register` → same store wiring → toast → navigate "/dashboard"; API/validation errors inline; Terms/Privacy note linking #/terms #/privacy; initial role read from `route.query.get("role")` (buyer/seller/builder). |
| `list-property-view.tsx` | `ListPropertyView()` | Auth-adaptive sell page. Hero "List Your Property on Vasati" with CTAs. Guest: role prompt card (→ /register?role=seller, → /login?next=/list-property) + 3 benefit cards (Verified buyer enquiries / Free listing / Control availability & pricing). Seller: starter panel with live `GET /api/stats` SellerStats (total/published/pending/enquiries via StatCard, skeletons, graceful error) + "Go to dashboard — Add property" → /dashboard?tab=listings + steps overview. Builder: "Manage projects & inventory" → /dashboard?tab=projects. Buyer/Admin: role note → /contact. Steps section (create → verification → go live → track & close) with "Listings are reviewed before going live" + honest RERA note. FAQ Accordion (commission, documents, verification, builders). |
| `partner-view.tsx` | `PartnerView()` | Hero "Grow Sales with the Vasati Partner Network"; 4 value props (Qualified leads with unique references / Site-visit coordination / Inventory & project pages / Transparent commission agreements); 5 partnership steps (Register & verify → Sign agreement → Publish → Attributed leads → Close & reconcile); signed-agreement note (percentage or fixed fee, platform-attributed only, free listing during early access); CTA → /register?role=builder or /dashboard?tab=projects for signed-in builders. |

## Implementation notes for other agents

- All views use `useAppStore` for `navigate`/`route`/`user`; money/labels via `@/lib/format` + `@/lib/constants`; shared components (`PropertyCard`, `ProjectCard`, `SearchBar`, `SectionHeading`, `StatCard`, `Logo`) reused — none recreated.
- The hero `<img>` does NOT need an `@next/next/no-img-element` disable comment in this repo config (that rule reports nothing here); existing unused-disable warnings in shared/* files belong to other agents.
- Avoid synchronous `setState` inside `useEffect` bodies — the repo lints with `react-hooks/set-state-in-effect`. Pattern used: initialize status as "idle", only setState inside promise continuations (see `list-property-view.tsx` `StatsState`).
- Login/Register both wire post-auth exactly as contract specifies; `next` query is validated to start with "/" before navigating.

## Lint / type status

- `bun run lint`: **0 errors**; 5 warnings remain, all in OTHER agents' files (`shared/image-gallery.tsx`, `shared/project-card.tsx`, `shared/property-card.tsx` — unused eslint-disable directives). None of my 8 files produce errors or warnings.
- `bunx tsc --noEmit`: no errors in any of my 8 files.
- Dev server: `GET / 200`, dev.log clean.

## Deviations

- None of substance. Two small judgement calls: (1) hero image loads eagerly (it is above the fold; the contract's lazy-loading rule is for DB-referenced images); (2) `login-view` only honors `next` params starting with "/" (open-path hygiene within the hash router).
