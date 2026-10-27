"use client"

import { useChat } from "@ai-sdk/react"
import type { ChatSessionPersistedState } from "@trigger.dev/sdk/chat"
import {
  useTriggerChatTransport,
  type InferChatUIMessage,
} from "@trigger.dev/sdk/chat/react"
import type { ToolUIPart } from "ai"
import { cn } from "cn"
import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react"

import {
  loadChatTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/actions/chat"
import { CodeBlock } from "@/components/ai-elements/code-block"
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
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool"
import { ChatAvatar } from "@/components/chat-avatar"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import type { ChatMember } from "@/queries/chats"
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
  kind,
  name,
  members,
}: {
  chatId: string
  kind: "direct" | "group"
  // Direct chats are named by their bot, groups by the dialog's name.
  name: string
  members: ChatMember[]
}) {
  const [load, setLoad] = useState<Load>({ chatId, status: "loading" })
  // The session is initialized with the first member's identity; the
  // transport's live clientData carries the composer's selection per turn.
  const {
    id: firstBotId,
    name: firstBotName,
    job: firstBotJob,
    instructions: firstBotInstructions,
    sandboxId: firstBotSandboxId,
  } = members[0]

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
              clientData: {
                name: firstBotName,
                job: firstBotJob,
                instructions: firstBotInstructions,
                sandboxId: firstBotSandboxId,
                botId: firstBotId,
              },
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
            initialMessages: transcript.messages as ChatMessage[],
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
  }, [
    chatId,
    firstBotId,
    firstBotName,
    firstBotJob,
    firstBotInstructions,
    firstBotSandboxId,
  ])

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
      kind={kind}
      name={name}
      members={members}
      initialMessages={current.initialMessages}
      initialSessions={current.initialSessions}
      resumeError={current.resumeError}
    />
  )
}

function ChatView({
  chatId,
  kind,
  name,
  members,
  initialMessages,
  initialSessions,
  resumeError,
}: {
  chatId: string
  kind: "direct" | "group"
  name: string
  members: ChatMember[]
  initialMessages: ChatMessage[]
  initialSessions?: Record<string, ChatSessionPersistedState>
  resumeError?: string
}) {
  // TEMPORARY debug strip data — counts of transport lifecycle events.
  const [streamEvents, setStreamEvents] = useState<Record<string, number>>({})

  // Who the next turn goes to. Direct chats have a single member; groups pick
  // in the composer. A stale id (navigated away and back) falls back to the
  // first member.
  const [selectedBotId, setSelectedBotId] = useState(members[0].id)
  const selectedBot =
    members.find((member) => member.id === selectedBotId) ?? members[0]

  const transport = useTriggerChatTransport<typeof pandoraChat>({
    task: "pandora-chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
    // Untrusted input by design: it only shapes the bot's personality.
    // Ownership is enforced server-side in the actions, and the sandbox a
    // turn may touch is resolved from the DB by chatId + botId membership.
    // Live-updates on a composer selection so the next send targets that bot.
    clientData: {
      name: selectedBot.name,
      job: selectedBot.job,
      instructions: selectedBot.instructions,
      sandboxId: selectedBot.sandboxId,
      botId: selectedBot.id,
    },
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
            : (transcript.messages as ChatMessage[])
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
                  : (transcript.messages as ChatMessage[])
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
            icon={
              kind === "group" ? (
                <GroupChatAvatar
                  avatars={members.map((member) => member.avatar)}
                  className="size-12"
                />
              ) : (
                <ChatAvatar seed={members[0].avatar} className="size-12" />
              )
            }
            title={name}
            description={`Say hello to start the conversation with ${selectedBot.name}.`}
          />
        ) : (
          <ConversationContent>
            {messages.map((message, index) => {
              const isLastAssistant =
                index === messages.length - 1 && message.role === "assistant"
              // Group chats attribute each answer to its bot through the
              // metadata stamped server-side; messages without it (older
              // history) render as before.
              const messageBot =
                kind === "group" && message.role === "assistant"
                  ? members.find(
                      (member) => member.id === message.metadata?.botId
                    )
                  : undefined
              // ...and each user message names the bot it was addressed to,
              // recorded at send time.
              const addressedBot =
                kind === "group" && message.role === "user"
                  ? members.find(
                      (member) => member.id === message.metadata?.botId
                    )
                  : undefined
              const messageParts = message.parts.map((part, partIndex) => {
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

                if (part.type.startsWith("tool-")) {
                  // The agent's own eyes: never part of the visible chat.
                  if (part.type === "tool-view_screen") return null
                  return <ToolCall part={part as ToolUIPart} key={partIndex} />
                }
              })

              return (
                <Message
                  className={
                    messageBot ? "flex-row items-start gap-2" : undefined
                  }
                  from={message.role}
                  key={message.id}
                >
                  {messageBot && (
                    <ChatAvatar
                      seed={messageBot.avatar}
                      className="mt-0.5 size-6 shrink-0"
                    />
                  )}
                  <div
                    className={cn(
                      "flex min-w-0 flex-col gap-2",
                      messageBot && "flex-1"
                    )}
                  >
                    <MessageContent>
                      {addressedBot ? (
                        // The tag rides on the first line, as if the user
                        // named the bot at the start of their message.
                        <div className="flex items-start gap-2">
                          <Badge
                            className="max-w-40 gap-1.5 pl-1"
                            variant="outline"
                          >
                            <ChatAvatar
                              seed={addressedBot.avatar}
                              className="size-4 shrink-0"
                            />
                            <span className="truncate">
                              {addressedBot.name}
                            </span>
                          </Badge>
                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                            {messageParts}
                          </div>
                        </div>
                      ) : (
                        messageParts
                      )}
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
                  </div>
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
            // Group chats record the addressed bot on the message itself, so
            // the badge survives reloads.
            sendMessage({
              text,
              metadata:
                kind === "group" ? { botId: selectedBot.id } : undefined,
            })
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea
              autoFocus
              onKeyDown={handleTextareaKeyDown}
              placeholder={`Message ${selectedBot.name}...`}
              ref={textareaRef}
            />
          </PromptInputBody>
          <PromptInputFooter>
            {kind === "group" ? (
              <PromptInputTools>
                <PromptInputSelect
                  value={selectedBot.id}
                  onValueChange={(value) => setSelectedBotId(value as string)}
                >
                  <PromptInputSelectTrigger aria-label="Bot to talk to">
                    <PromptInputSelectValue>
                      {(value: string | null) => {
                        const bot =
                          members.find((member) => member.id === value) ??
                          selectedBot
                        return (
                          <span className="flex items-center gap-1.5">
                            <ChatAvatar seed={bot.avatar} className="size-5" />
                            {bot.name}
                          </span>
                        )
                      }}
                    </PromptInputSelectValue>
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {members.map((member) => (
                      <PromptInputSelectItem key={member.id} value={member.id}>
                        <span className="flex items-center gap-2">
                          <ChatAvatar seed={member.avatar} className="size-5" />
                          {member.name}
                        </span>
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              </PromptInputTools>
            ) : (
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
            )}
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

const toolTitles: Record<string, string> = {
  bash: "Ran a command",
  read_file: "Read a file",
  write_file: "Wrote a file",
  list_files: "Listed files",
  mouse_click: "Clicked",
  mouse_move: "Moved the mouse",
  mouse_scroll: "Scrolled",
  keyboard_type: "Typed text",
  keyboard_press: "Pressed a key",
  show_screen: "Showed the screen",
  handoff: "Handed off",
  get_memory: "Checked memory",
  set_memory: "Remembered",
}

function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined
}

const asText = (value: unknown) => (typeof value === "string" ? value : "")
const asNumber = (value: unknown) => (typeof value === "number" ? value : 0)

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ToolLine({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs break-words">{children}</p>
}

function ToolNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

function OutputBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap">
      {children}
    </pre>
  )
}

// One renderer for every sandbox tool. The backend's `toModelOutput` keeps
// screenshots out of the model context for view_screen, but the raw output
// still arrives here — only show_screen draws it.
function ToolCall({ part }: { part: ToolUIPart }) {
  const name = part.type.slice(5)
  const input = "input" in part ? part.input : undefined
  const output = part.state === "output-available" ? part.output : undefined
  const errorText = part.state === "output-error" ? part.errorText : undefined

  return (
    <Tool defaultOpen={name === "show_screen" || Boolean(errorText)}>
      <ToolHeader
        state={part.state}
        title={toolTitles[name] ?? name}
        type={part.type}
      />
      <ToolContent>
        <ToolDetails input={input} name={name} output={output} />
        {errorText && (
          <p className="text-sm break-words text-destructive">{errorText}</p>
        )}
      </ToolContent>
    </Tool>
  )
}

function ToolDetails({
  name,
  input,
  output,
}: {
  name: string
  input: unknown
  output: unknown
}) {
  switch (name) {
    case "bash": {
      const command = asText(field(input, "command"))
      return (
        <div className="space-y-3">
          {command && <CodeBlock code={command} language="bash" />}
          {output !== undefined && (
            <>
              <OutputBlock>
                {asText(field(output, "output")) || "(no output)"}
              </OutputBlock>
              <ToolNote>
                Exit code {String(field(output, "exitCode") ?? 0)}
              </ToolNote>
            </>
          )}
        </div>
      )
    }

    case "read_file": {
      const binary = field(output, "binary") === true
      return (
        <div className="space-y-2">
          <ToolLine>{asText(field(input, "path"))}</ToolLine>
          {output !== undefined &&
            (binary ? (
              <ToolNote>
                Binary file ({formatBytes(asNumber(field(output, "bytes")))}).
              </ToolNote>
            ) : (
              <OutputBlock>{asText(field(output, "content"))}</OutputBlock>
            ))}
        </div>
      )
    }

    case "write_file":
      return (
        <div className="space-y-2">
          <ToolLine>{asText(field(input, "path"))}</ToolLine>
          {output !== undefined && (
            <ToolNote>
              Wrote {formatBytes(asNumber(field(output, "bytes")))}.
            </ToolNote>
          )}
        </div>
      )

    case "list_files": {
      const entries = Array.isArray(field(output, "entries"))
        ? (field(output, "entries") as unknown[])
        : []
      return (
        <div className="space-y-2">
          <ToolLine>{asText(field(input, "path")) || "."}</ToolLine>
          {entries.length > 0 && (
            <ul className="max-h-60 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs">
              {entries.map((entry, index) => (
                <li className="flex justify-between gap-4 py-0.5" key={index}>
                  <span className="truncate">
                    {asText(field(entry, "name"))}
                    {field(entry, "type") === "dir" ? "/" : ""}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {field(entry, "type") === "dir"
                      ? "dir"
                      : formatBytes(asNumber(field(entry, "size")))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    }

    case "mouse_click":
      return (
        <ToolLine>
          {field(input, "double") === true ? "Double-clicked" : "Clicked"}{" "}
          {asText(field(input, "button")) || "left"} at{" "}
          {asNumber(field(input, "x"))}, {asNumber(field(input, "y"))}
        </ToolLine>
      )

    case "mouse_move":
      return (
        <ToolLine>
          Moved to {asNumber(field(input, "x"))}, {asNumber(field(input, "y"))}
        </ToolLine>
      )

    case "mouse_scroll":
      return (
        <ToolLine>
          Scrolled {asText(field(input, "direction"))} ×
          {asNumber(field(input, "amount")) || 3} at{" "}
          {asNumber(field(input, "x"))}, {asNumber(field(input, "y"))}
        </ToolLine>
      )

    case "keyboard_type":
      return (
        <ToolLine>
          Typed {JSON.stringify(asText(field(input, "text")))}
        </ToolLine>
      )

    case "keyboard_press": {
      const modifiers = Array.isArray(field(input, "modifiers"))
        ? (field(input, "modifiers") as unknown[]).map(asText).join("+")
        : ""
      return (
        <ToolLine>
          Pressed {modifiers ? `${modifiers}+` : ""}
          {asText(field(input, "key"))}
        </ToolLine>
      )
    }

    case "show_screen": {
      const base64 = asText(field(output, "base64"))
      if (!base64)
        return (
          <ToolNote>
            {output === undefined ? "Taking a screenshot…" : "No screenshot."}
          </ToolNote>
        )
      return (
        // The screenshot is a base64 data URL, so next/image cannot optimize it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="The bot's screen"
          className="max-w-full rounded-md border"
          src={`data:${asText(field(output, "mediaType")) || "image/jpeg"};base64,${base64}`}
        />
      )
    }

    case "handoff": {
      const name = asText(field(output, "handedTo"))
      const reason = asText(field(output, "reason"))
      if (!name) return <ToolNote>Handing off to another bot…</ToolNote>
      return (
        <ToolNote>
          Handed off to {name}.{reason ? ` ${reason}` : ""}
        </ToolNote>
      )
    }

    case "get_memory": {
      if (output === undefined) return <ToolNote>Checking memory…</ToolNote>
      return (
        <OutputBlock>
          {asText(field(output, "memory")) || "(empty)"}
        </OutputBlock>
      )
    }

    case "set_memory": {
      const content = asText(field(input, "content"))
      return (
        <ToolNote>
          {content ? `Remembered: ${content}` : "Saving to memory…"}
        </ToolNote>
      )
    }

    default:
      return <OutputBlock>{JSON.stringify(input ?? null, null, 2)}</OutputBlock>
  }
}
