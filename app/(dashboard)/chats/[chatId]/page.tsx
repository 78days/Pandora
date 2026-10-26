import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { Chat } from "@/components/chat"
import { ChatDesktop } from "@/components/chat-desktop"
import { ChatHeader } from "@/components/chat-header"
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
    <ChatPanels desktop={<ChatDesktop chatId={chat.id} name={chat.bot.name} />}>
      <ChatHeader bot={chat.bot} />
      <Chat
        chatId={chat.id}
        name={chat.bot.name}
        avatar={chat.bot.avatar}
        job={chat.bot.job}
        instructions={chat.bot.instructions}
        sandboxId={chat.bot.sandboxId}
      />
    </ChatPanels>
  )
}
