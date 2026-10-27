import { PricingTable } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

// Reached from the billing toasts — deliberately not linked from the
// sidebar. Checkout needs a session, so signed-out visitors hit sign-in
// first and come back here.
export default async function PricingPage() {
  await auth.protect()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col items-center justify-center gap-10 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Choose a plan</h1>
        <p className="text-sm text-muted-foreground">
          The paid plan unlocks everything: bots, chats, and their sandboxes.
        </p>
      </div>
      <PricingTable />
      {/* nativeButton: the render target is a link, not a real <button>. */}
      <Button
        nativeButton={false}
        render={<Link href="/" />}
        size="sm"
        variant="ghost"
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Back to Pandora
      </Button>
    </main>
  )
}
