import { auth } from "@clerk/nextjs/server"
import { and, asc, eq } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"

export type ChatMember = {
  id: string
  name: string
  avatar: string
  job: string
  instructions: string | null
  sandboxId: string | null
}

export type Chat = {
  id: string
  kind: "direct" | "group"
  // Group chats carry the dialog's name; direct chats are named by their bot.
  name: string | null
  members: ChatMember[]
}

// The user's chat by id with every member in join order (member one is the
// direct chat's bot and a group chat's default respondent). Memoized per
// request. Returns null when the chat doesn't exist, belongs to someone else,
// or has no members, so callers can 404.
export const getChat = cache(async (chatId: string): Promise<Chat | null> => {
  const { userId } = await auth()
  if (!userId) return null

  const rows = await db
    .select({
      id: chats.id,
      kind: chats.kind,
      name: chats.name,
      member: {
        id: bots.id,
        name: bots.name,
        avatar: bots.avatar,
        job: bots.job,
        instructions: bots.instructions,
        sandboxId: bots.sandboxId,
      },
    })
    .from(chats)
    .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .innerJoin(bots, eq(bots.id, chatMembers.botId))
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .orderBy(asc(chatMembers.joinedAt))

  const [first] = rows
  if (!first) return null

  return {
    id: first.id,
    kind: first.kind,
    name: first.name,
    members: rows.map((row) => row.member),
  }
})
