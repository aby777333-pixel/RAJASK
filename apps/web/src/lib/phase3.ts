"use server";

import { revalidatePath } from "next/cache";
import { Money } from "@rajask/core";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function ctx() {
  return getCourtContext();
}

// ---- CHANCERY ----
export async function createReport(input: { title: string; kind: string; format: string }): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.title.trim().length < 2) return { ok: false, error: "Give the report a title." };
  const supabase = createClient();
  const { error } = await supabase.from("reports").insert({
    realm_id: activeRealm.realmId,
    created_by: user.id,
    title: input.title.trim(),
    kind: input.kind,
    format: input.format,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/chancery");
  return { ok: true };
}

/** Generate a report — snapshots live realm metrics into its content. */
export async function generateReport(reportId: string): Promise<ActionResult> {
  const { activeRealm } = await ctx();
  if (!activeRealm) return { ok: false, error: "No active realm." };
  const supabase = createClient();
  const realm = activeRealm.realmId;

  const [members, tasks, approvals, meetings] = await Promise.all([
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("realm_id", realm).eq("status", "active").is("deleted_at", null),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("realm_id", realm).is("deleted_at", null),
    supabase.from("approval_requests").select("id", { count: "exact", head: true }).eq("realm_id", realm).eq("status", "pending"),
    supabase.from("meetings").select("id", { count: "exact", head: true }).eq("realm_id", realm).is("deleted_at", null),
  ]);

  const content = {
    generatedAt: new Date().toISOString(),
    metrics: {
      activeMembers: members.count ?? 0,
      totalTasks: tasks.count ?? 0,
      pendingApprovals: approvals.count ?? 0,
      meetings: meetings.count ?? 0,
    },
  };
  const { error } = await supabase
    .from("reports")
    .update({ status: "generated", generated_at: new Date().toISOString(), content })
    .eq("id", reportId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/chancery");
  return { ok: true };
}

// ---- CODEX ----
export async function createDecision(input: { title: string; reasoning?: string; expectedOutcome?: string }): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.title.trim().length < 2) return { ok: false, error: "Give the decision a title." };
  const supabase = createClient();
  const { error } = await supabase.from("decisions").insert({
    realm_id: activeRealm.realmId,
    created_by: user.id,
    owner_user_id: user.id,
    title: input.title.trim(),
    reasoning: input.reasoning?.trim() || null,
    expected_outcome: input.expectedOutcome?.trim() || null,
    decided_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/codex");
  return { ok: true };
}

export async function createRisk(input: { title: string; category: string; likelihood: number; impact: number; mitigation?: string }): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.title.trim().length < 2) return { ok: false, error: "Give the risk a title." };
  const supabase = createClient();
  const { error } = await supabase.from("risks").insert({
    realm_id: activeRealm.realmId,
    created_by: user.id,
    owner_user_id: user.id,
    title: input.title.trim(),
    category: input.category,
    likelihood: input.likelihood,
    impact: input.impact,
    mitigation: input.mitigation?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/codex");
  return { ok: true };
}

// ---- TREASURY ----
export async function addSnapshot(input: { revenue?: string; cash?: string; expenses?: string; currency: string }): Promise<ActionResult> {
  const { activeRealm } = await ctx();
  if (!activeRealm) return { ok: false, error: "No active realm." };
  const supabase = createClient();
  const cur = input.currency || "INR";
  const { error } = await supabase.from("treasury_snapshots").insert({
    realm_id: activeRealm.realmId,
    revenue: input.revenue ? Money.of(input.revenue, cur).toDb() : null,
    cash: input.cash ? Money.of(input.cash, cur).toDb() : null,
    expenses: input.expenses ? Money.of(input.expenses, cur).toDb() : null,
    currency: cur,
    source: "manual",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/treasury");
  return { ok: true };
}

export async function submitExpense(input: { amount: string; currency: string; category?: string; description?: string }): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (!input.amount) return { ok: false, error: "Enter an amount." };
  const supabase = createClient();
  const cur = input.currency || "INR";
  const { error } = await supabase.from("expenses").insert({
    realm_id: activeRealm.realmId,
    submitted_by: user.id,
    amount: Money.of(input.amount, cur).toDb(),
    currency: cur,
    category: input.category?.trim() || null,
    description: input.description?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/treasury");
  return { ok: true };
}

// ---- CHRONICLE ----
export async function createSurvey(input: { question: string; kind: string }): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.question.trim().length < 4) return { ok: false, error: "Ask a question." };
  const supabase = createClient();
  const { error } = await supabase.from("pulse_surveys").insert({
    realm_id: activeRealm.realmId,
    created_by: user.id,
    question: input.question.trim(),
    kind: input.kind,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/chronicle");
  return { ok: true };
}

export async function respondPulse(surveyId: string, score: number): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  const supabase = createClient();
  const { error } = await supabase
    .from("pulse_responses")
    .upsert({ realm_id: activeRealm.realmId, survey_id: surveyId, user_id: user.id, score }, { onConflict: "survey_id,user_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/chronicle");
  return { ok: true };
}
