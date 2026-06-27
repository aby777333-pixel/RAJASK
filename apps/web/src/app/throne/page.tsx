import { WidgetShell, Badge, Button, SpectrumBar } from "@rajask/ui";
import type { Subsystem } from "@rajask/core";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

interface Widget {
  subsystem: Subsystem;
  title: string;
  empty: string;
}

/** §5.1 — the THRONE widget set. Live data is wired per-subsystem in later phases. */
const WIDGETS: Widget[] = [
  { subsystem: "VIZIER", title: "Morning Intelligence", empty: "Your AI chief of staff will brief you here once a realm is established." },
  { subsystem: "ALMANAC", title: "Today's Agenda", empty: "No meetings or events. Connect a calendar in Phase 1." },
  { subsystem: "SEAL", title: "Pending Approvals", empty: "Nothing awaits your seal." },
  { subsystem: "CHANCERY", title: "Outstanding Reports", empty: "No reports due. The reporting engine arrives in Phase 3." },
  { subsystem: "WRIT", title: "Delegated Tasks", empty: "No decrees in flight. Delegation lands in Phase 2." },
  { subsystem: "CHRONICLE", title: "Team Health", empty: "Engagement analytics begin once members join your court." },
  { subsystem: "TREASURY", title: "Cash & Revenue", empty: "Connect accounting via CONDUIT to see money at a glance." },
  { subsystem: "WARD", title: "Critical Alerts", empty: "All quiet. Risk and security warnings surface here." },
];

export default async function ThronePage() {
  let userEmail: string | null = null;
  if (env.isConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      userEmail = data.user?.email ?? null;
    } catch {
      userEmail = null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-wide text-ivory">The Throne</h1>
          <p className="text-sm text-ivory/50">
            {userEmail
              ? `Welcome back, ${userEmail}.`
              : "The seat of power. Everything important, at a glance."}
          </p>
        </div>
        <Badge tone={env.isConfigured() ? "success" : "warning"}>
          {env.isConfigured() ? "Supabase connected" : "Supabase not configured"}
        </Badge>
      </div>

      {/* Establish-realm banner (Phase 0 state) */}
      <div className="rounded-regal border border-gold/20 bg-gold/[0.06] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ivory">Establish your realm</h2>
            <p className="mt-1 max-w-2xl text-sm text-ivory/55">
              The foundation is laid — multi-tenant schema, default-deny RLS, the permission
              resolver, append-only audit, and the regal design system. Sign-in and realm
              creation (COURT) arrive in Phase 1, which will light up the widgets below.
            </p>
          </div>
          <Button variant="outline" disabled title="Available in Phase 1">
            Create realm →
          </Button>
        </div>
        <SpectrumBar className="mt-4" />
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {WIDGETS.map((w) => (
          <WidgetShell key={w.title} subsystem={w.subsystem} title={w.title}>
            <p className="text-sm text-ivory/45">{w.empty}</p>
          </WidgetShell>
        ))}
      </div>
    </div>
  );
}
