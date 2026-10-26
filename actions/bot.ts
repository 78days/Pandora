"use server"

import { auth } from "@clerk/nextjs/server"
import { DaytonaNotFoundError } from "@daytona/sdk"
import { and, eq, inArray } from "drizzle-orm"
import { nanoid } from "nanoid"

import { db } from "@/db"
import { bots, botsInsertSchema, chatMembers, chats } from "@/db/schema"
import { getDaytona } from "@/lib/daytona"

export async function createBot(input: unknown) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const data = botsInsertSchema.parse(input)
  const botId = nanoid()
  const chatId = nanoid()

  const sandbox = await getDaytona().create()

  try {
    const [bot, chat] = await db.batch([
      db
        .insert(bots)
        .values({ id: botId, ...data, userId, sandboxId: sandbox.id })
        .returning(),
      db
        .insert(chats)
        .values({ id: chatId, userId, kind: "direct" })
        .returning(),
      db.insert(chatMembers).values({ chatId, botId }),
    ])

    return { bot: bot[0], chat: chat[0] }
  } catch (error) {
    // Best effort: the sandbox would be orphaned without its bot row.
    await sandbox.delete().catch(() => {})
    throw error
  }
}

export async function updateBot(botId: string, input: unknown) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const data = botsInsertSchema.parse(input)
  await db
    .update(bots)
    .set(data)
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
}

export async function deleteBot(botId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  // The sandbox goes first so a failure here leaves the bot intact and the
  // action retryable; an already-deleted sandbox (retried delete) is tolerated.
  const [bot] = await db
    .select({ sandboxId: bots.sandboxId })
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))

  if (bot?.sandboxId) {
    const sandbox = await getDaytona()
      .get(bot.sandboxId)
      .catch((error) => {
        if (error instanceof DaytonaNotFoundError) return null
        throw error
      })
    if (sandbox) await sandbox.delete()
  }

  // Direct chats die with their bot; group chats keep their other members.
  // chat_members rows go via the schema's cascade deletes.
  await db.batch([
    db
      .delete(chats)
      .where(
        and(
          eq(chats.userId, userId),
          eq(chats.kind, "direct"),
          inArray(
            chats.id,
            db
              .select({ id: chatMembers.chatId })
              .from(chatMembers)
              .where(eq(chatMembers.botId, botId))
          )
        )
      ),
    db.delete(bots).where(and(eq(bots.id, botId), eq(bots.userId, userId))),
  ])
}
