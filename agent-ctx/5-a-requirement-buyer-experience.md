# Task 5-a — Buyer "Post Your Requirement" experience

Agent: 5-a (requirement form + buyer-facing surfaces)
Date: 2026-06-15
Status: COMPLETE — eslint clean on my 3 files, `tsc --noEmit` shows zero errors in my files (project has 11 pre-existing errors in OTHER scopes: `agent-ctx/e2e-scripts/*`, `examples/*`, `mini-services/*`, `skills/*`, `src/app/api/team/overview/route.ts`, `shared/visit-dialog.tsx`). End-to-end POST smoke-tested via curl: 201 → `VAS-REQ-2026-333339`, status MATCHED, 1 match @ 94% with reasons.

## Files touched (ONLY these)

1. **CREATED `src/components/marketplace/shared/requirement-form.tsx`**
   - Exports:
     - `RequirementForm({ onPosted?, idPrefix?, className? })` — public form (no auth). POSTs `/api/requirements`, shows inline success state (reference, "advisor will call within 24 hours", instant matches) with duplicate-aware copy. `onPosted(result)` fires on success (dashboard uses it to refetch + auto-expand). `idPrefix` keeps DOM ids unique.
     - `RequirementMatchCard({ match, className? })` — light match card in PropertyCard's visual language (rounded-xl border bg-card, aspect-[4/3] image, price font-display text-xl, BedDouble/Bath/Ruler specs row, emerald `% match` chip, reasons as bg-secondary chips, Vasati Verified badge, click → `navigate(/properties/{slug})`).
     - `RequirementMatchesList({ matches, className? })` — "We found N homes matching your requirement" grid + zero-match reassuring copy.
     - `RequirementPostResult` type (requirement + matches + duplicate?).
   - Form fields (state, no react-hook-form — follows `enquiry-form.tsx` pattern):
     purpose BUY/RENT segmented toggle (REQUIREMENT_PURPOSES + Home/KeyRound icons) · city Select (CITIES, required) · preferred localities toggleable chips (city-specific, reset on city change, joined with ", " for the API) · propertyType Select ("Any" + PROPERTY_TYPES) · BHK Select 1–6 optional · budgetMin/budgetMax Selects (BUDGET_OPTIONS, optional, inline min>max error) · name · phone (regex `^[+\d][\d\s-]{7,14}$`) · email optional · notes Textarea ≤1000 · consent Checkbox (required, defaults true like enquiry form).
   - Contact fields prefilled from `useAppStore(s => s.user)` for any signed-in user (fills only empty fields). Mobile-first: single-column under sm, 44px-friendly targets, full-width submit.
   - Client validation via `toast` (sonner) mirroring server zod rules; loading state on submit button; duplicate (200) treated as success with `toast.info`.

2. **EDITED `src/components/marketplace/views/home-view.tsx`**
   - Added "Post your requirement" CTA section between "How it works" and the Seller CTA band (spec-suggested "before the footer CTA area" slot). Full-width `bg-secondary/40` band, two-column on lg: copy (eyebrow + "Can't find the right home? Tell us what you need." + assisted-model pitch + 3 trust points: Sparkles/PhoneCall/ShieldCheck) beside the form in a card. New imports: `PhoneCall`, `Sparkles`, `RequirementForm`. All existing sections preserved untouched.

3. **EDITED `src/components/marketplace/views/dashboard/buyer-dashboard.tsx`**
   - Registered tab `requirements` (label "My requirements", icon `ClipboardList`) in `TABS` between favourites and enquiries — mobile pill bar + desktop sidebar pick it up automatically via the existing map.
   - New `RequirementsTab`: header with "Post a requirement" button (opens Dialog with `RequirementForm`, sm:max-w-2xl, max-h-[88vh] scroll); list from `GET /api/requirements?pageSize=50` (loading skeletons, ErrorState retry, EmptyState with post CTA); each row = expandable card showing reference, StatusBadge (REQUIREMENT_STATUSES via existing StatusBadge), purpose · config · city (+localities), budget (formatPriceRange), matchCount + topMatch, posted date, notes on expand. Expanding lazy-loads live matches from `GET /api/requirements/[id]` (own `useApiData` instance, skeleton + retry). After posting from the dialog: list refetches and the new requirement auto-expands.
   - Header copy now mentions requirements; file-header tab comment updated. All existing tabs/behaviour preserved.

## API contract consumed (backend untouched)

- `POST /api/requirements` → 201 `{requirement, matches}` | 200 `{..., duplicate:true}` | 422/429 `{error}` (surfaced via toast).
- `GET /api/requirements?pageSize=50` (auth BUYER) → `{items: (RequirementDTO & {matchCount, topMatch})[], total, page, pageSize}`.
- `GET /api/requirements/[id]` (buyer-owner) → `{requirement, matches}` — matches sorted by score desc, used for the expand detail.

## Notes for other agents

- Match cards link to `#/properties/{slug}` via `navigate` — property detail view must handle those slugs (it already does for PropertyCard).
- Requirement status chips use the shared `StatusBadge` (REQUIREMENT_STATUSES tones already wired there).
- `/agent-ctx` at FS root is not writable; records live in `/home/z/my-project/agent-ctx/` (other agents' e2e-scripts are there too).

## Deviations from spec

1. Prefill happens for **any signed-in user**, not strictly BUYER role (matches `enquiry-form.tsx` convention; backend only attaches `buyerId` for BUYER anyway).
2. CTA section placed before the Seller CTA band (spec offered "after featured properties" OR "before the footer CTA area" — chose the latter to keep listing sections' rhythm intact).
3. Empty-state in Requirements tab opens the Dialog form (spec allowed Dialog or home navigation; Dialog keeps the user in context).
