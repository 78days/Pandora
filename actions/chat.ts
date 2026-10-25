"use server"

import { auth as triggerAuth } from "@trigger.dev/sdk"
import {
  chat,
  defaultStorage,
  type ChatLoadTranscriptParams,
  type ChatStartSessionParams,
} from "@trigger.dev/sdk/ai"

import { getChat } from "@/queries/chats"
import type { pandoraChat } from "@/trigger/chat"

const startSessionAction =
  chat.createStartSessionAction<typeof pandoraChat>("pandora-chat")
const loadTranscriptAction = chat.createLoadTranscriptAction(defaultStorage, {
  limit: 100,
})

async function requireChat(chatId: string) {
  const chat = await getChat(chatId)
  if (!chat) throw new Error("Chat not found")
  return chat
}

// Creates the durable Session + first run for this chat and returns a
// session-scoped token. Idempotent on (environment, chatId).
export async function startChatSession(
  params: ChatStartSessionParams<typeof pandoraChat>
) {
  await requireChat(params.chatId)
  return startSessionAction(params)
}

// Pure mint. The transport calls this again on a 401/403.
export async function mintChatAccessToken(chatId: string) {
  await requireChat(chatId)

  return triggerAuth.createPublicToken({
    scopes: { read: { sessions: chatId }, write: { sessions: chatId } },
    expirationTime: "1h",
  })
}

// The stored transcript for a fresh page, scoped to the signed-in user.
export async function loadChatTranscript(params: ChatLoadTranscriptParams) {
  await requireChat(params.chatId)
  return loadTranscriptAction(params)
}
