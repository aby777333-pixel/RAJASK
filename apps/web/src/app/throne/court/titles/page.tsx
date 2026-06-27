import Link from "next/link";
import { Card, CardHeader, CardBody, Badge } from "@rajask/ui";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { TitleMatrix } from "@/components/TitleMatrix";

export const dynamic = "force-dynamic";

export default async function TitlesPage({
  searchParams,
}: {
  searchParams: { title?: string };
}) {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return <p className="text-ivory/60">Establish a realm first.</p>;

  const supabase = createClient();
  const perms = createPermissionService(supabase);
  const actor = { userId: user.id, realmId: activeRealm.realmId };

  if (!(await perms.can(actor, { subsystem: "COURT", action: "view" }))) {
    return <p className="text-ivory/60">You may not view titles.</p>;
  }
  const canConfigure = await perms.can(actor, { subsystem: "COURT", action: "configure" });

  const { data: titles } = await supabase
    .from("titles")
    .select("id, name, key, is_system")
    .eq("realm_id", activeRealm.realmId)
    .is("deleted_at", null)
    .order("name");

  const titleRows = titles ?? [];
  const selectedId = searchParams.title ?? titleRows[0]?.id ?? null;
  const selected = titleRows.find((t) => t.id === selectedId) ?? null;

  let allowedKeys: string[] = [];
  if (selected) {
    const { data: cells } = await supabase
      .from("title_permissions")
      .select("subsystem, action, allowed")
      .eq("title_id", selected.id);
    allowedKeys = (cells ?? [])
      .filter((c) => c.allowed)
      .map((c) => `${c.subsystem}:${c.action}`);
  }

  const isSovereignTitle = selected?.key === "SOVEREIGN";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-wide text-ivory">Titles & Permissions</h1>
          <p className="text-sm text-ivory/50">
            The permission matrix as data — every title × subsystem × action.
          </p>
        </div>
        <Link
          href="/throne/court"
          className="rounded-regal border border-white/10 px-3 py-1.5 text-sm text-ivory hover:bg-white/5"
        >
          ← Court
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Title list */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ivory">
                Titles <span className="text-ivory/40">({titleRows.length})</span>
              </h2>
            </CardHeader>
            <CardBody className="max-h-[70vh] space-y-0.5 overflow-y-auto">
              {titleRows.map((t) => (
                <Link
                  key={t.id}
                  href={`/throne/court/titles?title=${t.id}`}
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                    t.id === selectedId ? "bg-white/5 text-gold" : "text-ivory/75 hover:bg-white/[0.03]"
                  }`}
                >
                  <span className="truncate">{t.name}</span>
                  {t.key === "SOVEREIGN" && <Badge tone="gold">★</Badge>}
                </Link>
              ))}
            </CardBody>
          </Card>
        </div>

        {/* Matrix */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ivory">
                {selected ? selected.name : "Select a title"}
              </h2>
              {isSovereignTitle && <Badge tone="gold">Unrestricted — not editable</Badge>}
              {!isSovereignTitle && !canConfigure && (
                <Badge tone="warning">Read-only (needs COURT configure)</Badge>
              )}
            </CardHeader>
            <CardBody>
              {selected ? (
                <TitleMatrix
                  key={selected.id}
                  titleId={selected.id}
                  initial={allowedKeys}
                  editable={canConfigure && !isSovereignTitle}
                />
              ) : (
                <p className="text-sm text-ivory/45">No title selected.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
