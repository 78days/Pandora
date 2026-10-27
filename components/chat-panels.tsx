"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

import { cn } from "cn"

// The header's desktop button and the panel live in different trees, so the
// open state sits in the shared parent above both.
const DesktopPanelContext = createContext<{
  open: boolean
  toggle: () => void
} | null>(null)

function useDesktopPanel() {
  const value = useContext(DesktopPanelContext)
  if (!value) {
    throw new Error("useDesktopPanel must be used inside ChatPanels")
  }
  return value
}

// The design's workspace panel is a fixed 256px column, not a resizable
// split: the header's monitor button toggles it. It stays mounted while
// hidden so its VNC iframe survives closing and reopening.
function ChatPanels({
  children,
  desktop,
}: {
  children: ReactNode
  desktop: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <DesktopPanelContext.Provider
      value={{ open, toggle: () => setOpen((value) => !value) }}
    >
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        {desktop != null && (
          <aside
            className={cn(
              "w-64 shrink-0 flex-col border-l",
              open ? "flex" : "hidden"
            )}
          >
            {desktop}
          </aside>
        )}
      </div>
    </DesktopPanelContext.Provider>
  )
}

export { ChatPanels, useDesktopPanel }
