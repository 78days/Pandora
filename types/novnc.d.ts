// Minimal surface of the noVNC RFB client used by the desktop panel.
// The package ships no type declarations of its own; its `exports` field
// points the bare specifier at ./core/rfb.js (subpath imports are blocked).
declare module "@novnc/novnc" {
  export default class RFB {
    constructor(
      target: HTMLElement | null,
      urlOrChannel: string | WebSocket,
      options?: {
        shared?: boolean
        scaleViewport?: boolean
        resizeSession?: boolean
      }
    )
    // Reassigning re-runs noVNC's autoscale against the container's current
    // size — the one reliable way to re-fit after the container resized.
    scaleViewport: boolean
    // False lets the stream grab mouse and keyboard (fullscreen); true is a
    // watched-only screen (the panel card).
    viewOnly: boolean
    background: string
    addEventListener(
      type: "connect" | "credentialsrequired" | "desktopname",
      listener: (event: Event) => void
    ): void
    addEventListener(
      type: "disconnect",
      listener: (event: CustomEvent<{ clean: boolean }>) => void
    ): void
    removeEventListener(
      type: "connect" | "disconnect" | "credentialsrequired" | "desktopname",
      listener: (event: Event) => void
    ): void
    disconnect(): void
    focus(options?: { preventScroll?: boolean }): void
    blur(): void
  }
}
