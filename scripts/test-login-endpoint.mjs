async function testLogin() {
  try {
    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@vasati.in", password: "Admin@123" })
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
    console.log("Cookies:", res.headers.get("set-cookie"));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}
testLogin();

