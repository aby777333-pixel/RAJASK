"use client";

import { useState, useTransition } from "react";
import { Button } from "@rajask/ui";
import {
  createReport,
  generateReport,
  createDecision,
  createRisk,
  addSnapshot,
  submitExpense,
  createSurvey,
  respondPulse,
} from "@/lib/phase3";

const input =
  "w-full rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-ivory outline-none placeholder:text-ivory/25 focus:border-gold/50";

function useMsg() {
  return useState<{ ok: boolean; text: string } | null>(null);
}
function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p className={`text-sm ${msg.ok ? "text-spectrum-teal" : "text-spectrum-crimson"}`}>{msg.text}</p>;
}

// CHANCERY
export function ReportComposer() {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("monthly");
  const [format, setFormat] = useState("dashboard");
  const [msg, setMsg] = useMsg();
  const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); start(async () => { const r = await createReport({ title, kind, format }); setMsg(r.ok ? { ok: true, text: "Report created." } : { ok: false, text: r.error ?? "Failed" }); if (r.ok) setTitle(""); }); }} className="space-y-3">
      <input className={input} placeholder="Report title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>{["daily", "weekly", "monthly", "quarterly", "annual", "adhoc"].map((k) => <option key={k} value={k} className="bg-obsidian">{k}</option>)}</select>
        <select className={input} value={format} onChange={(e) => setFormat(e.target.value)}>{["dashboard", "pdf", "excel", "csv", "powerpoint"].map((f) => <option key={f} value={f} className="bg-obsidian">{f}</option>)}</select>
      </div>
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create report"}</Button>
    </form>
  );
}
export function GenerateButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  return <button disabled={pending} onClick={() => start(async () => { const r = await generateReport(id); setDone(r.ok ? "generated" : r.error ?? "error"); })} className="rounded-md bg-gold px-2 py-0.5 text-[11px] font-semibold text-obsidian disabled:opacity-50">{pending ? "…" : done ?? "Generate"}</button>;
}

// CODEX
export function DecisionComposer() {
  const [title, setTitle] = useState(""); const [reasoning, setReasoning] = useState(""); const [expected, setExpected] = useState("");
  const [msg, setMsg] = useMsg(); const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); start(async () => { const r = await createDecision({ title, reasoning, expectedOutcome: expected }); setMsg(r.ok ? { ok: true, text: "Decision logged." } : { ok: false, text: r.error ?? "Failed" }); if (r.ok) { setTitle(""); setReasoning(""); setExpected(""); } }); }} className="space-y-2">
      <input className={input} placeholder="Decision" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className={`${input} min-h-[50px]`} placeholder="Reasoning" value={reasoning} onChange={(e) => setReasoning(e.target.value)} />
      <input className={input} placeholder="Expected outcome" value={expected} onChange={(e) => setExpected(e.target.value)} />
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Logging…" : "Log decision"}</Button>
    </form>
  );
}
export function RiskComposer() {
  const [title, setTitle] = useState(""); const [category, setCategory] = useState("operational");
  const [likelihood, setL] = useState(3); const [impact, setI] = useState(3); const [mitigation, setM] = useState("");
  const [msg, setMsg] = useMsg(); const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); start(async () => { const r = await createRisk({ title, category, likelihood, impact, mitigation }); setMsg(r.ok ? { ok: true, text: "Risk registered." } : { ok: false, text: r.error ?? "Failed" }); if (r.ok) { setTitle(""); setM(""); } }); }} className="space-y-2">
      <input className={input} placeholder="Risk" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>{["financial", "legal", "compliance", "operational", "cybersecurity", "reputational"].map((c) => <option key={c} value={c} className="bg-obsidian">{c}</option>)}</select>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-ivory/50">Likelihood<select className={input} value={likelihood} onChange={(e) => setL(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n} className="bg-obsidian">{n}</option>)}</select></label>
        <label className="text-xs text-ivory/50">Impact<select className={input} value={impact} onChange={(e) => setI(Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n} className="bg-obsidian">{n}</option>)}</select></label>
      </div>
      <input className={input} placeholder="Mitigation" value={mitigation} onChange={(e) => setM(e.target.value)} />
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Registering…" : "Register risk"}</Button>
    </form>
  );
}

// TREASURY
export function SnapshotComposer() {
  const [revenue, setR] = useState(""); const [cash, setC] = useState(""); const [exp, setE] = useState(""); const [currency, setCur] = useState("INR");
  const [msg, setMsg] = useMsg(); const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); start(async () => { const r = await addSnapshot({ revenue: revenue || undefined, cash: cash || undefined, expenses: exp || undefined, currency }); setMsg(r.ok ? { ok: true, text: "Snapshot saved." } : { ok: false, text: r.error ?? "Failed" }); if (r.ok) { setR(""); setC(""); setE(""); } }); }} className="space-y-2">
      <input className={input} placeholder="Revenue" inputMode="decimal" value={revenue} onChange={(e) => setR(e.target.value)} />
      <input className={input} placeholder="Cash" inputMode="decimal" value={cash} onChange={(e) => setC(e.target.value)} />
      <input className={input} placeholder="Expenses" inputMode="decimal" value={exp} onChange={(e) => setE(e.target.value)} />
      <input className={input} value={currency} onChange={(e) => setCur(e.target.value.toUpperCase())} />
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save snapshot"}</Button>
    </form>
  );
}
export function ExpenseComposer() {
  const [amount, setA] = useState(""); const [currency, setCur] = useState("INR"); const [category, setCat] = useState(""); const [desc, setD] = useState("");
  const [msg, setMsg] = useMsg(); const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); start(async () => { const r = await submitExpense({ amount, currency, category, description: desc }); setMsg(r.ok ? { ok: true, text: "Expense submitted." } : { ok: false, text: r.error ?? "Failed" }); if (r.ok) { setA(""); setCat(""); setD(""); } }); }} className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <input className={`${input} col-span-2`} placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setA(e.target.value)} />
        <input className={input} value={currency} onChange={(e) => setCur(e.target.value.toUpperCase())} />
      </div>
      <input className={input} placeholder="Category" value={category} onChange={(e) => setCat(e.target.value)} />
      <input className={input} placeholder="Description" value={desc} onChange={(e) => setD(e.target.value)} />
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit expense"}</Button>
    </form>
  );
}

// CHRONICLE
export function SurveyComposer() {
  const [question, setQ] = useState(""); const [kind, setKind] = useState("nps");
  const [msg, setMsg] = useMsg(); const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); setMsg(null); start(async () => { const r = await createSurvey({ question, kind }); setMsg(r.ok ? { ok: true, text: "Survey launched." } : { ok: false, text: r.error ?? "Failed" }); if (r.ok) setQ(""); }); }} className="space-y-2">
      <input className={input} placeholder="Pulse question" value={question} onChange={(e) => setQ(e.target.value)} />
      <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>{["nps", "satisfaction", "custom"].map((k) => <option key={k} value={k} className="bg-obsidian">{k}</option>)}</select>
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Launching…" : "Launch survey"}</Button>
    </form>
  );
}
export function PulseRespond({ surveyId }: { surveyId: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<number | null>(null);
  return (
    <span className="flex flex-wrap gap-1">
      {done !== null ? <span className="text-[11px] text-spectrum-teal">scored {done}</span> :
        [0, 2, 4, 6, 8, 10].map((n) => (
          <button key={n} disabled={pending} onClick={() => start(async () => { const r = await respondPulse(surveyId, n); if (r.ok) setDone(n); })}
            className="h-6 w-6 rounded border border-white/10 text-[11px] text-ivory/70 hover:bg-white/5 disabled:opacity-50">{n}</button>
        ))}
    </span>
  );
}
