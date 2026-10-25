import { formatDistanceToNowStrict } from "date-fns"
import Link from "next/link"

import { ChatCommandItem } from "@/components/chat-command-item"
import { ChatAvatar } from "@/components/chat-avatar"
import { CommandEmpty, CommandGroup } from "@/components/ui/command"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar"
import { getSidebarChats } from "@/queries/bots"

function relativeTime(date: Date) {
  if (Date.now() - date.getTime() < 60_000) return "now"
  return formatDistanceToNowStrict(date)
}

async function SidebarChats() {
  const chats = await getSidebarChats()
  if (chats.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {chats.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton
                size="lg"
                render={<Link href={`/chats/${chat.id}`} />}
              >
                <ChatAvatar seed={chat.botAvatar} />
                <div className="grid flex-1 gap-0.5 text-left leading-tight">
                  <span className="truncate font-medium">{chat.botName}</span>
                  {chat.lastMessagePreview && (
                    <span className="truncate text-xs text-muted-foreground">
                      {chat.lastMessagePreview}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {relativeTime(chat.lastMessageAt)}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

// Chat list for the search command dialog. CommandEmpty lives inside this
// server component so it only mounts after the chats resolve — otherwise it
// would flash "no results" while the query is still streaming.
async function CommandChats() {
  const chats = await getSidebarChats()

  return (
    <>
      <CommandGroup heading="Chats">
        {chats.map((chat) => (
          <ChatCommandItem
            key={chat.id}
            chatId={chat.id}
            botName={chat.botName}
            botAvatar={chat.botAvatar}
          />
        ))}
      </CommandGroup>
      <CommandEmpty>No chats found.</CommandEmpty>
    </>
  )
}

function SidebarChatsSkeleton() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {Array.from({ length: 3 }, (_, i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export { CommandChats, SidebarChats, SidebarChatsSkeleton }
