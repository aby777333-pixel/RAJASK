"use client";

import { useState } from "react";

/**
 * Starts a LiveKit call for the conversation. Requests a scoped token from the
 * server; if LiveKit isn't configured the server returns 503 and we show the
 * call as unavailable. When configured, opens the LiveKit client with the
 * minted token + realm's room.
 */
export function CallButton({ conversationId }: { conversationId: string }) {
  const [status, setStatus] = useState<"idle" | "starting" | "unavailable">("idle");

  async function startCall() {
    setStatus("starting");
    try {
      const res = await fetch("/api/courier/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      if (res.status === 503) {
        setStatus("unavailable");
        return;
      }
      if (!res.ok) {
        setStatus("idle");
        return;
      }
      const { token, wsUrl } = (await res.json()) as { token: string; wsUrl: string };
      const url = `https://meet.livekit.io/custom?liveKitUrl=${encodeURIComponent(
        wsUrl,
      )}&token=${encodeURIComponent(token)}`;
      window.open(url, "_blank", "noopener");
      setStatus("idle");
    } catch {
      setStatus("idle");
    }
  }

  if (status === "unavailable") {
    return (
      <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-ivory/30" title="Set LIVEKIT_API_KEY / SECRET / NEXT_PUBLIC_LIVEKIT_URL to enable calls">
        Calls unavailable
      </span>
    );
  }

  return (
    <button
      onClick={startCall}
      disabled={status === "starting"}
      className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-ivory/80 hover:bg-white/5 disabled:opacity-50"
    >
      {status === "starting" ? "Starting…" : "📞 Call"}
    </button>
  );
}
