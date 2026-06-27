import { describe, it, expect } from "vitest";
import { pickChannel } from "./router";
import { mintLiveKitToken, isLiveKitConfigured } from "./livekit";
import { WhatsAppAdapter } from "./whatsapp";

describe("pickChannel", () => {
  it("prefers in-app when online", () => {
    expect(pickChannel({ online: true, available: ["in_app", "email"] })).toBe("in_app");
  });
  it("honours the preferred channel when offline", () => {
    expect(
      pickChannel({ online: false, preferred: "whatsapp", available: ["in_app", "whatsapp"] }),
    ).toBe("whatsapp");
  });
  it("downgrades to async under DnD", () => {
    expect(
      pickChannel({ online: true, dnd: true, available: ["in_app", "email"] }),
    ).toBe("email");
  });
  it("falls back through the order", () => {
    expect(pickChannel({ online: false, available: ["sms"] })).toBe("sms");
  });
});

describe("livekit", () => {
  it("reports unconfigured without creds", () => {
    expect(isLiveKitConfigured({})).toBe(false);
  });
  it("returns null token when unconfigured", async () => {
    expect(await mintLiveKitToken({}, { room: "r", identity: "u" }, 1000)).toBeNull();
  });
  it("mints a 3-segment JWT when configured", async () => {
    const t = await mintLiveKitToken(
      { apiKey: "k", apiSecret: "s", wsUrl: "wss://x" },
      { room: "room1", identity: "user1" },
      1000,
    );
    expect(t).not.toBeNull();
    expect((t as string).split(".")).toHaveLength(3);
  });
});

describe("whatsapp", () => {
  it("is unconfigured and send fails gracefully without creds", async () => {
    const wa = new WhatsAppAdapter({});
    expect(wa.isConfigured()).toBe(false);
    const r = await wa.send({ to: "1", text: "hi" });
    expect(r.ok).toBe(false);
  });
  it("parses an inbound webhook payload", () => {
    const wa = new WhatsAppAdapter({});
    const msgs = wa.parseInbound({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  { id: "wamid.1", from: "15551234567", timestamp: "1700000000", text: { body: "hello" } },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ channel: "whatsapp", externalId: "wamid.1", text: "hello" });
  });
});
