import { chat, type InferChatUIMessageFromTools } from "@trigger.dev/sdk/ai"
import { isStepCount, tool } from "ai"
import { asc, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "../db"
import { bots, chatMembers, chats } from "../db/schema"
import { chatModel } from "../lib/ai"
import { Sentry } from "./sentry"
import { createTools, type PandoraTools } from "./tools"
import { assertTokenQuota, chatUserId, recordTurnUsage } from "./usage"

// Sent with each message. The bot a group chat's message is addressed to;
// everything else about the bot is read from the database, so a forged
// payload can only pick among the chat's own members.
const clientDataSchema = z
  .object({
    botId: z.string().nullish(),
  })
  .optional()

type TurnBot = {
  id: string
  name: string
  job: string
  instructions: string | null
  sandboxId: string | null
}

// A chat's bots and the one answering this turn, straight from the database.
// No session here: the chat's owner was checked when the session started.
// botId comes from the browser, so it only ever picks among the chat's own
// members; without one (or with a stale one) the first member answers.
async function getTurnContext(chatId: string, botId?: string | null) {
  const rows = await db
    .select({
      chat: {
        id: chats.id,
        userId: chats.userId,
        kind: chats.kind,
        name: chats.name,
      },
      bot: {
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
    .where(eq(chats.id, chatId))
    .orderBy(asc(chatMembers.joinedAt))

  const [first] = rows
  const members = rows.map((row) => row.bot)
  const bot = members.find((member) => member.id === botId) ?? members[0]
  if (!first || !bot) throw new Error("Bot is not in this chat")

  return {
    chat: first.chat,
    members,
    bot: bot as TurnBot,
  }
}

// What a bot is told on top of its own job when it answers in a group chat
function groupBriefing(
  bot: TurnBot,
  group: { name: string | null; members: TurnBot[] }
) {
  const others = group.members.filter((member) => member.id !== bot.id)
  return [
    group.name
      ? `This is the group chat "${group.name}".`
      : "This is a group chat.",
    others.length > 0
      ? `The other bots here: ${others.map((member) => `${member.name} (${member.job}) — botId "${member.id}"`).join("; ")}.`
      : "You are its only bot.",
    "A human user chats with all of you and picks which bot answers each message; another bot can also hand the conversation to you mid-turn.",
    others.length > 0
      ? "If the user's message is clearly a better fit for another bot's job than yours, call the handoff tool with that bot's botId instead of answering yourself. Hand off only on a clear mismatch — anything within your own job is yours to handle. Never pass a request back to a bot that handed it to you."
      : undefined,
  ]
    .filter(Boolean)
    .join(" ")
}

// Base identity for every bot: name, job, purpose, and its sandbox
// environment. The creator's instructions come so they read as additional,
// bot-specific direction on top of the shared frame. Group chats add a
// briefing: who else is here, how turns are chosen, and when to hand the
// conversation off. Read from the database every turn, so edits to a bot
// apply to its next message.
function systemPrompt(bot: TurnBot, group: GroupTurn | null) {
  return [
    `You are ${bot.name}, a bot in Pandora — a space where people create their own bots and chat with them.`,
    `Your job: ${bot.job}.`,
    `Your purpose is to be the user's bot: converse naturally, stay in character as ${bot.name}, and help with whatever they bring.`,
    bot.instructions
      ? `Instructions from your creator:\n${bot.instructions}`
      : undefined,
    bot.sandboxId
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
    group ? groupBriefing(bot, group) : undefined,
  ]
    .filter(Boolean)
    .join("\n\n")
}

type GroupTurn = {
  name: string | null
  members: TurnBot[]
}

// Run-scoped state: the bot that currently holds the mic. Each turn starts
// with the composer's selection; a handoff rewrites it mid-turn, and the
// per-step persona swap and the message metadata read it so they stay in
// agreement about who is speaking.
const currentBot = chat.local<{ botId?: string }>({ id: "pandoraRespondent" })

// The handoff tool for group chats. The target is validated against the
// turn's DB-loaded member list, so a hallucinated or foreign botId errors
// the call instead of switching personas. The `held` set keeps a request
// from bouncing between bots. A successful handoff rewrites the
// mic-holder; the run's prepareStep picks it up before the next step.
function createHandoffTool(params: {
  chatId: string
  members: TurnBot[]
  held: Set<string>
  onHandoff: (target: TurnBot) => void
}) {
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
      const target = params.members.find((member) => member.id === botId)
      if (!target) {
        throw new Error("That bot is not a member of this group.")
      }
      if (target.id === currentBot.botId) {
        throw new Error("That is your own botId — pick a different member.")
      }
      // Keeps a request from bouncing between bots
      if (params.held.has(target.id)) {
        Sentry.logger.warn("Handoff refused: bot already had it", {
          "pandora.chat.id": params.chatId,
          "pandora.handoff.from": currentBot.botId,
          "pandora.handoff.to": target.id,
        })
        throw new Error(
          `${target.name} already had this request. Answer it yourself.`
        )
      }

      Sentry.logger.info("Turn handed off", {
        "pandora.chat.id": params.chatId,
        "pandora.handoff.from": currentBot.botId,
        "pandora.handoff.to": target.id,
      })

      params.onHandoff(target)
      return { botId: target.id, name: target.name, reason }
    },
  })
}

type HandoffTool = ReturnType<typeof createHandoffTool>

// One durable conversation per chat id. History lives in the default
// transcript storage (keyed by chatId); the answering bot is resolved from
// the database each turn. The message type pins each tool part's
// input/output so the chat UI can render them typed, and carries the
// responding bot's id so group chats can attribute each answer.
export type ChatMessageMetadata = { botId?: string }

export type ChatMessage = InferChatUIMessageFromTools<
  PandoraTools & { handoff: HandoffTool }
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
  // error chunk and keeps the session alive. Report them for monitoring, and
  // record the tokens they spent all the same (fires for stopped turns too).
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

    // A stopped or failed turn still consumed model tokens; the stream's
    // onFinish does not run for them, so the ledger entry is written here.
    try {
      const tokens =
        (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0)
      const userId = await chatUserId(chatId)
      if (userId && tokens > 0) {
        await recordTurnUsage({ chatId, userId, tokens, sandboxMinutes: 0 })
      }
    } catch (ledgerError) {
      Sentry.captureException(ledgerError, {
        tags: { "pandora.chat.id": chatId },
      })
    }
  },
  // Resolved per turn. The turn context is the DB's answer to who is in this
  // chat; a handoff moves the mic and the sandbox tools to another member.
  // Group chats additionally get the handoff tool — decided by the chat row,
  // never by what the browser claims.
  tools: async ({ chatId, clientData }) => {
    const {
      chat: row,
      members,
      bot,
    } = await getTurnContext(chatId, clientData?.botId)

    // Whoever holds the turn; a handoff moves it, and the sandbox tools with it
    let current = bot
    const held = new Set([bot.id])

    // Sandbox tools exist only for a bot that has a sandbox to point at
    const sandboxTools = current.sandboxId
      ? createTools({
          getSandboxId: () => current.sandboxId ?? undefined,
          getUserId: () => row.userId,
        })
      : {}

    if (row.kind !== "group") return sandboxTools

    return {
      ...sandboxTools,
      handoff: createHandoffTool({
        chatId: row.id,
        members,
        held,
        onHandoff: (target) => {
          current = target
          held.add(target.id)
          currentBot.botId = target.id
        },
      }),
    }
  },
  run: async ({ chatId, clientData, messages, tools, signal, streamText }) => {
    // Read every turn, so edits to the bots apply to the next message
    const {
      chat: row,
      members,
      bot,
    } = await getTurnContext(chatId, clientData?.botId)
    const group: GroupTurn | null =
      row.kind === "group" ? { name: row.name, members } : null

    // The billable AI spend happens in this turn — check the token allowance
    // before any model call, so an exhausted plan blocks here instead of
    // streaming an answer it already paid for.
    await assertTokenQuota(row.userId)

    // Fresh turn: the mic returns to the composer's selection before anything
    // reads it.
    currentBot.botId = bot.id
    const startBotId = bot.id
    const turnStartedAt = Date.now()

    // Every assistant message carries the bot that started it; after a
    // handoff the reply's later sections are attributed through the handoff
    // tool's output, so the UI can show who wrote each stretch.
    chat.setUIMessageStreamOptions({
      messageMetadata: () => ({ botId: startBotId }),
    })

    return streamText({
      model: chatModel,
      system: systemPrompt(bot, group),
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
      tools,
      // Room for a full computer-use loop: look, act, look again, repeat.
      stopWhen: isStepCount(30),
      abortSignal: signal,
      maxOutputTokens: 8192,
      // The ledger entry for the turn's sandbox time: the turn's wall clock,
      // charged in whole minutes and only when a sandbox tool actually ran
      // (the handoff tool never touches one). Tokens are recorded in
      // onTurnComplete, which also fires for stopped and failed turns.
      // Ledger failures must never fail a turn that already answered.
      onFinish: async (event) => {
        try {
          const touchedSandbox = event.toolCalls.some(
            (call) => call.toolName !== "handoff"
          )
          const sandboxMinutes = touchedSandbox
            ? Math.max(1, Math.ceil((Date.now() - turnStartedAt) / 60_000))
            : 0
          if (sandboxMinutes > 0) {
            await recordTurnUsage({
              chatId,
              userId: row.userId,
              tokens: 0,
              sandboxMinutes,
            })
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
            const respondent = members.find(
              (member) => member.id === currentBot.botId
            )
            if (!respondent || respondent.id === startBotId) return
            return {
              instructions: systemPrompt(respondent, group),
            }
          }
        : undefined,
    })
  },
})
