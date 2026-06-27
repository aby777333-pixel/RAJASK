"use client";

import { useState, useTransition } from "react";
import { Button } from "@rajask/ui";
import {
  createCompany,
  createOkr,
  createConnector,
  createApiKey,
  revokeApiKey,
  createPrivyItem,
} from "@/lib/phase4";

const input =
  "w-full rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-ivory outline-none placeholder:text-ivory/25 focus:border-gold/50";
function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p className={`text-sm ${msg.ok ? "text-spectrum-teal" : "text-spectrum-crimson"}`}>{msg.text}</p>;
}

export function CompanyComposer() {
  const [name, setName] = useState(""); const [kind, setKind] = useState("subsidiary"); const [currency, setCur] = useState("INR");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); start(async () => { const r = await createCompany({ name, kind, currency }); setMsg(r.ok ? { ok: true, text: "Company added." } : { ok: false, text: r.error ?? "Failed" }); if (r.ok) setName(""); }); }} className="space-y-2">
      <input className={input} placeholder="Company name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>{["company", "subsidiary", "spv", "family_office", "jv", "holding", "department"].map((k) => <option key={k} value={k} className="bg-obsidian">{k}</option>)}</select>
        <input className={input} value={currency} onChange={(e) => setCur(e.target.value.toUpperCase())} />
      </div>
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add company"}</Button>
    </form>
  );
}

export function OkrComposer() {
  const [objective, setO] = useState(""); const [keyResult, setK] = useState(""); const [period, setP] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); start(async () => { const r = await createOkr({ objective, keyResult, period }); setMsg(r.ok ? { ok: true, text: "OKR set." } : { ok: false, text: r.error ?? "Failed" }); if (r.ok) { setO(""); setK(""); setP(""); } }); }} className="space-y-2">
      <input className={input} placeholder="Objective" value={objective} onChange={(e) => setO(e.target.value)} />
      <input className={input} placeholder="Key result" value={keyResult} onChange={(e) => setK(e.target.value)} />
      <input className={input} placeholder="Period (e.g. Q3 2026)" value={period} onChange={(e) => setP(e.target.value)} />
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Setting…" : "Set OKR"}</Button>
    </form>
  );
}

export function ConnectorComposer() {
  const [provider, setProvider] = useState("slack"); const [label, setLabel] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); start(async () => { const r = await createConnector({ provider, label }); setMsg(r.ok ? { ok: true, text: "Connector added." } : { ok: false, text: r.error ?? "Failed" }); if (r.ok) setLabel(""); }); }} className="space-y-2">
      <select className={input} value={provider} onChange={(e) => setProvider(e.target.value)}>{["slack", "teams", "zoom", "google_meet", "whatsapp", "telegram", "accounting", "crm", "payment", "market_data", "esign"].map((p) => <option key={p} value={p} className="bg-obsidian">{p}</option>)}</select>
      <input className={input} placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add connector"}</Button>
    </form>
  );
}

export function ApiKeyComposer() {
  const [name, setName] = useState(""); const [plain, setPlain] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); setPlain(null); start(async () => { const r = await createApiKey({ name }); if (r.ok && r.plaintext) { setPlain(r.plaintext); setName(""); } else setMsg({ ok: false, text: r.error ?? "Failed" }); }); }} className="space-y-2">
      <input className={input} placeholder="Key name" value={name} onChange={(e) => setName(e.target.value)} />
      {plain && (
        <div className="rounded-lg border border-gold/30 bg-gold/[0.06] p-2">
          <p className="text-[11px] text-ivory/50">Copy now — shown once:</p>
          <code className="block break-all text-xs text-gold">{plain}</code>
        </div>
      )}
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Generating…" : "Generate API key"}</Button>
    </form>
  );
}

export function RevokeKeyButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  if (done) return <span className="text-[11px] text-ivory/40">revoked</span>;
  return <button disabled={pending} onClick={() => start(async () => { await revokeApiKey(id); setDone(true); })} className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-ivory/70 hover:bg-white/5 disabled:opacity-50">Revoke</button>;
}

export function PrivyComposer() {
  const [title, setTitle] = useState(""); const [kind, setKind] = useState("note"); const [body, setBody] = useState(""); const [dueAt, setDue] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); start(async () => { const r = await createPrivyItem({ title, kind, body, dueAt: dueAt || undefined }); setMsg(r.ok ? { ok: true, text: "Saved privately." } : { ok: false, text: r.error ?? "Failed" }); if (r.ok) { setTitle(""); setBody(""); setDue(""); } }); }} className="space-y-2">
      <input className={input} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>{["reminder", "note", "contact", "document", "finance", "event", "wellbeing"].map((k) => <option key={k} value={k} className="bg-obsidian">{k}</option>)}</select>
      <textarea className={`${input} min-h-[50px]`} placeholder="Private details…" value={body} onChange={(e) => setBody(e.target.value)} />
      <input type="datetime-local" className={input} value={dueAt} onChange={(e) => setDue(e.target.value)} />
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save (private)"}</Button>
    </form>
  );
}
