"use client"

import { useChat } from "@ai-sdk/react"
import type { ChatSessionPersistedState } from "@trigger.dev/sdk/chat"
import {
  useTriggerChatTransport,
  type InferChatUIMessage,
} from "@trigger.dev/sdk/chat/react"
import { useCallback, useEffect, useState } from "react"

import {
  loadChatTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/actions/chat"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { ChatAvatar } from "@/components/chat-avatar"
import type { pandoraChat } from "@/trigger/chat"

type ChatMessage = InferChatUIMessage<typeof pandoraChat>

type Load =
  | { chatId: string; status: "loading" }
  | { chatId: string; status: "error"; message: string }
  | {
      chatId: string
      status: "ready"
      initialMessages: ChatMessage[]
      // Hydrating the session (without `isStreaming`) is what lets `resume`
      // reconnect to a turn that is still generating after a reload.
      initialSessions?: Record<string, ChatSessionPersistedState>
    }

export function Chat({
  chatId,
  name,
  avatar,
  instructions,
}: {
  chatId: string
  name: string
  avatar: string
  instructions: string | null
}) {
  const [load, setLoad] = useState<Load>({ chatId, status: "loading" })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const transcript = await loadChatTranscript({ chatId })
        if (cancelled) return

        let initialSessions:
          Record<string, ChatSessionPersistedState> | undefined
        if (transcript.messages.length > 0) {
          try {
            // Idempotent on (env, chatId). The token lets `resume` subscribe
            // without waiting for a send; without `isStreaming` the reconnect
            // opens the stream and the server closes it fast if settled.
            const session = await startChatSession({
              chatId,
              clientData: { instructions },
            })
            initialSessions = {
              [chatId]: {
                publicAccessToken: session.publicAccessToken,
                lastEventId: transcript.cursors?.lastOutEventId,
              },
            }
          } catch {
            // Resume is best-effort; the chat works without it.
          }
        }

        if (!cancelled) {
          setLoad({
            chatId,
            status: "ready",
            initialMessages: transcript.messages,
            initialSessions,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setLoad({
            chatId,
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [chatId, instructions])

  // State from a previous chatId (navigating between chats) counts as loading.
  const current = load.chatId === chatId ? load : null

  if (current?.status === "error") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-sm text-destructive">
          Could not load conversation: {current.message}
        </p>
      </div>
    )
  }

  if (current?.status !== "ready") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Shimmer>Loading conversation...</Shimmer>
      </div>
    )
  }

  return (
    <ChatView
      chatId={chatId}
      name={name}
      avatar={avatar}
      instructions={instructions}
      initialMessages={current.initialMessages}
      initialSessions={current.initialSessions}
    />
  )
}

function ChatView({
  chatId,
  name,
  avatar,
  instructions,
  initialMessages,
  initialSessions,
}: {
  chatId: string
  name: string
  avatar: string
  instructions: string | null
  initialMessages: ChatMessage[]
  initialSessions?: Record<string, ChatSessionPersistedState>
}) {
  const transport = useTriggerChatTransport<typeof pandoraChat>({
    task: "pandora-chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
    // Untrusted input by design: it only shapes the bot's personality.
    // Ownership is enforced server-side in the actions.
    clientData: { instructions },
    sessions: initialSessions,
  })

  const {
    messages,
    sendMessage,
    status,
    error,
    stop: aiStop,
  } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    // Reconnect to an in-flight stream after a page reload.
    resume: initialMessages.length > 0,
  })

  // useChat's stop() alone doesn't reach the backend after a resume.
  const stop = useCallback(() => {
    aiStop()
    transport.stopGeneration(chatId)
  }, [aiStop, chatId, transport])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        {messages.length === 0 ? (
          <ConversationEmptyState
            icon={<ChatAvatar seed={avatar} className="size-12" />}
            title={name}
            description={`Say hello to start the conversation with ${name}.`}
          />
        ) : (
          <ConversationContent>
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <MessageResponse key={index}>
                            {part.text}
                          </MessageResponse>
                        )
                      case "reasoning":
                        return (
                          <Reasoning
                            key={index}
                            isStreaming={part.state === "streaming"}
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        )
                    }
                  })}
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>
      <div className="p-4">
        <PromptInput
          onSubmit={(message) => {
            if (message.text?.trim()) sendMessage({ text: message.text })
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea placeholder={`Message ${name}...`} />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
        {error && (
          <p className="mt-2 text-sm text-destructive">
            Something went wrong: {error.message || "please try again."}
          </p>
        )}
      </div>
    </div>
  )
}
