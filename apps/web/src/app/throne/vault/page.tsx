import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { VaultComposer } from "@/components/phase2/forms";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;
  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "VAULT", action: "view" }))) return <p className="text-ivory/60">You may not view the vault.</p>;
  const canCreate = await perms.can(actor, { subsystem: "VAULT", action: "create" });

  const { data: docs } = await supabase.from("documents")
    .select("id, title, category, status, version, created_at")
    .eq("realm_id", activeRealm.realmId).is("deleted_at", null)
    .order("created_at", { ascending: false }).limit(80);
  const rows = docs ?? [];

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl tracking-wide text-ivory">Vault</h1>
        <p className="text-sm text-ivory/50">The sovereign archive — documents, contracts, e-signatures.</p></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Documents ({rows.length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {rows.length === 0 && <p className="text-sm text-ivory/45">The vault is empty.</p>}
            {rows.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 p-3">
                <span className="truncate text-sm font-medium text-ivory">{d.title}</span>
                <div className="flex items-center gap-2">
                  <Badge>{d.category}</Badge>
                  <span className="text-[11px] text-ivory/30">v{d.version}</span>
                  <Badge tone={d.status === "active" ? "success" : "neutral"}>{d.status}</Badge>
                </div>
              </div>
            ))}
          </CardBody></Card></div>
        <div><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Register document</h2></CardHeader>
          <CardBody>{canCreate ? <VaultComposer /> : <p className="text-sm text-ivory/45">You need VAULT create rights.</p>}</CardBody></Card></div>
      </div>
    </div>
  );
}
