import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { Money } from "@rajask/core";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { SnapshotComposer, ExpenseComposer } from "@/components/phase3/forms";

export const dynamic = "force-dynamic";

function fmt(v: number | string | null, cur: string) {
  if (v === null) return "—";
  return Money.fromDb(String(v), cur).format();
}

export default async function TreasuryPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;
  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "TREASURY", action: "view" }))) return <p className="text-ivory/60">You may not view finances.</p>;
  const canCreate = await perms.can(actor, { subsystem: "TREASURY", action: "create" });

  const [{ data: snaps }, { data: expenses }] = await Promise.all([
    supabase.from("treasury_snapshots").select("revenue, cash, expenses, currency, as_of").eq("realm_id", activeRealm.realmId).order("as_of", { ascending: false }).limit(1),
    supabase.from("expenses").select("id, amount, currency, category, description, status").eq("realm_id", activeRealm.realmId).order("created_at", { ascending: false }).limit(40),
  ]);
  const snap = snaps?.[0];
  const cur = snap?.currency ?? "INR";
  const exp = expenses ?? [];

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl tracking-wide text-ivory">Treasury</h1>
        <p className="text-sm text-ivory/50">Money at a glance — Decimal-exact, no floats.</p></div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-regal border border-white/8 bg-obsidian-100 p-4"><div className="text-xl font-semibold text-spectrum-lime">{fmt(snap?.revenue ?? null, cur)}</div><div className="text-xs text-ivory/50">Revenue</div></div>
        <div className="rounded-regal border border-white/8 bg-obsidian-100 p-4"><div className="text-xl font-semibold text-gold">{fmt(snap?.cash ?? null, cur)}</div><div className="text-xs text-ivory/50">Cash</div></div>
        <div className="rounded-regal border border-white/8 bg-obsidian-100 p-4"><div className="text-xl font-semibold text-spectrum-orange">{fmt(snap?.expenses ?? null, cur)}</div><div className="text-xs text-ivory/50">Expenses</div></div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Expenses ({exp.length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {exp.length === 0 && <p className="text-sm text-ivory/45">No expenses submitted.</p>}
            {exp.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 p-3">
                <span className="min-w-0"><span className="block truncate text-sm text-ivory">{e.description || e.category || "Expense"}</span><span className="text-[11px] text-ivory/40">{e.category}</span></span>
                <div className="flex items-center gap-2"><span className="text-sm text-ivory/80">{fmt(e.amount, e.currency)}</span><Badge tone={e.status === "approved" || e.status === "reimbursed" ? "success" : "neutral"}>{e.status}</Badge></div>
              </div>
            ))}
          </CardBody></Card></div>
        <div className="space-y-6">
          <Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Snapshot</h2></CardHeader><CardBody>{canCreate ? <SnapshotComposer /> : <p className="text-sm text-ivory/45">Needs TREASURY create.</p>}</CardBody></Card>
          <Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Submit expense</h2></CardHeader><CardBody><ExpenseComposer /></CardBody></Card>
        </div>
      </div>
    </div>
  );
}
