# Task 5-c — Property listing completion indicator ("Listing strength" meter)

**File touched (only this one):** `src/components/marketplace/views/dashboard/property-form.tsx`

## What was added

1. **Pure scoring helper at module scope** — `listingCompleteness(form, amenities, imageCount, isPlot): { score, missing }` plus `CompletenessGap` interface (`{ label, points, targetId }`) and `strengthTier(score)` (label + Tailwind classes). No React, no side effects; thresholds mirror the form's own validation hints (title ≥ 10 chars, description ≥ 50, price ≥ ₹5,00,000, address ≥ 10 chars).

2. **Live computation in the component** — `useMemo(() => listingCompleteness(form, amenities, images.length, isPlot), [form, amenities, images.length, isPlot])` → `listingScore`, `listingGaps`, `tier`, `topGaps` (first 3, sorted by points desc). Because it derives from the same React state the form uses (and that state is initialized from `property` in edit mode), the meter reflects loaded values immediately.

3. **Sticky meter UI** — inserted as the FIRST child of the existing scroll container (`vasati-scroll max-h-[75vh] … px-6 py-5`), as `sticky top-0 z-20 -mx-6 px-6 py-3 border-b bg-background/95 backdrop-blur`. It docks to the top of the form's scroll area while filling (below the DialogHeader), adds ZERO height to the dialog (so the sticky footer/submit area can never be pushed off-screen), and works identically on mobile and desktop. Reuses the already-imported `Progress` (with `value={listingScore}`) recolored per tier via `[&_[data-slot=progress-indicator]]:bg-*`.

   Layout: row 1 = Gauge icon + "LISTING STRENGTH" + tier label (left) / `{score}%` (right, tabular-nums); row 2 = Progress bar (h-1.5); row 3 = up to 3 actionable gap chips (pill buttons, `Plus` icon, `text-[11px]`, hover `border-primary/40`) + microcopy. Microcopy: "Complete listings get significantly more buyer enquiries on Vasati." (swapped to "This listing is ready to impress buyers." + a green "All key details filled in" check when nothing is missing).

4. **Chip click → scroll-to-field** via `document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" })`. All target ids already existed (`prop-title`, `prop-price`, `prop-bhk`, `prop-rera`, …) except photos/amenities, so two **additive** `id` attributes were added: `id="prop-photos"` (dropzone div) and `id="prop-amenities"` (amenities group div). No behavior change.

## Weights (total 100)

- **Basics 40:** title 6 · description 6 · type 4 · price 6 · city 6 · locality 6 · address 6
- **Specifications 20:** bhk 7 (counts as done for Plots/"na") · bathrooms 6 · area 7 (any of carpet / built-up / plot-when-Plot non-empty)
- **Details 10:** furnishing 2 · parking 2 · floorInfo 2 · facing 2 · construction status companion 2 (possessionDate when UNDER_CONSTRUCTION, ageOfProperty when READY_TO_MOVE, auto-satisfied for NEW)
- **Photos 15:** 0 → 0 · 1-2 → 8 · 3+ → 15 (gap chip worth 15 / 7)
- **Amenities 8:** 0 → 0 · 1-3 → 5 · 4+ → 8 (gap chip worth 8 / 3)
- **RERA 7:** non-empty

Tier labels: <40 "Just started" (stone) · 40-69 "Getting there" (amber) · 70-89 "Almost complete" (emerald) · ≥90 "Ready to impress" (primary deep emerald). All with dark: variants.

## Deviations from the brief

- Placement: chose "sticky at top of form (below the header)" INSIDE the existing scroll container rather than a separate summary card, because the dialog height budget (`header + 75vh scroll + footer`) has no room for an always-visible extra card on short viewports; the sticky-in-scroll approach is purely additive and never shifts/obscures existing elements.
- Basics thresholds are validation-aligned (not merely non-empty) so the meter never rewards values the form itself would reject on submit (e.g. price < ₹5L). Documented in the helper's JSDoc.
- Imports added: `useMemo` (react), `Check`, `Gauge`, `Plus` (lucide-react — verified to exist). No other files touched; no lint/build run on the project. Dev log checked — clean.
