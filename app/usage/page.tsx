import { auth } from "@clerk/nextjs/server"
import { formatDistanceToNowStrict } from "date-fns"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { getUsageSummary } from "@/queries/usage"

// Reached from the user button's usage entry — like /pricing, deliberately
// outside the dashboard shell and not in the sidebar.
export default async function UsagePage() {
  await auth.protect()
  const usage = await getUsageSummary()
  if (!usage) return null

  const resetsIn = usage.periodEnd
    ? formatDistanceToNowStrict(usage.periodEnd)
    : null

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col justify-center gap-10 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Usage</h1>
        <p className="text-sm text-muted-foreground">
          What this period of your plan has covered so far.
        </p>
      </div>
      <div className="space-y-8">
        <Meter
          format={(value) => value.toLocaleString()}
          limit={usage.limits.aiTokens}
          title="AI tokens"
          used={usage.used.aiTokens}
        />
        <Meter
          format={(value) => `${value.toLocaleString()} min`}
          limit={usage.limits.sandboxMinutes}
          title="Sandbox time"
          used={usage.used.sandboxMinutes}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {resetsIn
          ? `Your allowance resets in ${resetsIn}.`
          : "Your allowance resets at the end of your billing period."}
      </p>
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

function Meter({
  title,
  used,
  limit,
  format,
}: {
  title: string
  used: number
  limit: number
  format: (value: number) => string
}) {
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 100
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {limit === 0
            ? "Not in your plan"
            : `${format(used)} / ${format(limit)}`}
        </p>
      </div>
      <Progress value={percent} />
    </div>
  )
}
