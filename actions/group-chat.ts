"use server"

import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
import { nanoid } from "nanoid"

import { db } from "@/db"
import { bots, chatMembers, chats, groupChatsInsertSchema } from "@/db/schema"

// Creates a group chat from the dialog's payload. No sandbox is involved:
// every member already has its own.
export async function createGroupChat(input: unknown) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const data = groupChatsInsertSchema.parse(input)

  // Every member must be one of the caller's bots; the count also catches
  // duplicates, since inArray dedupes.
  const owned = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(eq(bots.userId, userId), inArray(bots.id, data.botIds)))
  if (owned.length !== data.botIds.length) {
    throw new Error("Unknown bot in selection.")
  }

  const chatId = nanoid()
  await db.batch([
    db
      .insert(chats)
      .values({ id: chatId, userId, kind: "group", name: data.name }),
    // Staggered timestamps keep the member order equal to the dialog's
    // selection order (now() is transaction-stable, so defaults would tie).
    db.insert(chatMembers).values(
      data.botIds.map((botId, index) => ({
        chatId,
        botId,
        joinedAt: new Date(Date.now() + index),
      }))
    ),
  ])

  return { chatId }
}
