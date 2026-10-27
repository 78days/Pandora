import * as Sentry from "@sentry/node"

// Error monitoring for the trigger runtime (task failures and errored chat
// turns — see the lifecycle hooks in trigger.config.ts). The DSN comes from
// the trigger environment; without it the SDK no-ops, so local development
// without the variable stays quiet.
//
// Tracing stays disabled on purpose: Trigger.dev's own OpenTelemetry pipeline
// owns tracing in this runtime (its dashboard is built on it), and a second
// global tracer provider would fight it.
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
})

export { Sentry }
