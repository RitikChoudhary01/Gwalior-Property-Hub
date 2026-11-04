#!/usr/bin/env node
// ============================================================
// migrate-data — carry every row from the local SQLite database
// (db/custom.db) into the Postgres/Supabase database.
//
// `scripts/use-supabase.mjs` pushes the SCHEMA to Supabase; this
// script then migrates ALL existing data — users, sessions,
// builders, projects, properties, images, amenities, favourites,
// requirements, leads, activities, site visits, agreements,
// transactions, commissions, payments, featured listings,
// notifications, audit logs, contact messages, settings.
//
// Safety guarantees:
//   • INSERT ... ON CONFLICT ("id") DO NOTHING  — re-runnable,
//     never overwrites rows already in Postgres, never deletes
//     anything on either side.
//   • The SQLite file is opened READ-ONLY — it can never be
//     modified by this script.
//   • All inserts run inside ONE transaction: either every row
//     lands, or nothing does (rollback on first failure).
//   • Tables are written parent-first so foreign keys always hold.
//
// Type mapping (SQLite → Postgres):
//   • DateTime stored as epoch-ms INTEGER → ISO string → TIMESTAMP(3)
//   • Boolean stored as 0/1 INTEGER       → true/false → BOOLEAN
//
// Usage:
//   bun scripts/migrate-data.mjs                 # live run (needs DATABASE_URL, postgres://…)
//   bun scripts/migrate-data.mjs --dry           # read-only report, no Postgres needed
//   bun scripts/migrate-data.mjs --sqlite=path   # alternate source file
// ============================================================

import { existsSync } from "node:fs";
import { Database } from "bun:sqlite";
import pg from "pg";

// ---------- CLI ----------
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const sqliteArg = args.find((a) => a.startsWith("--sqlite="));
const SQLITE_PATH = sqliteArg ? sqliteArg.split("=").slice(1).join("=") : "db/custom.db";

// Prefer DIRECT_URL (session-mode pooler, :5432) for this script: it wraps
// all inserts in ONE transaction, which PgBouncer's transaction mode
// (DATABASE_URL, :6543) is not designed to carry reliably. Falls back to
// DATABASE_URL when DIRECT_URL is absent (e.g. direct connections).
const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
if (!DRY && !DATABASE_URL.startsWith("postgres")) {
  console.error(
    "✗ DIRECT_URL / DATABASE_URL must be a Postgres connection string.\n" +
      "  Find it: Supabase → Project Settings → Database → Connection string (URI).\n" +
      "  Tip: run `bun scripts/migrate-data.mjs --dry` to preview without a database."
  );
  process.exit(1);
}

// ---------- table specs (write order = FK-safe: parents first) ----------
// bools: SQLite 0/1 → true/false | dates: epoch-ms number → ISO string
const TABLES = [
  {
    table: "User",
    conflict: "id",
    bools: ["isVerified", "isActive"],
    dates: ["createdAt", "updatedAt"],
    cols: ["id", "email", "passwordHash", "name", "phone", "role", "avatarUrl", "city", "isVerified", "isActive", "inviteToken", "createdAt", "updatedAt"],
  },
  {
    table: "Session",
    conflict: "id",
    dates: ["expiresAt", "createdAt"],
    cols: ["id", "userId", "expiresAt", "createdAt"],
  },
  {
    table: "Builder",
    conflict: "id",
    bools: ["isVerified"],
    dates: ["createdAt", "updatedAt"],
    cols: ["id", "userId", "companyName", "description", "logoUrl", "website", "reraNumber", "address", "city", "state", "isVerified", "createdAt", "updatedAt"],
  },
  {
    table: "Project",
    conflict: "id",
    bools: ["featured"],
    dates: ["createdAt", "updatedAt"],
    cols: ["id", "builderId", "name", "slug", "description", "city", "state", "locality", "propertyType", "configuration", "priceMin", "priceMax", "totalUnits", "availableUnits", "reraNumber", "construction", "possessionDate", "amenities", "status", "rejectionReason", "featured", "createdAt", "updatedAt"],
  },
  {
    table: "ProjectImage",
    conflict: "id",
    cols: ["id", "projectId", "url", "caption", "sortOrder"],
  },
  {
    table: "Property",
    conflict: "id",
    bools: ["negotiable", "featured"],
    dates: ["createdAt", "updatedAt"],
    cols: ["id", "title", "slug", "description", "type", "price", "negotiable", "city", "state", "locality", "address", "latitude", "longitude", "bhk", "bathrooms", "carpetArea", "builtUpArea", "plotArea", "furnishing", "parking", "floorInfo", "facing", "constructionStatus", "possessionDate", "ageOfProperty", "reraNumber", "sellerId", "builderId", "projectId", "status", "rejectionReason", "verificationStatus", "availability", "featured", "views", "createdAt", "updatedAt"],
  },
  {
    table: "PropertyImage",
    conflict: "id",
    bools: ["isMain"],
    dates: ["createdAt"],
    cols: ["id", "propertyId", "url", "isMain", "sortOrder", "createdAt"],
  },
  {
    table: "PropertyAmenity",
    conflict: "id",
    cols: ["id", "propertyId", "name"],
  },
  {
    table: "PropertyDocument",
    conflict: "id",
    dates: ["uploadedAt"],
    cols: ["id", "propertyId", "name", "url", "docType", "status", "uploadedAt"],
  },
  {
    table: "Favourite",
    conflict: "id",
    dates: ["createdAt"],
    cols: ["id", "userId", "propertyId", "createdAt"],
  },
  {
    table: "Requirement",
    conflict: "id",
    dates: ["createdAt", "updatedAt"],
    cols: ["id", "reference", "buyerId", "name", "phone", "email", "purpose", "city", "localities", "propertyType", "bhk", "budgetMin", "budgetMax", "notes", "source", "status", "assignedToId", "createdAt", "updatedAt"],
  },
  {
    table: "Lead",
    conflict: "id",
    bools: ["consent"],
    dates: ["followUpDate", "lastContactedAt", "createdAt", "updatedAt"],
    cols: ["id", "reference", "propertyId", "buyerId", "name", "phone", "email", "budget", "message", "source", "status", "assignedToId", "followUpDate", "lastContactedAt", "consent", "createdAt", "updatedAt"],
  },
  {
    table: "LeadActivity",
    conflict: "id",
    dates: ["createdAt"],
    cols: ["id", "leadId", "userId", "type", "note", "createdAt"],
  },
  {
    table: "SiteVisit",
    conflict: "id",
    dates: ["preferredDate", "createdAt", "updatedAt"],
    cols: ["id", "propertyId", "buyerId", "leadId", "preferredDate", "preferredTime", "contactName", "contactPhone", "assignedToId", "status", "notes", "createdAt", "updatedAt"],
  },
  {
    table: "SellerAgreement",
    conflict: "id",
    dates: ["startDate", "endDate", "createdAt", "updatedAt"],
    cols: ["id", "reference", "sellerId", "commissionType", "commissionRate", "fixedFee", "startDate", "endDate", "status", "notes", "createdAt", "updatedAt"],
  },
  {
    table: "BuilderAgreement",
    conflict: "id",
    dates: ["startDate", "endDate", "createdAt", "updatedAt"],
    cols: ["id", "reference", "builderId", "commissionType", "commissionRate", "fixedFee", "startDate", "endDate", "status", "notes", "createdAt", "updatedAt"],
  },
  {
    table: "Transaction",
    conflict: "id",
    dates: ["bookingDate", "completionDate", "createdAt", "updatedAt"],
    cols: ["id", "reference", "leadId", "propertyId", "buyerId", "sellerId", "builderId", "saleValue", "bookingDate", "agreementRef", "status", "completionDate", "notes", "createdAt", "updatedAt"],
  },
  {
    table: "Commission",
    conflict: "id",
    dates: ["dueDate", "createdAt", "updatedAt"],
    cols: ["id", "transactionId", "sellerAgreementId", "builderAgreementId", "commissionType", "rate", "amount", "dueDate", "paidAmount", "status", "createdAt", "updatedAt"],
  },
  {
    table: "CommissionPayment",
    conflict: "id",
    dates: ["paidOn", "createdAt"],
    cols: ["id", "commissionId", "amount", "paidOn", "method", "reference", "recordedById", "createdAt"],
  },
  {
    table: "FeaturedListing",
    conflict: "id",
    bools: ["isActive"],
    dates: ["startDate", "endDate", "createdAt"],
    cols: ["id", "propertyId", "package", "startDate", "endDate", "amount", "isActive", "createdAt"],
  },
  {
    table: "Notification",
    conflict: "id",
    bools: ["isRead"],
    dates: ["createdAt"],
    cols: ["id", "userId", "title", "message", "type", "link", "isRead", "createdAt"],
  },
  {
    table: "AuditLog",
    conflict: "id",
    dates: ["createdAt"],
    cols: ["id", "userId", "action", "entity", "entityId", "details", "createdAt"],
  },
  {
    table: "ContactMessage",
    conflict: "id",
    dates: ["createdAt"],
    cols: ["id", "name", "email", "phone", "subject", "message", "status", "createdAt"],
  },
  {
    table: "Setting",
    conflict: "key",
    cols: ["key", "value"],
  },
];

// ---------- value conversion ----------
function toBool(v) {
  if (v === 1 || v === true) return true;
  if (v === 0 || v === false) return false;
  return Boolean(v); // null-safe fallback (all bool columns are NOT NULL)
}

function toDate(v) {
  if (v == null) return null;
  if (typeof v === "number") return new Date(v).toISOString(); // epoch ms → ISO
  return String(v); // already a text timestamp — Postgres parses it
}

function transformRow(spec, row) {
  const out = {};
  for (const c of spec.cols) {
    const v = row[c] ?? null;
    if (spec.bools?.includes(c)) out[c] = toBool(v);
    else if (spec.dates?.includes(c)) out[c] = toDate(v);
    else out[c] = v;
  }
  return out;
}

// ---------- read source ----------
if (!existsSync(SQLITE_PATH)) {
  console.error(`✗ Source database not found: ${SQLITE_PATH}`);
  process.exit(1);
}

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const report = [];
let grandTotal = 0;

for (const spec of TABLES) {
  const colList = spec.cols.map((c) => `"${c}"`).join(", ");
  let rows;
  try {
    rows = sqlite.query(`SELECT ${colList} FROM "${spec.table}"`).all();
  } catch (err) {
    console.error(`✗ Could not read "${spec.table}" from ${SQLITE_PATH}: ${err.message}`);
    process.exit(1);
  }
  const transformed = rows.map((r) => transformRow(spec, r));
  report.push({ spec, rows: transformed });
  grandTotal += transformed.length;
}

sqlite.close();

// ---------- dry run: report only ----------
if (DRY) {
  console.log(`DRY RUN — ${SQLITE_PATH} → Postgres (no writes performed)\n`);
  for (const { spec, rows } of report) {
    console.log(`  ${spec.table.padEnd(20)} ${String(rows.length).padStart(4)} rows`);
    if (rows.length > 0) {
      const sample = JSON.stringify(rows[0]);
      console.log(`  ${" ".repeat(20)} first: ${sample.length > 160 ? sample.slice(0, 160) + "…" : sample}`);
    }
  }
  console.log(`\n  TOTAL: ${grandTotal} rows would be inserted (ON CONFLICT DO NOTHING — existing rows skipped)`);
  process.exit(0);
}

// ---------- live run ----------
// SSL on for remote hosts (Supabase), off for local Postgres.
const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL);
const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

await client.connect();

const inserted = {};
const skipped = {};
try {
  await client.query("BEGIN");
  for (const { spec, rows } of report) {
    inserted[spec.table] = 0;
    skipped[spec.table] = 0;
    if (rows.length === 0) continue;

    const colList = spec.cols.map((c) => `"${c}"`).join(", ");
    const ph = spec.cols.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO "${spec.table}" (${colList}) VALUES (${ph}) ON CONFLICT ("${spec.conflict}") DO NOTHING`;

    for (const row of rows) {
      const params = spec.cols.map((c) => row[c]);
      try {
        const res = await client.query(sql, params);
        if (res.rowCount && res.rowCount > 0) inserted[spec.table]++;
        else skipped[spec.table]++;
      } catch (err) {
        throw new Error(
          `Failed on "${spec.table}" id=${row[spec.conflict] ?? "?"}: ${err.message}`
        );
      }
    }
  }
  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  await client.end();
  console.error(`\n✗ Migration rolled back — nothing was written. ${err.message}`);
  process.exit(1);
}

// ---------- verification ----------
console.log(`Migrated ${SQLITE_PATH} → Postgres\n`);
for (const { spec } of report) {
  const ins = inserted[spec.table];
  const skip = skipped[spec.table];
  const suffix = skip > 0 ? `, ${skip} skipped (already present)` : "";
  console.log(`  ${spec.table.padEnd(20)} ${ins} inserted${suffix}`);
}

const finalCounts = {};
for (const { spec } of report) {
  const r = await client.query(`SELECT COUNT(*)::int AS c FROM "${spec.table}"`);
  finalCounts[spec.table] = r.rows[0].c;
}
console.log("\nPostgres now contains:");
for (const { spec } of report) {
  console.log(`  ${spec.table.padEnd(20)} ${finalCounts[spec.table]} rows`);
}

await client.end();
console.log(`\n✓ Done — ${grandTotal} source rows processed, nothing deleted or overwritten.`);
