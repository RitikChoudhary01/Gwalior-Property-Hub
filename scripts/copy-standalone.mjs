import fs from "node:fs";
import path from "node:path";

try {
  const standaloneNext = path.join(".next", "standalone", ".next");
  const staticSrc = path.join(".next", "static");
  const staticDest = path.join(standaloneNext, "static");
  const publicSrc = "public";
  const publicDest = path.join(".next", "standalone", "public");

  if (fs.existsSync(staticSrc)) {
    fs.mkdirSync(standaloneNext, { recursive: true });
    fs.cpSync(staticSrc, staticDest, { recursive: true });
    console.log("✓ Copied .next/static to .next/standalone/.next/static");
  }

  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true });
    console.log("✓ Copied public to .next/standalone/public");
  }
} catch (err) {
  console.warn("Notice: standalone copy skipped or failed non-critically:", err.message);
}

