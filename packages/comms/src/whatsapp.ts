import type { AdapterResult, ChannelAdapter, InboundMessage, OutboundMessage } from "./types";
import { hmacSha256Hex, timingSafeEqualHex } from "./crypto";

export interface WhatsAppConfig {
  phoneNumberId?: string;
  accessToken?: string;
  /** App secret for inbound webhook signature verification. */
  appSecret?: string;
  /** Verify token for the Meta webhook GET handshake. */
  verifyToken?: string;
  apiVersion?: string; // default v21.0
}

/**
 * WhatsApp Business Cloud API adapter. Degrades gracefully: when creds are
 * absent `isConfigured()` is false and `send` returns an error rather than
 * throwing, so the rest of COURIER keeps working.
 */
export class WhatsAppAdapter implements ChannelAdapter {
  readonly channel = "whatsapp" as const;
  constructor(private readonly cfg: WhatsAppConfig) {}

  isConfigured(): boolean {
    return Boolean(this.cfg.phoneNumberId && this.cfg.accessToken);
  }

  async send(msg: OutboundMessage): Promise<AdapterResult> {
    if (!this.isConfigured()) return { ok: false, error: "WhatsApp is not configured" };
    const version = this.cfg.apiVersion ?? "v21.0";
    const url = `https://graph.facebook.com/${version}/${this.cfg.phoneNumberId}/messages`;
    const body = msg.template
      ? {
          messaging_product: "whatsapp",
          to: msg.to,
          type: "template",
          template: msg.template,
        }
      : {
          messaging_product: "whatsapp",
          to: msg.to,
          type: "text",
          text: { body: msg.text },
        };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.cfg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        messages?: { id: string }[];
        error?: { message: string };
      };
      if (!res.ok) return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
      return { ok: true, externalId: json.messages?.[0]?.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "network error" };
    }
  }

  /** Meta webhook GET verification — returns the challenge to echo, or null. */
  verifyChallenge(params: {
    mode?: string | null;
    token?: string | null;
    challenge?: string | null;
  }): string | null {
    if (params.mode === "subscribe" && params.token && params.token === this.cfg.verifyToken) {
      return params.challenge ?? "";
    }
    return null;
  }

  /** Verify the `X-Hub-Signature-256` header on an inbound webhook POST. */
  async verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
    if (!this.cfg.appSecret || !signatureHeader) return false;
    const expected = await hmacSha256Hex(this.cfg.appSecret, rawBody);
    const provided = signatureHeader.replace(/^sha256=/, "");
    return timingSafeEqualHex(expected, provided);
  }

  /** Map a WhatsApp Cloud API inbound webhook payload into InboundMessages. */
  parseInbound(payload: unknown): InboundMessage[] {
    const out: InboundMessage[] = [];
    const p = payload as {
      entry?: {
        changes?: {
          value?: {
            messages?: {
              id: string;
              from: string;
              timestamp: string;
              text?: { body?: string };
              type?: string;
            }[];
          };
        }[];
      }[];
    };
    for (const entry of p.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const m of change.value?.messages ?? []) {
          out.push({
            channel: "whatsapp",
            externalId: m.id,
            from: m.from,
            text: m.text?.body ?? `[${m.type ?? "unsupported"}]`,
            timestamp: m.timestamp,
            raw: m,
          });
        }
      }
    }
    return out;
  }
}

export function whatsAppFromEnv(env: Record<string, string | undefined>): WhatsAppAdapter {
  return new WhatsAppAdapter({
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    appSecret: env.WHATSAPP_APP_SECRET,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
    apiVersion: env.WHATSAPP_API_VERSION,
  });
}
