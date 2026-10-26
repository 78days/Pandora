import { auth } from "@clerk/nextjs/server"
import { asc, desc, eq } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"

export type SidebarChat = {
  id: string
  // Group chats carry the dialog's name; direct chats are named by their bot.
  name: string
  // Member avatar seeds in join order; GroupChatAvatar caps the display.
  avatars: string[]
  lastMessagePreview: string | null
  lastMessageAt: Date
}

// The user's chats, newest first, each with every member's avatar. Memoized
// per request: the sidebar list and the search dialog share one query.
export const getSidebarChats = cache(async (): Promise<SidebarChat[]> => {
  const { userId } = await auth()
  if (!userId) return []

  // Ordering keeps each chat's rows contiguous and its members in join order.
  const rows = await db
    .select({
      id: chats.id,
      kind: chats.kind,
      chatName: chats.name,
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
    const existing = sidebarChats.get(row.id)
    if (!existing) {
      sidebarChats.set(row.id, {
        id: row.id,
        name:
          row.kind === "group"
            ? (row.chatName ?? "Group chat")
            : (row.botName ?? ""),
        avatars: row.botAvatar ? [row.botAvatar] : [],
        lastMessagePreview: row.lastMessagePreview,
        lastMessageAt: row.lastMessageAt,
      })
    } else if (row.kind === "group" && row.botAvatar) {
      existing.avatars.push(row.botAvatar)
    }
  }
  return [...sidebarChats.values()]
})
