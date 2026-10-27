// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a user loads a page in their
// browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or
  // use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Session Replay: recording every session while testing — lower the session
  // rate for production (e.g. 0.25 for low traffic). Sessions with an error
  // are always recorded, replaying the 60 seconds before it.
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [Sentry.replayIntegration()],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
