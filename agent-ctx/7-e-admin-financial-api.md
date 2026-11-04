# Task 7-e — Admin + Financial API Routes (Vasati)

Agent: 7-e (backend API)
Date: 2026-11-03
Status: COMPLETE — all 10 route files created, tested end-to-end with curl, lint clean for my files.

## Files created (only under src/app/api/admin/)

1. `src/app/api/admin/stats/route.ts` — GET → AdminStats. Role counts, activeProperties (PUBLISHED), pendingApprovals (property+project PENDING), qualified leads (QUALIFIED→CONVERTED), site visits, confirmed transactions (CONFIRMED/COMPLETED), commission aggregates (earned/received/outstanding via `db.commission.aggregate`), leadsByStatus (groupBy), leadsByMonth (last 6 calendar months, JS grouping of createdAt, chronological "Jun"..."Nov"), propertiesByCity (groupBy city where PUBLISHED, count desc, take 8).
2. `src/app/api/admin/users/route.ts` — GET `?role&q&page&pageSize(20)` → Paginated<AdminUserDTO>. include builderProfile + _count{properties,leads,favourites}; project counts merged for builders via `db.project.groupBy({by:["builderId"],_count:true,where:{builderId:{in:[...]}}})`. Search name/email/phone contains, createdAt desc.
3. `src/app/api/admin/users/[id]/route.ts` — PATCH `{action: verify|unverify|activate|deactivate}` → `{user}`. Builder verification kept in sync (user + builderProfile). Self-deactivate/self-unverify blocked (400). Audits USER_VERIFIED/USER_UNVERIFIED/USER_ACTIVATED/USER_DEACTIVATED; notifies user (SYSTEM, #/dashboard). Next 16 async params.
4. `src/app/api/admin/agreements/route.ts` — GET `?partyType&status` merges SellerAgreement (seller{name}) + BuilderAgreement (builder{companyName,user{name}}) into AgreementDTO (transactionCount from _count commissions), createdAt desc. POST validates PERCENTAGE 0<rate≤10 / FIXED fee≥1000 + party existence (SELLER=user role SELLER, BUILDER=builder), creates ACTIVE with agreementReference("SLR"|"BLD"), audit AGREEMENT_CREATED, notifies party user (TRANSACTION, #/dashboard). 201.
5. `src/app/api/admin/agreements/[id]/route.ts` — PATCH `{partyType, status: ACTIVE|TERMINATED|DRAFT}` updates correct table, audit AGREEMENT_STATUS_UPDATED.
6. `src/app/api/admin/transactions/route.ts` — GET `?status&q` → TransactionDTO[] (bookingDate desc; q matches reference/property title/lead ref+name/buyer name). POST = CRITICAL FLOW: lead must exist + status in NEGOTIATION/SITE_VISIT_COMPLETED/BOOKING; no existing transaction for lead; applicable agreement = property.builderId → latest ACTIVE BuilderAgreement else latest ACTIVE SellerAgreement (else 409 "No active commission agreement..."); commission computed SERVER-SIDE (PERCENTAGE round(sale*rate/100), FIXED fixedFee); atomic $transaction: Transaction(CONFIRMED, transactionReference) + Commission(dueDate=booking+30d, PENDING, paidAmount 0) + Lead→CONVERTED + LeadActivity(STATUS_CHANGE "Transaction {ref} recorded — sale value ₹{en-IN formatted}") + Property→SOLD/SOLD. Audit TRANSACTION_CREATED (commission + agreement ref in details). Notifies assignedTo + seller + buyer (TRANSACTION). Returns 201.
7. `src/app/api/admin/transactions/[id]/route.ts` — PATCH `{status, completionDate?}`. CANCELLED: atomic — commission deleteMany (payments cascade), lead→LOST (+activity), property→AVAILABLE/PUBLISHED, transaction→CANCELLED; audits TRANSACTION_CANCELLED + COMMISSION_REVERSED. COMPLETED: completionDate default now. CONFIRMED: status only. Notifies listing owners (seller user + builder user). Already-cancelled guard 409.
8. `src/app/api/admin/commissions/route.ts` — GET `?status=PENDING|PARTIAL|PAID` → CommissionDTO[] (transaction + property{title,city}, payments paidOn desc), createdAt desc.
9. `src/app/api/admin/commissions/[id]/route.ts` — PATCH `{action:"record_payment", amount int>0, paidOn?, method? (default BANK_TRANSFER), reference?}`. amount ≤ outstanding else 400 "Payment exceeds outstanding amount." Atomic $transaction: CommissionPayment(recordedById=admin) + Commission paidAmount increment + status recompute (≥amount→PAID else PARTIAL). Audit COMMISSION_PAYMENT_RECORDED. Returns full CommissionDTO.
10. `src/app/api/admin/audit-logs/route.ts` — GET `?entity&page=1&pageSize=30` → Paginated<AuditLogDTO> (user{name,role}), createdAt desc.

## Patterns followed
- Every handler: `export const dynamic = "force-dynamic"`, wrapped in `handle(async () => {...})`, `await requireUser(["ADMIN"])`, zod bodies via `parseBody`, `audit()` on every mutation, `notify()` where specified. Money math 100% server-side; financial mutations atomic via `db.$transaction`.

## Test results (curl, dev server)
- Auth guards: no cookie → 401; BUYER cookie → 403. Verified for /api/admin/stats.
- stats: `{"totalUsers":8,"buyers":2,"sellers":3,"builders":2,"activeProperties":15,"pendingApprovals":2,"totalLeads":9,"qualifiedLeads":6,"siteVisits":4,"confirmedTransactions":1,"commissionEarned":148000,"commissionReceived":90000,"outstandingCommission":58000,...leadsByMonth Jun→Nov..., propertiesByCity 8 rows}`
- Payment test (commission ddae45a0-...): overpay 70000>68000 → 400 "Payment exceeds outstanding amount."; amount 0 → 422; valid ₹10,000 UPI → paidAmount 80000→90000, status stays PARTIAL, new payment first in list (paidOn desc). REQUIRED TEST PASSED.
- Transaction POST happy path: 16000000 sale on Meridian lead → 201, commission 160000 (1% server-computed), lead CONVERTED, property SOLD; then CANCELLED → commission deleted, property PUBLISHED/AVAILABLE, lead LOST (restored to NEGOTIATION via leads API). Guards: bogus lead 404, ineligible lead status 409, duplicate lead txn 409, saleValue <1000000 422, already-cancelled txn 409.
- Users: self-deactivate/unverify 400, bogus 404, verify/unverify round-trip OK (state restored). Builder users carry `_count.projects` from groupBy (e.g. Sthirya Homes projects:2).
- Agreements: POST validation 422s (missing rate, FIXED 500, rate 15, endDate<startDate), party 404s (bogus seller/builder, non-seller user), PATCH terminate→restore round-trip, GET partyType/status filters, wrong-partyType PATCH 404.
- Filters/pagination: transactions ?status=COMPLETED & ?q=meridian, commissions ?status=PAID (empty), audit-logs ?entity=COMMISSION (total 3), users ?q=sunita & page=2&pageSize=2 (totalPages 4).
- Builder user notifications confirmed delivered (TRANSACTION type: recorded/cancelled/update).
- 0 five-hundred responses from any /api/admin route in dev.log.

## State mutations left on shared DB (intentional, per required tests)
- Commission ddae45a0: paidAmount 90000, PARTIAL (required payment test).
- One CANCELLED test transaction VAS-TXN-2026-81357 + its audit logs/lead activities; lead VAS-2025-000377 restored to NEGOTIATION; its property restored PUBLISHED/AVAILABLE; the created commission was deleted (net-zero commission ledger besides the payment above).
- Seeded transaction VAS-TXN-2025-0007 completionDate restored to exact seeded value 2026-11-01T09:32:45.269Z.
- Buyer Rohan Iyer verify→unverify round-trip (restored to false). Agreement SLR-2025-0001 terminate→restore (ACTIVE).
- KPIs unchanged vs seed: confirmedTransactions 1, commissionEarned 148000, totalLeads 9 (lead statuses back to seed).

## Cross-agent issues observed (NOT mine to fix — do not modify per rules)
1. `src/lib/notifications.ts` has `notify(input: NotifyInput)` (single object), but leads/[id], leads, projects/[id], properties/[id], site-visits routes call `notify(userId, {...})` (two args). TS errors ("Expected 1 arguments, but got 2") and a runtime PrismaClientValidationError (link resolves to legacy String.prototype.link → [object Function]) producing 500s on those routes' notification paths (e.g. PATCH /api/leads/:id after status change — DB update still commits, response is 500). Whoever owns those files should update calls to `notify({ userId, title, message, type, link })`.
2. Lint errors (6) are in concurrently-written frontend files (views/dashboard/admin/*, project-detail-view, properties-view, property-detail-view — react-hooks/set-state-in-effect). My files: 0 errors, 0 warnings.
3. Dev server (bun run dev) died mid-session (~10:04, unrelated to my code — last request was a 200). I restarted it in the background (`nohup bun run dev >> dev.log &`) to restore the preview; it is healthy.
4. NOTE for the admin-dashboard frontend agent: as of 10:10 the whole dev server returns 500 (all routes, incl. pre-existing /api/properties) because `src/components/marketplace/views/dashboard/admin/parts-shared.tsx` (and siblings) import `../../shared/status-badge` and `../../shared/section` — wrong relative depth. From `views/dashboard/admin/` the shared folder is `../../../shared/...` (or use `@/components/marketplace/shared/...`). Once fixed, all routes recover; my admin API endpoints all returned 200 before this compile breakage and are unchanged.

## API consumers (for frontend agent)
- All admin endpoints return exact CONTRACTS shapes. TransactionDTO.commission = `{id,amount,paidAmount,status,commissionType,rate}|null`. AgreementDTO has no createdAt (per types.ts). AdminUserDTO._count = {properties,projects,leads}.
- POST /api/admin/transactions 409 messages are user-displayable: "No active commission agreement for this seller/builder. Create an agreement first." / "A transaction has already been recorded for this lead." / eligibility message.
