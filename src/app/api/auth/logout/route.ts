import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { handle } from "@/lib/api-helpers";

export async function POST() {
  return handle(async () => {
    await destroySession();
    const res = NextResponse.json({ ok: true });
    res.cookies.delete("vasati_session");
    return res;
  });
}

export const dynamic = "force-dynamic";
