import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { EdictComposer, RuleControls } from "@/components/phase2/forms";

export const dynamic = "force-dynamic";

export default async function EdictPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;
  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "EDICT", action: "view" }))) return <p className="text-ivory/60">You may not view rules.</p>;
  const canEdit = await perms.can(actor, { subsystem: "EDICT", action: "edit" });

  const { data: rules } = await supabase.from("automation_rules")
    .select("id, name, description, enabled, fire_count, last_fired_at")
    .eq("realm_id", activeRealm.realmId).is("deleted_at", null)
    .order("created_at", { ascending: false }).limit(80);
  const rows = rules ?? [];

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl tracking-wide text-ivory">Edict</h1>
        <p className="text-sm text-ivory/50">Standing rules that run the realm without you touching them.</p></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Rules ({rows.length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {rows.length === 0 && <p className="text-sm text-ivory/45">No standing rules yet.</p>}
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/8 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ivory">{r.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge tone={r.enabled ? "success" : "neutral"}>{r.enabled ? "enabled" : "disabled"}</Badge>
                    <RuleControls id={r.id} enabled={r.enabled} canEdit={canEdit} />
                  </div>
                </div>
                {r.description && <p className="mt-1 text-xs text-ivory/55">{r.description}</p>}
                <p className="mt-1 text-[11px] text-ivory/30">fired {r.fire_count}×{r.last_fired_at ? ` · last ${new Date(r.last_fired_at).toLocaleString()}` : ""}</p>
              </div>
            ))}
          </CardBody></Card></div>
        <div><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">New rule</h2></CardHeader>
          <CardBody>{canEdit ? <EdictComposer /> : <p className="text-sm text-ivory/45">You need EDICT edit rights.</p>}</CardBody></Card></div>
      </div>
    </div>
  );
}
