// ============================================================
// Audit trail — every sensitive action (approvals, financial
// records, verification) is recorded immutably.
// ============================================================

import "server-only";
import { db } from "@/lib/db";

export type AuditEntity = "PROPERTY" | "PROJECT" | "USER" | "LEAD" | "REQUIREMENT" | "TRANSACTION" | "COMMISSION" | "AGREEMENT" | "VISIT" | "SETTING";

export async function audit(
  userId: string | null,
  action: string,
  entity: AuditEntity,
  entityId?: string,
  details?: string
): Promise<void> {
  try {
    await db.auditLog.create({
      data: { userId, action, entity, entityId, details },
    });
  } catch (err) {
    console.error("[audit:error]", err);
  }
}
