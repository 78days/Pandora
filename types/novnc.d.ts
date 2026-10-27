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
    addEventListener(
      type: "connect" | "disconnect" | "credentialsrequired" | "desktopname",
      listener: (event: Event) => void
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
