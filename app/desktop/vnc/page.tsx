"use client"

import * as Sentry from "@sentry/nextjs"
import RFB from "@novnc/novnc"
import { LoaderCircleIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

type Phase = "connecting" | "connected" | "reconnecting"

// Standalone noVNC client for the desktop panel's iframe. The websocket
// connects the browser directly to the sandbox's signed preview URL — a
// websocket handshake never renders Daytona's preview warning page, which
// otherwise intercepts every browser navigation to a preview link.
export default function DesktopVncPage() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rfbRef = useRef<RFB | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [phase, setPhase] = useState<Phase>("connecting")

  useEffect(() => {
    const wsUrl = new URLSearchParams(window.location.search).get("ws")
    if (!wsUrl) return

    let disposed = false

    const connect = () => {
      if (disposed || !containerRef.current) return
      const rfb = new RFB(containerRef.current, wsUrl, {
        shared: true,
        scaleViewport: true,
        resizeSession: false,
      })
      rfbRef.current = rfb
      rfb.addEventListener("connect", () => {
        Sentry.logger.info("Desktop stream connected")
        setPhase("connected")
      })
      rfb.addEventListener("disconnect", () => {
        rfbRef.current = null
        if (disposed) return
        // The signed URL outlives sandbox restarts; keep retrying while the
        // panel is open.
        Sentry.logger.warn("Desktop stream disconnected — reconnecting")
        setPhase("reconnecting")
        retryRef.current = setTimeout(connect, 2000)
      })
    }

    connect()

    return () => {
      disposed = true
      if (retryRef.current) clearTimeout(retryRef.current)
      rfbRef.current?.disconnect()
      rfbRef.current = null
    }
  }, [])

  return (
    <main className="relative h-svh w-full bg-black">
      <div ref={containerRef} className="h-full w-full" />
      {phase !== "connected" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
          <LoaderCircleIcon className="size-4 animate-spin" />
          <p>
            {phase === "connecting"
              ? "Connecting to desktop…"
              : "Reconnecting…"}
          </p>
        </div>
      )}
    </main>
  )
}
