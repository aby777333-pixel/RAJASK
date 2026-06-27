import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { DecisionComposer, RiskComposer } from "@/components/phase3/forms";

export const dynamic = "force-dynamic";

export default async function CodexPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;
  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "CODEX", action: "view" }))) return <p className="text-ivory/60">You may not view the codex.</p>;
  const canCreate = await perms.can(actor, { subsystem: "CODEX", action: "create" });

  const [{ data: decisions }, { data: risks }] = await Promise.all([
    supabase.from("decisions").select("id, title, reasoning, expected_outcome, actual_outcome, status, created_at").eq("realm_id", activeRealm.realmId).is("deleted_at", null).order("created_at", { ascending: false }).limit(50),
    supabase.from("risks").select("id, title, category, likelihood, impact, status").eq("realm_id", activeRealm.realmId).is("deleted_at", null).order("created_at", { ascending: false }).limit(50),
  ]);
  const dRows = decisions ?? [];
  const rRows = risks ?? [];

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl tracking-wide text-ivory">Codex</h1>
        <p className="text-sm text-ivory/50">The book of judgments &amp; the book of perils.</p></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card><CardHeader className="flex items-center justify-between"><h2 className="text-sm font-semibold text-ivory">Decisions ({dRows.length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {canCreate && <div className="mb-3 rounded-lg border border-white/8 p-3"><DecisionComposer /></div>}
            {dRows.length === 0 && <p className="text-sm text-ivory/45">No decisions logged.</p>}
            {dRows.map((d) => (
              <div key={d.id} className="rounded-lg border border-white/8 p-3">
                <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium text-ivory">{d.title}</span><Badge tone={d.status === "closed" ? "success" : "neutral"}>{d.status}</Badge></div>
                {d.reasoning && <p className="mt-1 text-xs text-ivory/55">{d.reasoning}</p>}
                {d.expected_outcome && <p className="mt-1 text-[11px] text-ivory/35">expected: {d.expected_outcome}</p>}
              </div>
            ))}
          </CardBody></Card>
        <Card><CardHeader className="flex items-center justify-between"><h2 className="text-sm font-semibold text-ivory">Risks ({rRows.length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {canCreate && <div className="mb-3 rounded-lg border border-white/8 p-3"><RiskComposer /></div>}
            {rRows.length === 0 && <p className="text-sm text-ivory/45">No risks registered.</p>}
            {rRows.map((r) => {
              const sev = r.likelihood * r.impact;
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 p-3">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-ivory">{r.title}</span><span className="text-[11px] text-ivory/40">{r.category} · L{r.likelihood}×I{r.impact}</span></span>
                  <Badge tone={sev >= 15 ? "danger" : sev >= 8 ? "warning" : "neutral"}>{sev}</Badge>
                </div>
              );
            })}
          </CardBody></Card>
      </div>
    </div>
  );
}
