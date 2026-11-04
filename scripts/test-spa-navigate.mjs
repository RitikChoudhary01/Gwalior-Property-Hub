import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("1. Go to homepage");
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  console.log("Homepage url:", page.url());

  console.log("2. Navigate to #/properties");
  await page.evaluate(() => {
    window.location.hash = "#/properties";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  await page.waitForTimeout(2000);
  console.log("After properties navigate:", page.url(), "has h1:", await page.$eval("h1", el => el.textContent).catch(() => "no h1"));

  console.log("3. Navigate to detail view");
  await page.evaluate(() => {
    window.location.hash = "#/properties/demo-spacious-3bhk-apartment-city-centre-gwalior";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  await page.waitForSelector("h1", { timeout: 15000 });
  const h1 = await page.$eval("h1", el => el.textContent);
  console.log("Detail view loaded H1:", h1);

  await browser.close();
}

main().catch(console.error);

