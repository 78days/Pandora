import { schedules } from "@trigger.dev/sdk"
import { inArray } from "drizzle-orm"

import { db } from "../db"
import { bots } from "../db/schema"
import { listRunningSandboxIds, stopBotSandbox } from "../lib/daytona"
import { Sentry } from "./sentry"
import { isWithinSandboxQuota, recordSandboxUsage } from "./usage"

// How often the sandboxes are looked at, and so what one sighting is billed as
const INTERVAL_MINUTES = 5

// The sandbox meter. Chat turns only bill the minutes their tools ran in, so
// a sandbox that is left running would never be charged — this task charges
// every running sandbox the interval to its bot's owner, and stops the
// sandboxes of owners who have spent their allowance.
export const meterSandboxes = schedules.task({
  id: "meter-sandboxes",
  cron: `*/${INTERVAL_MINUTES} * * * *`,
  maxDuration: 240,
  run: async ({ timestamp }) => {
    const running = await listRunningSandboxIds()
    if (running.length === 0) return

    const owned = await db
      .select({ sandboxId: bots.sandboxId, userId: bots.userId })
      .from(bots)
      .where(inArray(bots.sandboxId, running))

    for (const { userId } of owned) {
      await recordSandboxUsage(userId, INTERVAL_MINUTES)
    }

    let stopped = 0
    for (const userId of new Set(owned.map((bot) => bot.userId))) {
      // Free users have no allowance, so this stops their sandboxes too
      if (await isWithinSandboxQuota(userId)) continue

      const sandboxIds = owned
        .filter((bot) => bot.userId === userId)
        .flatMap((bot) => (bot.sandboxId ? [bot.sandboxId] : []))
      await Promise.all(sandboxIds.map((id) => stopBotSandbox(id)))

      stopped += sandboxIds.length
      Sentry.logger.warn("Sandboxes stopped: usage limit reached", {
        "pandora.user.id": userId,
        "pandora.sandbox.count": sandboxIds.length,
      })
    }

    Sentry.logger.info("Sandboxes metered", {
      "pandora.sandbox.running": running.length,
      "pandora.sandbox.billed": owned.length,
      // Running at Daytona with no bot to charge: nobody pays for these
      "pandora.sandbox.unowned": running.length - owned.length,
      "pandora.sandbox.stopped": stopped,
      "pandora.meter.timestamp": timestamp.toISOString(),
    })
  },
})
