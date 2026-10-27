"use client"

import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

import { toast } from "@/components/ui/toast"
import { PAID_PLAN } from "@/lib/billing"

// Client-side gate for the billable features. Call the returned function
// before a gated action: true means go ahead; false means an error toast
// with a link to the pricing page was shown.
export function useBillable() {
  const { has } = useAuth()
  const router = useRouter()

  return () => {
    if (has?.({ plan: PAID_PLAN })) return true

    toast.add({
      type: "error",
      title: "This feature needs a paid plan",
      description:
        "Bots, chats, and sandboxes are unavailable on the free plan.",
      actionProps: {
        children: "View plans",
        onClick: () => router.push("/pricing"),
      },
    })
    return false
  }
}
