"use server";

import { revalidatePath } from "next/cache";
import { Money } from "@rajask/core";
import { createPermissionService } from "@rajask/auth";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function ctx() {
  const c = await getCourtContext();
  return c;
}

// ---- WRIT ----
export async function createTask(input: {
  title: string;
  brief?: string;
  assigneeUserId?: string;
  priority: "low" | "normal" | "high" | "urgent";
  dueAt?: string;
}): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.title.trim().length < 2) return { ok: false, error: "Give the decree a title." };
  const supabase = createClient();
  const { error } = await supabase.from("tasks").insert({
    realm_id: activeRealm.realmId,
    created_by: user.id,
    assignee_user_id: input.assigneeUserId || null,
    title: input.title.trim(),
    brief: input.brief?.trim() || null,
    priority: input.priority,
    status: input.assigneeUserId ? "assigned" : "draft",
    due_at: input.dueAt ? new Date(input.dueAt).toISOString() : null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/writ");
  return { ok: true };
}

export async function updateTaskStatus(taskId: string, status: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/throne/writ");
}

// ---- SEAL ----
export async function createApproval(input: {
  title: string;
  kind: string;
  amount?: string;
  currency: string;
  detail?: string;
}): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.title.trim().length < 2) return { ok: false, error: "Give it a title." };
  const supabase = createClient();
  const { error } = await supabase.from("approval_requests").insert({
    realm_id: activeRealm.realmId,
    requested_by: user.id,
    title: input.title.trim(),
    kind: input.kind,
    amount: input.amount ? Money.of(input.amount, input.currency).toDb() : null,
    currency: input.currency,
    detail: input.detail?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/seal");
  return { ok: true };
}

/** Decide an approval — enforces the SEAL DOA authority limit with Decimal precision. */
export async function decideApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  reason?: string,
): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  const supabase = createClient();

  const { data: req } = await supabase
    .from("approval_requests")
    .select("amount, currency, company_id")
    .eq("id", approvalId)
    .single();
  if (!req) return { ok: false, error: "Request not found." };

  if (decision === "approved" && req.amount !== null) {
    const perms = createPermissionService(supabase);
    const actor = { userId: user.id, realmId: activeRealm.realmId, companyId: req.company_id };
    const within = await perms.assertWithinAuthority(
      actor,
      { subsystem: "SEAL", action: "approve", companyId: req.company_id },
      Money.fromDb(String(req.amount), req.currency ?? "INR"),
    );
    if (!within.ok) return { ok: false, error: within.error.message };
  }

  const { error } = await supabase
    .from("approval_requests")
    .update({ status: decision, decided_by: user.id, decided_at: new Date().toISOString(), reason: reason ?? null })
    .eq("id", approvalId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/seal");
  return { ok: true };
}

// ---- COUNCIL ----
export async function createMeeting(input: {
  title: string;
  agenda?: string;
  startsAt: string;
  location?: string;
}): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.title.trim().length < 2) return { ok: false, error: "Give the meeting a title." };
  if (!input.startsAt) return { ok: false, error: "Pick a start time." };
  const supabase = createClient();
  const { error } = await supabase.from("meetings").insert({
    realm_id: activeRealm.realmId,
    created_by: user.id,
    title: input.title.trim(),
    agenda: input.agenda?.trim() || null,
    starts_at: new Date(input.startsAt).toISOString(),
    location: input.location?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/council");
  return { ok: true };
}

// ---- VAULT ----
export async function createDocument(input: {
  title: string;
  category: string;
}): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.title.trim().length < 2) return { ok: false, error: "Give the document a title." };
  const supabase = createClient();
  const { error } = await supabase.from("documents").insert({
    realm_id: activeRealm.realmId,
    owner_user_id: user.id,
    title: input.title.trim(),
    category: input.category,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/vault");
  return { ok: true };
}

// ---- EDICT ----
export async function createRule(input: { name: string; description?: string }): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.name.trim().length < 2) return { ok: false, error: "Name the rule." };
  const supabase = createClient();
  const { error } = await supabase.from("automation_rules").insert({
    realm_id: activeRealm.realmId,
    created_by: user.id,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    trigger: { kind: "manual" },
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/edict");
  return { ok: true };
}

export async function toggleRule(ruleId: string, enabled: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("automation_rules").update({ enabled }).eq("id", ruleId);
  if (error) throw new Error(error.message);
  revalidatePath("/throne/edict");
}

/** Dry-run a rule — logs a simulated run (real engine needs a scheduler/worker). */
export async function dryRunRule(ruleId: string): Promise<ActionResult> {
  const { activeRealm } = await ctx();
  if (!activeRealm) return { ok: false, error: "No active realm." };
  const supabase = createClient();
  const { error } = await supabase.from("automation_runs").insert({
    realm_id: activeRealm.realmId,
    rule_id: ruleId,
    status: "dry_run",
    detail: { note: "Simulated — no actions executed", at: new Date().toISOString() },
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/edict");
  return { ok: true };
}
