"use client"

import { cn } from "cn"
import { LoaderCircleIcon, RefreshCwIcon, XIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import * as Sentry from "@sentry/nextjs"

import { getDesktopUrl } from "@/actions/desktop"
import { useDesktopPanel } from "@/components/chat-panels"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

// One iframe drives both surfaces. Reparenting an iframe reloads its browsing
// context (which restarts VNC), so fullscreen is a CSS position, not a DOM move.
function frameClassName(fullscreen: boolean) {
  return cn(
    "border-0 bg-black",
    fullscreen
      ? "pointer-events-auto fixed top-10 left-0 z-[60] h-[calc(100svh-2.5rem)] w-full"
      : "pointer-events-none h-full w-full"
  )
}

// The design's workspace panel: a 40px header with reconnect, the stream in
// a screen card, and a caption. Clicking the stream opens fullscreen.
function ChatDesktop({ chatId, name }: { chatId: string; name: string }) {
  const { open } = useDesktopPanel()
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const loading = useRef(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement | null>(null)

  // The desktop costs a sandbox boot, so only resolve its URL once the panel
  // is actually opened. The URL then lives for the rest of the chat.
  useEffect(() => {
    if (!open || src || failed || loading.current) return
    loading.current = true
    getDesktopUrl(chatId)
      .then(setSrc)
      .catch(() => setFailed(true))
      .finally(() => {
        loading.current = false
      })
  }, [open, chatId, src, failed])

  useEffect(() => {
    if (!src) return
    // The iframe loads our own noVNC client, whose websocket connects the
    // browser straight to the sandbox's signed preview URL — a websocket
    // handshake never renders Daytona's preview warning page, which would
    // otherwise intercept every browser navigation to the preview link.
    const wsUrl = `wss://${new URL(src).host}/websockify`
    const frame = document.createElement("iframe")
    frame.src = `/desktop/vnc?ws=${encodeURIComponent(wsUrl)}`
    frame.title = `${name}'s desktop`
    frame.className = frameClassName(false)
    frameRef.current = frame
    previewRef.current?.appendChild(frame)
    return () => {
      frame.remove()
      frameRef.current = null
    }
  }, [src, name, reloadKey])

  useEffect(() => {
    const frame = frameRef.current
    if (frame) frame.className = frameClassName(fullscreen)
  }, [fullscreen, src])

  const reconnect = () => {
    if (!src) {
      setFailed(false)
      return
    }
    // Recreating the iframe restarts the VNC session against the same URL.
    setReloadKey((key) => key + 1)
  }

  return (
    <>
      <div className="flex h-10 shrink-0 items-center justify-end px-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Reconnect"
          onClick={reconnect}
        >
          <RefreshCwIcon />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 p-3">
        <div className="w-full overflow-hidden rounded-lg border bg-card p-1.5">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-black">
            <div
              ref={previewRef}
              className="pointer-events-none h-full w-full"
            />
            {!src && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-xs text-white/60">
                {failed ? (
                  <>
                    <p>Desktop unavailable.</p>
                    <Button
                      onClick={() => setFailed(false)}
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
            {src && (
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
        // The desktop iframe lives in the panel, not the dialog, so it must not
        // be inert/aria-hidden while fullscreen. It is positioned over the
        // dialog body instead of being moved into it.
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
          <div className="min-h-0 flex-1 bg-black" />
        </DialogContent>
      </Dialog>
    </>
  )
}

export { ChatDesktop }
