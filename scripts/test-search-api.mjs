#!/usr/bin/env node
// ============================================================
// test-search-api.mjs — tests all required search scenarios
// against the live Next.js backend API running on port 3000.
// ============================================================

const BASE_URL = "http://localhost:3000";

async function runTest(name, urlPath) {
  try {
    const res = await fetch(`${BASE_URL}${urlPath}`);
    if (!res.ok) {
      console.log(`❌ [FAIL] ${name} — Status: ${res.status}`);
      return false;
    }
    const json = await res.json();
    console.log(`✅ [PASS] ${name}`);
    console.log(`   Path: ${urlPath}`);
    console.log(`   Count: ${json.data ? json.data.length : 'N/A'}, Total: ${json.pagination ? json.pagination.total : 'N/A'}`);
    if (json.data && json.data.length > 0) {
      console.log(`   Sample: "${json.data[0].title}" | Locality: ${json.data[0].locality} | Price: ₹${json.data[0].price} | BHK: ${json.data[0].bhk}`);
    }
    return true;
  } catch (err) {
    console.log(`❌ [ERROR] ${name}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log("=== Testing Real Estate Search API Suite ===\n");

  const tests = [
    {
      name: "1. Search by City (Gwalior)",
      path: "/api/properties?city=Gwalior",
    },
    {
      name: "2. Search by Locality (City Centre, Gwalior)",
      path: "/api/properties?city=Gwalior&locality=City%20Centre",
    },
    {
      name: "3. Search by Locality (Thatipur, Gwalior)",
      path: "/api/properties?city=Gwalior&locality=Thatipur",
    },
    {
      name: "4. Search by Property Type (Villa)",
      path: "/api/properties?city=Gwalior&type=Villa",
    },
    {
      name: "5. Search by Property Type (Plot)",
      path: "/api/properties?city=Gwalior&type=Plot",
    },
    {
      name: "6. Search by BHK (3 BHK in Gwalior)",
      path: "/api/properties?city=Gwalior&bhk=3",
    },
    {
      name: "7. Search by Budget Range (Min ₹30L, Max ₹60L)",
      path: "/api/properties?city=Gwalior&minPrice=3000000&maxPrice=6000000",
    },
    {
      name: "8. Multiple Combined Filters (Gwalior + Flat + 2 BHK + Max ₹35L)",
      path: "/api/properties?city=Gwalior&type=Flat&bhk=2&maxPrice=3500000",
    },
    {
      name: "9. Multiple Combined Filters (Gwalior + Independent House + 3 BHK)",
      path: "/api/properties?city=Gwalior&type=Independent%20House&bhk=3",
    },
    {
      name: "10. Empty Search Results (Unmatched Criteria: 8 BHK in Gwalior)",
      path: "/api/properties?city=Gwalior&bhk=8",
    },
    {
      name: "11. Pagination (Page 1 with pageSize=4)",
      path: "/api/properties?city=Gwalior&page=1&pageSize=4",
    },
    {
      name: "12. Pagination (Page 2 with pageSize=4)",
      path: "/api/properties?city=Gwalior&page=2&pageSize=4",
    },
    {
      name: "13. Featured Listings (Homepage API)",
      path: "/api/properties?featured=1&pageSize=6",
    },
    {
      name: "14. Gwalior Builder Projects API",
      path: "/api/projects?city=Gwalior",
    },
  ];

  let passed = 0;
  for (const t of tests) {
    const ok = await runTest(t.name, t.path);
    if (ok) passed++;
    console.log("");
  }

  console.log(`\n================================`);
  console.log(`Results: ${passed} / ${tests.length} tests passed.`);
  console.log(`================================`);
}

main().catch(console.error);

