import { createClerkClient } from "@clerk/backend"
import { and, eq, gte, lt, sum } from "drizzle-orm"

import { db } from "../db"
import { chats, usageEntries } from "../db/schema"
import { limitsFor, PAID_PLAN } from "../lib/billing"
import { Sentry } from "./sentry"

// The usage ledger's trigger-side half: recording what each turn spent and
// enforcing the plan's allowance at the point of consumption. Clerk runs
// here without its Next.js auth context, so the backend client is built from
// the raw secret key; without it the quota checks degrade to no-ops (logged
// once) while the ledger keeps recording.
const clerk = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null

if (!clerk) {
  console.warn(
    "[billing] CLERK_SECRET_KEY is not configured for this environment — usage quota checks are skipped; the ledger still records."
  )
}

type Period = { planSlug: string | null; start: Date; end: Date | null }

function monthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// Subscription fetches are cached briefly: quota checks run once per turn
// (tokens) and once per sandbox tool call (minutes), and a minute of
// staleness in an over-quota window costs nothing.
const PERIOD_CACHE_TTL_MS = 60_000
const periodCache = new Map<string, { period: Period; at: number }>()

async function billingPeriod(userId: string): Promise<Period> {
  const cached = periodCache.get(userId)
  if (cached && Date.now() - cached.at < PERIOD_CACHE_TTL_MS) {
    return cached.period
  }

  let period: Period
  try {
    if (!clerk) throw new Error("Clerk client unavailable")
    const subscription = await clerk.billing.getUserBillingSubscription(userId)
    const paidItem = subscription.subscriptionItems.find(
      (item) => item.plan?.slug === PAID_PLAN
    )
    // Backend resources carry epochs, not Dates.
    period = paidItem
      ? {
          planSlug: PAID_PLAN,
          start: new Date(paidItem.periodStart),
          end: paidItem.periodEnd != null ? new Date(paidItem.periodEnd) : null,
        }
      : { planSlug: null, start: monthStart(), end: null }
  } catch {
    period = { planSlug: null, start: monthStart(), end: null }
    // A missing key already warned at module level; this is the per-call
    // degradation signal (e.g. a Clerk API failure).
    if (clerk) {
      Sentry.logger.warn(
        "Billing period unavailable — calendar month fallback",
        {
          "pandora.user.id": userId,
        }
      )
    }
  }

  periodCache.set(userId, { period, at: Date.now() })
  return period
}

export async function chatUserId(chatId: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: chats.userId })
    .from(chats)
    .where(eq(chats.id, chatId))
  return row?.userId ?? null
}

// Appends the turn's spend to the ledger. Never throws — a ledger hiccup
// must not fail a turn that already streamed its answer.
export async function recordTurnUsage(params: {
  chatId: string
  userId: string
  tokens: number
  sandboxMinutes: number
}) {
  const entries = [
    params.tokens > 0 && {
      userId: params.userId,
      chatId: params.chatId,
      kind: "ai_tokens" as const,
      amount: params.tokens,
    },
    params.sandboxMinutes > 0 && {
      userId: params.userId,
      chatId: params.chatId,
      kind: "sandbox_minutes" as const,
      amount: params.sandboxMinutes,
    },
  ].filter((entry) => entry !== false)

  if (entries.length === 0) return
  await db.insert(usageEntries).values(entries)
}

async function usedInPeriod(
  userId: string,
  kind: "ai_tokens" | "sandbox_minutes",
  period: Period
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

// Free users carry no paid plan, so the plan error — not a usage error — is
// what a bypassing client should see.
async function assertWithinQuota(
  userId: string,
  kind: "ai_tokens" | "sandbox_minutes"
) {
  const period = await billingPeriod(userId)
  if (!period.planSlug) {
    throw new Error("This feature requires a paid plan.")
  }
  const used = await usedInPeriod(userId, kind, period)
  const limits = limitsFor(period.planSlug)
  const allowance =
    kind === "ai_tokens" ? limits.aiTokens : limits.sandboxMinutes
  const label = kind === "ai_tokens" ? "AI token" : "Sandbox usage"
  if (used >= allowance) {
    throw new Error(
      `${label} limit reached for this period. It resets with your next billing period.`
    )
  }
}

export async function assertTokenQuota(userId: string) {
  await assertWithinQuota(userId, "ai_tokens")
}

export async function assertSandboxQuota(userId: string) {
  await assertWithinQuota(userId, "sandbox_minutes")
}
