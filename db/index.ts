import { neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

// The Neon HTTP endpoint intermittently drops the first request after the
// connection sat idle: fetch fails with a network error before any HTTP
// response arrives. Only those connection-level failures are retried;
// responses with an HTTP status pass through untouched.
neonConfig.fetchFunction = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(input, init)
    } catch (error) {
      if (attempt === 2) throw error
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
    }
  }
}

export const db = drizzle(process.env.DATABASE_URL, { schema })
