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

// Every sandbox that is running or on its way there: the sandbox meter's
// sighting list. Daytona stops idle sandboxes by itself and reports no
// running time, so the ledger is filled by looking.
export async function listRunningSandboxIds() {
  const ids: string[] = []
  for await (const sandbox of getDaytona().list({
    states: ["started", "starting", "stopping"],
  })) {
    ids.push(sandbox.id)
  }
  return ids
}

// Stops a sandbox without deleting it: its files stay, and it starts again
// the next time it is used. The meter stops those of owners who have spent
// their allowance.
export async function stopBotSandbox(sandboxId: string) {
  const sandbox = await getDaytona().get(sandboxId)
  if (sandbox.state === "started") await sandbox.stop()
}
