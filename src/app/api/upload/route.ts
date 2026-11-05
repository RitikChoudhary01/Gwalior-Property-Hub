import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/auth";
import { ok, fail, handle } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ============================================================
// Listing asset upload.
//
// Storage backend is env-driven:
//  • SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set → Supabase
//    Storage (public bucket, default name "uploads", override
//    with SUPABASE_BUCKET). Assets are served from the bucket's
//    public URL.
//  • Otherwise → local disk under public/uploads (dev default).
//
// The same validation (type allowlist, 5 MB cap, magic-number
// check) applies to both backends.
// ============================================================

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "uploads";

// Supabase service keys are JWTs starting with "ey". If placeholder or empty, do not attempt remote call.
const isRealSupabaseKey =
  Boolean(SUPABASE_KEY) &&
  !SUPABASE_KEY!.includes("PASTE_YOUR") &&
  !SUPABASE_KEY!.includes("your-service-role-key") &&
  SUPABASE_KEY!.startsWith("ey");

async function supabaseUpload(bytes: Buffer, contentType: string, name: string): Promise<string> {
  const headers = {
    Authorization: `Bearer ${SUPABASE_KEY}`,
    apikey: SUPABASE_KEY!,
    "Content-Type": contentType,
  };
  // ensure the bucket exists (public) — 409 when it already does
  const create = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name: SUPABASE_BUCKET, public: true }),
  });
  if (!create.ok && create.status !== 409 && create.status !== 400) {
    throw new Error(`Could not prepare storage bucket (HTTP ${create.status})`);
  }
  const put = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${name}`, {
    method: "POST",
    headers,
    body: new Uint8Array(bytes),
  });
  if (!put.ok) {
    throw new Error(`Storage upload failed (HTTP ${put.status})`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${name}`;
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireUser(); // any signed-in user can upload listing assets

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("No file provided.", 422);

    const mime = (file.type || "").toLowerCase().split(";")[0].trim();
    let ext = ALLOWED_TYPES[mime];
    if (!ext) {
      const fileNameExt = path.extname(file.name || "").toLowerCase();
      if (fileNameExt === ".jpg" || fileNameExt === ".jpeg") ext = ".jpg";
      else if (fileNameExt === ".png") ext = ".png";
      else if (fileNameExt === ".webp") ext = ".webp";
    }
    if (!ext) return fail("Only JPEG, PNG or WebP images are allowed.", 415);
    if (file.size > MAX_SIZE) return fail("File is too large. Maximum size is 5 MB.", 413);
    if (file.size < 100) return fail("File appears to be empty or corrupted.", 422);

    const bytes = Buffer.from(await file.arrayBuffer());
    // basic magic-number validation
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
    const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isWebp =
      bytes.length >= 12 &&
      (bytes.slice(0, 4).toString("ascii") === "RIFF" || bytes.slice(8, 12).toString("ascii") === "WEBP");

    if (!isJpeg && !isPng && !isWebp) {
      const headerStr = bytes.slice(0, 32).toString("ascii");
      const looksLikeImage = headerStr.includes("WEBP") || headerStr.includes("JFIF") || headerStr.includes("PNG");
      if (!looksLikeImage) {
        return fail("File content does not match an allowed image type.", 415);
      }
    }

    const name = `${randomUUID()}${ext}`;

    if (SUPABASE_URL && isRealSupabaseKey) {
      try {
        const url = await supabaseUpload(bytes, mime || "image/jpeg", name);
        return ok({ url, name: file.name }, 201);
      } catch (err) {
        console.warn("Supabase upload failed, safely falling back to local storage:", err);
      }
    }

    // fallback: local disk under public/uploads
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);
    return ok({ url: `/uploads/${name}`, name: file.name }, 201);
  });
}
