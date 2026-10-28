import type { Metadata } from "next"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BriefcaseIcon,
  CheckIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FingerprintIcon,
  KeyboardIcon,
  LockIcon,
  MessageSquareIcon,
  MonitorIcon,
  MousePointer2Icon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"
import Link from "next/link"

import { ChatAvatar } from "@/components/chat-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Pandora — Give every bot a face, a job, and a place to work.",
  description:
    "Pandora is a chat workspace for custom AI bots. Give one a name, a role, and standing instructions, and it appears in your sidebar with its own face, memory, and Linux sandbox.",
}

const crew = [
  {
    name: "Nova",
    role: "Research assistant",
    seed: "nova-7f3a",
    preview: "The middle plan wins on cost.",
    time: "2m",
  },
  {
    name: "Atlas",
    role: "Code reviewer",
    seed: "atlas-c21b",
    preview: "The diff looks clean.",
    time: "18m",
  },
  {
    name: "Mira",
    role: "Writing editor",
    seed: "mira-9d4e",
    preview: "Tighter, same voice.",
    time: "1h",
  },
  {
    name: "Patch",
    role: "Tutor",
    seed: "patch-51aa",
    preview: "Let's try the next step.",
    time: "3h",
  },
]

const capabilities = [
  "Bot personas",
  "Durable sessions",
  "Sandbox tools",
  "Live desktop",
  "Group chats",
  "Command palette",
  "Deterministic avatars",
  "Theming",
]

const workspaceFeatures = [
  {
    title: "Chats ordered by activity",
    description:
      "Every bot gets its own conversation, with the bot's name, avatar, and a stored preview in the sidebar.",
  },
  {
    title: "One command palette",
    description:
      "Press ⌘K or Ctrl+K and search every chat from anywhere in the workspace.",
  },
  {
    title: "Bots you can edit in place",
    description:
      "Rename a bot, change its job, or rewrite its instructions from the chat header. Delete it when the work is done.",
  },
  {
    title: "Light or dark, your call",
    description:
      "The workspace follows the system theme. Press d outside a text field to toggle it.",
  },
]

const stack = [
  { name: "Next.js 16", role: "App Router" },
  { name: "React 19", role: "UI" },
  { name: "AI SDK 7", role: "Streaming" },
  { name: "Trigger.dev", role: "Durable sessions" },
  { name: "Daytona", role: "Linux sandboxes" },
  { name: "Clerk", role: "Auth" },
  { name: "Neon", role: "Postgres" },
  { name: "Drizzle", role: "ORM" },
]

export default function WelcomePage() {
  return (
    <div className="dark min-h-svh overflow-x-hidden bg-[#090909] text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <CapabilityStrip />
        <CrewSection />
        <WorkspaceSection />
        <SandboxSection />
        <GroupChatSection />
        <StackSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  )
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[#090909]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/welcome" className="flex items-center gap-2.5">
          <ChatAvatar
            seed="pandora"
            className="size-7 rounded-md ring-1 ring-white/10"
          />
          <span className="text-sm font-medium tracking-tight">Pandora</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          <a
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#workspace"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Workspace
          </a>
          <a
            href="#stack"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Stack
          </a>
          <a
            href="https://github.com/78days/Pandora"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
            <ExternalLinkIcon className="size-3" />
          </a>
        </nav>

        <div className="flex items-center gap-1.5">
          <Button
            nativeButton={false}
            render={<Link href="/sign-in" />}
            size="sm"
            variant="ghost"
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/sign-up" />}
            size="sm"
            className="rounded-full px-4"
          >
            Get started
          </Button>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.09),transparent_62%)]"
      />
      <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-16 sm:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-[#0d0d0d] px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            AI bot workspace
          </p>

          <h1 className="bg-[linear-gradient(to_bottom,#fff_10%,rgba(255,255,255,0.45))] bg-clip-text pb-1 text-5xl leading-[0.95] font-medium tracking-[-0.05em] text-balance text-transparent sm:text-6xl md:text-7xl">
            Give every bot a face, a job, and a place to work.
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-balance text-muted-foreground sm:text-lg">
            Pandora is a chat workspace for custom AI bots. Name one, give it a
            role, and it appears in your sidebar with its own face, durable
            conversation, and Linux sandbox.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              nativeButton={false}
              render={<Link href="/sign-up" />}
              className="h-10 rounded-full px-5"
            >
              Create your first bot
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/sign-in" />}
              variant="outline"
              className="h-10 rounded-full px-5"
            >
              Sign in
            </Button>
          </div>

          <p className="mt-6 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            Open source · Next.js 16 · AI SDK 7
          </p>
        </div>

        <WorkspaceMockup />
      </div>
    </section>
  )
}

function CapabilityStrip() {
  return (
    <div className="border-y border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-7 gap-y-2 px-6 py-5 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase sm:justify-between">
        {capabilities.map((capability) => (
          <span key={capability}>{capability}</span>
        ))}
      </div>
    </div>
  )
}

function CrewSection() {
  return (
    <section id="features" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <SectionHeading
          index="01"
          label="Personas"
          title="A face, a job, and a standing brief."
          description="Pandora is not a row of identical chat boxes. Each bot is a persona you can recognize at a glance: a name, a role, free-form instructions, and a deterministic avatar rendered from its own seed."
        />

        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {crew.map((bot) => (
            <div
              key={bot.name}
              className="rounded-xl border border-border bg-[#0d0d0d] p-4 transition-colors hover:border-white/20 hover:bg-[#111]"
            >
              <ChatAvatar seed={bot.seed} className="size-10 rounded-lg" />
              <p className="mt-4 text-sm font-medium">{bot.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{bot.role}</p>
              <p className="mt-3 font-mono text-[9px] tracking-widest text-muted-foreground/60 uppercase">
                seed {bot.seed.slice(-4)}
              </p>
            </div>
          ))}

          <Link
            href="/sign-up"
            className="flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-white/15 p-4 text-center transition-colors hover:border-white/30 hover:bg-white/[0.02]"
          >
            <PlusIcon className="size-5 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Your next bot</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Name it, give it a job.
            </p>
          </Link>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
          <FeatureCard
            icon={FingerprintIcon}
            tag="Avatars"
            title="A face you'll recognize"
            description="A DiceBear gaze face rendered locally from a stored seed. Shuffle for a new one; no image is ever uploaded."
          />
          <FeatureCard
            icon={BriefcaseIcon}
            tag="Personas"
            title="A job, not a prompt"
            description="Set a name, a role, and standing instructions once. One-click presets cover research, code review, editing, and tutoring."
          />
          <FeatureCard
            icon={MessageSquareIcon}
            tag="Memory"
            title="A conversation that stays put"
            description="Each bot owns a durable Trigger.dev session. Refresh, reconnect, and the transcript is still there."
          />
        </div>
      </div>
    </section>
  )
}

function WorkspaceSection() {
  return (
    <section id="workspace" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <SectionHeading
          index="02"
          label="Workspace"
          title="Everything in one quiet sidebar."
          description="A chat workspace should feel like a desk, not a dashboard. Pandora keeps the roster, the conversations, and the shortcuts in one place, then gets out of the way."
        />

        <div className="mt-14 grid items-center gap-16 lg:grid-cols-2">
          <div>
            <ul className="space-y-6">
              {workspaceFeatures.map((feature) => (
                <li key={feature.title} className="flex gap-3">
                  <CheckIcon className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{feature.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <Button
              nativeButton={false}
              render={<Link href="/sign-up" />}
              variant="outline"
              className="mt-9 rounded-full"
            >
              Open the workspace
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          </div>

          <SidebarMockup />
        </div>
      </div>
    </section>
  )
}

function SandboxSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <SectionHeading
          index="03"
          label="Sandbox"
          title="They don't just talk. They work."
          description="Every bot owns a Daytona Linux sandbox. It can run shell commands, read and write files, and drive its own desktop with a mouse, keyboard, and screenshots."
        />

        <div className="mt-14 grid items-center gap-16 lg:grid-cols-2">
          <SandboxMockup />

          <div>
            <h3 className="text-2xl font-medium tracking-[-0.03em] sm:text-3xl">
              A Linux box behind every conversation.
            </h3>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
              The bot works inside its own machine, not yours. Open the live
              desktop beside the chat and watch the commands land, the files
              change, and the screenshots arrive. A cron meters every running
              sandbox in five-minute ticks.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {["bash", "files", "mouse", "keyboard", "screenshots"].map(
                (tool) => (
                  <Badge
                    key={tool}
                    variant="outline"
                    className="rounded-full border-border px-2.5 py-1 font-mono text-[9px] tracking-widest text-muted-foreground uppercase"
                  >
                    {tool}
                  </Badge>
                )
              )}
            </div>

            <p className="mt-7 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              <MonitorIcon className="size-3.5" />
              noVNC · boots on open
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function GroupChatSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <SectionHeading
          index="04"
          label="Group chats"
          title="Put the whole crew in one room."
          description="Sometimes the work needs more than one specialist. Group chats give several bots one microphone, and the composer decides who answers each message."
        />

        <div className="mt-14 grid items-center gap-16 lg:grid-cols-2">
          <div>
            <h3 className="text-2xl font-medium tracking-[-0.03em] sm:text-3xl">
              The roster shares a conversation.
            </h3>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
              Pick the bot who should respond, or let the group decide. When a
              message fits another member better, a bot can hand the turn over
              mid-reply. The target&apos;s persona and sandbox take over from
              there.
            </p>

            <ul className="mt-7 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckIcon className="size-4" />
                Member roster and handoffs resolved on the server
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="size-4" />
                One transcript per group, not per bot
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="size-4" />
                Each member keeps its own instructions and sandbox
              </li>
            </ul>
          </div>

          <GroupChatMockup />
        </div>
      </div>
    </section>
  )
}

function StackSection() {
  return (
    <section id="stack" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <SectionHeading
          index="05"
          label="Stack"
          title="Durable pieces, not a demo."
          description="Pandora runs on the same infrastructure it needs in production: durable sessions, real Linux sandboxes, a hosted Postgres, and an auth layer that stays out of the way."
        />

        <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
          {stack.map((item) => (
            <div key={item.name} className="bg-[#0d0d0d] p-5">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="mt-1 font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                {item.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_62%)]"
      />
      <div className="relative mx-auto max-w-6xl px-6 py-28 text-center sm:py-36">
        <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Start here
        </p>
        <h2 className="mx-auto mt-6 max-w-2xl text-4xl font-medium tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl">
          Your first bot is one click away.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
          Name it, give it a job, and start the conversation. It will have a
          face before you finish typing.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            nativeButton={false}
            render={<Link href="/sign-up" />}
            className="h-10 rounded-full px-5"
          >
            Create your first bot
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button
            nativeButton={false}
            render={
              <a
                href="https://github.com/78days/Pandora"
                target="_blank"
                rel="noreferrer"
              />
            }
            variant="outline"
            className="h-10 rounded-full px-5"
          >
            Read the README
            <ExternalLinkIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col justify-between gap-12 sm:flex-row">
        <div>
          <Link href="/welcome" className="flex items-center gap-2.5">
            <ChatAvatar seed="pandora" className="size-6 rounded-md" />
            <span className="text-sm font-medium tracking-tight">Pandora</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
            Give every bot a face, a job, and a place to work.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <FooterColumn
            title="Product"
            links={[
              { label: "Features", href: "#features" },
              { label: "Workspace", href: "#workspace" },
              { label: "Stack", href: "#stack" },
            ]}
          />
          <FooterColumn
            title="Project"
            links={[
              {
                label: "GitHub",
                href: "https://github.com/78days/Pandora",
                external: true,
              },
              {
                label: "README",
                href: "https://github.com/78days/Pandora#readme",
                external: true,
              },
              {
                label: "Live demo",
                href: "https://pandora-drab-ten.vercel.app/welcome",
                external: true,
              },
            ]}
          />
          <FooterColumn
            title="Account"
            links={[
              { label: "Sign in", href: "/sign-in" },
              { label: "Create account", href: "/sign-up" },
            ]}
          />
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Pandora. Built for bots with jobs.</p>
        <p className="font-mono text-[9px] tracking-widest uppercase">
          Next.js · AI SDK · Trigger.dev · Daytona
        </p>
      </div>
    </footer>
  )
}

function SectionHeading({
  index,
  label,
  title,
  description,
}: {
  index: string
  label: string
  title: string
  description: string
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[0.8fr_2fr] md:gap-12">
      <div className="flex items-start gap-3">
        <span className="font-mono text-[11px] text-muted-foreground/60">
          {index}
        </span>
        <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          {label}
        </span>
      </div>
      <div className="max-w-2xl">
        <h2 className="text-3xl font-medium tracking-[-0.03em] text-balance sm:text-4xl md:text-5xl">
          {title}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  tag,
  title,
  description,
}: {
  icon: LucideIcon
  tag: string
  title: string
  description: string
}) {
  return (
    <div className="bg-[#0d0d0d] p-7">
      <div className="flex items-center justify-between">
        <span className="flex size-9 items-center justify-center rounded-lg border border-border">
          <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
        </span>
        <span className="font-mono text-[9px] tracking-widest text-muted-foreground/60 uppercase">
          {tag}
        </span>
      </div>
      <h3 className="mt-6 text-base font-medium">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string; external?: boolean }[]
}) {
  return (
    <div>
      <p className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function WorkspaceMockup() {
  return (
    <div aria-hidden className="relative mx-auto mt-16 w-full max-w-5xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -top-8 h-40 rounded-full bg-white/5 blur-3xl"
      />
      <div className="relative overflow-hidden rounded-xl border border-border bg-[#0d0d0d] shadow-2xl shadow-black/60">
        <div className="flex h-10 items-center gap-1.5 border-b border-border px-4">
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/15" />
          <div className="mx-auto flex h-6 items-center gap-1.5 rounded-md border border-border bg-[#090909] px-3 font-mono text-[10px] text-muted-foreground">
            <LockIcon className="size-2.5" />
            pandora.app/workspace
          </div>
          <span className="w-10" />
        </div>

        <div className="grid min-h-[400px] grid-cols-1 sm:grid-cols-[200px_1fr] lg:grid-cols-[200px_1fr_210px]">
          <MockSidebar />
          <MockChat />
          <MockDesktop />
        </div>
      </div>
    </div>
  )
}

function MockSidebar() {
  return (
    <div className="hidden flex-col border-r border-border bg-[#0a0a0a] p-3 sm:flex">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium">Workspace</span>
        <PlusIcon className="size-3.5 text-muted-foreground" />
      </div>

      <div className="mt-3 flex h-7 items-center gap-1.5 rounded-md border border-border bg-[#0d0d0d] px-2 text-[10px] text-muted-foreground">
        <SearchIcon className="size-3" />
        Search chats
        <Kbd className="ml-auto h-4 min-w-4 font-mono text-[9px]">⌘K</Kbd>
      </div>

      <p className="mt-4 px-1 font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
        Chats
      </p>

      <div className="mt-2 space-y-0.5">
        {crew.map((bot, index) => (
          <div
            key={bot.name}
            className={cn(
              "flex items-center gap-2 rounded-md px-1.5 py-1.5",
              index === 0 && "bg-white/5"
            )}
          >
            <ChatAvatar seed={bot.seed} className="size-6 rounded-md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium">{bot.name}</p>
              <p className="truncate text-[9px] text-muted-foreground">
                {bot.preview}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
        <ChatAvatar seed="you" className="size-5 rounded-full" />
        <span className="text-[10px] text-muted-foreground">you@pandora</span>
      </div>
    </div>
  )
}

function MockChat() {
  return (
    <div className="flex min-w-0 flex-col bg-[#0b0b0b]">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ChatAvatar seed={crew[0].seed} className="size-7 rounded-md" />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{crew[0].name}</p>
          <p className="truncate font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
            {crew[0].role}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          <span className="font-mono text-[9px] tracking-widest uppercase">
            live
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-4">
        <div className="ml-auto w-fit max-w-[80%] rounded-lg rounded-br-sm bg-white px-3 py-2 text-[11px] leading-5 text-black">
          Compare the three pricing pages and write a short brief.
        </div>

        <div className="w-fit max-w-[88%] space-y-2">
          <div className="rounded-lg rounded-bl-sm border border-border bg-[#111] px-3 py-2 text-[11px] leading-5">
            I&apos;ll pull the pages and compare the plans.
          </div>

          <div className="rounded-lg border border-border bg-[#0a0a0a] p-2.5 font-mono text-[9px] leading-4 text-muted-foreground">
            <p className="text-[#c9c9c9]">$ curl -s /pricing | compare</p>
            <p className="mt-1 text-emerald-400">✓ 3 pages fetched</p>
            <p className="text-emerald-400">✓ brief.md written</p>
          </div>

          <div className="rounded-lg rounded-bl-sm border border-border bg-[#111] px-3 py-2 text-[11px] leading-5">
            The middle plan wins on per-seat cost. I saved the brief to your
            workspace.
          </div>

          <div className="flex w-fit items-center gap-2 rounded-md border border-border bg-[#0d0d0d] px-2.5 py-1.5">
            <FileTextIcon className="size-3 text-muted-foreground" />
            <span className="text-[10px]">pricing-brief.md</span>
          </div>
        </div>
      </div>

      <div className="m-3 flex items-center gap-2 rounded-lg border border-border bg-[#0d0d0d] px-3 py-2">
        <span className="text-[10px] text-muted-foreground">
          Ask Nova to do something…
        </span>
        <span className="ml-auto flex items-center gap-1 text-muted-foreground">
          <Kbd className="h-4 min-w-4 font-mono text-[9px]">⌘</Kbd>
          <Kbd className="h-4 min-w-4 font-mono text-[9px]">↵</Kbd>
        </span>
      </div>
    </div>
  )
}

function MockDesktop() {
  return (
    <div className="hidden flex-col border-l border-border bg-[#0a0a0a] p-3 lg:flex">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
          Live desktop
        </span>
        <span className="flex items-center gap-1 font-mono text-[9px] tracking-widest text-emerald-400 uppercase">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          booted
        </span>
      </div>

      <div className="mt-3 flex-1 rounded-md border border-border bg-[#0d0d0d] p-2 font-mono text-[9px] leading-4 text-muted-foreground">
        <p className="text-[#c9c9c9]">nova@daytona:~$ ls</p>
        <p>brief.md notes/ data.csv</p>
        <p className="mt-2 text-[#c9c9c9]">nova@daytona:~$ python plot.py</p>
        <p className="text-emerald-400">✓ chart saved</p>

        <div className="mt-3 flex h-24 items-end gap-1 rounded border border-border p-2">
          {[35, 52, 44, 70, 58, 84, 66].map((height) => (
            <div
              key={height}
              className="flex-1 rounded-sm bg-white/20"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-muted-foreground">
        <MousePointer2Icon className="size-3" />
        <span className="font-mono text-[8px] tracking-widest uppercase">
          computer use
        </span>
      </div>
    </div>
  )
}

function SidebarMockup() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-sm pb-20">
      <div className="rounded-xl border border-border bg-[#0d0d0d] p-3 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="text-xs font-medium">Pandora</span>
          <span className="rounded-md border border-border px-2 py-1 font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
            New bot
          </span>
        </div>

        <div className="space-y-1">
          {crew.map((bot, index) => (
            <div
              key={bot.name}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-2",
                index === 0 && "bg-white/[0.06]"
              )}
            >
              <ChatAvatar seed={bot.seed} className="size-7 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">{bot.name}</p>
                <p className="truncate text-[9px] text-muted-foreground">
                  {bot.preview}
                </p>
              </div>
              <span className="font-mono text-[8px] text-muted-foreground/60">
                {bot.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -right-3 -bottom-1 w-64 rounded-lg border border-border bg-[#111] p-3 shadow-2xl shadow-black/70 sm:-right-10">
        <div className="flex items-center gap-2 rounded-md border border-border bg-[#0a0a0a] px-2 py-1.5">
          <SearchIcon className="size-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Search chats…
          </span>
          <Kbd className="ml-auto h-4 min-w-4 font-mono text-[9px]">⌘K</Kbd>
        </div>

        <div className="mt-2 space-y-0.5">
          {crew.slice(0, 3).map((bot) => (
            <div
              key={bot.name}
              className="flex items-center gap-2 rounded-md px-2 py-1.5"
            >
              <ChatAvatar seed={bot.seed} className="size-5 rounded-md" />
              <span className="text-[10px]">{bot.name}</span>
              <span className="ml-auto font-mono text-[8px] tracking-widest text-muted-foreground uppercase">
                {bot.role.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-2 border-t border-border pt-2 font-mono text-[8px] tracking-widest text-muted-foreground uppercase">
          ↑↓ navigate · ↵ open
        </p>
      </div>
    </div>
  )
}

function SandboxMockup() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl border border-border bg-[#0d0d0d] shadow-2xl shadow-black/50"
    >
      <div className="flex h-9 items-center gap-2 border-b border-border px-3">
        <MonitorIcon className="size-3.5 text-muted-foreground" />
        <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
          Live desktop · nova
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-emerald-400 uppercase">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          connected
        </span>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-md border border-border bg-[#0a0a0a] p-3 font-mono text-[9px] leading-5 text-muted-foreground">
          <p className="text-[#d4d4d4]">nova@daytona:~$ ls -la</p>
          <p>total 24</p>
          <p>drwxr-xr-x brief.md</p>
          <p>drwxr-xr-x notes/</p>
          <p>drwxr-xr-x data.csv</p>
          <p className="mt-2 text-[#d4d4d4]">nova@daytona:~$ python plot.py</p>
          <p className="text-emerald-400">✓ chart saved to chart.png</p>
          <p className="mt-2 flex items-center gap-1 text-[#d4d4d4]">
            nova@daytona:~$
            <span className="inline-block h-3 w-1.5 animate-pulse bg-white/70" />
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex h-28 items-end gap-1 rounded-md border border-border bg-[#0a0a0a] p-3">
            {[30, 48, 40, 66, 54, 78, 62].map((height) => (
              <div
                key={height}
                className="flex-1 rounded-sm bg-white/20"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-[#0a0a0a] px-2 py-1.5">
            <span className="flex items-center gap-1.5 font-mono text-[8px] tracking-widest text-muted-foreground uppercase">
              <MousePointer2Icon className="size-3" />
              computer use
            </span>
            <span className="flex items-center gap-1 font-mono text-[8px] tracking-widest text-muted-foreground uppercase">
              <KeyboardIcon className="size-3" />
              input
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function GroupChatMockup() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl border border-border bg-[#0d0d0d] shadow-2xl shadow-black/50"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex -space-x-1.5">
          {crew.slice(0, 3).map((bot) => (
            <ChatAvatar
              key={bot.name}
              seed={bot.seed}
              className="size-6 rounded-full ring-2 ring-[#0d0d0d]"
            />
          ))}
        </div>
        <div>
          <p className="text-xs font-medium">Launch crew</p>
          <p className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
            3 bots · group chat
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-emerald-400 uppercase">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          live
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div className="ml-auto w-fit max-w-[80%] rounded-lg rounded-br-sm bg-white px-3 py-2 text-[11px] leading-5 text-black">
          Ship the pricing page copy.
        </div>

        <div className="flex items-start gap-2">
          <ChatAvatar seed={crew[2].seed} className="size-6 rounded-md" />
          <div className="max-w-[80%] rounded-lg rounded-bl-sm border border-border bg-[#111] px-3 py-2 text-[11px] leading-5">
            I&apos;ll tighten the hero.{" "}
            <span className="text-muted-foreground">
              Handing the deploy check to Atlas.
            </span>
          </div>
        </div>

        <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-[#0a0a0a] px-3 py-1 font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
          Mira
          <ArrowRightIcon className="size-3" />
          Atlas
        </div>

        <div className="flex items-start gap-2">
          <ChatAvatar seed={crew[1].seed} className="size-6 rounded-md" />
          <div className="max-w-[80%] rounded-lg rounded-bl-sm border border-border bg-[#111] px-3 py-2 text-[11px] leading-5">
            On it. The build is green and the new page is live.
          </div>
        </div>
      </div>

      <div className="m-3 flex items-center gap-2 rounded-lg border border-border bg-[#0a0a0a] px-2.5 py-2">
        <span className="rounded-md border border-border bg-[#111] px-2 py-1 font-mono text-[9px] tracking-widest uppercase">
          Atlas
        </span>
        <span className="text-[10px] text-muted-foreground">Ask the crew…</span>
        <span className="ml-auto font-mono text-[9px] text-muted-foreground">
          who answers?
        </span>
      </div>
    </div>
  )
}
