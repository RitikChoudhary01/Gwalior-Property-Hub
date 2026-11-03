// ============================================================
// Test harness — simulates the Z.ai preview panel environment:
// a top-level page on localhost embedding the app's HTTPS
// gateway URL in a CROSS-SITE iframe. Cookies set by the iframe
// are third-party; this is where SameSite=Lax sessions broke.
// Port: 3031 (fixed).
//
// The harness also exposes a form that POSTs login credentials
// with target=the iframe, so the Set-Cookie lands in the same
// third-party cookie partition the embedded app would use —
// this lets us verify session cookies work in iframe context
// even though synthetic clicks can't reach cross-origin frames.
// ============================================================

import { serve } from "bun";

const PORT = 3031;
const APP_URL = process.env.APP_URL ?? "https://preview-chat-c01ba57d-d6b7-4885-9e00-76df66224ffa.space-z.ai";

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Cross-site iframe harness</title>
<style>
  body { margin: 0; font: 14px system-ui; background: #1a1a2e; color: #eee; }
  header { padding: 8px 12px; font-size: 12px; letter-spacing: .5px; }
  iframe { width: 100%; height: calc(100vh - 34px); border: 1px solid #444; background: #fff; }
</style>
</head>
<body>
<header>CROSS-SITE IFRAME HARNESS — top-level: localhost:${PORT} · iframe: ${APP_URL}</header>
<iframe id="app-frame" name="app-frame" src="${APP_URL}/" title="Vasati app under test" allow="clipboard-write"></iframe>
<!-- invisible helper form: POSTs a login into the iframe so the session cookie is set in the third-party partition -->
<form id="login-form" method="POST" action="${APP_URL}/api/auth/login" target="app-frame" style="display:none">
  <input type="hidden" name="email" value="" id="lf-email" />
  <input type="hidden" name="password" value="" id="lf-password" />
</form>
<script>
  // Drive it from the automation console:
  //   iframeLogin(email, password)  → sets cookie in 3P partition, iframe shows JSON reply
  //   iframeGo("/#/dashboard")      → navigate the iframe anywhere in the app
  window.iframeLogin = (email, password) => {
    document.getElementById("lf-email").value = email;
    document.getElementById("lf-password").value = password;
    document.getElementById("login-form").submit();
    return "posted";
  };
  window.iframeGo = (path) => {
    document.getElementById("app-frame").src = "${APP_URL}" + path;
    return "navigated";
  };
</script>
</body>
</html>`;

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/__health") return new Response("ok");
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },
});

console.log(`[iframe-test] harness on http://localhost:${PORT} → iframe: ${APP_URL}`);
