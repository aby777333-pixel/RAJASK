/** The channels COURIER can route a message through. */
export type CommsChannel = "in_app" | "whatsapp" | "sms" | "email" | "push";

export interface OutboundMessage {
  to: string; // phone / email / device token, per channel
  text: string;
  /** WhatsApp HSM template (required to message beyond the 24h window). */
  template?: { name: string; language: string; components?: unknown[] };
}

export interface InboundMessage {
  channel: CommsChannel;
  /** Provider message id — used as the idempotency key on ingest. */
  externalId: string;
  from: string;
  text: string;
  timestamp: string;
  raw: unknown;
}

export interface AdapterResult {
  ok: boolean;
  externalId?: string;
  error?: string;
}

/**
 * Adapter contract (architectural law #5). Every external channel implements
 * this so a provider can be swapped without touching domain logic.
 */
export interface ChannelAdapter {
  readonly channel: CommsChannel;
  isConfigured(): boolean;
  send(msg: OutboundMessage): Promise<AdapterResult>;
}
