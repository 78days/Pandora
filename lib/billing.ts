// The slug of the single paid plan in Clerk Billing (Dashboard → Billing →
// Plans, User Plans tab). Everything billable — bots, chats, sandboxes —
// gates on it; anyone without an active subscription to it is on the free
// tier and gets blocked with a toast.
export const PAID_PLAN = "pro"

// Usage allowances per subscription period, keyed by plan slug. Plans not
// listed here (the free tier) have no allowance at all.
export const PLAN_LIMITS: Record<
  string,
  { aiTokens: number; sandboxMinutes: number }
> = {
  pro: { aiTokens: 500_000, sandboxMinutes: 120 },
}

export function limitsFor(planSlug: string | null | undefined) {
  return PLAN_LIMITS[planSlug ?? ""] ?? { aiTokens: 0, sandboxMinutes: 0 }
}
