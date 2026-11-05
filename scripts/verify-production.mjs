import "dotenv/config";
import { performance } from "perf_hooks";

const BASE_URL = "http://localhost:3000";

async function measure(name, fn) {
  const t0 = performance.now();
  const res = await fn();
  const elapsed = Math.round(performance.now() - t0);
  return { name, elapsed, res };
}

async function run() {
  console.log("=================================================");
  console.log("  Gwalior Property Hub — Production Audit Run");
  console.log("=================================================");

  const results = [];

  // 1. Homepage & Public API Tests
  console.log("\n[1] Testing Public APIs & Caching...");

  // First call (cold)
  const coldSearch = await measure("Properties Search (Cold)", () =>
    fetch(`${BASE_URL}/api/properties?city=Gwalior&take=12`)
  );
  console.log(`  - ${coldSearch.name}: HTTP ${coldSearch.res.status} in ${coldSearch.elapsed}ms`);
  results.push(coldSearch);

  // Second call (hot / cached)
  const hotSearch = await measure("Properties Search (Cached)", () =>
    fetch(`${BASE_URL}/api/properties?city=Gwalior&take=12`)
  );
  console.log(`  - ${hotSearch.name}: HTTP ${hotSearch.res.status} in ${hotSearch.elapsed}ms`);
  results.push(hotSearch);

  // Projects list
  const coldProjects = await measure("Projects List (Cold)", () =>
    fetch(`${BASE_URL}/api/projects?take=10`)
  );
  console.log(`  - ${coldProjects.name}: HTTP ${coldProjects.res.status} in ${coldProjects.elapsed}ms`);
  results.push(coldProjects);

  const hotProjects = await measure("Projects List (Cached)", () =>
    fetch(`${BASE_URL}/api/projects?take=10`)
  );
  console.log(`  - ${hotProjects.name}: HTTP ${hotProjects.res.status} in ${hotProjects.elapsed}ms`);
  results.push(hotProjects);

  // 2. Authentication Flow & Session Speed
  console.log("\n[2] Testing Authentication & Session Caching...");
  const adminEmail = process.env.ADMIN_EMAIL || "admin@vasati.in";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  const loginCall = await measure("Admin Login", () =>
    fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    })
  );
  const cookie = loginCall.res.headers.get("set-cookie") || "";
  console.log(`  - ${loginCall.name}: HTTP ${loginCall.res.status} in ${loginCall.elapsed}ms`);
  results.push(loginCall);

  // Platform stats (role-aware, requires auth)
  const statsCall = await measure("Platform Stats (Authenticated)", () =>
    fetch(`${BASE_URL}/api/stats`, { headers: { Cookie: cookie } })
  );
  console.log(`  - ${statsCall.name}: HTTP ${statsCall.res.status} in ${statsCall.elapsed}ms`);
  results.push(statsCall);

  // Cold session check
  const coldMe = await measure("Auth Session /me (Cold)", () =>
    fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: cookie } })
  );
  console.log(`  - ${coldMe.name}: HTTP ${coldMe.res.status} in ${coldMe.elapsed}ms`);
  results.push(coldMe);

  // Hot session check (in-memory cached session token)
  const hotMe = await measure("Auth Session /me (Cached)", () =>
    fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: cookie } })
  );
  console.log(`  - ${hotMe.name}: HTTP ${hotMe.res.status} in ${hotMe.elapsed}ms`);
  results.push(hotMe);

  // 3. Admin & Protected Endpoints
  console.log("\n[3] Testing Admin Dashboard & Moderation APIs...");
  const adminUsers = await measure("Admin Users List", () =>
    fetch(`${BASE_URL}/api/admin/users`, { headers: { Cookie: cookie } })
  );
  console.log(`  - ${adminUsers.name}: HTTP ${adminUsers.res.status} in ${adminUsers.elapsed}ms`);
  results.push(adminUsers);

  const notifications = await measure("Notifications API", () =>
    fetch(`${BASE_URL}/api/notifications`, { headers: { Cookie: cookie } })
  );
  console.log(`  - ${notifications.name}: HTTP ${notifications.res.status} in ${notifications.elapsed}ms`);
  results.push(notifications);

  // 4. Supabase Storage Cloud Upload
  console.log("\n[4] Testing Supabase Cloud Storage Upload (WebP)...");
  const webpBuffer = Buffer.alloc(256);
  webpBuffer.write("RIFF", 0);
  webpBuffer.writeUInt32LE(248, 4);
  webpBuffer.write("WEBP", 8);
  webpBuffer.write("VP8 ", 12);
  const webpBlob = new Blob([webpBuffer], { type: "image/webp" });
  const form = new FormData();
  form.append("file", webpBlob, "audit-benchmark.webp");

  const uploadCall = await measure("Supabase WebP Cloud Upload", () =>
    fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: form,
    })
  );
  const uploadJson = await uploadCall.res.json().catch(() => ({}));
  console.log(`  - ${uploadCall.name}: HTTP ${uploadCall.res.status} in ${uploadCall.elapsed}ms -> ${uploadJson.url || "N/A"}`);
  results.push(uploadCall);

  console.log("\n=================================================");
  console.log("  Audit Summary:");
  console.log(`  Total Checks: ${results.length}`);
  console.log(`  Passed: ${results.filter((r) => r.res.status < 400).length}`);
  console.log(`  Failed: ${results.filter((r) => r.res.status >= 400).length}`);
  const avgLatency = Math.round(results.reduce((a, b) => a + b.elapsed, 0) / results.length);
  console.log(`  Average Latency: ${avgLatency}ms`);
  console.log("=================================================");
}

run().catch(console.error);

