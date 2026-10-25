"use client"

import { useChat } from "@ai-sdk/react"

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
import { ChatAvatar } from "@/components/chat-avatar"

export function Chat({
  chatId,
  name,
  avatar,
}: {
  chatId: string
  name: string
  avatar: string
}) {
  const { messages, sendMessage, status, error, stop } = useChat({ id: chatId })

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
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </div>
  )
}
