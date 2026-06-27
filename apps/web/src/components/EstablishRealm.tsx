"use client";

import { useState, useTransition } from "react";
import { Button, SpectrumBar } from "@rajask/ui";
import { createRealm } from "@/lib/court/actions";

/** First-run flow: name your realm and be invested as its Sovereign. */
export function EstablishRealm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createRealm(name);
      if (res && !res.ok) setError(res.error ?? "Could not create realm");
    });
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-regal border border-gold/20 bg-gold/[0.06] p-6">
        <h2 className="font-display text-xl text-ivory">Establish your realm</h2>
        <p className="mt-2 text-sm text-ivory/55">
          Name the sovereign account from which you will run everything. You will be invested
          as its Sovereign with unrestricted authority — every title, company, and member is
          yours to command.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-ivory/50">Realm name</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-ivory outline-none placeholder:text-ivory/25 focus:border-gold/50"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Holdings, The Sharma Family Office"
              autoFocus
              required
            />
          </label>
          {error && <p className="text-sm text-spectrum-crimson">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Establishing…" : "Establish realm →"}
          </Button>
        </form>
        <SpectrumBar className="mt-5" />
      </div>
    </div>
  );
}
