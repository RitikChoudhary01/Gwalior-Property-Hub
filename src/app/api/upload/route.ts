import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/auth";
import { ok, fail, handle } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  return handle(async () => {
    await requireUser(); // any signed-in user can upload listing assets

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("No file provided.", 422);

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) return fail("Only JPEG, PNG or WebP images are allowed.", 415);
    if (file.size > MAX_SIZE) return fail("File is too large. Maximum size is 5 MB.", 413);
    if (file.size < 1024) return fail("File appears to be empty or corrupted.", 422);

    const bytes = Buffer.from(await file.arrayBuffer());
    // basic magic-number validation
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isWebp = bytes.slice(8, 12).toString("ascii") === "WEBP";
    if (!isJpeg && !isPng && !isWebp) return fail("File content does not match an allowed image type.", 415);

    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}${ext}`;
    await writeFile(path.join(dir, name), bytes);

    return ok({ url: `/uploads/${name}`, name: file.name }, 201);
  });
}
