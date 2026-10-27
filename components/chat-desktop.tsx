"use client"

import type RFB from "@novnc/novnc"
import * as Sentry from "@sentry/nextjs"
import { LoaderCircleIcon, RefreshCwIcon, XIcon } from "lucide-react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

import { getDesktopUrl } from "@/actions/desktop"
import { useDesktopPanel } from "@/components/chat-panels"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

type DesktopStatus = "idle" | "connecting" | "connected" | "disconnected"

// One live noVNC screen drives both surfaces, as in the reference repo: the
// screen div is created once outside React and reparented between the panel
// card and the fullscreen dialog. Moving a plain div keeps the stream alive —
// reparenting an iframe would reload it and restart VNC.
function ChatDesktop({ chatId, name }: { chatId: string; name: string }) {
  const { open } = useDesktopPanel()
  const [status, setStatus] = useState<DesktopStatus>("idle")
  const [fullscreen, setFullscreen] = useState(false)
  const screenRef = useRef<HTMLDivElement | null>(null)
  const rfbRef = useRef<RFB | null>(null)
  const interactiveRef = useRef(false)
  // Only the latest connection attempt may report its status
  const attemptRef = useRef(0)

  const [panelSlot, setPanelSlot] = useState<HTMLDivElement | null>(null)
  const [dialogSlot, setDialogSlot] = useState<HTMLDivElement | null>(null)

  const getScreen = useCallback(() => {
    if (!screenRef.current) {
      screenRef.current = document.createElement("div")
      screenRef.current.className = "size-full"
    }
    return screenRef.current
  }, [])

  const connect = useCallback(async () => {
    const attempt = ++attemptRef.current
    rfbRef.current?.disconnect()
    rfbRef.current = null
    setStatus("connecting")
    const startedAt = Date.now()

    try {
      // noVNC touches window at module scope, so it can only load in the
      // browser — a top-level import would crash this page's server render.
      const [url, { default: RFB }] = await Promise.all([
        getDesktopUrl(chatId),
        import("@novnc/novnc"),
      ])
      if (attempt !== attemptRef.current) return

      const rfb = new RFB(
        getScreen(),
        `wss://${new URL(url).host}/websockify`,
        { shared: true, scaleViewport: true, resizeSession: false }
      )
      rfb.background = "transparent"
      rfb.viewOnly = !interactiveRef.current
      rfb.addEventListener("connect", () => {
        if (attempt !== attemptRef.current) return
        setStatus("connected")
        Sentry.logger.info("Desktop stream connected", {
          "pandora.chat.id": chatId,
          "pandora.desktop.connect_ms": Date.now() - startedAt,
        })
        if (interactiveRef.current) rfb.focus()
        // noVNC scales once at framebuffer-resize; re-fit in case the
        // container's layout raced the handshake.
        rfb.scaleViewport = true
      })
      rfb.addEventListener("disconnect", (event) => {
        if (attempt !== attemptRef.current) return
        rfbRef.current = null
        setStatus("disconnected")
        // Unclean means the connection dropped or never opened
        if (!event.detail.clean) {
          Sentry.logger.warn("Desktop connection lost", {
            "pandora.chat.id": chatId,
          })
        }
      })
      rfbRef.current = rfb
    } catch (error) {
      if (attempt !== attemptRef.current) return
      setStatus("disconnected")
      Sentry.logger.error("Desktop failed to open", {
        "pandora.chat.id": chatId,
        ...(error instanceof Error && { "error.message": error.message }),
      })
    }
  }, [chatId, getScreen])

  const setInteractive = useCallback((interactive: boolean) => {
    interactiveRef.current = interactive
    const rfb = rfbRef.current
    if (!rfb) return
    rfb.viewOnly = !interactive
    if (interactive) rfb.focus()
  }, [])

  // Connect the first time the panel opens and keep the stream for later.
  // Deferred one tick so connect()'s setState stays out of the effect body.
  useEffect(() => {
    if (!open || status !== "idle") return
    const timer = setTimeout(() => void connect(), 0)
    return () => clearTimeout(timer)
  }, [open, status, connect])

  // The dialog's slot only exists while it is open, and wins while it does.
  useLayoutEffect(() => {
    const slot = dialogSlot ?? panelSlot
    if (!slot) return
    slot.appendChild(getScreen())
    setInteractive(slot === dialogSlot)
  }, [dialogSlot, panelSlot, getScreen, setInteractive])

  // noVNC rescales only on window resize, never on element resize — re-fit
  // after every surface change (panel open/close, fullscreen toggle).
  useEffect(() => {
    const rfb = rfbRef.current
    if (rfb && status === "connected") rfb.scaleViewport = true
  }, [open, fullscreen, status])

  useEffect(() => {
    const attempts = attemptRef
    const rfb = rfbRef
    return () => {
      attempts.current++
      rfb.current?.disconnect()
      rfb.current = null
    }
  }, [])

  return (
    <>
      <div className="flex h-10 shrink-0 items-center justify-end px-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Reconnect"
          disabled={status === "connecting"}
          onClick={() => void connect()}
        >
          <RefreshCwIcon />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 p-3">
        <div className="w-full overflow-hidden rounded-lg border bg-card p-1.5">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-black">
            <div ref={setPanelSlot} className="absolute inset-0" />
            {status === "connected" ? (
              <button
                type="button"
                className="absolute inset-0 cursor-zoom-in"
                onClick={() => {
                  Sentry.logger.info("Desktop fullscreen opened", {
                    "pandora.chat.id": chatId,
                  })
                  setFullscreen(true)
                }}
                aria-label="Open desktop in fullscreen"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-xs text-white/60">
                {status === "disconnected" ? (
                  <>
                    <p>Screen disconnected.</p>
                    <Button
                      onClick={() => void connect()}
                      size="sm"
                      variant="outline"
                    >
                      Try again
                    </Button>
                  </>
                ) : (
                  <>
                    <LoaderCircleIcon className="size-4 animate-spin" />
                    <p>Starting desktop…</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{name}&apos;s screen</p>
      </div>
      <Dialog
        open={fullscreen}
        onOpenChange={(next, details) => {
          if (next) {
            setFullscreen(true)
            return
          }
          // Only the explicit close button closes the dialog. Escape, outside
          // presses and back gestures must reach the desktop instead, so VNC
          // shortcuts and clicks never dismiss it.
          if (details.reason !== "close-press") {
            details.cancel()
            return
          }
          setFullscreen(false)
        }}
        disablePointerDismissal
        // The screen div is reparented into the dialog, so the panel must not
        // be inert/aria-hidden while fullscreen.
        modal={false}
      >
        <DialogContent
          showCloseButton={false}
          className="flex h-svh w-screen max-w-none flex-col gap-0 rounded-none p-0 ring-0 sm:max-w-none"
        >
          <div className="flex h-10 shrink-0 items-center gap-2 border-b px-4">
            <DialogTitle className="text-sm font-medium">
              {name}&apos;s screen
            </DialogTitle>
            <DialogClose
              render={
                <Button variant="ghost" size="icon-sm" className="ml-auto" />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
          <div ref={setDialogSlot} className="min-h-0 flex-1 bg-black" />
        </DialogContent>
      </Dialog>
    </>
  )
}

export { ChatDesktop }
