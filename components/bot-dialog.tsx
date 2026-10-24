"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, ShuffleIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { createBot } from "@/actions/bot"
import { ChatAvatar } from "@/components/chat-avatar"
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

function BotDialog() {
  const [open, setOpen] = useState(false)
  const form = useForm<BotsInsert>({
    resolver: zodResolver(botsInsertSchema),
    defaultValues: emptyBot(),
  })
  const { errors, isSubmitting } = form.formState
  const avatar = useWatch({ control: form.control, name: "avatar" })

  useEffect(() => {
    form.setValue("avatar", crypto.randomUUID())
  }, [form])

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) form.reset(emptyBot())
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
      await createBot(values)
      form.reset(emptyBot())
      setOpen(false)
    } catch {
      form.setError("root", {
        message: "Could not create the bot. Please try again.",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="secondary" />}>
        <PlusIcon data-icon="inline-start" />
        Create a new bot
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New bot</DialogTitle>
          <DialogDescription>
            Give it a face, a name, and a job to do.
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
              <FieldTitle>Face</FieldTitle>
              <div className="flex items-center gap-2">
                <ChatAvatar seed={avatar} className="size-10" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => form.setValue("avatar", crypto.randomUUID())}
                >
                  <ShuffleIcon />
                  Shuffle
                </Button>
              </div>
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
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              Create bot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { BotDialog }
