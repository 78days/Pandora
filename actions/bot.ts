"use server"

import { auth } from "@clerk/nextjs/server"
import { nanoid } from "nanoid"

import { db } from "@/db"
import { bots, botsInsertSchema, chatMembers, chats } from "@/db/schema"

export async function createBot(input: unknown) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const data = botsInsertSchema.parse(input)
  const botId = nanoid()
  const chatId = nanoid()

  const [bot, chat] = await db.batch([
    db
      .insert(bots)
      .values({ id: botId, ...data, userId })
      .returning(),
    db.insert(chats).values({ id: chatId, userId, kind: "direct" }).returning(),
    db.insert(chatMembers).values({ chatId, botId }),
  ])

  return { bot: bot[0], chat: chat[0] }
}
