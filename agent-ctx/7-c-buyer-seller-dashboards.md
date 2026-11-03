# Task 7-c — Buyer & Seller Dashboards + PropertyForm (work record)

Agent: 7-c (buyer/seller dashboards)
Status: COMPLETE — all 3 files written, lint clean, tsc clean, endpoints runtime-verified.

## Files created (exactly the 3 assigned)

1. `src/components/marketplace/views/dashboard/buyer-dashboard.tsx` (replaced placeholder)
2. `src/components/marketplace/views/dashboard/seller-dashboard.tsx` (replaced placeholder)
3. `src/components/marketplace/views/dashboard/property-form.tsx` (new)

## Prop signatures

- `export function BuyerDashboard({ initialTab }: { initialTab?: string })`
- `export function SellerDashboard({ initialTab }: { initialTab?: string })`
- `export function PropertyForm({ property, onSaved, onClose }: { property?: PropertyDetailDTO | null; onSaved: () => void; onClose: () => void })`
  - Designed to be rendered inside `DialogContent className="gap-0 p-0 sm:max-w-3xl"`; renders its own DialogHeader/Title/Description, `max-h-[75vh] overflow-y-auto vasati-scroll` body and a sticky footer (Cancel + Save as draft + Submit for approval).

## Tab shells (both dashboards)

- Tabs: buyer `overview / favourites / enquiries / visits / profile`; seller `overview / listings / enquiries / visits / profile`.
- Mobile: horizontal scrollable pill bar (`vasati-scroll`, full-bleed to container padding). Desktop: left sidebar `w-56` (hidden below `lg`).
- Header "Welcome back, {firstName}" + role eyebrow + subtitle.
- **Tab state is URL-derived** (no useState mirror): `route.query.get("tab") ?? initialTab`, validated against the tab list, default `"overview"`. `selectTab()` → `navigate("/dashboard?tab=x", { replace: true })`. Deep links and external nav work; no effect-based syncing (avoids `react-hooks/set-state-in-effect` errors).

## Data loading

Local `useApiData<T>(path, refreshKey = 0)` hook in each dashboard file (state updates only in async callbacks — stale-while-revalidate on refetch; skeleton loading states; EmptyState + retry on error). Seller passes a `savedAt` refresh key to overview + listings so saving the PropertyForm refreshes counts and cards.

## Implemented mutations (all with toast + refetch, busy spinners)

### Buyer
- `PATCH /api/site-visits/:id {status:"CANCELLED"}` — "Cancel request" on REQUESTED/CONFIRMED/RESCHEDULED upcoming visits, AlertDialog confirm.
- Favourite toggle: handled by `PropertyCard` heart + store; favourites grid is client-filtered by `useAppStore.favourites`, so un-favouriting removes cards instantly without refetch.
- Sign out via store `logout()` + toast.

### Seller — listings (`GET /api/properties?scope=mine&pageSize=24`)
- `POST /api/properties` (draft / submit) — via PropertyForm.
- `PATCH /api/properties/:id` full edit — via PropertyForm (owner edit of PUBLISHED → server re-queues as PENDING; info Alert shown in form).
- `PATCH /api/properties/:id {status:"PENDING"}` — "Submit/Resubmit for approval" on DRAFT/REJECTED/INACTIVE.
- `PATCH /api/properties/:id {status:"INACTIVE"}` — "Deactivate" on PUBLISHED (see deviation note 2).
- `PATCH /api/properties/:id {availability:"SOLD"}` — "Mark as sold" (AlertDialog confirm).
- `DELETE /api/properties/:id` — "Delete listing" (AlertDialog confirm, destructive).
- Rejected listings: rejection reason fetched lazily from `GET /api/properties/:id` (list DTO omits it) and shown inline on the card.
- Edit: list card → `GET /api/properties/:id` (loading state on menu item) → dialog opens with PropertyDetailDTO; dialog keyed by `property.id ?? "new"` so state always resets.

### Seller — enquiries (`GET /api/leads?pageSize=50`)
- `PATCH /api/leads/:id {status:"CONTACTED", markContacted:true}` — "Mark contacted".
- `PATCH /api/leads/:id {status:"LOST"}` — "Mark lost".

### Seller — visits (`GET /api/site-visits?pageSize=50`)
- `PATCH {status:"CONFIRMED"}` — Confirm (REQUESTED/RESCHEDULED).
- `PATCH {status:"RESCHEDULED", preferredDate, preferredTime}` — Reschedule dialog (date input min-today + Select from VISIT_TIME_SLOTS, inline validation).
- `PATCH {status:"CANCELLED"}` — Decline (REQUESTED/RESCHEDULED) / Cancel (CONFIRMED).
- `PATCH {status:"COMPLETED"}` — Mark completed (CONFIRMED).

### PropertyForm
- Sections: Basics / Location (city→state auto, locality from city, collapsible lat-lng) / Details (bhk 1-6 + N/A for Plot, bathrooms, carpet/built-up (+plot for Plot), furnishing, parking 0-4, floorInfo, facing N/E/S/W/diagonals, constructionStatus, possessionDate when UNDER_CONSTRUCTION, ageOfProperty when READY_TO_MOVE, optional RERA) / Amenities chip grid / Photos.
- Photos: drag-drop + click upload zone (accept jpeg/png/webp, ≤5MB, ≤12), per-file `uploadFile(file, pct)` with Progress bars, manager grid with Main radio (first default), move left/right, delete; existing images loaded when editing; save buttons disabled while uploads are in flight.
- Validation: title ≥10, description ≥50 (live counter), price ≥ ₹5,00,000 integer, city/locality/address ≥10, bhk required unless Plot, ≥1 image, area ≥100 when provided, lat/lng range checks. Inline field errors + toast summary.
- Submit: "Submit for approval" + "Save as draft" (new listings and when editing DRAFT/REJECTED — draft PATCHes `status:"DRAFT"`); editing other statuses shows single "Save changes". Body follows the exact POST/PATCH contract (numbers as numbers, `images:[{url,isMain}]`, `amenities:string[]`). API error rendered in a destructive Alert; PUBLISHED-edit info Alert included.

## Deviations / notes

1. **`react-hooks/set-state-in-effect`**: repo lint (eslint-config-next) errors on setState directly inside effect bodies. `useApiData` therefore only sets state in async callbacks, and tab sync is URL-derived instead of effect-synced. Same class of error still exists in OTHER agents' files (properties-view, property-detail-view, admin/parts-shared) — not mine to fix.
2. **Backend bug (not my file)**: `PATCH /api/properties/:id` accepts `status:"INACTIVE"` in its zod schema but the handler only applies DRAFT/PENDING for owners, so `INACTIVE` is silently ignored (verified by curl: 200 + unchanged status). CONTRACTS.md says only PUBLISHED/REJECTED are admin-only, so the route (`src/app/api/properties/[id]/route.ts`, line ~124) should add `"INACTIVE"` to the owner branch. My Deactivate action sends the contract-correct body and **verifies the returned status** — it shows an honest error toast until the backend is fixed, then automatically works.
3. **Buyer cancel button scope**: spec said REQUESTED/CONFIRMED; I also allow cancelling RESCHEDULED upcoming visits (same API permission, same UX intent).
4. **Seller visit actions for RESCHEDULED**: spec listed actions only for REQUESTED/CONFIRMED; RESCHEDULED visits get Confirm + Decline (a rescheduled visit still needs seller acceptance) but no second Reschedule button.
5. **"Mark as sold" visibility**: shown for PUBLISHED/INACTIVE listings that are not already SOLD (marking drafts/pending/rejected as sold is nonsensical).
6. Availability badge on listing cards is shown only when not AVAILABLE (AVAILABLE is the implied default; avoids double badge with status).
7. `<img>` tags intentionally have no `eslint-disable-next-line @next/next/no-img-element` comments — that rule is off in this repo's eslint config, and the directives produce "unused directive" warnings.
8. Buyer overview "Homes buyers are viewing" uses `stats.recentProperties` (top viewed published) as specified.

## Cross-agent observations (FYI)

- While I was verifying, `views/dashboard/admin/parts-shared.tsx` had broken relative imports (`../../shared/…` from `views/dashboard/admin/`) which 500-ed the ENTIRE app (all routes) for ~15 minutes. I did not touch it (not my file); the admin agent fixed it and the app recovered to 200. Other admin part files also import `StatusBadge`/`StatCard` from the wrong modules (TS2305) — check those when integrating.
- Dev-server verified after recovery: `GET /` → 200; seller/buyer stats, favourites, leads, site-visits, mine-listings all return the expected DTO shapes; create-draft → resubmit → delete listing flow exercised end-to-end via curl with the exact PropertyForm body (all temp listings deleted).

## Lint status (my files)

- `bunx eslint buyer-dashboard.tsx seller-dashboard.tsx property-form.tsx` → **0 errors, 0 warnings** (exit 0).
- `bunx tsc --noEmit` → **0 errors** in my 3 files (remaining project errors are in other agents' files: api routes' `audit()` arity, visit-dialog locality type, admin parts-*).
