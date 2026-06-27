import type { CommsChannel } from "./types";

export interface RouteInput {
  /** The recipient's preferred channel (COURIER per-member preference). */
  preferred?: CommsChannel;
  /** Whether the recipient is currently active in-app. */
  online: boolean;
  /** Channels currently configured/available in this realm. */
  available: CommsChannel[];
  /** Recipient is within a Do-Not-Disturb / focus window. */
  dnd?: boolean;
}

const FALLBACK_ORDER: CommsChannel[] = ["in_app", "whatsapp", "push", "sms", "email"];

/**
 * Decide which channel to deliver through (cross-cutting notification routing).
 * Online users get in-app; otherwise honour the preferred channel if available,
 * then fall back through a sensible order. DnD downgrades push/in-app toward
 * async channels (email) so urgent reach still lands without interrupting.
 */
export function pickChannel(input: RouteInput): CommsChannel {
  const has = (c: CommsChannel) => input.available.includes(c);

  if (input.online && !input.dnd && has("in_app")) return "in_app";

  if (input.preferred && has(input.preferred)) {
    if (input.dnd && (input.preferred === "in_app" || input.preferred === "push")) {
      // honour quiet hours — prefer an async channel instead
      return has("email") ? "email" : input.preferred;
    }
    return input.preferred;
  }

  for (const c of FALLBACK_ORDER) {
    if (input.dnd && (c === "in_app" || c === "push")) continue;
    if (has(c)) return c;
  }
  return "email";
}
