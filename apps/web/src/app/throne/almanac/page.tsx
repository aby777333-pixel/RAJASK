import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { EventComposer } from "@/components/almanac/EventComposer";

export const dynamic = "force-dynamic";

export default async function AlmanacPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;

  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };
  if (!(await perms.can(actor, { subsystem: "ALMANAC", action: "view" }))) {
    return <p className="text-ivory/60">You may not view the calendar.</p>;
  }
  const canCreate = await perms.can(actor, { subsystem: "ALMANAC", action: "create" });

  const nowIso = new Date().toISOString();
  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, title, kind, location, starts_at, ends_at, visibility")
    .eq("realm_id", activeRealm.realmId)
    .is("deleted_at", null)
    .gte("starts_at", new Date(Date.now() - 86400000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(50);

  const rows = events ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-wide text-ivory">Almanac</h1>
        <p className="text-sm text-ivory/50">Master of days &amp; journeys — calendar, meetings, travel.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ivory">Upcoming ({rows.length})</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              {rows.length === 0 && <p className="text-sm text-ivory/45">No upcoming events.</p>}
              {rows.map((e) => {
                const start = new Date(e.starts_at);
                const past = e.starts_at < nowIso;
                return (
                  <div
                    key={e.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border border-white/8 p-3 ${past ? "opacity-50" : ""}`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ivory">{e.title}</div>
                      <div className="truncate text-[11px] text-ivory/40">
                        {start.toLocaleString()} {e.location ? `· ${e.location}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{e.kind}</Badge>
                      <Badge tone="neutral">{e.visibility}</Badge>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ivory">New event</h2>
            </CardHeader>
            <CardBody>
              {canCreate ? (
                <EventComposer />
              ) : (
                <p className="text-sm text-ivory/45">You need ALMANAC create rights.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
