#!/usr/bin/env node
// ============================================================
// backup-db.mjs — exports a complete snapshot of all 24 models
// from the Supabase PostgreSQL database into a timestamped JSON
// backup file in backups/.
// ============================================================

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
if (!DATABASE_URL.startsWith("postgres")) {
  console.error("✗ DIRECT_URL / DATABASE_URL is missing or invalid in environment.");
  process.exit(1);
}

const TABLES = [
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

async function main() {
  console.log("Connecting to Postgres...");
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected. Exporting tables...");

  const backupData = {
    timestamp: new Date().toISOString(),
    tables: {},
    summary: {},
  };

  let totalRows = 0;
  for (const table of TABLES) {
    const res = await client.query(`SELECT * FROM "public"."${table}"`);
    backupData.tables[table] = res.rows;
    backupData.summary[table] = res.rows.length;
    totalRows += res.rows.length;
    console.log(`  ✓ ${table}: ${res.rows.length} rows`);
  }

  await client.end();

  const backupDir = join(process.cwd(), "backups");
  mkdirSync(backupDir, { recursive: true });

  const safeTs = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `db-backup-${safeTs}.json`;
  const fullPath = join(backupDir, filename);

  writeFileSync(fullPath, JSON.stringify(backupData, null, 2), "utf8");
  console.log(`\n✓ Backup completed successfully!`);
  console.log(`  File: ${fullPath}`);
  console.log(`  Total rows backed up: ${totalRows}`);
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});

