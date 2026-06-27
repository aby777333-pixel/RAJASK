import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { HeraldComposer } from "@/components/herald/HeraldComposer";
import { SendBroadcastButton } from "@/components/herald/SendBroadcastButton";

export const dynamic = "force-dynamic";

export default async function HeraldPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;

  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "HERALD", action: "view" }))) {
    return <p className="text-ivory/60">You may not view broadcasts.</p>;
  }
  const canCreate = await perms.can(actor, { subsystem: "HERALD", action: "create" });

  const [{ data: broadcasts }, { data: titles }] = await Promise.all([
    supabase
      .from("broadcasts")
      .select("id, title, body, status, segment, sent_at, created_at")
      .eq("realm_id", activeRealm.realmId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("titles")
      .select("key, name")
      .eq("realm_id", activeRealm.realmId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const rows = broadcasts ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-wide text-ivory">Herald</h1>
        <p className="text-sm text-ivory/50">Address the realm — broadcasts &amp; proclamations.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ivory">Proclamations ({rows.length})</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              {rows.length === 0 && <p className="text-sm text-ivory/45">No proclamations yet.</p>}
              {rows.map((b) => {
                const seg = b.segment as { kind?: string; value?: string } | null;
                return (
                  <div key={b.id} className="rounded-lg border border-white/8 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-ivory">{b.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge tone={b.status === "sent" ? "success" : "neutral"}>{b.status}</Badge>
                        {canCreate && b.status !== "sent" && <SendBroadcastButton id={b.id} />}
                      </div>
                    </div>
                    {b.body && <p className="mt-1 text-sm text-ivory/60">{b.body}</p>}
                    <p className="mt-1 text-[11px] text-ivory/30">
                      to {seg?.kind === "title" ? `title ${seg.value}` : "everyone"}
                      {b.sent_at ? ` · sent ${new Date(b.sent_at).toLocaleString()}` : ""}
                    </p>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ivory">New proclamation</h2>
            </CardHeader>
            <CardBody>
              {canCreate ? (
                <HeraldComposer titles={titles ?? []} />
              ) : (
                <p className="text-sm text-ivory/45">You need HERALD create rights.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
