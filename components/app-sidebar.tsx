"use client"

import { UserButton } from "@clerk/nextjs"
import { PlusIcon, SearchIcon, UsersIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { BotDialog } from "@/components/bot-dialog"
import { CloseSearchDialogProvider } from "@/components/chat-command-item"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar({
  chats,
  searchChats,
}: {
  chats?: React.ReactNode
  searchChats?: React.ReactNode
}) {
  const [botDialogOpen, setBotDialogOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const closeSearchDialog = useCallback(() => setSearchOpen(false), [])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="self-end" />
              }
            >
              <PlusIcon />
              <span className="sr-only">New</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setBotDialogOpen(true)}>
                  <PlusIcon />
                  Create a new bot
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UsersIcon />
                  Create a group chat
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            className="h-8 w-full justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm font-normal text-muted-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent! group-data-[collapsible=icon]:bg-transparent! group-data-[collapsible=icon]:p-2! dark:bg-input/30"
            onClick={() => setSearchOpen(true)}
          >
            <span className="flex items-center gap-2">
              <SearchIcon />
              <span className="group-data-[collapsible=icon]:hidden">
                Search
              </span>
            </span>
            <Kbd className="group-data-[collapsible=icon]:hidden">⌘K</Kbd>
          </Button>
        </SidebarHeader>
        <SidebarContent>{chats}</SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={
                  <UserButton
                    showName
                    appearance={{
                      elements: {
                        userButtonTrigger:
                          "flex h-12 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!",
                        userButtonAvatarBox: "size-8 rounded-lg",
                        userButtonOuterIdentifier:
                          "min-w-0 truncate group-data-[collapsible=icon]:hidden",
                      },
                    }}
                  />
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <BotDialog open={botDialogOpen} onOpenChange={setBotDialogOpen} />
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <Command>
          <CommandInput placeholder="Search chats..." />
          <CommandList>
            <CloseSearchDialogProvider close={closeSearchDialog}>
              {searchChats}
            </CloseSearchDialogProvider>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
