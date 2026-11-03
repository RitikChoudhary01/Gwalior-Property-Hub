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

export const SESSION_COOKIE = "vasati_session";
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
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  };
}

export type SessionUser = User & { builderProfile: Builder | null };

/** Reads the session cookie, validates it against the DB, returns the user (or null). */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const session = await db.session.findUnique({
      where: { id: token },
      include: { user: { include: { builderProfile: true } } },
    });
    if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;

    return session.user;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
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
