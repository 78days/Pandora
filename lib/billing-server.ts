import * as Sentry from "@sentry/nextjs"
import { auth } from "@clerk/nextjs/server"

import { PAID_PLAN } from "@/lib/billing"
import { getUsageSummary } from "@/queries/usage"

// Server-side enforcement for the billable features. The client gates the
// same features with a toast pointing at /pricing; this is what a request
// that skips the UI hits.
export async function requirePaidPlan() {
  const { has } = await auth()
  if (!has({ plan: PAID_PLAN })) {
    Sentry.logger.warn("Feature denied: paid plan required")
    throw new Error("This feature requires a paid plan.")
  }
}

// The plan's AI token allowance for the current period.
export async function requireWithinTokenQuota() {
  const usage = await getUsageSummary()
  if (!usage) throw new Error("Unauthorized")
  if (usage.used.aiTokens >= usage.limits.aiTokens) {
    Sentry.logger.warn("Token quota exhausted", {
      "pandora.usage.tokens": usage.used.aiTokens,
      "pandora.usage.limit": usage.limits.aiTokens,
    })
    throw new Error(
      "AI token limit reached for this period. It resets with your next billing period."
    )
  }
}

// The plan's sandbox allowance for the current period.
export async function requireWithinSandboxQuota() {
  const usage = await getUsageSummary()
  if (!usage) throw new Error("Unauthorized")
  if (usage.used.sandboxMinutes >= usage.limits.sandboxMinutes) {
    Sentry.logger.warn("Sandbox quota exhausted", {
      "pandora.usage.minutes": usage.used.sandboxMinutes,
      "pandora.usage.limit": usage.limits.sandboxMinutes,
    })
    throw new Error(
      "Sandbox usage limit reached for this period. It resets with your next billing period."
    )
  }
}
