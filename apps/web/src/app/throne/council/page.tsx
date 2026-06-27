import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { CouncilComposer } from "@/components/phase2/forms";

export const dynamic = "force-dynamic";

export default async function CouncilPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;
  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "COUNCIL", action: "view" }))) return <p className="text-ivory/60">You may not view meetings.</p>;
  const canCreate = await perms.can(actor, { subsystem: "COUNCIL", action: "create" });

  const { data: meetings } = await supabase.from("meetings")
    .select("id, title, agenda, starts_at, location, status")
    .eq("realm_id", activeRealm.realmId).is("deleted_at", null)
    .order("starts_at", { ascending: true }).limit(80);
  const rows = meetings ?? [];

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl tracking-wide text-ivory">Council</h1>
        <p className="text-sm text-ivory/50">Convene, run, and capture every meeting.</p></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Meetings ({rows.length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {rows.length === 0 && <p className="text-sm text-ivory/45">No meetings scheduled.</p>}
            {rows.map((m) => (
              <div key={m.id} className="rounded-lg border border-white/8 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ivory">{m.title}</span>
                  <Badge tone={m.status === "completed" ? "success" : "neutral"}>{m.status}</Badge>
                </div>
                {m.agenda && <p className="mt-1 text-xs text-ivory/55">{m.agenda}</p>}
                <p className="mt-1 text-[11px] text-ivory/30">{new Date(m.starts_at).toLocaleString()}{m.location ? ` · ${m.location}` : ""}</p>
              </div>
            ))}
          </CardBody></Card></div>
        <div><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Convene meeting</h2></CardHeader>
          <CardBody>{canCreate ? <CouncilComposer /> : <p className="text-sm text-ivory/45">You need COUNCIL create rights.</p>}</CardBody></Card></div>
      </div>
    </div>
  );
}
