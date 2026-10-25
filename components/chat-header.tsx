"use client"

import { MonitorIcon, PencilIcon } from "lucide-react"
import { useState } from "react"

import { BotDialog, type EditableBot } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"

function ChatHeader({ bot }: { bot: EditableBot }) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <header className="flex h-10 items-center gap-2 border-b border-white/15 bg-black px-4 text-white">
        <Button
          variant="ghost"
          className="gap-2 px-2 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
          onClick={() => setEditOpen(true)}
        >
          <ChatAvatar seed={bot.avatar} className="size-5" />
          {bot.name}
          <PencilIcon className="opacity-60" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto text-white hover:bg-white/10 hover:text-white"
          aria-label="Desktop view"
        >
          <MonitorIcon />
        </Button>
      </header>
      <BotDialog bot={bot} open={editOpen} onOpenChange={setEditOpen} />
    </>
  )
}

export { ChatHeader }
