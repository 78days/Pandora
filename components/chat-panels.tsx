"use client"

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { PanelImperativeHandle } from "react-resizable-panels"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

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

function ChatPanels({
  children,
  desktop,
}: {
  children: ReactNode
  desktop: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<PanelImperativeHandle | null>(null)

  // The desktop panel is collapsible rather than conditionally mounted so its
  // VNC iframe survives closing and reopening.
  const toggle = () => {
    const panel = panelRef.current
    if (!panel) return
    if (open) {
      panel.collapse()
      setOpen(false)
    } else {
      panel.resize("32")
      setOpen(true)
    }
  }

  return (
    <DesktopPanelContext.Provider value={{ open, toggle }}>
      <ResizablePanelGroup className="min-h-0 flex-1">
        <ResizablePanel className="flex min-h-0 flex-col" minSize="30">
          {children}
        </ResizablePanel>
        <ResizableHandle className={open ? undefined : "hidden"} withHandle />
        <ResizablePanel
          panelRef={panelRef}
          className="min-h-0 bg-black"
          collapsible
          collapsedSize="0"
          defaultSize="0"
          minSize="25"
          onResize={(size) => setOpen(size.asPercentage > 0)}
        >
          {desktop}
        </ResizablePanel>
      </ResizablePanelGroup>
    </DesktopPanelContext.Provider>
  )
}

export { ChatPanels, useDesktopPanel }
