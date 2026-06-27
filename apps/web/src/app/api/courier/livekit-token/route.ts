import { NextResponse, type NextRequest } from "next/server";
import { mintLiveKitToken, liveKitFromEnv, isLiveKitConfigured } from "@rajask/comms";
import { createClient } from "@/lib/supabase/server";

/**
 * Mint a LiveKit access token for a conversation call. Gated by auth +
 * conversation membership (RLS-bound RPC). Returns 503 when LiveKit isn't
 * configured so the UI can degrade to "calls unavailable".
 */
export async function POST(request: NextRequest) {
  const cfg = liveKitFromEnv(process.env);
  if (!isLiveKitConfigured(cfg)) {
    return NextResponse.json({ error: "LiveKit is not configured" }, { status: 503 });
  }

  const { conversationId } = (await request.json().catch(() => ({}))) as {
    conversationId?: string;
  };
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // Membership check via the same RLS-backed function the policies use.
  const { data: allowed } = await supabase.rpc("rajask_in_conversation", {
    p_conv: conversationId,
  });
  if (allowed !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const token = await mintLiveKitToken(
    cfg,
    {
      room: `conv-${conversationId}`,
      identity: user.id,
      name: user.email ?? user.id,
      canPublish: true,
      canSubscribe: true,
    },
    nowSeconds,
  );
  if (!token) {
    return NextResponse.json({ error: "Could not mint token" }, { status: 500 });
  }

  return NextResponse.json({ token, wsUrl: cfg.wsUrl, room: `conv-${conversationId}` });
}
