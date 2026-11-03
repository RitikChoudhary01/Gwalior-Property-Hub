# Task 7-b — Property Discovery Views (Vasati)

**Agent:** 7-b (property discovery)
**Status:** Complete — all 4 files written, lint clean, runtime-verified in headless browser.

## Files created (only these 4; nothing else touched)

1. `src/components/marketplace/views/properties-view.tsx` — `PropertiesView()` (search & browse)
2. `src/components/marketplace/views/property-detail-view.tsx` — `PropertyDetailView({ slugOrId })`
3. `src/components/marketplace/views/projects-view.tsx` — `ProjectsView()`
4. `src/components/marketplace/views/project-detail-view.tsx` — `ProjectDetailView({ slugOrId })`

## Architecture notes for other agents

### URL sync pattern (properties-view)
- The hash route query is the **single source of truth** for every filter: `city, locality, type,
  minPrice, maxPrice, bhk (comma list), bathrooms, furnishing, constructionStatus, verified, q, sort, page`.
- `applyFilters(patch)` clones `route.query`, sets/deletes patched keys, **deletes `page`** (reset to 1),
  then `navigate("/properties?...")`. Chips, sort Select and Clear all all go through it.
- `goToPage(p)` only sets/deletes `page`, preserving filters → back/forward + shareable links work.
- `FilterPanel` (one component reused in the desktop sticky sidebar and the mobile left Sheet) keeps a
  local **draft**; it is remounted via `key={panelKey}` (derived from filter params) so URL changes
  (chip removal, back/forward) always resync the draft. Apply carries over `q` + `sort`.
- Bathrooms filter sends a single value (API is `gte`); "3+" chip sends `3`. BHK is an exact-match
  comma list (API `in`), "4+" sends `4`.

### Data-fetch pattern used in ALL 4 views (lint-safe)
The repo lints with `react-hooks/set-state-in-effect` (React hooks v6 rules) — **calling setState
synchronously inside an effect body is an error**. Pattern used instead:

```tsx
const [loaded, setLoaded] = useState<Loaded | null>(null);   // { key, ok:true, ...payload } | { key, ok:false, message }
const loading = loaded?.key !== requestKey;                   // derived, never a setState in the effect
useEffect(() => {
  let cancelled = false;
  api(...).then(res => { if (!cancelled) setLoaded({ key: requestKey, ok: true, ... }); })
          .catch(err => { if (!cancelled) setLoaded({ key: requestKey, ok: false, message }); });
  return () => { cancelled = true; };
}, [deps...]);
```

Detail views key on `slugOrId` (skeleton while `loaded?.key !== slugOrId`, incl. slug transitions
without remount); list views key on `search|#nonce` (nonce enables the Try-again button).
If you write views/dashboard components, reuse this pattern — several dashboard files were failing
lint on this exact rule while I was working.

### API contracts actually exercised (verified live)
- `GET /api/properties?city&locality&type&minPrice&maxPrice&bhk=2,3&bathrooms&furnishing&constructionStatus&verified=1&q&sort=recent|price_asc|price_desc&page&pageSize` → `Paginated<PropertyCardDTO>`
- `GET /api/properties/:slugOrId` → `PropertyDetailDTO` incl. `similar[]`; 404s handled (EmptyState).
- `GET /api/projects?city&construction&page&pageSize` — **note the param is `construction`, not `status`** (public scope).
- `GET /api/projects/:slugOrId` → `ProjectDetailDTO` (`amenities` is a comma string; `units[]`, `builder{}`).
- `POST /api/contact` — **`email` is REQUIRED** by the zod schema, so the project enquiry form has
  name + email + phone + message (spec only listed name/phone/message; deviation forced by the API).

### Key interactions implemented
- Properties: removable active-filter chips (per-BHK-value granularity), Clear all, sort Select,
  mobile Sheet (side left) with active-filter count badge, pagination (Prev/Next + numbered pages
  with ellipsis, max ~7 entries), 6-card skeleton grid, EmptyState with suggestions + clear CTA,
  error EmptyState with Try again (nonce refetch).
- Property detail: breadcrumb (Home/Properties/City/title), share (clipboard + toast), favourite
  toggle (guest → toast.info + navigate /login), gallery, specs grid (BHK…Configuration; Plot area
  shown when `plotArea != null`), amenities chips, styled map block + Google Maps external link
  (lat/lng when present, else locality+city), sticky sidebar with price card, seller block
  (Verified Owner/Builder badge, member since, Show contact reveal, WhatsApp `wa.me/91{10-digit}`),
  VisitDialog full-width trigger, EnquiryForm; **SOLD** → CTAs replaced with "This property is sold" +
  "Browse similar homes"; RERA number or advisory line; views/listed-date strip; similar homes grid.
- Projects: hero strip with honest copy, city chips (All/Bengaluru/Pune/Hyderabad/Noida → `?city=`),
  construction Select (`?construction=`), 9-per-page grid with skeletons, EmptyState, Load more
  appends (guarded against stale keys).
- Project detail: builder eyebrow + VerifiedBadge, badges (construction/possession/featured), gallery
  with captions, Overview, amenities chips (split comma string), "Available homes in this project"
  (PropertyCard grid or EmptyState), sticky sidebar: builder card (description excerpt/city/website)
  + enquiry card (price range, units available of total, possession, project enquiry form →
  `/api/contact` with subject `Project enquiry: {name}`) + Google Maps link + RERA line.

### Deviations from spec (minor, justified)
1. Project enquiry form includes an **email** field — `/api/contact` zod schema requires it.
2. Plot area row shows whenever `plotArea != null` (covers Plot type and villas with plot data).
3. Sticky sidebars additionally get `lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto vasati-scroll`
   so long enquiry forms never get cut off on short viewports.
4. FilterPanel draft sync uses remount-by-key instead of a sync-in-effect setState (lint rule).
5. Projects view syncs `?city=` and `?construction=` into the hash (consistent shareable URLs).

## Verification
- `bunx eslint <my 4 files>` → **0 errors, 0 warnings** (`bun run lint` project-wide: my files clean;
  remaining warnings are unused eslint-disable directives in shared/* owned by other agents).
- `bunx tsc --noEmit` → no errors in my files.
- Headless browser (agent-browser) end-to-end: filtered list (all params), chip removal, back/forward
  URL restore, pagination `?page=2` → Prev back to page 1, mobile sheet open/apply (`?bhk=3` added),
  property detail (all sections, phone reveal, sold-property sidebar), project detail (builder card,
  units, enquiry submitted successfully → success panel), both 404 states. Zero page errors.
- NOTE for whoever integrates: while I worked, the dev server was returning 500 on every route
  because `views/dashboard/admin/parts-shared.tsx` imported `../../shared/section` (wrong depth —
  needs `../../../shared/section`; and `StatusBadge` lives in `shared/status-badge`, not `section`).
  That agent fixed it by the time I finished; mentioning it in case it regresses.

## Seed data observed (useful for QA)
15 published properties across cities; 3 projects (Sthirya Verdant Court Hyderabad, Meridian Skyline
Bengaluru, Meridian Greens Pune); a sold unit exists ("Meridian Skyline — 3 BHK Park-Facing
Residence (Sold)"); `seller@vasati.in / Seller@123` (Sunita Rao), `builder@vasati.in / Builder@123`.
