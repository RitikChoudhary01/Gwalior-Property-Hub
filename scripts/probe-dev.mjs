async function checkEndpoints() {
  const t0 = Date.now();
  const res1 = await fetch("http://localhost:3000/api/properties?cityCounts=1");
  const data1 = await res1.json();
  console.log("cityCounts:", res1.status, data1, `${Date.now() - t0}ms`);

  const t1 = Date.now();
  const res2 = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@vasati.in", password: "Admin@123" })
  });
  console.log("login:", res2.status, `${Date.now() - t1}ms`);
}

checkEndpoints().catch(console.error);
