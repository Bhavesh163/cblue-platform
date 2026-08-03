"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "../lib/api";
import { adminFetchResponse } from "./adminApi";
import { visibleQualificationDocuments } from "../../../lib/qualificationAdminProjection.mjs";

type DocumentRow = {
  id: string;
  documentType: string;
  evidenceStatus?: string | null;
  sizeBytes?: number | null;
  assessmentJob?: { status?: string | null; attempts?: number | null } | null;
};

type SubmissionRow = {
  id: string;
  version?: number;
  status?: string;
  submittedAt?: string | null;
  fixer?: {
    user?: { name?: string | null; email?: string | null } | null;
  } | null;
  priceList?: unknown;
  documents?: DocumentRow[];
};

type Props = { token: string };

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-GB");
}

export default function QualificationHistoryPanel({ token }: Props) {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl("/qualification/admin/submissions"),
        { cache: "no-store", headers: { Authorization: "Bearer " + token } },
      );
      if (!response.ok)
        throw new Error("Unable to load qualification history.");
      const payload = (await response.json()) as unknown;
      setSubmissions(Array.isArray(payload) ? payload : []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load qualification history.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDocument(submissionId: string, documentId: string) {
    const key = submissionId + ":" + documentId;
    setOpening(key);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl(
          `/qualification/admin/submissions/${submissionId}/documents/${documentId}/url`,
        ),
        { cache: "no-store", headers: { Authorization: "Bearer " + token } },
      );
      if (!response.ok)
        throw new Error("Unable to create a protected document link.");
      const payload = (await response.json()) as { url?: unknown };
      if (typeof payload.url !== "string" || !payload.url) {
        throw new Error("Protected document link was not returned.");
      }
      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to open document.",
      );
    } finally {
      setOpening("");
    }
  }

  return (
    <section className="w-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Qualification history
          </h2>
          <p className="text-sm text-slate-500">
            Persisted submissions, evidence status, and partner price-list
            records.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {!loading && submissions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No qualification submissions returned by the admin API.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Partner</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Submitted</th>
                <th className="py-2 pr-4">Evidence</th>
                <th className="py-2">Price list</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((submission) => {
                const documents: DocumentRow[] = visibleQualificationDocuments(
                  submission.documents || [],
                );
                const priceCount = Array.isArray(submission.priceList)
                  ? submission.priceList.length
                  : 0;
                return (
                  <tr key={submission.id}>
                    <td className="py-3 pr-4 align-top font-semibold text-slate-900">
                      {submission.fixer?.user?.name ||
                        submission.fixer?.user?.email ||
                        "Partner"}
                      <p className="mt-1 text-xs font-normal text-slate-500">
                        Version {submission.version ?? "-"}
                      </p>
                    </td>
                    <td className="py-3 pr-4 align-top text-slate-700">
                      {submission.status || "-"}
                    </td>
                    <td className="py-3 pr-4 align-top text-slate-600">
                      {formatDate(submission.submittedAt)}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <div className="space-y-2">
                        {documents.map((document) => {
                          const key = submission.id + ":" + document.id;
                          return (
                            <div
                              key={document.id}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <span className="text-slate-700">
                                {document.documentType} ·{" "}
                                {document.evidenceStatus || "PENDING"}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  void openDocument(submission.id, document.id)
                                }
                                disabled={opening === key}
                                className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              >
                                {opening === key ? "Opening..." : "Open file"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 align-top text-slate-600">
                      {priceCount} item{priceCount === 1 ? "" : "s"}
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
