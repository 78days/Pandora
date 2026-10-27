import { chat, type InferChatUIMessageFromTools } from "@trigger.dev/sdk/ai"
import { isStepCount, tool } from "ai"
import { and, asc, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "../db"
import { bots, chatMembers, chats } from "../db/schema"
import { chatModel } from "../lib/ai"
import { Sentry } from "./sentry"
import { createTools, type PandoraTools } from "./tools"
import { assertTokenQuota, chatUserId, recordTurnUsage } from "./usage"

const clientDataSchema = z.object({
  name: z.string().min(1),
  job: z.string().min(1),
  instructions: z.string().nullish(),
  sandboxId: z.string().nullish(),
  // Group chats: which member this turn goes to, chosen in the composer and
  // threaded through the transport's per-turn metadata. Only the personality
  // is trusted from the browser; the sandbox is still resolved from the DB.
  botId: z.string().nullish(),
})

type BotClientData = z.infer<typeof clientDataSchema>

// Run-scoped state: the bot that currently holds the mic. Each turn starts
// with the composer's selection; a handoff rewrites it mid-turn, and the
// sandbox tools, the per-step persona swap, and the message metadata all read
// it so they stay in agreement about who is speaking.
const currentBot = chat.local<{ botId?: string }>({ id: "pandoraRespondent" })

// The group's member roster, loaded from the DB per turn — the system prompt
// and handoff validation never trust a browser-supplied member list.
type GroupTurnMember = {
  id: string
  name: string
  job: string
  instructions: string | null
  sandboxId: string | null
}

type GroupTurn = {
  name: string | null
  members: GroupTurnMember[]
}

async function groupForTurn(chatId: string): Promise<GroupTurn | null> {
  const rows = await db
    .select({
      name: chats.name,
      member: {
        id: bots.id,
        name: bots.name,
        job: bots.job,
        instructions: bots.instructions,
        sandboxId: bots.sandboxId,
      },
    })
    .from(chats)
    .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .innerJoin(bots, eq(bots.id, chatMembers.botId))
    .where(and(eq(chats.id, chatId), eq(chats.kind, "group")))
    .orderBy(asc(chatMembers.joinedAt))

  const [first] = rows
  if (!first) return null
  return { name: first.name, members: rows.map((row) => row.member) }
}

async function chatKind(chatId: string) {
  const [row] = await db
    .select({ kind: chats.kind })
    .from(chats)
    .where(eq(chats.id, chatId))
  return row?.kind ?? null
}

// Base identity for every bot: name, job, purpose, and its sandbox
// environment. The creator's instructions come last so they read as
// additional, bot-specific direction on top of the shared frame. Group chats
// add a briefing: who else is here, how turns are chosen, and when to hand
// the conversation off.
function systemPrompt(
  clientData: BotClientData | undefined,
  group: GroupTurn | null
) {
  if (!clientData) return undefined

  return [
    `You are ${clientData.name}, a bot in Pandora — a space where people create their own bots and chat with them.`,
    `Your job: ${clientData.job}.`,
    `Your purpose is to be the user's bot: converse naturally, stay in character as ${clientData.name}, and help with whatever they bring.`,
    group ? groupBriefing(clientData, group) : undefined,
    clientData.sandboxId
      ? [
          "You have your own sandbox environment: a dedicated, isolated Linux computer that was created for you and is linked only to you.",
          "You can control it with tools: bash, read_file, write_file, list_files, and mouse/keyboard control of its desktop.",
          "Call view_screen to look at the screen before clicking or typing into a GUI, and again after acting to check the result — it is your eyes and is never shown to the user.",
          "Call show_screen instead when the user asks to see the screen or what you are doing; it displays the screenshot in the chat.",
          "Mouse and keyboard tools use coordinates in screen pixels.",
          "You also keep a persistent memory, shared across every conversation you take part in — private 1:1 chats and group chats alike — through the get_memory and set_memory tools.",
          "When you learn something durable about the user — preferences, projects, ongoing threads, facts they share about themselves — call set_memory right away with a short one-line fact. Entries are appended in order; on the same topic, later ones supersede earlier ones.",
          "Before answering anything that might depend on an earlier conversation — 'do you remember…', references to past chats, or anything they may have told you privately — call get_memory first and base your answer on what it returns.",
          "Memory is how things said to you in private stay with you: note them as you go and you can recall them later, even when asked in a group chat.",
        ].join(" ")
      : undefined,
    clientData.instructions
      ? `Instructions from your creator:\n${clientData.instructions}`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n\n")
}

function groupBriefing(clientData: BotClientData, group: GroupTurn) {
  const others = group.members.filter(
    (member) => member.id !== clientData.botId
  )
  return [
    group.name
      ? `This is the group chat "${group.name}".`
      : "This is a group chat.",
    others.length > 0
      ? `The other bots here: ${others.map((member) => `${member.name} (${member.job}) — botId "${member.id}"`).join("; ")}.`
      : "You are its only bot.",
    "A human user chats with all of you and picks which bot answers each message; another bot can also hand the conversation to you mid-turn.",
    others.length > 0
      ? "If the user's message is clearly a better fit for another bot's job than yours, call the handoff tool with that bot's botId instead of answering yourself. Hand off only on a clear mismatch — anything within your own job is yours to handle."
      : undefined,
  ]
    .filter(Boolean)
    .join(" ")
}

// Resolves only for group chats. The target is validated against the chat's
// DB membership, so a hallucinated or foreign botId errors the call instead
// of switching personas. A successful handoff rewrites the mic-holder; the
// run's prepareStep picks it up before the next step.
function createHandoffTool(chatId: string) {
  return tool({
    description:
      "Hand the conversation to another bot in this group when their job fits the user's message better than yours. The handoff takes effect immediately — the other bot continues as you and writes the reply, so do not answer yourself after a successful handoff.",
    inputSchema: z.object({
      botId: z
        .string()
        .describe(
          'The botId of the group member to hand off to, e.g. "abc123".'
        ),
      reason: z
        .string()
        .describe("One short sentence on why that bot fits better."),
    }),
    execute: async ({ botId, reason }) => {
      if (botId === currentBot.botId) {
        throw new Error("That is your own botId — pick a different member.")
      }

      const [target] = await db
        .select({ id: bots.id, name: bots.name, job: bots.job })
        .from(bots)
        .innerJoin(chatMembers, eq(chatMembers.botId, bots.id))
        .where(and(eq(chatMembers.chatId, chatId), eq(bots.id, botId)))
        .limit(1)

      if (!target) throw new Error("That bot is not a member of this group.")

      const from = currentBot.botId
      currentBot.botId = target.id
      Sentry.logger.info("Turn handed off", {
        "pandora.chat.id": chatId,
        "pandora.handoff.from": from ?? "unknown",
        "pandora.handoff.to": target.id,
      })
      return { handedTo: target.name, theirJob: target.job, reason }
    },
  })
}

// One durable conversation per chat id. History lives in the default
// transcript storage (keyed by chatId); the bot's identity and personality
// arrive from the browser as clientData on every turn. The message type pins
// each tool part's input/output so the chat UI can render them typed, and
// carries the responding bot's id so group chats can attribute each answer.
export type ChatMessageMetadata = { botId?: string }

export type ChatMessage = InferChatUIMessageFromTools<
  PandoraTools & { handoff: ReturnType<typeof createHandoffTool> }
> & {
  metadata?: ChatMessageMetadata
}

export const pandoraChat = chat.withUIMessage<ChatMessage>().agent({
  id: "pandora-chat",
  clientDataSchema,
  // Initialized on every fresh worker so `currentBot` is writable from the
  // run, the tools, and the handoff. run() re-points it each turn.
  onBoot: async ({ clientData }) => {
    currentBot.init({ botId: clientData?.botId ?? undefined })
  },
  // Errored turns don't fail the run — the runtime converts the throw into an
  // error chunk and keeps the session alive. Report them for monitoring; the
  // quota gate in run() lands here too.
  onTurnComplete: async ({ chatId, totalUsage, stopped, error }) => {
    Sentry.logger.info("Chat turn completed", {
      "pandora.chat.id": chatId,
      "pandora.tokens":
        (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0),
      "pandora.stopped": stopped,
      "pandora.errored": error !== undefined,
    })
    if (error) {
      Sentry.captureException(error, { tags: { chatId } })
    }
  },
  // Resolved once per turn. Group chats additionally get the handoff tool,
  // decided by the chat row — never by what the browser claims.
  tools: async ({ chatId }) => {
    const sandboxTools = createTools(chatId, () => currentBot.botId)
    return (await chatKind(chatId)) === "group"
      ? { ...sandboxTools, handoff: createHandoffTool(chatId) }
      : sandboxTools
  },
  run: async ({ messages, clientData, chatId, signal, streamText, tools }) => {
    // The billable AI spend happens in this turn — check the token allowance
    // before any model call, so an exhausted plan blocks here instead of
    // streaming an answer it already paid for.
    const userId = await chatUserId(chatId)
    if (userId) await assertTokenQuota(userId)

    // Fresh turn: the mic returns to the composer's selection before anything
    // reads it.
    currentBot.botId = clientData?.botId ?? undefined
    const startBotId = currentBot.botId
    const group = await groupForTurn(chatId)
    const turnStartedAt = Date.now()

    // Every assistant message carries the bot that produced it — the final
    // respondent once a handoff has switched speakers — so the UI can render
    // its avatar in group chats.
    chat.setUIMessageStreamOptions({
      messageMetadata: () => {
        const botId = currentBot.botId
        return botId ? { botId } : undefined
      },
    })

    return streamText({
      model: chatModel,
      system: systemPrompt(clientData, group),
      // The transcript stores each turn's reasoning parts; fed back to a
      // reasoning model they get echoed — the previous answer reappeared
      // verbatim inside the next turn's thinking. Only final answers belong
      // in the model's context.
      messages: messages.map((message) => {
        if (
          message.role !== "assistant" ||
          typeof message.content === "string"
        ) {
          return message
        }
        return {
          ...message,
          content: message.content.filter(
            (part) =>
              part.type !== "reasoning" && part.type !== "reasoning-file"
          ),
        }
      }),
      tools: group ? tools : clientData?.sandboxId ? tools : {},
      // Room for a full computer-use loop: look, act, look again, repeat.
      stopWhen: isStepCount(30),
      abortSignal: signal,
      maxOutputTokens: 8192,
      // The ledger entry for this turn. Tokens come straight from the
      // aggregated usage; sandbox time is the turn's wall clock, charged in
      // whole minutes and only when a sandbox tool actually ran (the handoff
      // tool never touches one). Ledger failures must never fail a turn
      // that already answered.
      onFinish: async (event) => {
        try {
          const tokens =
            (event.usage.inputTokens ?? 0) + (event.usage.outputTokens ?? 0)
          const touchedSandbox = event.toolCalls.some(
            (call) => call.toolName !== "handoff"
          )
          const sandboxMinutes = touchedSandbox
            ? Math.max(1, Math.ceil((Date.now() - turnStartedAt) / 60_000))
            : 0
          if (userId && (tokens > 0 || sandboxMinutes > 0)) {
            await recordTurnUsage({ chatId, userId, tokens, sandboxMinutes })
          }
        } catch (ledgerError) {
          // A dropped ledger entry is billing data loss — worth an issue.
          Sentry.captureException(ledgerError, {
            tags: { "pandora.chat.id": chatId },
          })
        }
      },
      // After a handoff tool call, every later step of this turn runs as the
      // target bot: `instructions` replaces the system prompt and carries
      // forward. The SDK chains this after its own prepareStep, so steering,
      // compaction and injected context keep working.
      prepareStep: group
        ? async () => {
            const respondent = group.members.find(
              (member) => member.id === currentBot.botId
            )
            if (!respondent || respondent.id === startBotId) return
            return {
              instructions: systemPrompt(
                {
                  name: respondent.name,
                  job: respondent.job,
                  instructions: respondent.instructions,
                  sandboxId: respondent.sandboxId,
                  botId: respondent.id,
                },
                group
              ),
            }
          }
        : undefined,
    })
  },
})
