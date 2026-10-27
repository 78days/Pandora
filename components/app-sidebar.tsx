"use client"

import { UserButton } from "@clerk/nextjs"
import { useSubscription } from "@clerk/nextjs/experimental"
import { formatDistanceToNowStrict } from "date-fns"
import { GaugeIcon, PlusIcon, SearchIcon, UsersIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { BotDialog } from "@/components/bot-dialog"
import { CloseSearchDialogProvider } from "@/components/chat-command-item"
import { GroupChatDialog } from "@/components/group-chat-dialog"
import { useBillable } from "@/hooks/use-billable"
import { PAID_PLAN } from "@/lib/billing"
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
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  // Bot creation spins up a paid sandbox along with the bot itself.
  const isBillable = useBillable()
  const router = useRouter()
  // The usage entry in the user menu counts down the current subscription
  // period; billing data is absent (disabled or free tier) → plain "Usage".
  const { data: subscription } = useSubscription()
  const paidItem = subscription?.subscriptionItems.find(
    (item) => item.plan?.slug === PAID_PLAN
  )
  const resetsIn =
    paidItem?.periodEnd != null
      ? formatDistanceToNowStrict(new Date(paidItem.periodEnd))
      : null
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
                <DropdownMenuItem
                  onClick={() => {
                    if (!isBillable()) return
                    setBotDialogOpen(true)
                  }}
                >
                  <PlusIcon />
                  Create a new bot
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setGroupDialogOpen(true)}>
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
            <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              ⌘K
            </span>
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
                          "flex h-10 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!",
                        userButtonAvatarBox: "size-6 rounded-full",
                        userButtonOuterIdentifier:
                          "min-w-0 truncate group-data-[collapsible=icon]:hidden",
                      },
                    }}
                  >
                    <UserButton.MenuItems>
                      <UserButton.Action
                        label={
                          resetsIn ? `Usage · resets in ${resetsIn}` : "Usage"
                        }
                        labelIcon={<GaugeIcon />}
                        onClick={() => router.push("/usage")}
                      />
                      <UserButton.Action label="manageAccount" />
                      <UserButton.Action label="signOut" />
                    </UserButton.MenuItems>
                  </UserButton>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <BotDialog open={botDialogOpen} onOpenChange={setBotDialogOpen} />
      <GroupChatDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
      />
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
