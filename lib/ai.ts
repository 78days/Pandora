import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

// 书生·端砚 (Intern InkStone) Discovery API, an OpenAI-compatible endpoint.
// Its own models (Atria-Dawn, intern-s2, Agents-A1, Sage-A1.5) are free;
// third-party ones (DeepSeek, GLM, Kimi, ...) deduct "ink points".
export const internAI = createOpenAICompatible({
  name: "intern-ai",
  baseURL: "https://discovery-api.intern-ai.org.cn/v1",
  apiKey: process.env.INTERN_AI_API_KEY,
})

export const chatModel = internAI("Atria-Dawn")
