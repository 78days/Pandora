import { UserButton } from "@clerk/nextjs"

import {
  Sidebar,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar>
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
    </Sidebar>
  )
}
