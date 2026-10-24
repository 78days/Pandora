import { Avatar, Style } from "@dicebear/core"
import gaze from "@dicebear/styles/gaze.json" with { type: "json" }
import { cn } from "cn"
import Image from "next/image"

const style = new Style(gaze)

type ChatAvatarProps = {
  seed: string
  animated?: boolean
  className?: string
}

function ChatAvatar({ seed, animated = false, className }: ChatAvatarProps) {
  const src = new Avatar(style, {
    seed,
    size: 32,
    tags: animated ? ["animation"] : undefined,
  }).toDataUri()

  return (
    <Image
      src={src}
      alt=""
      width={32}
      height={32}
      className={cn("size-8 rounded-full", className)}
    />
  )
}

export { ChatAvatar }
