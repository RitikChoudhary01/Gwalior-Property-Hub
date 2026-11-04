#!/usr/bin/env node
// ============================================================
// rollback-db.mjs — restores the Supabase PostgreSQL database
// from a backup file created by backup-db.mjs.
// ============================================================

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
if (!DATABASE_URL.startsWith("postgres")) {
  console.error("✗ DIRECT_URL / DATABASE_URL is missing or invalid in environment.");
  process.exit(1);
}

// Order of deletion (child first) and order of insertion (parent first)
const PARENT_TO_CHILD = [
  "User",
  "Session",
  "Builder",
  "Project",
  "ProjectImage",
  "Property",
  "PropertyImage",
  "PropertyAmenity",
  "PropertyDocument",
  "Favourite",
  "Requirement",
  "Lead",
  "LeadActivity",
  "SiteVisit",
  "SellerAgreement",
  "BuilderAgreement",
  "Transaction",
  "Commission",
  "CommissionPayment",
  "FeaturedListing",
  "Notification",
  "AuditLog",
  "ContactMessage",
  "Setting",
];

const CHILD_TO_PARENT = [...PARENT_TO_CHILD].reverse();

async function main() {
  const backupDir = join(process.cwd(), "backups");
  const files = readdirSync(backupDir).filter((f) => f.startsWith("db-backup-") && f.endsWith(".json"));
  if (files.length === 0) {
    console.error("No backup files found in backups/");
    process.exit(1);
  }

  const targetFile = process.argv[2] ? process.argv[2] : join(backupDir, files.sort().reverse()[0]);
  console.log(`Using backup file: ${targetFile}`);

  const backupData = JSON.parse(readFileSync(targetFile, "utf8"));
  console.log(`Backup timestamp: ${backupData.timestamp}`);

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Postgres. Starting rollback transaction...");

  try {
    await client.query("BEGIN");

    // Clear tables child-first
    for (const table of CHILD_TO_PARENT) {
      await client.query(`DELETE FROM "public"."${table}"`);
      console.log(`  Cleared ${table}`);
    }

    // Insert rows parent-first
    for (const table of PARENT_TO_CHILD) {
      const rows = backupData.tables[table] || [];
      if (rows.length === 0) continue;

      const cols = Object.keys(rows[0]);
      const colNames = cols.map((c) => `"${c}"`).join(", ");

      const BATCH = 40;
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH);
        const values = [];
        const placeholders = [];

        slice.forEach((row, rIdx) => {
          const rowParams = cols.map((col, cIdx) => {
            values.push(row[col]);
            return `$${rIdx * cols.length + cIdx + 1}`;
          });
          placeholders.push(`(${rowParams.join(", ")})`);
        });

        const q = `INSERT INTO "public"."${table}" (${colNames}) VALUES ${placeholders.join(", ")}`;
        await client.query(q, values);
      }
      console.log(`  Restored ${table}: ${rows.length} rows`);
    }

    await client.query("COMMIT");
    console.log("\n✓ Database successfully rolled back to snapshot!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Rollback failed, transaction aborted:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

