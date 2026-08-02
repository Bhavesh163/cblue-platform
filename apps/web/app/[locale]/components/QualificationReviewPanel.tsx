"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "../lib/api";
import { adminFetchResponse } from "./adminApi";
import QualificationEvidenceControls from "./QualificationEvidenceControls";

type ReviewTask = {
  id: string;
  kind?: "KYC" | "TIER";
  status?: string;
  priority?: number;
  assignedTo?: string | null;
  proposedDecision?: string | null;
  proposedTier?: string | null;
  proposedReason?: string | null;
  proposedBy?: string | null;
  proposedAt?: string | null;
  checkedBy?: string | null;
  checkedAt?: string | null;
  createdAt?: string;
  submission?: {
    id?: string;
    status?: string;
    fixer?: {
      priceList?: Array<{ service?: string; unit?: string; finalPrice?: number | string }> | null;
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

type Props = { token: string; adminId: string };

const TIERS = ["ECONOMY", "STANDARD", "CORPORATE", "SPECIALIST", "EXPERT"] as const;

function allowedTiers(recommended?: string | null) {
  const ceiling = TIERS.indexOf(recommended as typeof TIERS[number]);
  return ceiling < 0 ? [] : TIERS.slice(0, ceiling + 1);
}

function displayName(task: ReviewTask) {
  return task.submission?.fixer?.user?.name ||
    task.submission?.fixer?.user?.email ||
    "Partner";
}

export default function QualificationReviewPanel({ token, adminId }: Props) {
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState("");
  const [releasing, setReleasing] = useState("");
  const [deciding, setDeciding] = useState("");
  const [reevaluating, setReevaluating] = useState("");
  const [decision, setDecision] = useState<Record<string, "APPROVE" | "REJECT">>({});
  const [approvedTier, setApprovedTier] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminFetchResponse(getApiUrl("/qualification/admin/review-tasks"), {
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
      const response = await adminFetchResponse(getApiUrl(`/qualification/admin/review-tasks/${taskId}/assign`), {
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

  async function release(taskId: string) {
    setReleasing(taskId);
    setError("");
    try {
      const response = await adminFetchResponse(getApiUrl("/qualification/admin/review-tasks/" + taskId + "/release"), {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) throw new Error("The review task could not be released.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to release review task.");
    } finally {
      setReleasing("");
    }
  }

  async function decide(task: ReviewTask) {
    const selectedDecision = decision[task.id] || "APPROVE";
    const deterministic = task.submission?.evaluations?.find((item) => item.provider === "DETERMINISTIC_POLICY");
    const selectedTier = approvedTier[task.id] || deterministic?.recommendedTier || "";
    const selectedReason = reason[task.id]?.trim() || "";
    if (selectedReason.length < 10) {
      setError("Enter a decision reason with at least 10 characters.");
      return;
    }
    if (task.kind !== "KYC" && selectedDecision === "APPROVE" && !selectedTier) {
      setError("Select the approved tier before approving a task.");
      return;
    }

    setDeciding(task.id);
    setError("");
    try {
      const response = await adminFetchResponse(getApiUrl("/qualification/admin/review-tasks/" + task.id + "/decision"), {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: selectedDecision,
          reason: selectedReason,
          ...(task.kind !== "KYC" && selectedDecision === "APPROVE" ? { approvedTier: selectedTier } : {}),
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

  async function reevaluate(submissionId?: string) {
    if (!submissionId) return;
    setReevaluating(submissionId);
    setError("");
    try {
      const response = await adminFetchResponse(getApiUrl(
        "/qualification/admin/submissions/" + submissionId + "/re-evaluate",
      ), {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) throw new Error("The qualification could not be re-evaluated.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to re-evaluate qualification.");
    } finally {
      setReevaluating("");
    }
  }

  return (
    <section className="w-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="py-2 pr-4">Partner / review type</th><th className="py-2 pr-4">Recommendation</th><th className="py-2 pr-4">Evidence</th><th className="py-2 pr-4">Proposed price list</th><th className="py-2 pr-4">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((task) => {
                const evaluation = task.submission?.evaluations?.find((item) => item.provider === "DETERMINISTIC_POLICY") || task.submission?.evaluations?.[0];
                return (
                  <tr key={task.id}>
                    <td className="py-3 pr-4 align-top font-semibold text-slate-900">{displayName(task)}<p className="mt-1 text-xs font-normal text-slate-500">{task.kind || "REVIEW"} / {task.submission?.status || "REVIEW"}</p></td>
                    <td className="py-3 pr-4 align-top text-slate-700">{evaluation?.recommendedTier || "Pending"}<p className="mt-1 text-xs text-slate-500">{evaluation?.risk || "-"} risk / {evaluation?.confidence ?? "-"}% confidence</p>{task.status === "ASSIGNED" && task.assignedTo === adminId && !task.proposedAt && <button type="button" onClick={() => void reevaluate(task.submission?.id)} disabled={!task.submission?.id || reevaluating === task.submission?.id} className="mt-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{reevaluating === task.submission?.id ? "Evaluating..." : "Re-evaluate evidence"}</button>}</td>
                    <td className="py-3 pr-4 align-top text-slate-600">
                      {task.status === "ASSIGNED" && task.assignedTo === adminId ? (
                        <QualificationEvidenceControls token={token} submissionId={task.submission?.id} documents={task.submission?.documents || []} onChanged={load} readOnly={Boolean(task.proposedAt)} />
                      ) : (
                        <span>{task.submission?.documents?.length ?? 0} document(s). Claim this task to review evidence.</span>
                      )}
                    </td>
                    <td className="min-w-72 py-3 pr-4 align-top text-slate-700">
                      {Array.isArray(task.submission?.fixer?.priceList) && task.submission.fixer.priceList.length ? (
                        <div className="space-y-1.5">{task.submission.fixer.priceList.slice(0, 30).map((row, index) => <div key={`${row.service || "service"}-${index}`} className="flex justify-between gap-4 rounded bg-slate-50 px-2.5 py-1.5"><span>{row.service || "Service"}{row.unit ? ` / ${row.unit}` : ""}</span><span className="whitespace-nowrap font-semibold">{Number(row.finalPrice || 0).toLocaleString("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 })}</span></div>)}</div>
                      ) : <span className="text-slate-500">No price list recorded</span>}
                    </td>
                    <td className="min-w-72 py-3 pr-4 align-top">
                      {task.status === "OPEN" && (
                        <button type="button" onClick={() => void claim(task.id)} disabled={claiming === task.id} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-60">
                          {claiming === task.id ? "Claiming..." : "Claim task"}
                        </button>
                      )}
                      {task.status === "ASSIGNED" && task.assignedTo === adminId && !task.proposedAt && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <select
                              aria-label={"Decision for " + displayName(task)}
                              value={decision[task.id] || "APPROVE"}
                              onChange={(event) => setDecision((current) => ({ ...current, [task.id]: event.target.value as "APPROVE" | "REJECT" }))}
                              className="rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700"
                            >
                              <option value="APPROVE">Approve submission</option>
                              <option value="REJECT">Request changes</option>
                            </select>
                            {task.kind !== "KYC" && (decision[task.id] || "APPROVE") === "APPROVE" && (
                              <select
                                aria-label={"Proposed tier for " + displayName(task)}
                                value={approvedTier[task.id] || evaluation?.recommendedTier || ""}
                                onChange={(event) => setApprovedTier((current) => ({ ...current, [task.id]: event.target.value }))}
                                className="rounded-lg border border-slate-300 px-2 py-2 text-xs text-slate-700"
                              >
                                <option value="">Select tier</option>
                                {allowedTiers(evaluation?.recommendedTier).map((tier) => <option key={tier} value={tier}>{tier}</option>)}
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
                          <button type="button" onClick={() => void decide(task)} disabled={deciding === task.id} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
                            {deciding === task.id ? "Saving..." : "Save decision"}
                          </button>
                          <button type="button" onClick={() => void release(task.id)} disabled={releasing === task.id} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                            {releasing === task.id ? "Releasing..." : "Release claim"}
                          </button>
                        </div>
                      )}
                      {task.status === "ASSIGNED" && task.proposedAt && (
                        <div className="min-w-80 space-y-2">
                          <p className="font-semibold text-slate-800">Decision recorded: {task.proposedDecision || "reviewed"}{task.proposedTier ? " / " + task.proposedTier : ""}</p>
                          <p className="text-xs text-slate-600">{task.proposedReason || "No decision reason supplied."}</p>
                          <p className="text-xs font-semibold text-slate-500">This review is already being finalized by the assigned administrator.</p>
                        </div>
                      )}
                      {task.status === "ASSIGNED" && task.assignedTo !== adminId && <span className="text-xs font-semibold text-slate-500">Assigned to another administrator</span>}
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
