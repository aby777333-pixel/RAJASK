import Link from "next/link";
import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { InviteForm } from "@/components/InviteForm";
import { revokeInvitation, setMemberStatus } from "@/lib/court/manage";

export const dynamic = "force-dynamic";

export default async function CourtPage() {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) {
    return <p className="text-ivory/60">Establish a realm first.</p>;
  }

  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };

  const canView = await perms.can(actor, { subsystem: "COURT", action: "view" });
  if (!canView) {
    return (
      <div className="rounded-regal border border-spectrum-crimson/30 bg-spectrum-crimson/[0.06] p-5">
        <h1 className="text-lg font-semibold text-ivory">Court — access denied</h1>
        <p className="mt-1 text-sm text-ivory/55">
          Your title does not grant you visibility into the Court.
        </p>
      </div>
    );
  }
  const canAdmin = await perms.can(actor, { subsystem: "COURT", action: "admin" });

  const [members, titles, invites] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, status, is_sovereign, users(full_name, email), titles(name, key)")
      .eq("realm_id", activeRealm.realmId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("titles")
      .select("id, name, key")
      .eq("realm_id", activeRealm.realmId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("invitations")
      .select("id, email, channel, status, note, created_at, titles(name)")
      .eq("realm_id", activeRealm.realmId)
      .order("created_at", { ascending: false }),
  ]);

  const memberRows = members.data ?? [];
  const titleRows = titles.data ?? [];
  const inviteRows = invites.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-wide text-ivory">The Court</h1>
          <p className="text-sm text-ivory/50">
            Who is admitted to {activeRealm.realmName} and the titles they hold.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/throne/court/titles"
            className="rounded-regal border border-white/10 px-3 py-1.5 text-sm text-ivory hover:bg-white/5"
          >
            Titles & permissions →
          </Link>
          <Link
            href="/throne"
            className="rounded-regal border border-white/10 px-3 py-1.5 text-sm text-ivory hover:bg-white/5"
          >
            ← Throne
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Directory */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ivory">
                Members <span className="text-ivory/40">({memberRows.length})</span>
              </h2>
            </CardHeader>
            <CardBody className="space-y-1">
              {memberRows.map((m) => {
                const u = m.users as unknown as { full_name: string | null; email: string | null } | null;
                const t = m.titles as unknown as { name: string; key: string | null } | null;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-ivory">
                        {u?.full_name || u?.email || "Unknown"}
                      </div>
                      <div className="truncate text-[11px] text-ivory/40">{u?.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.is_sovereign && <Badge tone="gold">Sovereign</Badge>}
                      <Badge>{t?.name ?? "—"}</Badge>
                      {m.status !== "active" && <Badge tone="warning">{m.status}</Badge>}
                      {canAdmin && !m.is_sovereign && (
                        <form
                          action={setMemberStatus.bind(
                            null,
                            m.id,
                            m.status === "active" ? "suspended" : "active",
                          )}
                        >
                          <button
                            type="submit"
                            className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-ivory/70 hover:bg-white/5"
                          >
                            {m.status === "active" ? "Suspend" : "Restore"}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          {/* Invitations */}
          <Card className="mt-6">
            <CardHeader>
              <h2 className="text-sm font-semibold text-ivory">
                Invitations <span className="text-ivory/40">({inviteRows.length})</span>
              </h2>
            </CardHeader>
            <CardBody className="space-y-1">
              {inviteRows.length === 0 && (
                <p className="text-sm text-ivory/45">No invitations yet.</p>
              )}
              {inviteRows.map((inv) => {
                const t = inv.titles as unknown as { name: string } | null;
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-ivory">
                        {inv.email || "(shareable link)"}
                      </div>
                      <div className="truncate text-[11px] text-ivory/40">
                        {t?.name} · {inv.channel}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={inv.status === "activated" ? "success" : "neutral"}>
                        {inv.status}
                      </Badge>
                      {canAdmin && inv.status !== "activated" && inv.status !== "revoked" && (
                        <form action={revokeInvitation.bind(null, inv.id)}>
                          <button
                            type="submit"
                            className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-ivory/70 hover:bg-white/5"
                          >
                            Revoke
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </div>

        {/* Invite form */}
        <div>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ivory">Admit to the court</h2>
            </CardHeader>
            <CardBody>
              {canAdmin ? (
                <InviteForm titles={titleRows.map((t) => ({ id: t.id, name: t.name }))} />
              ) : (
                <p className="text-sm text-ivory/45">
                  You need COURT admin rights to invite members.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
