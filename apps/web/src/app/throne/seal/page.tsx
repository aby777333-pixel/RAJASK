import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { Money } from "@rajask/core";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { SealComposer, ApprovalDecision } from "@/components/phase2/forms";

export const dynamic = "force-dynamic";

export default async function SealPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;
  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "SEAL", action: "view" }))) return <p className="text-ivory/60">You may not view approvals.</p>;
  const canCreate = await perms.can(actor, { subsystem: "SEAL", action: "create" });
  const canApprove = await perms.can(actor, { subsystem: "SEAL", action: "approve" });

  const { data: reqs } = await supabase.from("approval_requests")
    .select("id, title, kind, amount, currency, status, detail, created_at")
    .eq("realm_id", activeRealm.realmId).order("created_at", { ascending: false }).limit(80);
  const rows = reqs ?? [];

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl tracking-wide text-ivory">Seal</h1>
        <p className="text-sm text-ivory/50">Approvals &amp; authority — nothing sensitive happens unsealed.</p></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Requests ({rows.length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {rows.length === 0 && <p className="text-sm text-ivory/45">Nothing awaits your seal.</p>}
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/8 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ivory">{r.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge>{r.kind}</Badge>
                    <Badge tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "neutral"}>{r.status}</Badge>
                    {r.status === "pending" && <ApprovalDecision id={r.id} canApprove={canApprove} />}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-ivory/40">
                  {r.amount !== null ? Money.fromDb(String(r.amount), r.currency ?? "INR").format() : "no amount"}
                  {r.detail ? ` · ${r.detail}` : ""}
                </p>
              </div>
            ))}
          </CardBody></Card></div>
        <div><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Request approval</h2></CardHeader>
          <CardBody>{canCreate ? <SealComposer /> : <p className="text-sm text-ivory/45">You need SEAL create rights.</p>}</CardBody></Card></div>
      </div>
    </div>
  );
}
