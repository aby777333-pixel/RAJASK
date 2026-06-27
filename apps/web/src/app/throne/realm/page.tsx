import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { CompanyComposer, OkrComposer } from "@/components/phase4/forms";

export const dynamic = "force-dynamic";

export default async function RealmPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;
  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "REALM", action: "view" }))) return <p className="text-ivory/60">You may not view the realm structure.</p>;
  const canCreate = await perms.can(actor, { subsystem: "REALM", action: "create" });
  const canEdit = await perms.can(actor, { subsystem: "REALM", action: "edit" });

  const [{ data: companies }, { data: okrs }] = await Promise.all([
    supabase.from("companies").select("id, name, kind, currency").eq("realm_id", activeRealm.realmId).is("deleted_at", null).order("created_at"),
    supabase.from("okrs").select("id, objective, key_result, progress, period, status").eq("realm_id", activeRealm.realmId).is("deleted_at", null).order("created_at", { ascending: false }).limit(40),
  ]);
  const cos = companies ?? [];
  const okrRows = okrs ?? [];

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl tracking-wide text-ivory">Realm</h1>
        <p className="text-sm text-ivory/50">The kingdom &amp; its provinces — companies, subsidiaries, OKRs.</p></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Companies ({cos.length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {canCreate && <div className="mb-3 rounded-lg border border-white/8 p-3"><CompanyComposer /></div>}
            {cos.length === 0 && <p className="text-sm text-ivory/45">No companies yet.</p>}
            {cos.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 p-3">
                <span className="truncate text-sm font-medium text-ivory">{c.name}</span>
                <div className="flex items-center gap-2"><Badge>{c.kind}</Badge><span className="text-[11px] text-ivory/40">{c.currency}</span></div>
              </div>
            ))}
          </CardBody></Card>
        <Card><CardHeader><h2 className="text-sm font-semibold text-ivory">OKRs ({okrRows.length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {canEdit && <div className="mb-3 rounded-lg border border-white/8 p-3"><OkrComposer /></div>}
            {okrRows.length === 0 && <p className="text-sm text-ivory/45">No objectives set.</p>}
            {okrRows.map((o) => (
              <div key={o.id} className="rounded-lg border border-white/8 p-3">
                <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium text-ivory">{o.objective}</span><Badge tone={o.status === "done" ? "success" : "neutral"}>{o.progress}%</Badge></div>
                {o.key_result && <p className="mt-1 text-xs text-ivory/55">{o.key_result}</p>}
                {o.period && <p className="mt-1 text-[11px] text-ivory/30">{o.period}</p>}
              </div>
            ))}
          </CardBody></Card>
      </div>
    </div>
  );
}
