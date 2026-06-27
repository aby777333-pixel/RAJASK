import Link from "next/link";
import { WidgetShell, Badge, SpectrumBar } from "@rajask/ui";
import type { Subsystem } from "@rajask/core";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";
import { EstablishRealm } from "@/components/EstablishRealm";

export const dynamic = "force-dynamic";

interface Widget {
  subsystem: Subsystem;
  title: string;
  empty: string;
}

const WIDGETS: Widget[] = [
  { subsystem: "VIZIER", title: "Morning Intelligence", empty: "Your AI chief of staff will brief you here (Phase 3)." },
  { subsystem: "ALMANAC", title: "Today's Agenda", empty: "No meetings or events yet (Phase 1)." },
  { subsystem: "SEAL", title: "Pending Approvals", empty: "Nothing awaits your seal (Phase 2)." },
  { subsystem: "CHANCERY", title: "Outstanding Reports", empty: "No reports due (Phase 3)." },
  { subsystem: "WRIT", title: "Delegated Tasks", empty: "No decrees in flight (Phase 2)." },
  { subsystem: "CHRONICLE", title: "Team Health", empty: "Engagement analytics arrive in Phase 3." },
];

export default async function ThronePage() {
  const { user, activeRealm } = await getCourtContext();

  // Signed in but no realm yet → first-run flow.
  if (!activeRealm) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl tracking-wide text-ivory">Welcome to RAJASK</h1>
          <p className="text-sm text-ivory/50">
            {user?.email}, you hold no realm yet. Establish one to take the throne.
          </p>
        </div>
        <EstablishRealm />
      </div>
    );
  }

  // Live realm stats (RLS-scoped to what the caller may see).
  const supabase = createClient();
  const [{ count: memberCount }, { count: titleCount }, { data: auditRows }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("realm_id", activeRealm.realmId)
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .from("titles")
      .select("id", { count: "exact", head: true })
      .eq("realm_id", activeRealm.realmId),
    supabase
      .from("audit_events")
      .select("action, target_table, created_at")
      .eq("realm_id", activeRealm.realmId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-wide text-ivory">The Throne</h1>
          <p className="text-sm text-ivory/50">
            {activeRealm.realmName} · you reign as{" "}
            <span className="text-ivory/80">{activeRealm.titleName}</span>.
          </p>
        </div>
        {activeRealm.isSovereign && <Badge tone="gold">Sovereign</Badge>}
      </div>

      {/* Live realm snapshot */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Members" value={memberCount ?? 0} subsystem="COURT" />
        <Stat label="Titles" value={titleCount ?? 0} subsystem="COURT" />
        <Stat label="Companies" value={0} subsystem="REALM" hint="Phase 1" />
        <Stat label="Audit events" value={auditRows?.length ?? 0} subsystem="WARD" hint="recent" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/throne/court"
          className="rounded-regal border border-white/10 px-4 py-2 text-sm text-ivory hover:bg-white/5"
        >
          Manage the Court →
        </Link>
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {WIDGETS.map((w) => (
          <WidgetShell key={w.title} subsystem={w.subsystem} title={w.title}>
            <p className="text-sm text-ivory/45">{w.empty}</p>
          </WidgetShell>
        ))}

        {/* Live WARD audit feed */}
        <WidgetShell subsystem="WARD" title="Audit Trail">
          {auditRows && auditRows.length > 0 ? (
            <ul className="space-y-1.5 text-sm">
              {auditRows.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className="text-ivory/70">
                    <span className="text-ivory/40">{a.action}</span> {a.target_table}
                  </span>
                  <span className="text-[11px] text-ivory/30">
                    {new Date(a.created_at).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ivory/45">No audit events visible.</p>
          )}
        </WidgetShell>
      </div>

      <SpectrumBar />
    </div>
  );
}

function Stat({
  label,
  value,
  subsystem,
  hint,
}: {
  label: string;
  value: number;
  subsystem: Subsystem;
  hint?: string;
}) {
  return (
    <div className="rounded-regal border border-white/8 bg-obsidian-100 p-4">
      <div className="text-2xl font-semibold text-ivory">{value}</div>
      <div className="text-xs text-ivory/50">{label}</div>
      {hint && <div className="text-[10px] text-ivory/30">{hint}</div>}
    </div>
  );
}
