// ============================================================
// Notification service — in-app notifications (persisted),
// with email / WhatsApp channel adapters.
//
// Email and WhatsApp Business Cloud API delivery require
// provider credentials (see docs/DEPLOYMENT.md). When they are
// not configured, the channels are skipped gracefully and the
// in-app notification remains the source of truth.
// ============================================================

import "server-only";
import { db } from "@/lib/db";

export type NotificationType =
  | "ENQUIRY"
  | "VISIT"
  | "LISTING"
  | "TRANSACTION"
  | "COMMISSION"
  | "SYSTEM";

interface NotifyInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string; // hash route, e.g. "#/dashboard?tab=enquiries"
}

export async function notify(input: NotifyInput): Promise<void> {
  await db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      link: input.link,
    },
  });
}

/** Fan-out a notification to every platform administrator. */
export async function notifyAdmins(input: Omit<NotifyInput, "userId">): Promise<void> {
  const admins = await db.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  await Promise.all(admins.map((a) => notify({ ...input, userId: a.id })));
}

// ---------- External channel adapters ----------

export type ChannelResult = { channel: string; status: "SENT" | "SKIPPED" | "FAILED"; reason?: string };

/**
 * Email adapter. Configure via env:
 *   EMAIL_PROVIDER_URL, EMAIL_PROVIDER_KEY, EMAIL_FROM
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<ChannelResult> {
  if (!process.env.EMAIL_PROVIDER_URL || !process.env.EMAIL_PROVIDER_KEY) {
    console.log(`[notify:email:skipped] Not configured. Would email "${subject}" to ${to}`);
    return { channel: "email", status: "SKIPPED", reason: "email_provider_not_configured" };
  }
  // Provider integration point — wire your transactional email API here.
  try {
    const res = await fetch(process.env.EMAIL_PROVIDER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EMAIL_PROVIDER_KEY}`,
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html: body }),
    });
    if (!res.ok) return { channel: "email", status: "FAILED", reason: `http_${res.status}` };
    return { channel: "email", status: "SENT" };
  } catch (err) {
    console.error("[notify:email:error]", err);
    return { channel: "email", status: "FAILED", reason: "network_error" };
  }
}

/**
 * WhatsApp Business Cloud API adapter. Configure via env:
 *   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID
 */
export async function sendWhatsApp(phone: string, message: string): Promise<ChannelResult> {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
    console.log(`[notify:whatsapp:skipped] Not configured. Would WhatsApp ${phone}: ${message.slice(0, 80)}`);
    return { channel: "whatsapp", status: "SKIPPED", reason: "whatsapp_not_configured" };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "text",
        text: { body: message },
      }),
    });
    if (!res.ok) return { channel: "whatsapp", status: "FAILED", reason: `http_${res.status}` };
    return { channel: "whatsapp", status: "SENT" };
  } catch (err) {
    console.error("[notify:whatsapp:error]", err);
    return { channel: "whatsapp", status: "FAILED", reason: "network_error" };
  }
}
