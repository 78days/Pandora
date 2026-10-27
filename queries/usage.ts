import { clerkClient, auth } from "@clerk/nextjs/server"
import { and, eq, gte, lt, sum } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { usageEntries, type usageKind } from "@/db/schema"
import { limitsFor, PAID_PLAN } from "@/lib/billing"

export type UsageKind = (typeof usageKind)["enumValues"][number]

export type UsageSummary = {
  planSlug: string | null
  periodStart: Date
  periodEnd: Date | null
  limits: { aiTokens: number; sandboxMinutes: number }
  used: { aiTokens: number; sandboxMinutes: number }
}

function monthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// The active paid plan's billing period. Free users have no paid item — they
// fall back to the calendar month with a zero allowance (the plan gate
// blocks them long before usage matters). Billing API failures degrade to
// the same fallback; the zero allowance keeps free users blocked.
async function billingPeriod(userId: string): Promise<{
  planSlug: string | null
  start: Date
  end: Date | null
}> {
  try {
    const client = await clerkClient()
    const subscription = await client.billing.getUserBillingSubscription(userId)
    const paidItem = subscription.subscriptionItems.find(
      (item) => item.plan?.slug === PAID_PLAN
    )
    if (!paidItem) {
      return { planSlug: null, start: monthStart(), end: null }
    }
    // Backend resources carry epochs, not Dates.
    return {
      planSlug: PAID_PLAN,
      start: new Date(paidItem.periodStart),
      end: paidItem.periodEnd != null ? new Date(paidItem.periodEnd) : null,
    }
  } catch {
    return { planSlug: null, start: monthStart(), end: null }
  }
}

async function sumUsage(
  userId: string,
  kind: UsageKind,
  period: { start: Date; end: Date | null }
): Promise<number> {
  const [row] = await db
    .select({ total: sum(usageEntries.amount) })
    .from(usageEntries)
    .where(
      and(
        eq(usageEntries.userId, userId),
        eq(usageEntries.kind, kind),
        gte(usageEntries.createdAt, period.start),
        period.end ? lt(usageEntries.createdAt, period.end) : undefined
      )
    )
  return Number(row?.total ?? 0)
}

// The signed-in user's ledger for the current subscription period: what the
// plan allows, what has been spent, and when it resets. Memoized per request
// so the gates, the composer, and the usage page share one read.
export const getUsageSummary = cache(async (): Promise<UsageSummary | null> => {
  const { userId } = await auth()
  if (!userId) return null

  const { planSlug, start, end } = await billingPeriod(userId)
  const limits = limitsFor(planSlug)
  const [aiTokens, sandboxMinutes] = await Promise.all([
    sumUsage(userId, "ai_tokens", { start, end }),
    sumUsage(userId, "sandbox_minutes", { start, end }),
  ])

  return {
    planSlug,
    periodStart: start,
    periodEnd: end,
    limits,
    used: { aiTokens, sandboxMinutes },
  }
})
