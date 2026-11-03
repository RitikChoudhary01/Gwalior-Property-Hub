// ============================================================
// Cross-site iframe E2E — drives the REAL preview gateway URL
// inside a cross-origin iframe (localhost:3031 harness), exactly
// like the Z.ai preview panel. Verifies that session cookies
// survive the third-party iframe context (SameSite=Lax broke it).
// Run: bun agent-ctx/e2e-scripts/iframe-e2e.ts
// ============================================================

import { chromium } from "/opt/zcode/rt/runtime/node_modules/playwright-core/index.mjs";

const HARNESS = "http://localhost:3031/";
const GATEWAY = "https://preview-chat-c01ba57d-d6b7-4885-9e00-76df66224ffa.space-z.ai";

type Result = { name: string; pass: boolean; info: string };
const results: Result[] = [];
const check = (name: string, pass: boolean, info = "") => {
  results.push({ name, pass, info });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`);
};

const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.agent-browser/browsers/chrome-156.0.8078.80/chrome`,
  headless: true,
  args: ["--no-sandbox"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Load harness with embedded cross-site iframe
  await page.goto(HARNESS, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#app-frame", { timeout: 15000 });
  const appFrame = await (async () => {
    for (let i = 0; i < 40; i++) {
      const f = page.frames().find((fr) => fr.url().includes("space-z.ai"));
      if (f) return f;
      await page.waitForTimeout(500);
    }
    throw new Error("app frame never loaded");
  })();
  await appFrame.waitForSelector("text=Find a Place", { timeout: 30000 });
  check("iframe loads app over HTTPS", appFrame.url().startsWith("https://"));

  // 2. Open the login view by clicking the app's own navbar button (real-user path)
  await appFrame.getByRole("button", { name: "Sign in", exact: true }).click();
  await appFrame.waitForSelector("text=Welcome back", { timeout: 15000 });
  check("login view renders in iframe", true);

  // 3. Fill and submit the login form
  await appFrame.fill('input[type="email"]', "seller@vasati.in");
  await appFrame.fill('input[type="password"]', "Seller@123");
  await appFrame.click('button[type="submit"]');

  // 4. The moment of truth — does the session stick?
  await appFrame.waitForSelector("text=Welcome back, Sunita", { timeout: 20000 });
  const cookies = await page.context().cookies(GATEWAY);
  const session = cookies.find((c) => c.name === "vasati_session") as (typeof cookies)[number] & { partitionKey?: string } | undefined;
  check("session cookie stored in 3rd-party context", !!session,
    session ? `SameSite=${session.sameSite} secure=${session.secure} partitionKey=${session.partitionKey ?? "none"}` : "no cookie found");
  check("cookie is CHIPS-partitioned", !!session?.partitionKey);

  // 5. Dashboard stats must load (this was the RITIK bug)
  await appFrame.waitForSelector("text=TOTAL LISTINGS", { timeout: 20000 });
  const statText = await appFrame.locator("#main").innerText();
  check("seller dashboard stats load in iframe", statText.includes("TOTAL LISTINGS") && statText.includes("PUBLISHED"));
  check("no 'Could not load this section' error", !statText.includes("Could not load"));

  // 6. Click through every seller tab
  const tabs = ["Listings", "Enquiries", "Site visits", "Profile", "Overview"] as const;
  for (const tab of tabs) {
    await appFrame.getByRole("button", { name: tab, exact: true }).first().click();
    await appFrame.waitForTimeout(1800);
    const txt = await appFrame.locator("#main").innerText();
    const noErr = !txt.includes("Could not load this section");
    check(`tab "${tab}" loads`, noErr, noErr ? "" : txt.slice(0, 120));
  }

  // 7. Listings tab specifically (the screenshot bug)
  await appFrame.getByRole("button", { name: "Listings", exact: true }).first().click();
  await appFrame.waitForTimeout(2000);
  const listings = await appFrame.locator("#main").innerText();
  check("Listings tab shows real listings", /listing/i.test(listings) && listings.includes("₹"),
    listings.split("\n").slice(4, 7).join(" | ").slice(0, 100));

  // 8. Reload the iframe — session must survive (cookie, not just client state)
  await page.evaluate(() => { window.iframeGo("/#/dashboard"); });
  await page.waitForTimeout(4500);
  const reloaded = page.frames().find((fr) => fr.url().includes("space-z.ai"));
  await reloaded!.waitForTimeout(1500);
  const reloadText = await reloaded!.locator("#main").innerText().catch(() => "");
  check("session survives full iframe reload",
    reloadText.includes("Welcome back, Sunita") && !reloadText.includes("Could not load"),
    reloadText.includes("Could not load") ? reloadText.slice(0, 100) : "restored from cookie");

  // 9. Authenticated API works from inside the iframe
  const meAfter = await reloaded!.evaluate(async () => (await fetch("/api/auth/me")).status);
  check("authenticated API returns 200 inside iframe", meAfter === 200, `me=${meAfter}`);

  // 10. Register view loads (the exact RITIK entry point) via full navigation
  await page.evaluate(() => { window.iframeGo("/#/register"); });
  await page.waitForTimeout(4000);
  const regFrame2 = page.frames().find((fr) => fr.url().includes("space-z.ai"));
  const regText = await regFrame2!.locator("#main").innerText().catch(() => "");
  check("register view loads in iframe", /create your account/i.test(regText));

  await page.screenshot({ path: "/home/z/my-project/agent-ctx/iframe-final.png" });

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.log("FAILED:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
} finally {
  await browser.close();
}
