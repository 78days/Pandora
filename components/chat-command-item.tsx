"use client"

import { useRouter } from "next/navigation"
import { createContext, useContext } from "react"

import { ChatAvatar } from "@/components/chat-avatar"
import { CommandItem } from "@/components/ui/command"

// The chat list is a server slot rendered by the dashboard layout, so it can't
// receive the dialog's open state as props; items consume this instead.
const CloseSearchDialogContext = createContext<() => void>(() => {})

function CloseSearchDialogProvider({
  close,
  children,
}: {
  close: () => void
  children: React.ReactNode
}) {
  return (
    <CloseSearchDialogContext.Provider value={close}>
      {children}
    </CloseSearchDialogContext.Provider>
  )
}

function ChatCommandItem({
  chatId,
  botName,
  botAvatar,
}: {
  chatId: string
  botName: string
  botAvatar: string
}) {
  const router = useRouter()
  const closeSearchDialog = useContext(CloseSearchDialogContext)

  return (
    <CommandItem
      value={botName}
      onSelect={() => {
        closeSearchDialog()
        router.push(`/chats/${chatId}`)
      }}
    >
      <ChatAvatar seed={botAvatar} />
      <span>{botName}</span>
    </CommandItem>
  )
}

export { ChatCommandItem, CloseSearchDialogProvider }
