"use client"

import { useChat } from "@ai-sdk/react"
import type { ChatSessionPersistedState } from "@trigger.dev/sdk/chat"
import {
  useTriggerChatTransport,
  type InferChatUIMessage,
} from "@trigger.dev/sdk/chat/react"
import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"

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
  MessageAction,
  MessageActions,
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
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import type { pandoraChat } from "@/trigger/chat"

type ChatMessage = InferChatUIMessage<typeof pandoraChat>

// Total text across messages — a "who has more content" measure that still
// works when counts tie (a partially streamed answer on screen vs the saved
// complete answer in the transcript) and never adopts a shorter history
// (the transcript fetch is capped at the most recent 100 messages).
function textVolume(
  messages: readonly { parts: readonly { type: string; text?: string }[] }[]
) {
  return messages.reduce(
    (total, message) =>
      total +
      message.parts.reduce((sum, part) => sum + (part.text?.length ?? 0), 0),
    0
  )
}

type Load =
  | { chatId: string; status: "loading" }
  | { chatId: string; status: "error"; message: string }
  | {
      chatId: string
      status: "ready"
      initialMessages: ChatMessage[]
      // Hydrating the session (without `isStreaming`) is what lets the
      // reconnect reattach to a turn that is still generating after a reload.
      initialSessions?: Record<string, ChatSessionPersistedState>
      resumeError?: string
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
        let resumeError: string | undefined
        if (transcript.messages.length > 0) {
          try {
            // Idempotent on (env, chatId). The token lets the reconnect
            // subscribe without waiting for a send; without `isStreaming` it
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
          } catch (error) {
            // Resume is best-effort; the chat works without it.
            resumeError = error instanceof Error ? error.message : String(error)
          }
        }

        if (!cancelled) {
          setLoad({
            chatId,
            status: "ready",
            initialMessages: transcript.messages,
            initialSessions,
            resumeError,
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
      resumeError={current.resumeError}
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
  resumeError,
}: {
  chatId: string
  name: string
  avatar: string
  instructions: string | null
  initialMessages: ChatMessage[]
  initialSessions?: Record<string, ChatSessionPersistedState>
  resumeError?: string
}) {
  // TEMPORARY debug strip data — counts of transport lifecycle events.
  const [streamEvents, setStreamEvents] = useState<Record<string, number>>({})

  const transport = useTriggerChatTransport<typeof pandoraChat>({
    task: "pandora-chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
    // Untrusted input by design: it only shapes the bot's personality.
    // Ownership is enforced server-side in the actions.
    clientData: { instructions },
    sessions: initialSessions,
    onEvent: (event) => {
      setStreamEvents((prev) => ({
        ...prev,
        [event.type]: (prev[event.type] ?? 0) + 1,
      }))
    },
  })

  const {
    messages,
    sendMessage,
    status,
    error,
    stop: aiStop,
    setMessages,
    resumeStream,
    regenerate,
  } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    // NOTE: no automatic `resume` here. Under React strict mode (default in
    // next dev) the SDK's internal resume effect double-fires, and the second
    // makeRequest aborts the first one's reconnect — the transport then
    // cancels the SSE subscription it had just opened. The reloaded page ends
    // up with no live stream. We fire the reconnect once, manually, below.
  })

  // Reconnect to an in-flight turn exactly once per chat. The ref survives
  // strict mode's double mount, so the second effect run skips.
  const resumedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (resumedForRef.current === chatId) return
    if (initialMessages.length === 0) return
    resumedForRef.current = chatId
    void resumeStream()
  }, [chatId, initialMessages.length, resumeStream])

  // A resume can miss the answer: the reconnect may close empty when the turn
  // settled between the transcript load and the reconnect, or be skipped
  // outright (React strict mode double-fires the resume effect). The durable
  // transcript is the source of truth for settled turns, so every time the
  // chat goes quiet, adopt it if the server knows more messages than the
  // screen does.
  const statusRef = useRef(status)
  const reconcilingRef = useRef(false)
  // A user-initiated regenerate must not be followed by transcript adoption:
  // the durable log may still contain the replaced answer, and adopting it
  // would resurrect it on screen.
  const skipReconcileRef = useRef(false)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    if (status !== "ready") return
    if (initialMessages.length === 0) return
    if (skipReconcileRef.current) {
      skipReconcileRef.current = false
      return
    }
    if (reconcilingRef.current) return
    reconcilingRef.current = true

    void (async () => {
      try {
        const transcript = await loadChatTranscript({ chatId })
        // A send or a resumed stream taking over means live state is
        // fresher than any snapshot; leave it alone.
        if (statusRef.current !== "ready") return
        setMessages((currentMessages) =>
          textVolume(transcript.messages) <= textVolume(currentMessages)
            ? currentMessages
            : transcript.messages
        )
      } catch {
        // Best-effort; the transcript is re-checked on the next settle.
      } finally {
        reconcilingRef.current = false
      }
    })()
  }, [status, chatId, initialMessages.length, setMessages])

  // History that ends with an unanswered user message means a turn is (or
  // was) still generating server-side — the transcript was loaded mid-turn.
  // The resume stream should deliver the answer live, but when it doesn't
  // (reconnect closed empty, strict-mode double-fire, or the turn settles
  // after load), status may never change again, so nothing above re-checks.
  // Poll the durable transcript until the saved answer appears.
  const awaitingAnswer =
    initialMessages.length > 0 &&
    initialMessages[initialMessages.length - 1]?.role === "user"

  useEffect(() => {
    if (!awaitingAnswer) return

    let cancelled = false

    const poll = async () => {
      // ~5 minutes; a stopped or failed turn still saves a final state.
      for (let attempt = 0; attempt < 150 && !cancelled; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        if (cancelled) return
        // A live send or resumed stream owns the screen; stand down.
        if (statusRef.current !== "ready") return
        try {
          const transcript = await loadChatTranscript({ chatId })
          if (cancelled) return
          const last = transcript.messages[transcript.messages.length - 1]
          if (last && last.role !== "user") {
            if (statusRef.current === "ready") {
              setMessages((currentMessages) =>
                textVolume(transcript.messages) <= textVolume(currentMessages)
                  ? currentMessages
                  : transcript.messages
              )
            }
            return
          }
        } catch {
          // Transient fetch failure — try again on the next tick.
        }
      }
    }

    void poll()
    return () => {
      cancelled = true
    }
  }, [awaitingAnswer, chatId, setMessages])

  // useChat's stop() alone doesn't reach the backend after a resume.
  const stop = useCallback(() => {
    aiStop()
    transport.stopGeneration(chatId)
  }, [aiStop, chatId, transport])

  // Resend the last user turn for a fresh answer (also serves as Retry when
  // the previous attempt errored). The transport marks it
  // "regenerate-message" and the agent slices its own history server-side.
  const regenerateLast = useCallback(() => {
    skipReconcileRef.current = true
    void regenerate()
  }, [regenerate])

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyMessage = useCallback(async (message: ChatMessage) => {
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => ("text" in part ? part.text : ""))
      .join("\n")
      .trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setCopiedId(message.id)
    window.setTimeout(
      () => setCopiedId((current) => (current === message.id ? null : current)),
      2000
    )
  }, [])

  // Composer is uncontrolled, so ↑/↓ recall writes the DOM value directly.
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const sentRef = useRef<string[]>([])
  const historyIndexRef = useRef<number | null>(null)

  const setDraft = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.value = text
    textarea.setSelectionRange(text.length, text.length)
  }

  // ↑ walks back through sent prompts (from an empty draft or mid-walk);
  // ↓ walks forward, returning to an empty draft past the newest entry.
  const handleTextareaKeyDown = (
    e: ReactKeyboardEvent<HTMLTextAreaElement>
  ) => {
    const sent = sentRef.current
    if (e.key === "ArrowUp" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const index = historyIndexRef.current
      if ((e.currentTarget.value !== "" && index === null) || sent.length === 0)
        return
      e.preventDefault()
      const next = index === null ? sent.length - 1 : Math.max(0, index - 1)
      historyIndexRef.current = next
      setDraft(sent[next] ?? "")
    } else if (e.key === "ArrowDown" && historyIndexRef.current !== null) {
      e.preventDefault()
      const next = historyIndexRef.current + 1
      const text = next < sent.length ? (sent[next] ?? "") : ""
      historyIndexRef.current = next < sent.length ? next : null
      setDraft(text)
    }
  }

  // Escape stops a running turn from anywhere on the page; "/" focuses the
  // composer. Both stand down inside Base UI popups (dialogs, menus), where
  // Escape must keep closing the popup and typing goes to its own fields.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as Element | null
      // Every Base UI popup (dialog, menu, select, popover) sets this.
      if (target?.closest?.("[data-base-ui-focusable]")) return
      if (event.key === "Escape") {
        if (
          statusRef.current === "submitted" ||
          statusRef.current === "streaming"
        ) {
          event.preventDefault()
          stop()
        }
        return
      }
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !target?.closest?.("input, textarea, select, [contenteditable='true']")
      ) {
        event.preventDefault()
        textareaRef.current?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [stop])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* TEMPORARY debug strip — remove once reload-resume is confirmed. */}
      <div className="border-b border-dashed px-4 py-1 font-mono text-[10px] text-muted-foreground">
        {`session=${initialSessions ? "ok" : resumeError ? `failed: ${resumeError}` : "none"} status=${status} msgs=${messages.length} events=${JSON.stringify(streamEvents)}`}
      </div>
      <Conversation className="min-h-0 flex-1">
        {messages.length === 0 ? (
          <ConversationEmptyState
            icon={<ChatAvatar seed={avatar} className="size-12" />}
            title={name}
            description={`Say hello to start the conversation with ${name}.`}
          />
        ) : (
          <ConversationContent>
            {messages.map((message, index) => {
              const isLastAssistant =
                index === messages.length - 1 && message.role === "assistant"
              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, partIndex) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <MessageResponse key={partIndex}>
                              {part.text}
                            </MessageResponse>
                          )
                        case "reasoning":
                          return (
                            <Reasoning
                              defaultOpen={false}
                              isStreaming={part.state === "streaming"}
                              key={partIndex}
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
                            </Reasoning>
                          )
                      }
                    })}
                  </MessageContent>
                  {status !== "submitted" && (
                    <MessageActions
                      className={
                        message.role === "user"
                          ? "self-end opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                          : isLastAssistant && status === "ready"
                            ? "opacity-100 transition-opacity"
                            : "opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                      }
                    >
                      <MessageAction
                        onClick={() => void copyMessage(message)}
                        tooltip={copiedId === message.id ? "Copied" : "Copy"}
                      >
                        {copiedId === message.id ? (
                          <CheckIcon className="size-4" />
                        ) : (
                          <CopyIcon className="size-4" />
                        )}
                      </MessageAction>
                      {isLastAssistant && status === "ready" && (
                        <MessageAction
                          onClick={regenerateLast}
                          tooltip="Regenerate"
                        >
                          <RefreshCwIcon className="size-4" />
                        </MessageAction>
                      )}
                    </MessageActions>
                  )}
                </Message>
              )
            })}
            {status === "submitted" && (
              <div
                aria-label="Assistant is thinking"
                className="flex items-center gap-1.5 px-1 py-2"
                role="status"
              >
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
              </div>
            )}
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>
      <div className="p-4">
        <PromptInput
          onSubmit={(message) => {
            const text = message.text?.trim()
            if (!text) return
            const sent = sentRef.current
            if (sent[sent.length - 1] !== text) {
              sent.push(text)
              if (sent.length > 100) sent.shift()
            }
            historyIndexRef.current = null
            sendMessage({ text })
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea
              autoFocus
              onKeyDown={handleTextareaKeyDown}
              placeholder={`Message ${name}...`}
              ref={textareaRef}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Kbd>↵</Kbd> send
              </span>
              <span className="flex items-center gap-1">
                <Kbd>⇧</Kbd>
                <Kbd>↵</Kbd> newline
              </span>
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd> history
              </span>
              <span className="flex items-center gap-1">
                <Kbd>esc</Kbd> stop
              </span>
            </div>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
        {error && (
          <div className="mt-2 flex items-center gap-3 text-sm text-destructive">
            <p>Something went wrong: {error.message || "please try again."}</p>
            <Button
              onClick={regenerateLast}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCwIcon />
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
