"use client"

import { MonitorIcon } from "lucide-react"
import { useState } from "react"

import { BotDialog, type EditableBot } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { useDesktopPanel } from "@/components/chat-panels"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
import { GroupChatDialog } from "@/components/group-chat-dialog"
import { useBillable } from "@/hooks/use-billable"
import { Button } from "@/components/ui/button"

// The bot pill in the design is 20px face + 13px medium name in a 28px
// h-7 button; the monitor button lights up while the panel is open.
function ChatHeader({ bot }: { bot: EditableBot }) {
  const [editOpen, setEditOpen] = useState(false)
  const desktop = useDesktopPanel()
  // Opening the desktop view connects to the bot's sandbox.
  const isBillable = useBillable()

  return (
    <>
      <header className="flex h-10 items-center gap-2 border-b px-4">
        <Button
          variant="ghost"
          size="sm"
          className="min-w-0 shrink gap-1.5 px-2 font-medium"
          onClick={() => setEditOpen(true)}
        >
          <ChatAvatar seed={bot.avatar} className="size-5" />
          <span className="truncate text-[13px]">{bot.name}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          aria-label="Desktop view"
          aria-pressed={desktop.open}
          onClick={() => {
            if (!isBillable()) return
            desktop.toggle()
          }}
        >
          <MonitorIcon />
        </Button>
      </header>
      <BotDialog bot={bot} open={editOpen} onOpenChange={setEditOpen} />
    </>
  )
}

// Groups: the whole title opens the edit dialog — rename, swap members,
// delete. No desktop panel of its own, unlike a direct chat's header.
function GroupChatHeader({
  group,
}: {
  group: {
    id: string
    name: string
    members: { id: string; avatar: string }[]
  }
}) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <header className="flex h-10 items-center gap-2 border-b px-4">
        <Button
          variant="ghost"
          size="sm"
          className="min-w-0 shrink gap-1.5 px-2 font-medium"
          onClick={() => setEditOpen(true)}
        >
          <GroupChatAvatar
            avatars={group.members.map((member) => member.avatar)}
            className="size-5"
          />
          <span className="truncate text-[13px]">{group.name}</span>
        </Button>
      </header>
      <GroupChatDialog
        groupChat={{
          id: group.id,
          name: group.name,
          memberIds: group.members.map((member) => member.id),
        }}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

export { ChatHeader, GroupChatHeader }
