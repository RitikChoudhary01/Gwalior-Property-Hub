import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handle, parseBody, rateLimit, clientIp } from "@/lib/api-helpers";
import { notifyAdmins } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{7,14}$/).optional().or(z.literal("")),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

export async function POST(req: Request) {
  return handle(async () => {
    const ip = clientIp(req);
    if (!rateLimit(`contact:${ip}`, 5, 3600000)) {
      return fail("Too many messages. Please try again later.", 429);
    }

    const body = await parseBody(req, schema);
    await db.contactMessage.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        subject: body.subject || null,
        message: body.message,
      },
    });

    await notifyAdmins({
      title: "Contact form message",
      message: `${body.name} (${body.email}) sent a message${body.subject ? ` — "${body.subject}"` : ""}.`,
      type: "SYSTEM",
      link: "#/dashboard?tab=settings",
    });

    return ok({ ok: true }, 201);
  });
}
