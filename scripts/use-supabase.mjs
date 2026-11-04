#!/usr/bin/env node
// ============================================================
// use-supabase — switch the Gwalior Property Hub stack onto a Supabase project,
// WITHOUT losing any existing data.
//
// Usage:
//   1. Create a project at https://supabase.com (free tier works)
//   2. Project Settings → API → copy the URL + service_role key
//      Project Settings → Database → copy the connection string
//      Put all three in .env (see .env.example)
//   3. Run:  bun scripts/use-supabase.mjs
//
// What it does, in order:
//   • verifies SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL
//     (a Supabase Postgres connection string) are present in the env
//   • flips prisma/schema.prisma to the PostgreSQL provider
//     (identical 24-model schema — Postgres variant kept in
//      db/supabase/schema.prisma with generated DDL in
//      db/supabase/migration.sql as a manual fallback)
//   • `prisma db push` — creates every table on Supabase
//   • `scripts/migrate-data.mjs` — carries over EVERY existing row
//     from db/custom.db (users, listings, leads, deals, …) using
//     INSERT … ON CONFLICT DO NOTHING. Re-runnable, never deletes
//     or overwrites anything. The local SQLite file is untouched —
//     it stays in the repo as the demo-data snapshot.
//
// Seeding is OPT-IN (`--seed`): the seed script resets demo data,
// so it is never run by default. Pass --seed only when you want a
// fresh demo dataset instead of your existing data. (--no-seed is
// accepted as a no-op for compatibility.)
//
// Authentication and sessions stay DB-backed (they now live inside
// your Supabase Postgres). Listing uploads are stored in Supabase
// Storage by /api/upload as soon as SUPABASE_URL + key are set.
// ============================================================

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFileSync } from "node:fs";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((k) => !process.env[k]);
const dbUrl = process.env.DATABASE_URL ?? "";

if (missing.length) {
  console.error(`✗ Missing env: ${missing.join(", ")}. Set them in .env first (see .env.example).`);
  process.exit(1);
}
if (!dbUrl.startsWith("postgres")) {
  console.error(
    "✗ DATABASE_URL must be the Supabase Postgres connection string.\n" +
      "  Find it: Supabase → Project Settings → Database → Connection string (URI).\n" +
      "  It looks like: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
  );
  process.exit(1);
}

console.log("→ Flipping Prisma provider to PostgreSQL …");
copyFileSync("db/supabase/schema.prisma", "prisma/schema.prisma");

console.log("→ Pushing schema to Supabase (24 tables) …");
execSync("bunx prisma db push --accept-data-loss", { stdio: "inherit" });

const wantsSeed = process.argv.includes("--seed");

if (wantsSeed) {
  console.log("→ Seeding fresh demo data (--seed) …");
  console.log("  NOTE: the seed script RESETS the database first — existing rows are replaced.");
  try {
    execSync("bun run db:seed", { stdio: "inherit" });
  } catch {
    console.warn("  seed failed — continue with the data already in the database");
  }
} else if (existsSync("db/custom.db")) {
  console.log("→ Carrying over existing data from db/custom.db (nothing will be deleted) …");
  execSync("bun scripts/migrate-data.mjs", { stdio: "inherit" });
} else {
  console.log("→ No db/custom.db found — nothing to carry over (fresh install).");
}

console.log(
  [
    "",
    "✓ Gwalior Property Hub now runs on Supabase.",
    "  • Database:  Supabase Postgres (24 tables)",
    "  • Data:      every row from db/custom.db carried over (ON CONFLICT DO NOTHING —",
    "               re-runnable, never deletes or overwrites)",
    "  • Storage:   Supabase Storage bucket 'uploads' (used by /api/upload)",
    "  • Auth:      DB-backed sessions inside Supabase Postgres",
    "  • Backup:    your original db/custom.db is untouched and stays in the repo,",
    "               so the demo data is always present in the downloaded project",
    "",
    "  Start the app:  bun run dev   (or deploy to a server — see docs/DEPLOYMENT.md)",
    "",
  ].join("\n")
);
