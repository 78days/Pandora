import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

// Token Harbor, an OpenAI-compatible gateway. The ":free" route is never
// billed but rate-limits once the rolling 7-day allowance runs out.
export const tokenHarbor = createOpenAICompatible({
  name: "tokenharbor",
  baseURL: "https://tokenharbor.ai/v1",
  apiKey: process.env.TOKENHARBOR_API_KEY,
})

// deepseek-v4.1-flash takes tools and image inputs, which the computer-use
// tools need for their screenshot vision pass.
export const chatModel = tokenHarbor("deepseek-v4.1-flash:free")
