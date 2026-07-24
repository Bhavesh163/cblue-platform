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
                    <td className="py-3 pr-4 align-top">
                      {task.status === "OPEN" ? <button type="button" onClick={() => void claim(task.id)} disabled={claiming === task.id} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-60">{claiming === task.id ? "Claiming..." : "Claim task"}</button> : <span className="text-xs font-semibold text-slate-500">{task.status || "ASSIGNED"}</span>}
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
