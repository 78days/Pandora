"use server"

import { getDaytona } from "@/lib/daytona"
import { getChat } from "@/queries/chats"

// websockify serves noVNC here once the sandbox's computer use is running.
const NOVNC_PORT = 6080
// Long enough that a reconnect later in the session still works; the token is
// scoped to this one port.
const URL_TTL_SECONDS = 86_400

// Called the first time the desktop panel opens, so ordinary chat visits never
// boot a sandbox. Signed URLs are port-scoped and can be embedded in an
// iframe; the sandbox-wide preview token cannot.
export async function getDesktopUrl(chatId: string) {
  const chat = await getChat(chatId)
  if (!chat) throw new Error("Chat not found")
  if (!chat.bot.sandboxId) throw new Error("This bot has no desktop")

  const sandbox = await getDaytona().get(chat.bot.sandboxId)
  if (sandbox.state !== "started") await sandbox.start()
  if ((await sandbox.computerUse.getStatus()).status !== "active") {
    await sandbox.computerUse.start()
  }

  const { url } = await sandbox.getSignedPreviewUrl(NOVNC_PORT, URL_TTL_SECONDS)
  return url
}
