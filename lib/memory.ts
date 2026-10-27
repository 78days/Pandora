// Every bot keeps its cross-conversation memory in a single file in its own
// sandbox — the bridge between what it learns in a private 1:1 chat and what
// it can recall later anywhere, including group chats. The get_memory /
// set_memory tools (trigger/tools.ts) and the creation-time scaffold
// (actions/bot.ts) share this path. /home/daytona is the sandbox's home.
export const MEMORY_FILE_PATH = "/home/daytona/MEMORY.md"
