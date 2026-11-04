import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, verifyPassword, hashPassword } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[A-Za-z]/, "New password must contain a letter")
    .regex(/\d/, "New password must contain a number"),
});

export async function POST(req: Request) {
  return handle(async () => {
    const sessionUser = await requireUser();
    const body = await parseBody(req, schema);

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, email: true, name: true, passwordHash: true },
    });
    if (!user) return fail("User not found.", 404);

    if (!verifyPassword(body.currentPassword, user.passwordHash)) {
      return fail("Current password is incorrect.", 400);
    }

    const newHash = hashPassword(body.newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await audit(user.id, "PASSWORD_CHANGED", "USER", user.id, `${user.name} (${user.email}) changed their password`);

    return ok({ success: true, message: "Password changed successfully." });
  });
}

export const dynamic = "force-dynamic";

