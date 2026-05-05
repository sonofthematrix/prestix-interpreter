/**
 * Server-side membership activation (e.g. after Stripe checkout).
 * Uses ZenStack Subscription with system user so webhooks can create/update for any userId.
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";

const VALID_TIERS = ["essential", "pro", "event_organizer", "elite"] as const;
const VALID_BILLING = ["monthly", "yearly"] as const;

export async function setMembershipForUser(
  userId: string,
  tier: string,
  billingPeriod: string
): Promise<boolean> {
  if (!userId?.trim()) return false;
  if (!VALID_TIERS.includes(tier as (typeof VALID_TIERS)[number])) return false;
  if (!VALID_BILLING.includes(billingPeriod as (typeof VALID_BILLING)[number])) return false;

  const startDate = new Date();
  const expiryDate = new Date(startDate);
  if (billingPeriod === "yearly") {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  } else {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  }

  try {
    const systemUser = await getSystemUser();
    const adminContext = { ...systemUser, role: "PLATFORM_ADMIN" as const };
    const db = createClient(adminContext);

    const existing = await (db as any).subscription.findFirst({
      where: { userId },
      orderBy: { startDate: "desc" },
    });

    if (existing) {
      await (db as any).subscription.update({
        where: { id: existing.id },
        data: { tier, billingPeriod, startDate, expiryDate },
      });
    } else {
      await (db as any).subscription.create({
        data: {
          userId,
          tier,
          billingPeriod,
          startDate,
          expiryDate,
        },
      });
    }
    return true;
  } catch (err) {
    console.error("[membership-activate] setMembershipForUser:", err);
    return false;
  }
}
