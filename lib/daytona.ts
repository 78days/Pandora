import { Daytona } from "@daytona/sdk"

// apiUrl/target must be passed explicitly: the SDK throws when it sees
// DAYTONA_API_URL from both process.env (Next.js loads .env.local) and a
// dotenv file, refusing to guess which endpoint the key belongs to.
export function getDaytona() {
  return new Daytona({
    apiKey: process.env.DAYTONA_SECRET_KEY,
    apiUrl: process.env.DAYTONA_API_URL,
    target: process.env.DAYTONA_TARGET,
  })
}
