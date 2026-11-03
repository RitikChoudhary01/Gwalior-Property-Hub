// ============================================================
// API helpers — uniform JSON responses, zod body parsing,
// error handling and a simple in-memory rate limiter.
// ============================================================

import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AuthError } from "@/lib/auth";

// All API responses are dynamic (auth/session-aware) — never let browsers
// or proxies serve them from cache, or a stale 401 could persist after login.
const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data as object, { status, headers: NO_STORE });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: NO_STORE });
}

/** Wraps a route handler with uniform error handling. */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthError) {
      return fail(err.message, err.status);
    }
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return fail(first ? `${first.path.join(".")}: ${first.message}` : "Invalid request data.", 422);
    }
    console.error("[api-error]", err);
    return fail("Something went wrong. Please try again.", 500);
  }
}

/** Parses and validates a JSON body against a zod schema. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new AuthError("Invalid JSON body.", 400);
  }
  return schema.parse(json);
}

// ---------- Rate limiting (in-memory, per-instance) ----------

const buckets = new Map<string, number[]>();

/** Returns true if the request is allowed; false when over the limit. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    buckets.set(key, list);
    return false;
  }
  list.push(now);
  buckets.set(key, list);
  return true;
}

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// periodically clean stale buckets to avoid unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [k, list] of buckets) {
    const fresh = list.filter((t) => now - t < 3600000);
    if (fresh.length === 0) buckets.delete(k);
    else buckets.set(k, fresh);
  }
}, 1800000).unref?.();
