// This file configures the initialization of Sentry for the Node.js and Edge
// runtimes. It wires the server and edge configs above into Next's
// instrumentation lifecycle and forwards request errors (route handlers,
// server actions) to Sentry.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = Sentry.captureRequestError
