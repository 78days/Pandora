"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { TrashIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import {
  createGroupChat,
  deleteGroupChat,
  updateGroupChat,
} from "@/actions/group-chat"
import { listBots } from "@/actions/bot"
import { ChatAvatar } from "@/components/chat-avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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

// Passing `groupChat` switches the dialog to edit mode prefilled with the
// group's current name and members (mirrors BotDialog's optional bot prop).
export type EditableGroupChat = {
  id: string
  name: string
  memberIds: string[]
}

const emptyValues: GroupChatsInsert = { name: "", botIds: [] }

function valuesFor(groupChat?: EditableGroupChat): GroupChatsInsert {
  return groupChat
    ? { name: groupChat.name, botIds: groupChat.memberIds }
    : emptyValues
}

// Controlled-only: the sidebar header's dropdown opens creation; the group
// chat header opens editing. Bots load from the server each time it opens,
// so a bot created since the last visit shows up.
function GroupChatDialog({
  groupChat,
  open,
  onOpenChange,
}: {
  groupChat?: EditableGroupChat
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [bots, setBots] = useState<BotOption[] | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const form = useForm<GroupChatsInsert>({
    resolver: zodResolver(groupChatsInsertSchema),
    defaultValues: valuesFor(groupChat),
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
    if (!nextOpen) form.reset(valuesFor(groupChat))
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
      if (groupChat) {
        await updateGroupChat(groupChat.id, values)
      } else {
        const { chatId } = await createGroupChat(values)
        router.push(`/chats/${chatId}`)
      }
      form.reset(valuesFor(groupChat))
      router.refresh()
      changeOpen(false)
    } catch {
      form.setError("root", {
        message: groupChat
          ? "Could not update the group chat. Please try again."
          : "Could not create the group chat. Please try again.",
      })
    }
  }

  async function onDelete() {
    if (!groupChat) return
    setIsDeleting(true)
    try {
      await deleteGroupChat(groupChat.id)
      changeOpen(false)
      setConfirmOpen(false)
      // The deleted group's page no longer exists; refresh discards the
      // cached route so the sidebar queries rerun without it.
      router.replace("/")
      router.refresh()
    } catch {
      setConfirmOpen(false)
      form.setError("root", {
        message: "Could not delete the group chat. Please try again.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="rounded-[14px]">
        <DialogHeader>
          <DialogTitle>
            {groupChat ? "Edit group chat" : "New group chat"}
          </DialogTitle>
          <DialogDescription>
            {groupChat
              ? "Rename the group or change who's in it."
              : "Name the group and pick which bots are in it."}
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
                        aria-label={
                          groupChat
                            ? `${selectedIds.includes(bot.id) ? "Remove" : "Add"} ${bot.name}`
                            : `Add ${bot.name}`
                        }
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
            {groupChat && (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                onClick={() => setConfirmOpen(true)}
              >
                <TrashIcon data-icon="inline-start" />
                Delete
              </Button>
            )}
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {groupChat ? "Save changes" : "Create group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {groupChat && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete group chat?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes {groupChat.name} for everyone in it.
                The bots themselves are unaffected. This can&rsquo;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isDeleting}
                onClick={onDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Dialog>
  )
}

export { GroupChatDialog }
