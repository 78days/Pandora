import { auth } from "@clerk/nextjs/server"

import { PAID_PLAN } from "@/lib/billing"

// Server-side enforcement for the billable features. The client gates the
// same features with a toast pointing at /pricing; this is what a request
// that skips the UI hits.
export async function requirePaidPlan() {
  const { has } = await auth()
  if (!has({ plan: PAID_PLAN })) {
    throw new Error("This feature requires a paid plan.")
  }
}
