import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { Chat } from "@/components/chat"
import { ChatDesktop } from "@/components/chat-desktop"
import { ChatHeader, GroupChatHeader } from "@/components/chat-header"
import { ChatPanels } from "@/components/chat-panels"
import { getChat } from "@/queries/chats"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  await auth.protect()
  const { chatId } = await params
  const chat = await getChat(chatId)
  if (!chat) notFound()

  return (
    <ChatPanels
      // Group chats have no desktop panel; only a direct chat's bot owns one.
      desktop={
        chat.kind === "direct" ? (
          <ChatDesktop chatId={chat.id} name={chat.members[0].name} />
        ) : null
      }
    >
      {chat.kind === "group" ? (
        <GroupChatHeader
          group={{
            id: chat.id,
            name: chat.name ?? "Group chat",
            members: chat.members,
          }}
        />
      ) : (
        <ChatHeader bot={chat.members[0]} />
      )}
      <Chat
        chatId={chat.id}
        kind={chat.kind}
        name={
          chat.kind === "group"
            ? (chat.name ?? "Group chat")
            : chat.members[0].name
        }
        members={chat.members}
      />
    </ChatPanels>
  )
}
