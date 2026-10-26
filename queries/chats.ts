import { auth } from "@clerk/nextjs/server"
import { and, asc, eq } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"

export type Chat = {
  id: string
  bot: {
    id: string
    name: string
    avatar: string
    job: string
    instructions: string | null
    sandboxId: string | null
  }
}

// The user's chat by id, resolved to its first bot member (group chats fall
// back to the earliest member until they get real avatars). Memoized per
// request. Returns null when the chat doesn't exist or belongs to someone
// else, so callers can 404.
export const getChat = cache(async (chatId: string): Promise<Chat | null> => {
  const { userId } = await auth()
  if (!userId) return null

  return (
    (
      await db
        .select({
          id: chats.id,
          bot: {
            id: bots.id,
            name: bots.name,
            avatar: bots.avatar,
            job: bots.job,
            instructions: bots.instructions,
            sandboxId: bots.sandboxId,
          },
        })
        .from(chats)
        // Inner join: a chat without members has nothing to show in the
        // header, so it 404s like a missing chat.
        .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
        .innerJoin(bots, eq(bots.id, chatMembers.botId))
        .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
        .orderBy(asc(chatMembers.joinedAt))
        .limit(1)
    )[0] ?? null
  )
})
