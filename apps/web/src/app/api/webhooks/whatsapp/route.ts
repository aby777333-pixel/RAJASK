import { NextResponse, type NextRequest } from "next/server";
import { whatsAppFromEnv } from "@rajask/comms";
import { createServiceClient } from "@rajask/db";

/**
 * WhatsApp Business Cloud API webhook.
 *  GET  — Meta verification handshake (hub.challenge).
 *  POST — signature-verified, idempotent ingest of inbound messages into the
 *         bridge conversation (WHATSAPP_REALM_ID / WHATSAPP_CONVERSATION_ID).
 *
 * Degrades safely: without creds/mapping it acknowledges 200 without ingest,
 * so Meta doesn't disable the webhook and nothing throws.
 */
export async function GET(request: NextRequest) {
  const wa = whatsAppFromEnv(process.env);
  const sp = request.nextUrl.searchParams;
  const challenge = wa.verifyChallenge({
    mode: sp.get("hub.mode"),
    token: sp.get("hub.verify_token"),
    challenge: sp.get("hub.challenge"),
  });
  if (challenge !== null) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const wa = whatsAppFromEnv(process.env);
  const raw = await request.text();

  // Verify signature when an app secret is configured.
  const signature = request.headers.get("x-hub-signature-256");
  if (process.env.WHATSAPP_APP_SECRET) {
    const ok = await wa.verifySignature(raw, signature);
    if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true }); // ack malformed, don't retry-storm
  }

  const inbound = wa.parseInbound(payload);
  const realmId = process.env.WHATSAPP_REALM_ID;
  const conversationId = process.env.WHATSAPP_CONVERSATION_ID;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (inbound.length === 0 || !realmId || !conversationId || !serviceKey || !url) {
    return NextResponse.json({ ok: true, ingested: 0 });
  }

  const admin = createServiceClient(url, serviceKey);
  let ingested = 0;
  for (const msg of inbound) {
    // Idempotency: skip if this provider message id was already stored.
    const { data: existing } = await admin
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("metadata->>whatsapp_id", msg.externalId)
      .limit(1);
    if (existing && existing.length > 0) continue;

    const { error } = await admin.from("messages").insert({
      realm_id: realmId,
      conversation_id: conversationId,
      sender_user_id: null, // external sender
      kind: "text",
      body: msg.text,
      metadata: { source: "whatsapp", whatsapp_id: msg.externalId, from: msg.from },
    });
    if (!error) ingested += 1;
  }

  return NextResponse.json({ ok: true, ingested });
}
