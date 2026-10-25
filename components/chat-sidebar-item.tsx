"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { ChatAvatar } from "@/components/chat-avatar"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

function ChatSidebarItem({
  chatId,
  botName,
  botAvatar,
  lastMessagePreview,
  timeLabel,
}: {
  chatId: string
  botName: string
  botAvatar: string
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
        tooltip={botName}
        render={<Link href={`/chats/${chatId}`} />}
      >
        <ChatAvatar seed={botAvatar} />
        <div className="grid flex-1 gap-0.5 text-left leading-tight group-data-[collapsible=icon]:hidden">
          <span className="truncate font-medium">{botName}</span>
          {lastMessagePreview && (
            <span className="truncate text-xs text-muted-foreground">
              {lastMessagePreview}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          {timeLabel}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export { ChatSidebarItem }
