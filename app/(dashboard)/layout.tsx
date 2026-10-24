import { Suspense } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import {
  CommandChats,
  SidebarChats,
  SidebarChatsSkeleton,
} from "@/components/sidebar-chats"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar
        chats={
          <Suspense fallback={<SidebarChatsSkeleton />}>
            <SidebarChats />
          </Suspense>
        }
        searchChats={
          <Suspense fallback={null}>
            <CommandChats />
          </Suspense>
        }
      />
      <main>{children}</main>
    </SidebarProvider>
  )
}
