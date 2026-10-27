"use client"

import { MonitorIcon, PencilIcon } from "lucide-react"
import { useState } from "react"

import { BotDialog, type EditableBot } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { useDesktopPanel } from "@/components/chat-panels"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
import { GroupChatDialog } from "@/components/group-chat-dialog"
import { useBillable } from "@/hooks/use-billable"
import { Button } from "@/components/ui/button"

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
          className="gap-2 px-2 text-sm font-semibold"
          onClick={() => setEditOpen(true)}
        >
          <ChatAvatar seed={bot.avatar} className="size-5" />
          {bot.name}
          <PencilIcon className="opacity-60" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
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

// Groups: the whole title is an edit button — rename, swap members, delete.
// No desktop panel of its own, unlike a direct chat's header.
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
          className="gap-2 px-2 text-sm font-semibold"
          onClick={() => setEditOpen(true)}
        >
          <GroupChatAvatar
            avatars={group.members.map((member) => member.avatar)}
            className="size-5"
          />
          {group.name}
          <PencilIcon className="opacity-60" />
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
