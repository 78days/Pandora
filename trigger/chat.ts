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
      messages,
      abortSignal: signal,
      maxOutputTokens: 8192,
    }),
})
