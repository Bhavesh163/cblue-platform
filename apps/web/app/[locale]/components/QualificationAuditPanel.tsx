"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "../lib/api";

type AuditEntry = {
  id: string;
  submissionId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string | null;
  createdAt: string;
};

type Props = { token: string };

export default function QualificationAuditPanel({ token }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(getApiUrl("/qualification/admin/audit?limit=50"), {
        cache: "no-store",
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) throw new Error("Unable to load qualification audit events.");
      const payload = await response.json() as unknown;
      setEntries(Array.isArray(payload) ? payload : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load qualification audit events.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Qualification audit trail</h2>
          <p className="text-sm text-slate-500">Persisted review and evidence-access events from CBLUE.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh audit"}
        </button>
      </div>
      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!loading && !entries.length && <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No qualification audit events.</p>}
      {entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Entity</th>
                <th className="py-2 pr-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap py-3 pr-4 align-top text-slate-600">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 align-top font-semibold text-slate-900">{entry.action}</td>
                  <td className="py-3 pr-4 align-top text-slate-700">
                    {entry.entityType}
                    <p className="mt-1 text-xs text-slate-500">{entry.entityId}</p>
                  </td>
                  <td className="max-w-xl py-3 pr-4 align-top text-slate-600">{entry.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
