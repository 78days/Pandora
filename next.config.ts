import { withSentryConfig } from "@sentry/nextjs/config"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {}

// Source maps upload to Sentry at build time — needs SENTRY_AUTH_TOKEN and
// SENTRY_PROJECT (the project slug) in the environment. Without them the
// build proceeds, just without uploaded source maps.
export default withSentryConfig(nextConfig, {
  org: "pandora-y1",
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases
  // build time)
  widenClientFileUpload: true,
})
