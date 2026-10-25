import type { UIMessage } from "ai"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai"

import { chatModel } from "@/lib/ai"
import { getChat } from "@/queries/chats"

// useChat's default transport posts the chat id with the full message list;
// history lives in client state only (no persistence).
export async function POST(req: Request) {
  const { id, messages }: { id: string; messages: UIMessage[] } =
    await req.json()

  // Doubles as the auth check: null when signed out or the chat belongs to
  // someone else.
  const chat = await getChat(id)
  if (!chat) return new Response("Not found", { status: 404 })

  const result = streamText({
    model: chatModel,
    system: chat.bot.instructions ?? undefined,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 8192,
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
