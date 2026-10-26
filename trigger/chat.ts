import { chat, type InferChatUIMessageFromTools } from "@trigger.dev/sdk/ai"
import { isStepCount } from "ai"
import { z } from "zod"

import { chatModel } from "../lib/ai"
import { createTools, type PandoraTools } from "./tools"

const clientDataSchema = z.object({
  name: z.string().min(1),
  job: z.string().min(1),
  instructions: z.string().nullish(),
  sandboxId: z.string().nullish(),
})

type BotClientData = z.infer<typeof clientDataSchema>

// Base identity for every bot: name, job, purpose, and its sandbox
// environment. The creator's instructions come last so they read as
// additional, bot-specific direction on top of the shared frame.
function systemPrompt(clientData: BotClientData | undefined) {
  if (!clientData) return undefined

  return [
    `You are ${clientData.name}, a bot in Pandora — a space where people create their own bots and chat with them.`,
    `Your job: ${clientData.job}.`,
    `Your purpose is to be the user's bot: converse naturally, stay in character as ${clientData.name}, and help with whatever they bring.`,
    clientData.sandboxId
      ? [
          "You have your own sandbox environment: a dedicated, isolated Linux computer that was created for you and is linked only to you.",
          "You can control it with tools: bash, read_file, write_file, list_files, and mouse/keyboard control of its desktop.",
          "Call view_screen to look at the screen before clicking or typing into a GUI, and again after acting to check the result — it is your eyes and is never shown to the user.",
          "Call show_screen instead when the user asks to see the screen or what you are doing; it displays the screenshot in the chat.",
          "Mouse and keyboard tools use coordinates in screen pixels.",
        ].join(" ")
      : undefined,
    clientData.instructions
      ? `Instructions from your creator:\n${clientData.instructions}`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n\n")
}

// One durable conversation per chat id. History lives in the default
// transcript storage (keyed by chatId); the bot's identity and personality
// arrive from the browser as clientData on every turn. The message type pins
// each tool part's input/output so the chat UI can render them typed.
export type ChatMessage = InferChatUIMessageFromTools<PandoraTools>

export const pandoraChat = chat.withUIMessage<ChatMessage>().agent({
  id: "pandora-chat",
  clientDataSchema,
  // Resolved once per turn so each tool acts on this chat's sandbox. Only
  // pass them to the model when the bot actually has one; the lookup itself
  // is keyed by chatId, never by the browser-supplied id.
  tools: ({ chatId }) => createTools(chatId),
  run: async ({ messages, clientData, signal, streamText, tools }) =>
    streamText({
      model: chatModel,
      system: systemPrompt(clientData),
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
      tools: clientData?.sandboxId ? tools : {},
      // Room for a full computer-use loop: look, act, look again, repeat.
      stopWhen: isStepCount(30),
      abortSignal: signal,
      maxOutputTokens: 8192,
    }),
})
