"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { GroupChatAvatar } from "@/components/group-chat-avatar"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

function ChatSidebarItem({
  chatId,
  name,
  avatars,
  lastMessagePreview,
  timeLabel,
}: {
  chatId: string
  name: string
  avatars: string[]
  lastMessagePreview: string | null
  // Relative times are computed on the server; recomputing here at hydration
  // could produce a different string and a hydration mismatch.
  timeLabel: string
}) {
  const pathname = usePathname()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="lg"
        isActive={pathname === `/chats/${chatId}`}
        tooltip={name}
        render={<Link href={`/chats/${chatId}`} />}
      >
        <GroupChatAvatar avatars={avatars} />
        <div className="grid min-w-0 flex-1 gap-0.5 text-left leading-tight group-data-[collapsible=icon]:hidden">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-medium">{name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {timeLabel}
            </span>
          </div>
          {lastMessagePreview && (
            <span className="truncate text-xs text-muted-foreground">
              {lastMessagePreview}
            </span>
          )}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export { ChatSidebarItem }
