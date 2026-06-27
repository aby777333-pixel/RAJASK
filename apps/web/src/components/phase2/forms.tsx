"use client";

import { useState, useTransition } from "react";
import { Button } from "@rajask/ui";
import {
  createTask,
  updateTaskStatus,
  createApproval,
  decideApproval,
  createMeeting,
  createDocument,
  createRule,
  toggleRule,
  dryRunRule,
} from "@/lib/phase2";

const input =
  "w-full rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-ivory outline-none placeholder:text-ivory/25 focus:border-gold/50";

function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p className={`text-sm ${msg.ok ? "text-spectrum-teal" : "text-spectrum-crimson"}`}>{msg.text}</p>;
}

// ---- WRIT ----
export function WritComposer({ people }: { people: { userId: string; name: string }[] }) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [dueAt, setDueAt] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await createTask({ title, brief, assigneeUserId: assignee || undefined, priority, dueAt: dueAt || undefined });
          setMsg(r.ok ? { ok: true, text: "Decree issued." } : { ok: false, text: r.error ?? "Failed" });
          if (r.ok) { setTitle(""); setBrief(""); setDueAt(""); }
        });
      }}
      className="space-y-3"
    >
      <input className={input} placeholder="Decree title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className={`${input} min-h-[70px]`} placeholder="Brief…" value={brief} onChange={(e) => setBrief(e.target.value)} />
      <select className={input} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
        <option value="" className="bg-obsidian">Unassigned</option>
        {people.map((p) => <option key={p.userId} value={p.userId} className="bg-obsidian">{p.name}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
          {["low", "normal", "high", "urgent"].map((p) => <option key={p} value={p} className="bg-obsidian">{p}</option>)}
        </select>
        <input type="datetime-local" className={input} value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </div>
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Issuing…" : "Issue decree"}</Button>
    </form>
  );
}

const TASK_STATES = ["draft", "assigned", "accepted", "in_progress", "awaiting_review", "awaiting_approval", "completed", "blocked", "escalated", "cancelled"];
export function TaskStatus({ id, status, editable }: { id: string; status: string; editable: boolean }) {
  const [val, setVal] = useState(status);
  const [pending, start] = useTransition();
  if (!editable) return <span className="text-[11px] text-ivory/50">{status}</span>;
  return (
    <select
      className="rounded-md border border-white/10 bg-obsidian px-1.5 py-0.5 text-[11px] text-ivory/80"
      value={val}
      disabled={pending}
      onChange={(e) => { const v = e.target.value; setVal(v); start(() => updateTaskStatus(id, v)); }}
    >
      {TASK_STATES.map((s) => <option key={s} value={s} className="bg-obsidian">{s}</option>)}
    </select>
  );
}

// ---- SEAL ----
export function SealComposer() {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("payment");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [detail, setDetail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await createApproval({ title, kind, amount: amount || undefined, currency, detail });
          setMsg(r.ok ? { ok: true, text: "Submitted for seal." } : { ok: false, text: r.error ?? "Failed" });
          if (r.ok) { setTitle(""); setAmount(""); setDetail(""); }
        });
      }}
      className="space-y-3"
    >
      <input className={input} placeholder="Request title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>
        {["payment", "purchase", "contract", "discount", "hiring", "budget", "leave", "vendor", "capex", "other"].map((k) => <option key={k} value={k} className="bg-obsidian">{k}</option>)}
      </select>
      <div className="grid grid-cols-3 gap-2">
        <input className={`${input} col-span-2`} placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
        <input className={input} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
      </div>
      <textarea className={`${input} min-h-[60px]`} placeholder="Detail…" value={detail} onChange={(e) => setDetail(e.target.value)} />
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Submitting…" : "Request seal"}</Button>
    </form>
  );
}

export function ApprovalDecision({ id, canApprove }: { id: string; canApprove: boolean }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  if (!canApprove) return null;
  if (done) return <span className="text-[11px] text-ivory/50">{done}</span>;
  return (
    <span className="flex gap-1">
      <button disabled={pending} onClick={() => start(async () => { const r = await decideApproval(id, "approved"); setDone(r.ok ? "approved" : r.error ?? "error"); })}
        className="rounded-md bg-spectrum-green/80 px-2 py-0.5 text-[11px] font-semibold text-obsidian disabled:opacity-50">Approve</button>
      <button disabled={pending} onClick={() => start(async () => { const r = await decideApproval(id, "rejected"); setDone(r.ok ? "rejected" : r.error ?? "error"); })}
        className="rounded-md bg-spectrum-crimson/80 px-2 py-0.5 text-[11px] font-semibold text-ivory disabled:opacity-50">Reject</button>
    </span>
  );
}

// ---- COUNCIL ----
export function CouncilComposer() {
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await createMeeting({ title, agenda, startsAt, location });
          setMsg(r.ok ? { ok: true, text: "Meeting convened." } : { ok: false, text: r.error ?? "Failed" });
          if (r.ok) { setTitle(""); setAgenda(""); setStartsAt(""); setLocation(""); }
        });
      }}
      className="space-y-3"
    >
      <input className={input} placeholder="Meeting title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className={`${input} min-h-[60px]`} placeholder="Agenda…" value={agenda} onChange={(e) => setAgenda(e.target.value)} />
      <input type="datetime-local" className={input} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
      <input className={input} placeholder="Location / link (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Convening…" : "Convene meeting"}</Button>
    </form>
  );
}

// ---- VAULT ----
export function VaultComposer() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("contract");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await createDocument({ title, category });
          setMsg(r.ok ? { ok: true, text: "Document registered." } : { ok: false, text: r.error ?? "Failed" });
          if (r.ok) setTitle("");
        });
      }}
      className="space-y-3"
    >
      <input className={input} placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
        {["contract", "sop", "policy", "board_pack", "legal", "financial", "deck", "other"].map((c) => <option key={c} value={c} className="bg-obsidian">{c}</option>)}
      </select>
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Registering…" : "Register document"}</Button>
    </form>
  );
}

// ---- EDICT ----
export function EdictComposer() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await createRule({ name, description });
          setMsg(r.ok ? { ok: true, text: "Rule created." } : { ok: false, text: r.error ?? "Failed" });
          if (r.ok) { setName(""); setDescription(""); }
        });
      }}
      className="space-y-3"
    >
      <input className={input} placeholder="Rule name" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea className={`${input} min-h-[60px]`} placeholder="What should this standing rule do?" value={description} onChange={(e) => setDescription(e.target.value)} />
      <Msg msg={msg} />
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create rule"}</Button>
    </form>
  );
}

export function RuleControls({ id, enabled, canEdit }: { id: string; enabled: boolean; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      {canEdit && (
        <button disabled={pending} onClick={() => start(() => toggleRule(id, !enabled))}
          className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-ivory/70 hover:bg-white/5 disabled:opacity-50">
          {enabled ? "Disable" : "Enable"}
        </button>
      )}
      <button disabled={pending} onClick={() => start(async () => { const r = await dryRunRule(id); setNote(r.ok ? "dry-run logged" : r.error ?? "error"); })}
        className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-ivory/70 hover:bg-white/5 disabled:opacity-50">
        {note ?? "Dry-run"}
      </button>
    </span>
  );
}
