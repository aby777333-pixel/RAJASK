import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { ConnectorComposer, ApiKeyComposer, RevokeKeyButton } from "@/components/phase4/forms";

export const dynamic = "force-dynamic";

export default async function ConduitPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;
  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "CONDUIT", action: "view" }))) return <p className="text-ivory/60">You may not view integrations.</p>;
  const canEdit = await perms.can(actor, { subsystem: "CONDUIT", action: "edit" });
  const canAdmin = await perms.can(actor, { subsystem: "CONDUIT", action: "admin" });

  const { data: connectors } = await supabase.from("integration_connectors")
    .select("id, provider, label, status, last_sync_at").eq("realm_id", activeRealm.realmId).order("created_at", { ascending: false });
  const cons = connectors ?? [];

  let keys: { id: string; name: string; key_prefix: string; revoked_at: string | null; created_at: string }[] = [];
  if (canAdmin) {
    const { data } = await supabase.from("api_keys").select("id, name, key_prefix, revoked_at, created_at").eq("realm_id", activeRealm.realmId).order("created_at", { ascending: false });
    keys = data ?? [];
  }

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl tracking-wide text-ivory">Conduit</h1>
        <p className="text-sm text-ivory/50">Connect RAJASK to the outside world — integrations, API, webhooks.</p></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Connectors ({cons.length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {canEdit && <div className="mb-3 rounded-lg border border-white/8 p-3"><ConnectorComposer /></div>}
            {cons.length === 0 && <p className="text-sm text-ivory/45">No connectors yet.</p>}
            {cons.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 p-3">
                <span className="truncate text-sm text-ivory">{c.label || c.provider}</span>
                <Badge tone={c.status === "connected" ? "success" : c.status === "error" ? "danger" : "neutral"}>{c.status}</Badge>
              </div>
            ))}
          </CardBody></Card>
        <Card><CardHeader><h2 className="text-sm font-semibold text-ivory">API keys</h2></CardHeader>
          <CardBody className="space-y-2">
            {!canAdmin && <p className="text-sm text-ivory/45">CONDUIT admin required to manage API keys.</p>}
            {canAdmin && <div className="mb-3 rounded-lg border border-white/8 p-3"><ApiKeyComposer /></div>}
            {canAdmin && keys.length === 0 && <p className="text-sm text-ivory/45">No API keys yet.</p>}
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 p-3">
                <span className="min-w-0"><span className="block truncate text-sm text-ivory">{k.name}</span><code className="text-[11px] text-ivory/40">{k.key_prefix}…</code></span>
                {k.revoked_at ? <Badge tone="danger">revoked</Badge> : <RevokeKeyButton id={k.id} />}
              </div>
            ))}
            <p className="pt-2 text-[11px] text-ivory/30">Public API base: <code>/api/conduit</code> · webhooks land at <code>/api/webhooks/*</code> (signature-verified).</p>
          </CardBody></Card>
      </div>
    </div>
  );
}
