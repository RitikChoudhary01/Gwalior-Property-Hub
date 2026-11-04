import { getSessionUser } from "@/lib/auth";
import { ok, fail, handle } from "@/lib/api-helpers";
import { toAuthUser } from "@/lib/serializers";

export async function GET() {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) return fail("Not signed in.", 401);
    return ok(toAuthUser(user));
  });
}

export const dynamic = "force-dynamic";
