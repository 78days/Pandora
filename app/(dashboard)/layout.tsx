import { Suspense } from "react"
import { cookies } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import {
  CommandChats,
  SidebarChats,
  SidebarChatsSkeleton,
} from "@/components/sidebar-chats"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Written by SidebarProvider on every toggle; absent cookie means expanded.
  const sidebarState = (await cookies()).get("sidebar_state")

  return (
    <SidebarProvider
      className="h-svh"
      defaultOpen={sidebarState?.value !== "false"}
    >
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
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
