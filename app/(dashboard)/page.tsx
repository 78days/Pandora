import { auth } from "@clerk/nextjs/server"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default async function Page() {
  await auth.protect()

  return (
    <Empty className="min-h-svh">
      <EmptyHeader>
        <EmptyMedia className="mb-4">
          <ChatAvatar seed={crypto.randomUUID()} />
        </EmptyMedia>
        <EmptyTitle>Meet your first bot</EmptyTitle>
        <EmptyDescription className="text-wrap">
          Every bot gets its own personality, memory, and face. Spin one up and
          start the conversation.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <BotDialog />
      </EmptyContent>
    </Empty>
  )
}
