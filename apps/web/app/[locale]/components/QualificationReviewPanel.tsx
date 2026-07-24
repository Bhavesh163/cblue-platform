"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "../lib/api";

type ReviewTask = {
  id: string;
  status?: string;
  priority?: number;
  assignedTo?: string | null;
  createdAt?: string;
  submission?: {
    status?: string;
    fixer?: {
      user?: { name?: string | null; email?: string | null } | null;
    } | null;
    documents?: Array<{ id: string; documentType: string; evidenceStatus: string }>;
    evaluations?: Array<{
      provider: string;
      risk?: string | null;
      recommendedTier?: string | null;
      confidence?: number | null;
    }>;
  };
};

type Props = { token: string };

const TIERS = ["ECONOMY", "STANDARD", "CORPORATE", "SPECIALIST", "EXPERT"] as const;

function displayName(task: ReviewTask) {
  return task.submission?.fixer?.user?.name ||
    task.submission?.fixer?.user?.email ||
    "Partner";
}

export default function QualificationReviewPanel({ token }: Props) {
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState("");
  const [deciding, setDeciding] = useState("");
  const [decision, setDecision] = useState<Record<string, "APPROVE" | "REJECT">>({});
  const [approvedTier, setApprovedTier] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(getApiUrl("/qualification/admin/review-tasks"), {
        cache: "no-store",
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) throw new Error("Unable to load qualification review tasks.");
      const payload = await response.json() as unknown;
      setTasks(Array.isArray(payload) ? payload : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load qualification review tasks.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function claim(taskId: string) {
    setClaiming(taskId);
    setError("");
    try {
      const response = await fetch(getApiUrl(`/qualification/admin/review-tasks/${taskId}/assign`), {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) throw new Error("This review task is no longer available.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to claim review task.");
    } finally {
      setClaiming("");
    }
  }

  async function decide(task: ReviewTask) {
    const selectedDecision = decision[task.id] || "APPROVE";
    const selectedReason = reason[task.id]?.trim() || "";
    if (selectedReason.length < 10) {
      setError("Enter a decision reason with at least 10 characters.");
      return;
    }
    if (selectedDecision === "APPROVE" && !approvedTier[task.id]) {
      setError("Select the approved tier before approving a task.");
      return;
    }

    setDeciding(task.id);
    setError("");
    try {
      const response = await fetch(getApiUrl("/qualification/admin/review-tasks/" + task.id + "/decision"), {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: selectedDecision,
          reason: selectedReason,
          ...(selectedDecision === "APPROVE" ? { approvedTier: approvedTier[task.id] } : {}),
        }),
      });
      if (!response.ok) throw new Error("The review decision could not be saved.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save review decision.");
    } finally {
      setDeciding("");
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Qualification review queue</h2>
          <p className="text-sm text-slate-500">Live evidence tasks from CBLUE. Tier decisions remain server-owned.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh queue"}
        </button>
      </div>
      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!loading && !tasks.length && <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No live qualification review tasks.</p>}
      {tasks.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="py-2 pr-4">Partner</th><th className="py-2 pr-4">Recommendation</th><th className="py-2 pr-4">Evidence</th><th className="py-2 pr-4">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((task) => {
                const evaluation = task.submission?.evaluations?.[0];
                return (
                  <tr key={task.id}>
                    <td className="py-3 pr-4 align-top font-semibold text-slate-900">{displayName(task)}<p className="mt-1 text-xs font-normal text-slate-500">{task.submission?.status || "REVIEW"}</p></td>
                    <td className="py-3 pr-4 align-top text-slate-700">{evaluation?.recommendedTier || "Pending"}<p className="mt-1 text-xs text-slate-500">{evaluation?.risk || "-"} risk · {evaluation?.confidence ?? "-"}% confidence</p></td>
                    <td className="py-3 pr-4 align-top text-slate-600">{task.submission?.documents?.length ?? 0} document(s)</td>
                    <td className="min-w-72 py-3 pr-4 align-top">
                      {task.status === "OPEN" && (
                        <button type="button" onClick={() => void claim(task.id)} disabled={claiming === task.id} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-60">
                          {claiming === task.id ? "Claiming..." : "Claim task"}
                        </button>
                      )}
                      {task.status === "ASSIGNED" && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <select
                              aria-label={"Decision for " + displayName(task)}
                              value={decision[task.id] || "APPROVE"}
                              onChange={(event) => setDecision((current) => ({ ...current, [task.id]: event.target.value as "APPROVE" | "REJECT" }))}
                              className="rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700"
                            >
                              <option value="APPROVE">Approve</option>
                              <option value="REJECT">Reject</option>
                            </select>
                            {(decision[task.id] || "APPROVE") === "APPROVE" && (
                              <select
                                aria-label={"Approved tier for " + displayName(task)}
                                value={approvedTier[task.id] || ""}
                                onChange={(event) => setApprovedTier((current) => ({ ...current, [task.id]: event.target.value }))}
                                className="rounded-lg border border-slate-300 px-2 py-2 text-xs text-slate-700"
                              >
                                <option value="">Select tier</option>
                                {TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                              </select>
                            )}
                          </div>
                          <input
                            aria-label={"Decision reason for " + displayName(task)}
                            value={reason[task.id] || ""}
                            onChange={(event) => setReason((current) => ({ ...current, [task.id]: event.target.value }))}
                            placeholder="Decision reason (10+ characters)"
                            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs text-slate-700"
                          />
                          <button type="button" onClick={() => void decide(task)} disabled={deciding === task.id} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                            {deciding === task.id ? "Saving..." : "Save decision"}
                          </button>
                        </div>
                      )}
                      {task.status !== "OPEN" && task.status !== "ASSIGNED" && <span className="text-xs font-semibold text-slate-500">{task.status || "DECIDED"}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
