import { auth } from "@clerk/nextjs/server"
import { asc, desc, eq } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"

export type SidebarChat = {
  id: string
  botName: string
  botAvatar: string
  lastMessagePreview: string | null
  lastMessageAt: Date
}

// The user's chats, newest first, each resolved to its first bot member
// (group chats fall back to the earliest member until they get real avatars).
// Memoized per request: the sidebar list and the search dialog share one query.
export const getSidebarChats = cache(async (): Promise<SidebarChat[]> => {
  const { userId } = await auth()
  if (!userId) return []

  // Ordering keeps each chat's rows contiguous and its earliest member first,
  // so the first row seen per chat id carries its bot.
  const rows = await db
    .select({
      id: chats.id,
      lastMessagePreview: chats.lastMessagePreview,
      lastMessageAt: chats.lastMessageAt,
      botName: bots.name,
      botAvatar: bots.avatar,
    })
    .from(chats)
    .leftJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .leftJoin(bots, eq(bots.id, chatMembers.botId))
    .where(eq(chats.userId, userId))
    .orderBy(
      desc(chats.lastMessageAt),
      asc(chats.id),
      asc(chatMembers.joinedAt)
    )

  const sidebarChats = new Map<string, SidebarChat>()
  for (const row of rows) {
    if (!sidebarChats.has(row.id)) {
      sidebarChats.set(row.id, {
        id: row.id,
        botName: row.botName ?? "",
        botAvatar: row.botAvatar ?? "",
        lastMessagePreview: row.lastMessagePreview,
        lastMessageAt: row.lastMessageAt,
      })
    }
  }
  return [...sidebarChats.values()]
})
