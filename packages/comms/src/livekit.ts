import { base64UrlString, hmacSha256Base64Url } from "./crypto";

export interface LiveKitConfig {
  apiKey?: string;
  apiSecret?: string;
  wsUrl?: string;
}

export interface LiveKitGrant {
  room: string;
  identity: string;
  name?: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  ttlSeconds?: number;
}

export function isLiveKitConfigured(cfg: LiveKitConfig): boolean {
  return Boolean(cfg.apiKey && cfg.apiSecret && cfg.wsUrl);
}

/**
 * Mint a LiveKit access token (a signed JWT) for joining a room. Returns null
 * when LiveKit isn't configured, so calling UI can degrade to "unavailable".
 * Implemented with Web Crypto HS256 — no server SDK dependency required.
 */
export async function mintLiveKitToken(
  cfg: LiveKitConfig,
  grant: LiveKitGrant,
  nowSeconds: number,
): Promise<string | null> {
  if (!cfg.apiKey || !cfg.apiSecret) return null;
  const ttl = grant.ttlSeconds ?? 3600;
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: cfg.apiKey,
    sub: grant.identity,
    name: grant.name,
    nbf: nowSeconds,
    exp: nowSeconds + ttl,
    video: {
      room: grant.room,
      roomJoin: true,
      canPublish: grant.canPublish ?? true,
      canSubscribe: grant.canSubscribe ?? true,
    },
  };
  const head = base64UrlString(JSON.stringify(header));
  const body = base64UrlString(JSON.stringify(payload));
  const signature = await hmacSha256Base64Url(cfg.apiSecret, `${head}.${body}`);
  return `${head}.${body}.${signature}`;
}

export function liveKitFromEnv(env: Record<string, string | undefined>): LiveKitConfig {
  return {
    apiKey: env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_API_SECRET,
    wsUrl: env.NEXT_PUBLIC_LIVEKIT_URL,
  };
}
