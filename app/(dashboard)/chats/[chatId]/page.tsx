import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { Chat } from "@/components/chat"
import { ChatHeader } from "@/components/chat-header"
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
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatHeader bot={chat.bot} />
      <Chat chatId={chat.id} name={chat.bot.name} avatar={chat.bot.avatar} />
    </div>
  )
}
