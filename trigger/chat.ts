import { chat } from "@trigger.dev/sdk/ai"
import { z } from "zod"

import { chatModel } from "../lib/ai"

// One durable conversation per chat id. History lives in the default
// transcript storage (keyed by chatId); the bot's personality arrives from
// the browser as clientData on every turn.
export const pandoraChat = chat.agent({
  id: "pandora-chat",
  clientDataSchema: z.object({
    instructions: z.string().nullish(),
  }),
  run: async ({ messages, clientData, signal, streamText }) =>
    streamText({
      model: chatModel,
      system: clientData?.instructions ?? undefined,
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
      abortSignal: signal,
      maxOutputTokens: 8192,
    }),
})
