import { defineConfig } from "@trigger.dev/sdk"

import { Sentry } from "./trigger/sentry"

export default defineConfig({
  project: "proj_gthiexkzdhiitutbyzbi",
  runtime: "node-24",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./trigger"],
  // Run-level monitoring: any failing task run is reported to Sentry with
  // the failing task's id (see ./trigger/sentry for the SDK init).
  onFailure: async ({ error, ctx }) => {
    Sentry.captureException(error, { tags: { task: ctx.task.id } })
  },
})
