"use server"

import * as Sentry from "@sentry/nextjs"

import {
  requirePaidPlan,
  requireWithinSandboxQuota,
} from "@/lib/billing-server"
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
  // Opening the desktop view connects to the bot's sandbox — a metered
  // resource like any other tool use.
  await requirePaidPlan()
  await requireWithinSandboxQuota()
  const chat = await getChat(chatId)
  if (!chat) throw new Error("Chat not found")
  // Only a direct chat's bot has a desktop; group chats never mount the panel.
  const bot = chat.members[0]
  if (!bot.sandboxId) throw new Error("This bot has no desktop")

  const sandbox = await getDaytona().get(bot.sandboxId)
  if (sandbox.state !== "started") await sandbox.start()
  if ((await sandbox.computerUse.getStatus()).status !== "active") {
    await sandbox.computerUse.start()
  }

  const { url } = await sandbox.getSignedPreviewUrl(NOVNC_PORT, URL_TTL_SECONDS)

  Sentry.logger.info("Desktop preview URL issued", {
    "pandora.chat.id": chatId,
  })

  return url
}
