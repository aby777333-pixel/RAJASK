import { Card, CardHeader, CardBody } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { SurveyComposer, PulseRespond } from "@/components/phase3/forms";

export const dynamic = "force-dynamic";

export default async function ChroniclePage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;
  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "CHRONICLE", action: "view" }))) return <p className="text-ivory/60">You may not view analytics.</p>;
  const canManage = await perms.can(actor, { subsystem: "CHRONICLE", action: "edit" });

  const realm = activeRealm.realmId;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const [members, activity, messages, surveys, responses] = await Promise.all([
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("realm_id", realm).eq("status", "active").is("deleted_at", null),
    supabase.from("audit_events").select("id", { count: "exact", head: true }).eq("realm_id", realm).gte("created_at", weekAgo),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("realm_id", realm),
    supabase.from("pulse_surveys").select("id, question, kind, active").eq("realm_id", realm).order("created_at", { ascending: false }).limit(20),
    supabase.from("pulse_responses").select("score").eq("realm_id", realm),
  ]);

  const scores = (responses.data ?? []).map((r) => r.score);
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "—";

  const Stat = ({ label, value }: { label: string; value: string | number }) => (
    <div className="rounded-regal border border-white/8 bg-obsidian-100 p-4"><div className="text-2xl font-semibold text-ivory">{value}</div><div className="text-xs text-ivory/50">{label}</div></div>
  );

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl tracking-wide text-ivory">Chronicle</h1>
        <p className="text-sm text-ivory/50">The living ledger — engagement, satisfaction, intelligence.</p></div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Active members" value={members.count ?? 0} />
        <Stat label="Actions (7d)" value={activity.count ?? 0} />
        <Stat label="Messages" value={messages.count ?? 0} />
        <Stat label="Avg pulse" value={avg} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Pulse surveys ({(surveys.data ?? []).length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {(surveys.data ?? []).length === 0 && <p className="text-sm text-ivory/45">No surveys running.</p>}
            {(surveys.data ?? []).map((s) => (
              <div key={s.id} className="rounded-lg border border-white/8 p-3">
                <div className="text-sm text-ivory">{s.question}</div>
                <div className="mt-2"><PulseRespond surveyId={s.id} /></div>
              </div>
            ))}
          </CardBody></Card></div>
        <div><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Launch pulse</h2></CardHeader>
          <CardBody>{canManage ? <SurveyComposer /> : <p className="text-sm text-ivory/45">You need CHRONICLE edit rights.</p>}</CardBody></Card></div>
      </div>
    </div>
  );
}
