import { formatDistanceToNowStrict } from "date-fns"

import { ChatCommandItem } from "@/components/chat-command-item"
import { ChatSidebarItem } from "@/components/chat-sidebar-item"
import { CommandEmpty, CommandGroup } from "@/components/ui/command"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
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
            <ChatSidebarItem
              key={chat.id}
              chatId={chat.id}
              botName={chat.botName}
              botAvatar={chat.botAvatar}
              lastMessagePreview={chat.lastMessagePreview}
              timeLabel={relativeTime(chat.lastMessageAt)}
            />
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
