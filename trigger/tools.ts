import type { Sandbox } from "@daytona/sdk"
import { generateText, tool } from "ai"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "../db"
import { bots, chatMembers } from "../db/schema"
import { chatModel } from "../lib/ai"
import { getDaytona } from "../lib/daytona"
import { MEMORY_FILE_PATH } from "../lib/memory"

// Text results share one cap: a runaway `cat` of a huge file would otherwise
// fill the model's context and the streamed tool-output record.
const MAX_OUTPUT_CHARS = 50_000

const clamp = (text: string) =>
  text.length > MAX_OUTPUT_CHARS
    ? `${text.slice(0, MAX_OUTPUT_CHARS)}\n…[truncated]`
    : text

// The browser supplies `clientData`, but only the chat row decides which
// sandbox a turn may touch — a forged sandboxId would otherwise reach another
// user's computer. The respondent's botId comes from a getter rather than a
// fixed value: a handoff rewrites it mid-turn, so tool calls after the
// handoff operate the new bot's sandbox. The lookup still runs through the
// DB, so the bot must be a member of the chat for it to land on a sandbox.
async function sandboxForChat(
  chatId: string,
  botId?: string
): Promise<Sandbox> {
  const [row] = await db
    .select({ sandboxId: bots.sandboxId })
    .from(bots)
    .innerJoin(chatMembers, eq(chatMembers.botId, bots.id))
    .where(
      botId
        ? and(eq(chatMembers.chatId, chatId), eq(chatMembers.botId, botId))
        : eq(chatMembers.chatId, chatId)
    )
    .limit(1)

  if (!row?.sandboxId) throw new Error("This bot has no sandbox.")

  const sandbox = await getDaytona().get(row.sandboxId)
  // Sandboxes auto-stop when idle; the next tool call wakes this one.
  if (sandbox.state !== "started") await sandbox.start()
  return sandbox
}

async function computer(sandbox: Sandbox) {
  const { status } = await sandbox.computerUse.getStatus()
  if (status !== "active") await sandbox.computerUse.start()
  return sandbox.computerUse
}

// 1024x768 JPEG at quality 55 is ~40 KB, comfortably under Trigger's ~1 MiB
// tool-output record limit while staying readable for vision models.
async function captureScreen(chatId: string) {
  const sandbox = await sandboxForChat(chatId)
  const use = await computer(sandbox)
  const [shot, display] = await Promise.all([
    use.screenshot.takeCompressed({ format: "jpeg", quality: 55 }),
    use.display.getInfo(),
  ])

  if (!shot.screenshot) throw new Error("Screenshot failed.")

  const primary =
    display.displays?.find((entry) => entry.isActive) ?? display.displays?.[0]

  return {
    base64: shot.screenshot,
    mediaType: "image/jpeg",
    width: primary?.width ?? 0,
    height: primary?.height ?? 0,
  }
}

// OpenAI-compatible tool results can't carry images: the provider drops them
// and the model answers blind. So a vision pass describes the screenshot and
// that text goes back to the agent; show_screen still streams the raw image
// to the chat UI.
async function describeScreen({
  base64,
  width,
  height,
}: {
  base64: string
  width: number
  height: number
}) {
  const result = await generateText({
    model: chatModel,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `You are the eyes of an AI agent controlling this ${width}x${height} Linux desktop.`,
              "Describe only what is visible: the active app or window, readable text, buttons and fields with approximate pixel coordinates, any dialog or error, and where the mouse cursor is.",
              "If the screen is blank or shows only the desktop, say so. Do not invent content. Keep it under 120 words.",
            ].join(" "),
          },
          {
            type: "file",
            mediaType: "image/jpeg",
            data: { type: "data", data: base64 },
          },
        ],
      },
    ],
    // Agents-A1 spends reasoning tokens first; a tight cap can end the step
    // with no visible text at all.
    maxOutputTokens: 2048,
  })

  return (
    result.text.trim() ||
    "Screenshot captured, but describing it failed. Call view_screen again."
  )
}

const textOutput = ({ output }: { output: { description: string } }) => ({
  type: "text" as const,
  value: output.description,
})

export type PandoraTools = ReturnType<typeof createTools>

export function createTools(
  chatId: string,
  getBotId: () => string | undefined
) {
  const sandbox = () => sandboxForChat(chatId, getBotId())

  return {
    bash: tool({
      description:
        "Run a shell command in your Linux sandbox and return its exit code and output.",
      inputSchema: z.object({
        command: z.string().describe("The shell command to run."),
        cwd: z
          .string()
          .optional()
          .describe("Working directory. Defaults to the home directory."),
      }),
      execute: async ({ command, cwd }) => {
        const result = await (
          await sandbox()
        ).process.executeCommand(command, cwd, undefined, 120)
        return {
          exitCode: result.exitCode ?? 0,
          output: clamp(result.result),
        }
      },
    }),

    read_file: tool({
      description: "Read a file from your sandbox as UTF-8 text.",
      inputSchema: z.object({
        path: z.string().describe("Absolute path of the file to read."),
      }),
      execute: async ({ path }) => {
        const buffer = await (await sandbox()).fs.downloadFile(path)
        const binary = buffer.subarray(0, 8192).includes(0)
        return {
          path,
          bytes: buffer.length,
          binary,
          content: binary ? null : clamp(buffer.toString("utf8")),
        }
      },
    }),

    write_file: tool({
      description:
        "Create or overwrite a file in your sandbox with the given text.",
      inputSchema: z.object({
        path: z.string().describe("Absolute path of the file to write."),
        content: z.string().describe("Full text content of the file."),
      }),
      execute: async ({ path, content }) => {
        await (await sandbox()).fs.uploadFile(Buffer.from(content), path)
        return { path, bytes: Buffer.byteLength(content) }
      },
    }),

    list_files: tool({
      description: "List the files and directories at a path in your sandbox.",
      inputSchema: z.object({
        path: z
          .string()
          .optional()
          .describe("Directory to list. Defaults to the home directory."),
      }),
      execute: async ({ path }) => {
        const files = await (await sandbox()).fs.listFiles(path ?? ".")
        return {
          path: path ?? ".",
          truncated: files.length > 500,
          entries: files.slice(0, 500).map((file) => ({
            name: file.name,
            path: file.path,
            type: file.isDir ? "dir" : "file",
            size: file.size,
          })),
        }
      },
    }),

    // The cross-conversation memory: one shared file in the bot's own sandbox,
    // so facts learned in a private 1:1 chat are recallable everywhere,
    // group chats included. Explicit tools rather than prompt-only file
    // instructions — a named call is far more dependable than hoping the
    // model re-derives the file path each turn. The sandbox getter keeps a
    // handed-off turn on the new bot's memory.
    get_memory: tool({
      description:
        "Read your persistent memory: facts you have saved about the user and your past conversations. The memory is shared across every chat you are in — private 1:1 and group chats — so this is where things said in private are recallable. Call this before answering any question that might depend on an earlier conversation.",
      inputSchema: z.object({}),
      execute: async () => {
        const buffer = await (
          await sandbox()
        ).fs
          .downloadFile(MEMORY_FILE_PATH)
          .catch(() => null)
        const memory = buffer?.toString("utf8") ?? ""
        // Memories only ever grow; when the log outgrows the context, the
        // most recent entries at the tail are the ones that matter.
        return {
          memory:
            memory.length > MAX_OUTPUT_CHARS
              ? `[older memories truncated]\n${memory.slice(-MAX_OUTPUT_CHARS)}`
              : memory,
        }
      },
    }),

    set_memory: tool({
      description:
        "Save a durable fact to your persistent memory — something about the user, their preferences, projects, or ongoing threads. The memory is shared across every chat you are in, so things learned in a private chat are recallable everywhere, group chats included. One short fact per call; entries are appended in order and later ones supersede earlier ones on the same topic.",
      inputSchema: z.object({
        content: z
          .string()
          .min(1)
          .describe('The fact to remember, e.g. "The user\'s name is Ali."'),
      }),
      execute: async ({ content }) => {
        const line = content.trim()
        if (!line) return { saved: "" }

        const fs = (await sandbox()).fs
        const previous = await fs
          .downloadFile(MEMORY_FILE_PATH)
          .then((buffer) => buffer.toString("utf8"))
          .catch(() => "")
        const next =
          previous === "" || previous.endsWith("\n")
            ? previous + line + "\n"
            : previous + "\n" + line + "\n"
        await fs.uploadFile(Buffer.from(next), MEMORY_FILE_PATH)
        return { saved: line }
      },
    }),

    mouse_click: tool({
      description: "Click the mouse at screen coordinates.",
      inputSchema: z.object({
        x: z.number().int().describe("X coordinate in screen pixels."),
        y: z.number().int().describe("Y coordinate in screen pixels."),
        button: z.enum(["left", "right", "middle"]).optional(),
        double: z.boolean().optional().describe("Double-click when true."),
      }),
      execute: async ({ x, y, button, double }) => {
        const use = await computer(await sandbox())
        await use.mouse.click(x, y, button ?? "left", double ?? false)
        return { x, y }
      },
    }),

    mouse_move: tool({
      description: "Move the mouse to screen coordinates.",
      inputSchema: z.object({
        x: z.number().int().describe("X coordinate in screen pixels."),
        y: z.number().int().describe("Y coordinate in screen pixels."),
      }),
      execute: async ({ x, y }) => {
        const use = await computer(await sandbox())
        await use.mouse.move(x, y)
        return { x, y }
      },
    }),

    mouse_scroll: tool({
      description: "Scroll the mouse wheel at screen coordinates.",
      inputSchema: z.object({
        x: z.number().int().describe("X coordinate in screen pixels."),
        y: z.number().int().describe("Y coordinate in screen pixels."),
        direction: z.enum(["up", "down", "left", "right"]),
        amount: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe("Number of scroll steps. Defaults to 3."),
      }),
      execute: async ({ x, y, direction, amount }) => {
        const use = await computer(await sandbox())
        await use.mouse.scroll(x, y, direction, amount ?? 3)
        return { x, y, direction, amount: amount ?? 3 }
      },
    }),

    keyboard_type: tool({
      description: "Type text with the keyboard into the focused window.",
      inputSchema: z.object({
        text: z.string().describe("Text to type."),
      }),
      execute: async ({ text }) => {
        const use = await computer(await sandbox())
        await use.keyboard.type(text)
        return { characters: text.length }
      },
    }),

    keyboard_press: tool({
      description:
        "Press a single key, optionally holding modifiers (for example ctrl+c).",
      inputSchema: z.object({
        key: z
          .string()
          .describe("Key name, such as enter, tab, escape, a, f5."),
        modifiers: z
          .array(z.enum(["ctrl", "alt", "shift", "cmd"]))
          .optional()
          .describe("Modifier keys held during the press."),
      }),
      execute: async ({ key, modifiers }) => {
        const use = await computer(await sandbox())
        await use.keyboard.press(key, modifiers)
        return { key, modifiers: modifiers ?? [] }
      },
    }),

    // The agent's own eyes. Never rendered in the chat.
    view_screen: tool({
      description:
        "Look at the current screen. Use before clicking or typing into a GUI, and after acting to check the result. Not shown to the user.",
      inputSchema: z.object({}),
      execute: async () => {
        const shot = await captureScreen(chatId)
        return {
          width: shot.width,
          height: shot.height,
          description: await describeScreen(shot),
        }
      },
      toModelOutput: textOutput,
    }),

    // Rendered in the chat for the user.
    show_screen: tool({
      description:
        "Show the user what is currently on screen. Use when they ask to see the screen or what you are doing.",
      inputSchema: z.object({}),
      execute: async () => {
        const shot = await captureScreen(chatId)
        return { ...shot, description: await describeScreen(shot) }
      },
      toModelOutput: textOutput,
    }),
  }
}
