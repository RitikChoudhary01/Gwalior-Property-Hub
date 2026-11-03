#!/usr/bin/env node
// ============================================================
// use-supabase — switch the Vasati stack onto a Supabase project.
//
// Usage:
//   1. Create a project at https://supabase.com (free tier works)
//   2. Project Settings → API → copy the URL + service_role key
//      Project Settings → Database → copy the connection string
//   3. Run:  bun scripts/use-supabase.mjs
//      (or:  node scripts/use-supabase.mjs)
//
// What it does:
//   • verifies SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL
//     (a Supabase Postgres connection string) are present in the env
//   • flips prisma/schema.prisma to the PostgreSQL provider
//     (identical 23-model schema — Postgres variant kept in
//      db/supabase/schema.prisma with generated DDL in
//      db/supabase/migration.sql as a manual fallback)
//   • `prisma db push` — creates every table on Supabase
//   • optionally seeds demo data with `db:seed` (skip with --no-seed)
//
// Authentication and sessions stay DB-backed (they now live inside
// your Supabase Postgres). Listing uploads are stored in Supabase
// Storage by /api/upload as soon as SUPABASE_URL + key are set.
// ============================================================

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((k) => !process.env[k]);
const dbUrl = process.env.DATABASE_URL ?? "";

if (missing.length) {
  console.error(`✗ Missing env: ${missing.join(", ")}. Set them in .env first.`);
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

console.log("→ Pushing schema to Supabase …");
execSync("bunx prisma db push --accept-data-loss", { stdio: "inherit" });

const seed = !process.argv.includes("--no-seed");
if (seed) {
  console.log("→ Seeding demo data (skip with --no-seed) …");
  try {
    execSync("bun run db:seed", { stdio: "inherit" });
  } catch {
    console.warn("  seed skipped/failed — continue with an empty database");
  }
}

console.log(
  [
    "",
    "✓ Vasati now runs on Supabase.",
    "  • Database:  Supabase Postgres (23 tables)",
    "  • Storage:   Supabase Storage bucket 'uploads' (used by /api/upload)",
    "  • Auth:      DB-backed sessions inside Supabase Postgres",
    "",
    "  Start the app:  bun run dev   (or deploy to Vercel with the same env vars)",
    "",
  ].join("\n")
);
