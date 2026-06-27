import { Logo, SpectrumBar } from "@rajask/ui";
import { RegaliaNav } from "./RegaliaNav";
import { RealmMenu } from "./RealmMenu";
import type { RealmMembership } from "@/lib/court/data";

/** The persistent regal chrome: top bar, Regalia rail, content area. */
export function AppShell({
  email,
  memberships,
  activeRealmId,
  children,
}: {
  email: string;
  memberships: RealmMembership[];
  activeRealmId: string | null;
  children: React.ReactNode;
}) {
  const active = memberships.find((m) => m.realmId === activeRealmId) ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-obsidian text-ivory">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-obsidian/80 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Logo size={32} />
          <div className="leading-tight">
            <div className="font-display text-lg tracking-wide">RAJASK</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-ivory/40">
              {active ? active.realmName : "CEO Operating System"}
            </div>
          </div>
          <div className="ml-auto">
            <RealmMenu email={email} memberships={memberships} activeRealmId={activeRealmId} />
          </div>
        </div>
        <SpectrumBar className="h-[3px] rounded-none" />
      </header>

      <div className="mx-auto flex w-full max-w-[1500px] flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-white/8 p-3 lg:block">
          <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-ivory/30">
            The Regalia
          </div>
          <RegaliaNav />
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
