import { Logo, SpectrumBar, Badge } from "@rajask/ui";
import { RegaliaNav } from "./RegaliaNav";

/** The persistent regal chrome: top bar, Regalia rail, content area. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian text-ivory">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-obsidian/80 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Logo size={32} />
          <div className="leading-tight">
            <div className="font-display text-lg tracking-wide">RAJASK</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-ivory/40">
              CEO Operating System
            </div>
          </div>
          <Badge tone="gold" className="ml-2 hidden sm:inline-flex">
            Phase 0 · Foundation
          </Badge>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-ivory/40 md:inline">No realm selected</span>
            <div
              className="grid h-8 w-8 place-items-center rounded-full bg-white/8 text-xs font-semibold"
              title="Account"
            >
              R
            </div>
          </div>
        </div>
        <SpectrumBar className="h-[3px] rounded-none" />
      </header>

      {/* Body */}
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
