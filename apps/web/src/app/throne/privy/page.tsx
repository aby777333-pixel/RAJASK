import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { PrivyComposer } from "@/components/phase4/forms";

export const dynamic = "force-dynamic";

export default async function PrivyPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;
  const supabase = createClient();

  // Owner-only by RLS — no realm permission needed; this is the private sphere.
  const { data: items } = await supabase.from("privy_items")
    .select("id, kind, title, body, due_at").eq("owner_user_id", user.id).is("deleted_at", null)
    .order("created_at", { ascending: false }).limit(80);
  const rows = items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-wide text-ivory">Privy</h1>
        <p className="text-sm text-ivory/50">Your private household — walled off from company data, visible to no one but you.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Private items ({rows.length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {rows.length === 0 && <p className="text-sm text-ivory/45">Nothing private yet.</p>}
            {rows.map((p) => (
              <div key={p.id} className="rounded-lg border border-white/8 p-3">
                <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium text-ivory">{p.title}</span><Badge>{p.kind}</Badge></div>
                {p.body && <p className="mt-1 text-xs text-ivory/55">{p.body}</p>}
                {p.due_at && <p className="mt-1 text-[11px] text-ivory/30">{new Date(p.due_at).toLocaleString()}</p>}
              </div>
            ))}
          </CardBody></Card></div>
        <div><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Add private item</h2></CardHeader>
          <CardBody><PrivyComposer /></CardBody></Card></div>
      </div>
    </div>
  );
}
