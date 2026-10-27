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

// The edit dialog submits the group's full desired state: the new name and
// the complete member list, so membership is replaced rather than diffed.
export async function updateGroupChat(chatId: string, input: unknown) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const data = groupChatsInsertSchema.parse(input)

  const [chat] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.userId, userId),
        eq(chats.kind, "group")
      )
    )
  if (!chat) throw new Error("Group chat not found")

  // Every member must be one of the caller's bots; the count also catches
  // duplicates, since inArray dedupes.
  const owned = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(eq(bots.userId, userId), inArray(bots.id, data.botIds)))
  if (owned.length !== data.botIds.length) {
    throw new Error("Unknown bot in selection.")
  }

  await db.batch([
    db.update(chats).set({ name: data.name }).where(eq(chats.id, chatId)),
    db.delete(chatMembers).where(eq(chatMembers.chatId, chatId)),
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
}

export async function deleteGroupChat(chatId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  // Only the group row goes; members, their bots, and their sandboxes are
  // untouched. chat_members goes with it via the schema's cascade deletes.
  await db
    .delete(chats)
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.userId, userId),
        eq(chats.kind, "group")
      )
    )
}
