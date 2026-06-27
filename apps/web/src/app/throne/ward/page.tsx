import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";

export const dynamic = "force-dynamic";

export default async function WardPage() {
  const { user, activeRealm, isSuperAdmin } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;
  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "WARD", action: "view" }))) {
    return <p className="text-ivory/60">Only the Sovereign / WARD viewers may see the audit.</p>;
  }

  const { data: events } = await supabase.from("audit_events")
    .select("action, target_table, actor_user_id, created_at")
    .eq("realm_id", activeRealm.realmId)
    .order("created_at", { ascending: false }).limit(60);
  const rows = events ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-2xl tracking-wide text-ivory">Ward</h1>
          <p className="text-sm text-ivory/50">Security, access &amp; the append-only audit log.</p></div>
        {isSuperAdmin && <Badge tone="gold">Platform Super Admin</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-regal border border-white/8 bg-obsidian-100 p-4"><div className="text-2xl font-semibold text-ivory">{rows.length}</div><div className="text-xs text-ivory/50">Recent events</div></div>
        <div className="rounded-regal border border-white/8 bg-obsidian-100 p-4"><div className="text-2xl font-semibold text-spectrum-lime">RLS</div><div className="text-xs text-ivory/50">Default-deny, forced</div></div>
        <div className="rounded-regal border border-white/8 bg-obsidian-100 p-4"><div className="text-2xl font-semibold text-spectrum-teal">Append-only</div><div className="text-xs text-ivory/50">Audit immutable</div></div>
        <div className="rounded-regal border border-white/8 bg-obsidian-100 p-4"><div className="text-2xl font-semibold text-gold">DPDP</div><div className="text-xs text-ivory/50">India-first</div></div>
      </div>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-ivory">Audit trail</h2></CardHeader>
        <CardBody className="space-y-1">
          {rows.length === 0 && <p className="text-sm text-ivory/45">No audit events visible.</p>}
          {rows.map((a, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-white/[0.03]">
              <span className="text-sm text-ivory/75"><span className="text-ivory/40">{a.action}</span> {a.target_table}</span>
              <span className="text-[11px] text-ivory/30">{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
