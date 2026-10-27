import { cn } from "cn"

import { ChatAvatar } from "@/components/chat-avatar"

// How many member avatars are drawn; everything beyond shows as a count.
const MAX_VISIBLE = 3

// Slot geometry as Tailwind classes, as fractions of the square container.
// One member fills the square exactly like a single ChatAvatar; two overlap
// side by side; three form a triangle; four or more show three avatars plus
// a "+N" tile in a 2x2 grid.
const SLOTS: string[][] = [
  ["inset-0"],
  [
    "top-1/2 left-0 size-[62%] -translate-y-1/2",
    "top-1/2 right-0 size-[62%] -translate-y-1/2",
  ],
  [
    "top-0 left-1/2 size-[56%] -translate-x-1/2",
    "bottom-0 left-0 size-[56%]",
    "bottom-0 right-0 size-[56%]",
  ],
  [
    "top-0 left-0 size-[56%]",
    "top-0 right-0 size-[56%]",
    "bottom-0 left-0 size-[56%]",
    "bottom-0 right-0 size-[56%]",
  ],
]

type GroupChatAvatarProps = {
  avatars: string[]
  className?: string
}

// Same footprint as ChatAvatar wherever it renders (sidebar, header, empty
// state); pass the size through className, e.g. "size-5" or "size-12". The
// size-8 default is load-bearing: the slots are absolutely positioned, so
// without an explicit size the container collapses to zero.
function GroupChatAvatar({ avatars, className }: GroupChatAvatarProps) {
  const slots = SLOTS[Math.min(Math.max(avatars.length, 1), 4) - 1]
  const restCount = avatars.length - MAX_VISIBLE

  return (
    <span
      className={cn(
        "@container relative inline-block aspect-square size-8 shrink-0",
        className
      )}
    >
      {avatars.slice(0, MAX_VISIBLE).map((seed, index) => (
        <ChatAvatar
          className={cn("absolute", slots[index])}
          key={`${seed}-${index}`}
          seed={seed}
        />
      ))}
      {restCount > 0 && (
        <span
          className={cn(
            "absolute flex items-center justify-center rounded-full bg-muted text-[38cqw] leading-none font-medium text-muted-foreground",
            slots[MAX_VISIBLE]
          )}
        >
          +{restCount}
        </span>
      )}
    </span>
  )
}

export { GroupChatAvatar }
