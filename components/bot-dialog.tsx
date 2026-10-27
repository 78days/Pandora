"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, ShuffleIcon, TrashIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { createBot, deleteBot, updateBot } from "@/actions/bot"
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { botsInsertSchema, type BotsInsert } from "@/db/schema"

const presets = [
  {
    label: "Research assistant",
    job: "Research assistant",
    instructions:
      "Answer briefly, cite sources, and ask before running anything destructive.",
  },
  {
    label: "Code reviewer",
    job: "Code reviewer",
    instructions:
      "Review changes for bugs, edge cases, and clarity. Keep comments short and actionable.",
  },
  {
    label: "Writing editor",
    job: "Writing editor",
    instructions:
      "Tighten the prose, keep the author's voice, and suggest cuts before rewriting.",
  },
  {
    label: "Tutor",
    job: "Tutor",
    instructions:
      "Explain one step at a time, check understanding, and let the learner try first.",
  },
]

function emptyBot(): BotsInsert {
  return { avatar: crypto.randomUUID(), name: "", job: "", instructions: "" }
}

export type EditableBot = {
  id: string
  name: string
  avatar: string
  job: string
  instructions: string | null
}

function botToValues(bot: EditableBot): BotsInsert {
  return {
    avatar: bot.avatar,
    name: bot.name,
    job: bot.job,
    instructions: bot.instructions ?? "",
  }
}

// Uncontrolled (no `open` prop) renders its own trigger; controlled callers
// (the sidebar header menu, the chat header) render it trigger-less and open
// it themselves. Passing `bot` switches it to edit mode prefilled with the
// bot's current values.
function BotDialog({
  bot,
  open: controlledOpen,
  onOpenChange,
}: {
  bot?: EditableBot
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const form = useForm<BotsInsert>({
    resolver: zodResolver(botsInsertSchema),
    defaultValues: bot ? botToValues(bot) : emptyBot(),
  })
  const { errors, isSubmitting } = form.formState
  const avatar = useWatch({ control: form.control, name: "avatar" })

  useEffect(() => {
    if (bot) return
    form.setValue("avatar", crypto.randomUUID())
  }, [bot, form])

  function changeOpen(nextOpen: boolean) {
    if (!isControlled) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
    if (!nextOpen) form.reset(bot ? botToValues(bot) : emptyBot())
  }

  function applyPreset(preset: (typeof presets)[number]) {
    form.setValue("job", preset.job, {
      shouldDirty: true,
      shouldValidate: true,
    })
    form.setValue("instructions", preset.instructions, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  async function onSubmit(values: BotsInsert) {
    try {
      if (bot) {
        await updateBot(bot.id, values)
      } else {
        await createBot(values)
      }
      form.reset(bot ? botToValues(bot) : emptyBot())
      router.refresh()
      changeOpen(false)
    } catch {
      form.setError("root", {
        message: bot
          ? "Could not update the bot. Please try again."
          : "Could not create the bot. Please try again.",
      })
    }
  }

  async function onDelete() {
    if (!bot) return
    setIsDeleting(true)
    try {
      await deleteBot(bot.id)
      changeOpen(false)
      setConfirmOpen(false)
      // The chat page for a deleted bot no longer exists; refresh discards
      // the cached home route so the sidebar queries rerun without it.
      router.replace("/")
      router.refresh()
    } catch {
      setConfirmOpen(false)
      form.setError("root", {
        message: "Could not delete the bot. Please try again.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      {!isControlled && (
        <DialogTrigger render={<Button variant="secondary" />}>
          <PlusIcon data-icon="inline-start" />
          Create a new bot
        </DialogTrigger>
      )}
      <DialogContent className="rounded-[14px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{bot ? "Edit bot" : "New bot"}</DialogTitle>
          <DialogDescription>
            {bot
              ? "Adjust its face, name, and job."
              : "Give it a face, a name, and a job to do."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Field orientation="horizontal">
              <div className="flex min-w-0 items-center gap-3">
                <ChatAvatar seed={avatar} className="size-14 shrink-0" />
                <div className="flex min-w-0 flex-col">
                  <FieldTitle>Face</FieldTitle>
                  <span className="truncate text-sm text-muted-foreground">
                    Shuffle until you find one you like.
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => form.setValue("avatar", crypto.randomUUID())}
              >
                <ShuffleIcon />
                Shuffle
              </Button>
            </Field>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="bot-name">Name</FieldLabel>
              <Input
                id="bot-name"
                placeholder="Ada"
                aria-invalid={!!errors.name}
                {...form.register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={!!errors.job}>
              <FieldLabel htmlFor="bot-job">Job</FieldLabel>
              <Input
                id="bot-job"
                placeholder="Research assistant"
                aria-invalid={!!errors.job}
                {...form.register("job")}
              />
              <FieldError errors={[errors.job]} />
            </Field>
            <Field data-invalid={!!errors.instructions}>
              <FieldLabel htmlFor="bot-instructions">
                How it should work
              </FieldLabel>
              <Textarea
                id="bot-instructions"
                rows={3}
                placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                aria-invalid={!!errors.instructions}
                {...form.register("instructions")}
              />
              <FieldError errors={[errors.instructions]} />
            </Field>
          </FieldGroup>
          <FieldError errors={[errors.root]} className="mt-4" />
          <DialogFooter className="mt-4">
            {bot && (
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
              {bot ? "Save changes" : "Create bot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {bot && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete bot?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes {bot.name} and its chat. This
                can&rsquo;t be undone.
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

export { BotDialog }
