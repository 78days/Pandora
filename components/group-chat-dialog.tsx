"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { createGroupChat } from "@/actions/group-chat"
import { listBots } from "@/actions/bot"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { groupChatsInsertSchema, type GroupChatsInsert } from "@/db/schema"

type BotOption = { id: string; name: string; avatar: string }

const emptyValues: GroupChatsInsert = { name: "", botIds: [] }

// Controlled-only: the sidebar header's dropdown opens it. Bots load from the
// server each time it opens, so a bot created since the last visit shows up.
function GroupChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [bots, setBots] = useState<BotOption[] | null>(null)
  const form = useForm<GroupChatsInsert>({
    resolver: zodResolver(groupChatsInsertSchema),
    defaultValues: emptyValues,
  })
  const { errors, isSubmitting } = form.formState
  const selectedIds = useWatch({ control: form.control, name: "botIds" }) ?? []

  // Fetched while the dialog is open. The list from a previous open stays up
  // during a refetch (stale-while-revalidate); only the first open shows the
  // skeleton.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    listBots()
      .then((rows) => {
        if (!cancelled) setBots(rows)
      })
      .catch(() => {
        if (!cancelled) setBots((current) => current ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [open])

  function changeOpen(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) form.reset(emptyValues)
  }

  // The Base UI checkbox is button-based, so it can't be registered like a
  // native input; the selection lives in the form and toggles through it.
  function toggleBot(id: string, checked: boolean) {
    const current = form.getValues("botIds")
    form.setValue(
      "botIds",
      checked ? [...current, id] : current.filter((value) => value !== id),
      { shouldValidate: true }
    )
  }

  async function onSubmit(values: GroupChatsInsert) {
    try {
      const { chatId } = await createGroupChat(values)
      form.reset(emptyValues)
      router.push(`/chats/${chatId}`)
      router.refresh()
      changeOpen(false)
    } catch {
      form.setError("root", {
        message: "Could not create the group chat. Please try again.",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New group chat</DialogTitle>
          <DialogDescription>
            Name the group and pick which bots are in it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="group-chat-name">Name</FieldLabel>
              <Input
                id="group-chat-name"
                placeholder="Weekend plans"
                aria-invalid={!!errors.name}
                {...form.register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={!!errors.botIds}>
              <FieldTitle>Bots</FieldTitle>
              {bots === null ? (
                <div className="flex flex-col gap-2">
                  {[0, 1, 2].map((index) => (
                    <div
                      className="flex items-center gap-3 px-2 py-1.5"
                      key={index}
                    >
                      <div className="size-4 animate-pulse rounded-[4px] bg-muted" />
                      <div className="size-8 animate-pulse rounded-full bg-muted" />
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : bots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You have no bots yet. Create one first, then bring it into a
                  group chat.
                </p>
              ) : (
                <div className="flex flex-col">
                  {bots.map((bot) => (
                    <label
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-accent/50"
                      key={bot.id}
                    >
                      <Checkbox
                        aria-label={`Add ${bot.name}`}
                        checked={selectedIds.includes(bot.id)}
                        onCheckedChange={(checked) =>
                          toggleBot(bot.id, checked === true)
                        }
                      />
                      <ChatAvatar seed={bot.avatar} />
                      {bot.name}
                    </label>
                  ))}
                </div>
              )}
              <FieldError errors={[errors.botIds]} />
            </Field>
          </FieldGroup>
          <FieldError errors={[errors.root]} className="mt-4" />
          <DialogFooter className="mt-4">
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              Create group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { GroupChatDialog }
