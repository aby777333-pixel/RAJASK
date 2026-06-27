import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { ReportComposer, GenerateButton } from "@/components/phase3/forms";

export const dynamic = "force-dynamic";

export default async function ChanceryPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;
  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "CHANCERY", action: "view" }))) return <p className="text-ivory/60">You may not view reports.</p>;
  const canCreate = await perms.can(actor, { subsystem: "CHANCERY", action: "create" });

  const { data: reports } = await supabase.from("reports")
    .select("id, title, kind, format, status, content, generated_at")
    .eq("realm_id", activeRealm.realmId).is("deleted_at", null)
    .order("created_at", { ascending: false }).limit(50);
  const rows = reports ?? [];

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl tracking-wide text-ivory">Chancery</h1>
        <p className="text-sm text-ivory/50">The royal writing office — reports &amp; briefings.</p></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Reports ({rows.length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {rows.length === 0 && <p className="text-sm text-ivory/45">No reports yet.</p>}
            {rows.map((r) => {
              const m = (r.content as { metrics?: Record<string, number> } | null)?.metrics;
              return (
                <div key={r.id} className="rounded-lg border border-white/8 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-ivory">{r.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge>{r.kind}</Badge><Badge tone="neutral">{r.format}</Badge>
                      <Badge tone={r.status === "generated" ? "success" : "neutral"}>{r.status}</Badge>
                      {canCreate && r.status !== "generated" && <GenerateButton id={r.id} />}
                    </div>
                  </div>
                  {m && (
                    <p className="mt-2 text-[11px] text-ivory/40">
                      {m.activeMembers} members · {m.totalTasks} tasks · {m.pendingApprovals} pending approvals · {m.meetings} meetings
                    </p>
                  )}
                </div>
              );
            })}
          </CardBody></Card></div>
        <div><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">New report</h2></CardHeader>
          <CardBody>{canCreate ? <ReportComposer /> : <p className="text-sm text-ivory/45">You need CHANCERY create rights.</p>}</CardBody></Card></div>
      </div>
    </div>
  );
}
