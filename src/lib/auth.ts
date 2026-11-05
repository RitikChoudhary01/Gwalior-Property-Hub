// ============================================================
// Server-side authentication — scrypt password hashing,
// DB-backed sessions, httpOnly cookies, role guards.
// Sensitive business logic stays on the server.
// ============================================================

import "server-only";
import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { User, Builder } from "@prisma/client";

export const SESSION_COOKIE = "gph_session";
const SESSION_DAYS = 30;

// ---------- Password hashing (scrypt) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `s1:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [version, salt, hash] = stored.split(":");
    if (version !== "s1" || !salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// ---------- Sessions ----------

export async function createSession(userId: string): Promise<string> {
  const token = `${randomUUID()}.${randomBytes(24).toString("hex")}`;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.session.create({ data: { id: token, userId, expiresAt } });
  return token;
}

export function sessionCookieOptions() {
  // The app is frequently viewed inside cross-site iframes (e.g. the web
  // preview panel). Browsers reject SameSite=Lax cookies in that context,
  // so authenticated APIs would 401 even though the user just signed in.
  // SameSite=None; Secure; Partitioned (CHIPS) works in first-party tabs,
  // cross-site iframes and survives third-party cookie blocking in Chrome.
  // NOTE: protocol detection via X-Forwarded-Proto is unreliable here — the
  // sandbox gateway terminates TLS upstream and forwards plain HTTP — so we
  // always emit the iframe-safe attributes. Chrome accepts Secure cookies
  // on localhost, and production is always HTTPS.
  return {
    httpOnly: true,
    sameSite: "none" as const,
    secure: true,
    partitioned: true,
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  };
}

export type SessionUser = User & { builderProfile: Builder | null };

const sessionCache = new Map<string, { user: SessionUser; expires: number }>();

export function clearSessionCache(token?: string) {
  if (token) sessionCache.delete(token);
  else sessionCache.clear();
}

/** Reads the session cookie, validates it against the DB, returns the user (or null). */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const cached = sessionCache.get(token);
    if (cached && Date.now() < cached.expires) {
      return cached.user;
    }

    const session = await db.session.findUnique({
      where: { id: token },
      include: { user: { include: { builderProfile: true } } },
    });
    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      sessionCache.delete(token);
      return null;
    }

    sessionCache.set(token, { user: session.user, expires: Date.now() + 30_000 });
    return session.user;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    sessionCache.delete(token);
    await db.session.deleteMany({ where: { id: token } });
  }
}

// ---------- Role guards ----------

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Throws AuthError if not signed in or role not permitted. */
export async function requireUser(roles?: string[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("You need to sign in to continue.", 401);
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    throw new AuthError("You do not have permission to perform this action.", 403);
  }
  return user;
}
