"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { getApiUrl } from "../lib/api";
import { adminFetchResponse, readAdminResponseError } from "./adminApi";
import {
  qualificationAssessmentSummary,
  qualificationAssessmentTimestamp,
  qualificationDocumentChecks,
  qualificationFindingsForDocument,
  qualificationHistoryDocuments,
  qualificationReasonLabels,
  safeQualificationExtractedFields,
} from "../../../lib/qualificationAdminProjection.mjs";

type Finding = {
  documentId?: string | null;
  code?: string | null;
  severity?: string | null;
  claim?: string | null;
  result?: string | null;
  confidence?: number | null;
  createdAt?: string | null;
};

type DocumentRow = {
  id: string;
  documentType: string;
  evidenceStatus?: string | null;
  sizeBytes?: number | null;
  isActive?: boolean;
  lifecycleState?: string | null;
  objectDeletedAt?: string | null;
  assessmentReasonCodes?: string[] | null;
  extractedFields?: Record<string, unknown> | null;
  extractedAt?: string | null;
  createdAt?: string | null;
  identityNumberLast4?: string | null;
  identityExpiryDate?: string | null;
  assessmentJob?: {
    status?: string | null;
    attempts?: number | null;
    completedAt?: string | null;
  } | null;
};

type EvaluationRow = {
  provider?: string | null;
  status?: string | null;
  risk?: string | null;
  recommendedTier?: string | null;
  confidence?: number | null;
  identityConfidence?: number | null;
  documentAuthenticityConfidence?: number | null;
  faceMatchConfidence?: number | null;
  livenessConfidence?: number | null;
  credentialConfidence?: number | null;
  tierEligibilityScore?: number | null;
  humanReviewRequired?: boolean | null;
  findings?: Finding[];
  completedAt?: string | null;
  createdAt?: string | null;
};

type ReviewTaskRow = {
  id?: string;
  kind?: string | null;
  status?: string | null;
  proposedDecision?: string | null;
  proposedTier?: string | null;
  decision?: string | null;
  proposedAt?: string | null;
  decidedAt?: string | null;
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
  evaluations?: EvaluationRow[];
  reviewTasks?: ReviewTaskRow[];
};

type Props = { token: string };

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-GB");
}

function toneClass(tone: string) {
  if (tone === "danger") return "border-red-200 bg-red-50 text-red-800";
  if (tone === "success")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "review") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function latestEvaluation(submission: SubmissionRow) {
  return (
    submission.evaluations?.find(
      (evaluation) => evaluation.provider === "DETERMINISTIC_POLICY",
    ) || submission.evaluations?.[0]
  );
}

export default function QualificationHistoryPanel({ token }: Props) {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState("");
  const [expanded, setExpanded] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl("/qualification/admin/submissions"),
        { cache: "no-store", headers: { Authorization: "Bearer " + token } },
      );
      if (!response.ok)
        throw new Error(
          await readAdminResponseError(
            response,
            "Unable to load qualification history.",
          ),
        );
      const payload = (await response.json()) as unknown;
      const rows = Array.isArray(payload) ? (payload as SubmissionRow[]) : [];
      setSubmissions(rows);
      setExpanded((current) =>
        rows.some((submission) => submission.id === current) ? current : "",
      );
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
        throw new Error(
          await readAdminResponseError(
            response,
            "Unable to create a protected document link.",
          ),
        );
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
          <p className="max-w-4xl text-sm text-slate-500">
            Persisted submissions, automated assessment outcomes, evidence
            status, administrator decisions, and partner price-list records.
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
        <div className="max-h-[75vh] overflow-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Partner</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Submitted</th>
                <th className="py-2 pr-4">Automated assessment</th>
                <th className="py-2 pr-4">Evidence</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((submission) => {
                const documents = qualificationHistoryDocuments(
                  submission.documents || [],
                ) as DocumentRow[];
                const evaluation = latestEvaluation(submission);
                const summary = qualificationAssessmentSummary(documents);
                const priceCount = Array.isArray(submission.priceList)
                  ? submission.priceList.length
                  : 0;
                const isExpanded = expanded === submission.id;
                return (
                  <Fragment key={submission.id}>
                    <tr className={isExpanded ? "bg-sky-50" : "bg-white"}>
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
                      <td className="py-3 pr-4 align-top text-slate-700">
                        <p>
                          {summary.passed} passed / {summary.failed} failed /{" "}
                          {summary.review} review / {summary.notPerformed} not
                          performed
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Recommendation: {evaluation?.recommendedTier || "-"}
                          {evaluation?.confidence !== null &&
                          evaluation?.confidence !== undefined
                            ? ` / ${evaluation.confidence}% confidence`
                            : ""}
                        </p>
                      </td>
                      <td className="py-3 pr-4 align-top text-slate-600">
                        {documents.length} document(s) / {priceCount} price-list
                        item(s)
                      </td>
                      <td className="py-3 align-top">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() =>
                            setExpanded(isExpanded ? "" : submission.id)
                          }
                          className="rounded-lg border border-sky-700 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100"
                        >
                          {isExpanded ? "Hide details" : "Review details"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50 p-4">
                          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
                            <div className="grid gap-3 md:grid-cols-2">
                              {documents.map((document) => {
                                const key = submission.id + ":" + document.id;
                                const checks =
                                  qualificationDocumentChecks(document);
                                const fields =
                                  safeQualificationExtractedFields(document);
                                const reasons = qualificationReasonLabels(
                                  document.assessmentReasonCodes,
                                );
                                const findings =
                                  qualificationFindingsForDocument(
                                    evaluation?.findings,
                                    document.id,
                                  ) as Finding[];
                                return (
                                  <article
                                    key={document.id}
                                    className="rounded-lg border border-slate-200 bg-white p-4"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <h3 className="font-bold text-slate-900">
                                          {document.documentType}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                          {document.evidenceStatus || "PENDING"}
                                          {document.isActive === false
                                            ? " / retained for audit"
                                            : " / current evidence"}
                                        </p>
                                      </div>
                                      {document.isActive !== false ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void openDocument(
                                              submission.id,
                                              document.id,
                                            )
                                          }
                                          disabled={opening === key}
                                          className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                        >
                                          {opening === key
                                            ? "Opening..."
                                            : "Open file"}
                                        </button>
                                      ) : null}
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">
                                      Assessed:{" "}
                                      {formatDate(
                                        qualificationAssessmentTimestamp(
                                          document,
                                        ),
                                      )}
                                    </p>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                      {checks.map((check) => (
                                        <p
                                          key={check.label}
                                          className={`rounded border px-2 py-1.5 text-xs ${toneClass(check.tone)}`}
                                        >
                                          <strong>{check.label}:</strong>{" "}
                                          {check.status}
                                        </p>
                                      ))}
                                    </div>
                                    {reasons.length ? (
                                      <p className="mt-3 text-xs text-amber-800">
                                        {reasons.join(". ")}
                                      </p>
                                    ) : null}
                                    {fields.length ? (
                                      <dl className="mt-3 grid gap-1 text-xs text-slate-700">
                                        {fields.map((field) => (
                                          <div
                                            key={field.key}
                                            className="grid grid-cols-[150px_minmax(0,1fr)] gap-2"
                                          >
                                            <dt className="font-semibold">
                                              {field.label}
                                            </dt>
                                            <dd className="break-words">
                                              {field.value}
                                            </dd>
                                          </div>
                                        ))}
                                      </dl>
                                    ) : null}
                                    {findings.length ? (
                                      <div className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600">
                                        {findings.slice(0, 5).map((finding) => (
                                          <p
                                            key={`${finding.code || finding.claim}-${finding.createdAt || ""}`}
                                          >
                                            {finding.code ||
                                              finding.claim ||
                                              "Assessment finding"}
                                            {finding.result
                                              ? `: ${finding.result}`
                                              : ""}
                                          </p>
                                        ))}
                                      </div>
                                    ) : null}
                                  </article>
                                );
                              })}
                            </div>
                            <aside className="space-y-3">
                              <div className="rounded-lg border border-slate-200 bg-white p-4">
                                <h3 className="font-bold text-slate-900">
                                  Automated evaluation
                                </h3>
                                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                                  <div>
                                    <dt className="text-slate-500">Status</dt>
                                    <dd className="font-semibold">
                                      {evaluation?.status || "Not recorded"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-slate-500">Risk</dt>
                                    <dd className="font-semibold">
                                      {evaluation?.risk || "-"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-slate-500">Identity</dt>
                                    <dd className="font-semibold">
                                      {evaluation?.identityConfidence ?? "-"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-slate-500">
                                      Authenticity
                                    </dt>
                                    <dd className="font-semibold">
                                      {evaluation?.documentAuthenticityConfidence ??
                                        "-"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-slate-500">
                                      Credentials
                                    </dt>
                                    <dd className="font-semibold">
                                      {evaluation?.credentialConfidence ?? "-"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-slate-500">
                                      Tier score
                                    </dt>
                                    <dd className="font-semibold">
                                      {evaluation?.tierEligibilityScore ?? "-"}
                                    </dd>
                                  </div>
                                </dl>
                                <p className="mt-3 text-xs text-slate-500">
                                  Completed:{" "}
                                  {formatDate(
                                    evaluation?.completedAt ||
                                      evaluation?.createdAt,
                                  )}
                                </p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-4">
                                <h3 className="font-bold text-slate-900">
                                  Administrator decisions
                                </h3>
                                {submission.reviewTasks?.length ? (
                                  <div className="mt-2 max-h-52 space-y-2 overflow-y-auto text-xs text-slate-700">
                                    {submission.reviewTasks.map((task) => (
                                      <p key={task.id}>
                                        {task.kind || "Review"}:{" "}
                                        {task.decision ||
                                          task.proposedDecision ||
                                          task.status ||
                                          "Pending"}
                                        {task.proposedTier
                                          ? ` / ${task.proposedTier}`
                                          : ""}
                                        {task.decidedAt || task.proposedAt
                                          ? ` / ${formatDate(task.decidedAt || task.proposedAt)}`
                                          : ""}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-2 text-xs text-slate-500">
                                    No administrator decision recorded.
                                  </p>
                                )}
                              </div>
                            </aside>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
