import { auth } from "@clerk/nextjs/server"
import { PlusIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
          <Avatar>
            <AvatarImage src="/favicon.ico" alt="Pandora" />
            <AvatarFallback>P</AvatarFallback>
          </Avatar>
        </EmptyMedia>
        <EmptyTitle>Meet your first bot</EmptyTitle>
        <EmptyDescription className="text-wrap">
          Every bot gets its own personality, memory, and face. Spin one up and
          start the conversation.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="secondary">
          <PlusIcon data-icon="inline-start" />
          Create a new bot
        </Button>
      </EmptyContent>
    </Empty>
  )
}
