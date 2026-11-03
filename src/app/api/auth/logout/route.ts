import { NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { handle } from "@/lib/api-helpers";

export async function POST(req: Request) {
  return handle(async () => {
    await destroySession();
    const res = NextResponse.json({ ok: true });
    // Clearing a cookie requires the exact same attributes it was set with
    // (SameSite/Secure/Partitioned) — cookies.delete() drops those and would
    // leave the original in place inside cross-site iframe contexts.
    res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return res;
  });
}

export const dynamic = "force-dynamic";
