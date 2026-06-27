import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { getRealmPeople } from "@/lib/courier/data";
import { WritComposer, TaskStatus } from "@/components/phase2/forms";

export const dynamic = "force-dynamic";

export default async function WritPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;
  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "WRIT", action: "view" }))) return <p className="text-ivory/60">You may not view decrees.</p>;
  const canCreate = await perms.can(actor, { subsystem: "WRIT", action: "create" });
  const canEdit = await perms.can(actor, { subsystem: "WRIT", action: "edit" });

  const [{ data: tasks }, people] = await Promise.all([
    supabase.from("tasks").select("id, title, brief, priority, status, due_at, assignee_user_id")
      .eq("realm_id", activeRealm.realmId).is("deleted_at", null).order("created_at", { ascending: false }).limit(80),
    getRealmPeople(activeRealm.realmId, user.id),
  ]);
  const rows = tasks ?? [];
  const nameMap = new Map<string, string>(people.map((p) => [p.userId, p.name]));
  nameMap.set(user.id, "You");

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl tracking-wide text-ivory">Writ</h1>
        <p className="text-sm text-ivory/50">Delegation engine — turn intent into tracked, accountable execution.</p></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">Decrees ({rows.length})</h2></CardHeader>
          <CardBody className="space-y-2">
            {rows.length === 0 && <p className="text-sm text-ivory/45">No decrees yet.</p>}
            {rows.map((t) => (
              <div key={t.id} className="rounded-lg border border-white/8 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ivory">{t.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge tone={t.priority === "urgent" || t.priority === "high" ? "warning" : "neutral"}>{t.priority}</Badge>
                    <TaskStatus id={t.id} status={t.status} editable={canEdit} />
                  </div>
                </div>
                {t.brief && <p className="mt-1 text-xs text-ivory/55">{t.brief}</p>}
                <p className="mt-1 text-[11px] text-ivory/30">
                  {t.assignee_user_id ? `→ ${nameMap.get(t.assignee_user_id) ?? "member"}` : "unassigned"}
                  {t.due_at ? ` · due ${new Date(t.due_at).toLocaleDateString()}` : ""}
                </p>
              </div>
            ))}
          </CardBody></Card></div>
        <div><Card><CardHeader><h2 className="text-sm font-semibold text-ivory">New decree</h2></CardHeader>
          <CardBody>{canCreate ? <WritComposer people={people} /> : <p className="text-sm text-ivory/45">You need WRIT create rights.</p>}</CardBody></Card></div>
      </div>
    </div>
  );
}
