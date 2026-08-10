"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "../lib/api";
import { adminFetchResponse, readAdminResponseError } from "./adminApi";
import QualificationEvidenceControls from "./QualificationEvidenceControls";
import {
  biometricAssessmentLabel,
  buildQualificationDecisionPayload,
  qualificationAssessmentSummary,
  visibleQualificationDocuments,
} from "../../../lib/qualificationAdminProjection.mjs";

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
  reviewReadiness?: {
    canApprove: boolean;
    blockingReason?: string | null;
    requiredEvidence?: Array<{
      documentType: string;
      status: string;
      ready: boolean;
    }>;
  };
  submission?: {
    id?: string;
    status?: string;
    purpose?: "INITIAL_KYC" | "KYC_REVERIFICATION";
    reverificationReasons?: string[];
    fixer?: {
      priceList?: Array<{
        service?: string;
        unit?: string;
        finalPrice?: number | string;
      }> | null;
      user?: { name?: string | null; email?: string | null } | null;
      qualificationEligibilityStatus?: string;
      kycValidUntil?: string | null;
      kycReverificationRequiredAt?: string | null;
      kycReverificationReasons?: string[];
      tierReevaluationRequestedAt?: string | null;
      tierReevaluationCompletedAt?: string | null;
    } | null;
    documents?: Array<{
      id: string;
      documentType: string;
      evidenceStatus: string;
      assessmentReasonCodes?: string[] | null;
      isActive?: boolean;
      lifecycleState?: string;
      objectDeletedAt?: string | null;
      extractedFields?: Record<string, unknown> | null;
      extractedAt?: string | null;
      createdAt?: string | null;
      identityNumberLast4?: string | null;
      identityExpiryDate?: string | null;
      subjectNameHash?: string | null;
      legalHoldUntil?: string | null;
      assessmentJob?: {
        status?: string;
        attempts?: number;
        lastError?: string | null;
        nextAttemptAt?: string;
        completedAt?: string | null;
      } | null;
      complianceAccesses?: Array<{
        actorId?: string;
        purpose?: string;
        caseReference?: string | null;
        legalHoldUntil?: string | null;
        createdAt?: string;
      }>;
    }>;
    evaluations?: Array<{
      provider: string;
      policyVersion?: string | null;
      risk?: string | null;
      recommendedTier?: string | null;
      confidence?: number | null;
      identityConfidence?: number | null;
      documentAuthenticityConfidence?: number | null;
      faceMatchConfidence?: number | null;
      livenessConfidence?: number | null;
      credentialConfidence?: number | null;
      tierEligibilityScore?: number | null;
      findings?: Array<{
        documentId?: string | null;
        code?: string;
        severity?: string;
        claim?: string;
        result?: string;
        confidence?: number | null;
        createdAt?: string;
      }>;
      completedAt?: string | null;
      createdAt?: string;
    }>;
    auditLogs?: Array<{
      id?: string;
      actorId?: string | null;
      action?: string;
      reason?: string | null;
      createdAt?: string;
    }>;
  };
};
type QualificationDocument = NonNullable<
  NonNullable<ReviewTask["submission"]>["documents"]
>[number];

type Props = { token: string; adminId: string };

const TIERS = [
  "ECONOMY",
  "STANDARD",
  "CORPORATE",
  "SPECIALIST",
  "EXPERT",
] as const;

const CURRENT_POLICY_VERSION = "cblue-fixer-qualification-v5";

function allowedTiers(recommended?: string | null) {
  const ceiling = TIERS.indexOf(recommended as (typeof TIERS)[number]);
  return ceiling < 0 ? [] : TIERS.slice(0, ceiling + 1);
}

function displayName(task: ReviewTask) {
  return (
    task.submission?.fixer?.user?.name ||
    task.submission?.fixer?.user?.email ||
    "Partner"
  );
}

const REVERIFICATION_REASON_LABELS: Record<string, string> = {
  ID_EXPIRED: "Identity document expired",
  ID_EXPIRING: "Identity document renewal",
  ID_REPLACED: "Identity evidence replaced",
  EMAIL_CHANGED: "Email address changed",
  PHONE_CHANGED: "Phone number changed",
  ADDRESS_CHANGED: "Official address changed",
  SERVICE_AREA_CHANGED: "Service area changed",
  MISSING_ID_EXPIRY: "Identity expiry date required",
};

function reverificationSummary(task: ReviewTask): string | null {
  if (task.submission?.purpose !== "KYC_REVERIFICATION") return null;
  const reasons = Array.from(
    new Set([
      ...(task.submission.reverificationReasons || []),
      ...(task.submission.fixer?.kycReverificationReasons || []),
    ]),
  );
  if (!reasons.length) return "Identity renewal";
  return reasons
    .map((reason) => REVERIFICATION_REASON_LABELS[reason] || reason)
    .join(", ");
}

function extractedCompanyName(documents: QualificationDocument[]) {
  const affidavit = documents.find(
    (document) =>
      document.documentType === "company-affidavit" &&
      document.isActive !== false &&
      document.evidenceStatus === "VALIDATED",
  );
  const extracted = affidavit?.extractedFields;
  if (!extracted || typeof extracted !== "object") return "";
  const nested = extracted.fields;
  const fields =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : extracted;
  return typeof fields.companyName === "string"
    ? fields.companyName.trim()
    : "";
}

export default function QualificationReviewPanel({ token, adminId }: Props) {
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState("");
  const [releasing, setReleasing] = useState("");
  const [deciding, setDeciding] = useState("");
  const [reevaluating, setReevaluating] = useState("");
  const [autoReevaluated, setAutoReevaluated] = useState<
    Record<string, boolean>
  >({});
  const [decision, setDecision] = useState<
    Record<string, "APPROVE" | "REJECT">
  >({});
  const [approvedTier, setApprovedTier] = useState<Record<string, string>>({});
  const [providerIdentityType, setProviderIdentityType] = useState<
    Record<string, "PERSONAL" | "COMPANY">
  >({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [expandedTaskId, setExpandedTaskId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl("/qualification/admin/review-tasks"),
        {
          cache: "no-store",
          headers: { Authorization: "Bearer " + token },
        },
      );
      if (!response.ok)
        throw new Error(
          await readAdminResponseError(
            response,
            "Unable to load qualification review tasks.",
          ),
        );
      const payload = (await response.json()) as unknown;
      const nextTasks = Array.isArray(payload) ? (payload as ReviewTask[]) : [];
      setTasks(nextTasks);
      setExpandedTaskId((current) =>
        nextTasks.some((task) => task.id === current) ? current : "",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load qualification review tasks.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const staleTask = tasks.find((task) => {
      const evaluation = task.submission?.evaluations?.find(
        (item) => item.provider === "DETERMINISTIC_POLICY",
      );
      return (
        task.kind === "TIER" &&
        task.status === "ASSIGNED" &&
        task.assignedTo === adminId &&
        Boolean(task.submission?.id) &&
        evaluation?.policyVersion !== CURRENT_POLICY_VERSION &&
        !autoReevaluated[task.id]
      );
    });
    if (!staleTask?.submission?.id) return;
    setAutoReevaluated((current) => ({ ...current, [staleTask.id]: true }));
    setReevaluating(staleTask.submission.id);
    void adminFetchResponse(
      getApiUrl(
        "/qualification/admin/submissions/" +
          staleTask.submission.id +
          "/re-evaluate",
      ),
      {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            await readAdminResponseError(
              response,
              "The qualification could not be re-evaluated.",
            ),
          );
        }
        await load();
      })
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to re-evaluate qualification.",
        );
      })
      .finally(() => setReevaluating(""));
  }, [adminId, autoReevaluated, load, tasks, token]);
  async function claim(taskId: string) {
    setClaiming(taskId);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl(`/qualification/admin/review-tasks/${taskId}/assign`),
        {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
        },
      );
      if (!response.ok)
        throw new Error(
          await readAdminResponseError(
            response,
            "This review task is no longer available.",
          ),
        );
      setExpandedTaskId(taskId);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to start review.",
      );
    } finally {
      setClaiming("");
    }
  }

  async function release(taskId: string) {
    setReleasing(taskId);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl("/qualification/admin/review-tasks/" + taskId + "/release"),
        {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
        },
      );
      if (!response.ok)
        throw new Error(
          await readAdminResponseError(
            response,
            "The review task could not be released.",
          ),
        );
      setExpandedTaskId("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to return review task to the queue.",
      );
    } finally {
      setReleasing("");
    }
  }

  async function decide(task: ReviewTask) {
    const selectedDecision = decision[task.id] || "APPROVE";
    const deterministic = task.submission?.evaluations?.find(
      (item) => item.provider === "DETERMINISTIC_POLICY",
    );
    const selectedTier =
      approvedTier[task.id] || deterministic?.recommendedTier || "";
    const selectedProviderName = extractedCompanyName(
      (task.submission?.documents || []) as QualificationDocument[],
    );
    const selectedIdentityType =
      providerIdentityType[task.id] ||
      (selectedProviderName ? "COMPANY" : "PERSONAL");
    const selectedReason = reason[task.id]?.trim() || "";
    if (selectedReason.length < 10) {
      setError("Enter a decision reason with at least 10 characters.");
      return;
    }
    if (
      task.kind === "KYC" &&
      selectedDecision === "APPROVE" &&
      selectedIdentityType === "COMPANY" &&
      selectedProviderName.length < 2
    ) {
      setError("Enter the approved company provider name.");
      return;
    }
    if (
      task.kind !== "KYC" &&
      selectedDecision === "APPROVE" &&
      !selectedTier
    ) {
      setError("Select the approved tier before approving a task.");
      return;
    }

    setDeciding(task.id);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl("/qualification/admin/review-tasks/" + task.id + "/decision"),
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            buildQualificationDecisionPayload({
              kind: task.kind === "KYC" ? "KYC" : "TIER",
              decision: selectedDecision,
              reason: selectedReason,
              approvedTier: selectedTier,
              providerIdentityType: selectedIdentityType,
              approvedProviderName: selectedProviderName,
            }),
          ),
        },
      );
      if (!response.ok)
        throw new Error(
          await readAdminResponseError(
            response,
            "The review decision could not be saved.",
          ),
        );
      setExpandedTaskId("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save review decision.",
      );
    } finally {
      setDeciding("");
    }
  }

  async function reevaluate(submissionId?: string) {
    if (!submissionId) return;
    setReevaluating(submissionId);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl(
          "/qualification/admin/submissions/" + submissionId + "/re-evaluate",
        ),
        {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
        },
      );
      if (!response.ok)
        throw new Error(
          await readAdminResponseError(
            response,
            "The qualification could not be re-evaluated.",
          ),
        );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to re-evaluate qualification.",
      );
    } finally {
      setReevaluating("");
    }
  }

  return (
    <section className="w-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Qualification review queue
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Only each partner&apos;s latest submission appears here. Start
            review reserves it for you for 30 minutes. Return to queue releases
            it without a decision. Completed decisions leave this queue.
          </p>
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
      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {!loading && !tasks.length && (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No live qualification review tasks.
        </p>
      )}
      {tasks.length > 0 && (
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Partner / review type</th>
                <th className="py-2 pr-4">Recommendation</th>
                <th className="py-2 pr-4">Evidence</th>
                <th className="py-2 pr-4">Proposed price list</th>
                <th className="py-2 pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((task) => {
                const evaluation =
                  task.submission?.evaluations?.find(
                    (item) => item.provider === "DETERMINISTIC_POLICY",
                  ) || task.submission?.evaluations?.[0];
                const allDocuments = visibleQualificationDocuments(
                  task.submission?.documents || [],
                ) as QualificationDocument[];
                const documents = allDocuments.filter((document) =>
                  task.kind === "KYC"
                    ? [
                        "id-front",
                        "selfie-with-id",
                        "company-affidavit",
                        "company-letter-of-intent",
                      ].includes(document.documentType)
                    : !["id-front", "selfie-with-id"].includes(
                        document.documentType,
                      ),
                );
                const assessmentSummary =
                  qualificationAssessmentSummary(documents);
                const selectedDecision = decision[task.id] || "APPROVE";
                const selectedIdentityType =
                  providerIdentityType[task.id] ||
                  (extractedCompanyName(allDocuments) ? "COMPANY" : "PERSONAL");
                const submissionFindings =
                  evaluation?.findings?.filter(
                    (finding) => !finding.documentId,
                  ) || [];
                const approvalBlocked =
                  selectedDecision === "APPROVE" &&
                  !task.reviewReadiness?.canApprove;
                const assignedToCurrent =
                  task.status === "ASSIGNED" &&
                  task.assignedTo === adminId &&
                  !task.proposedAt;
                const expanded =
                  assignedToCurrent && expandedTaskId === task.id;
                const renewalSummary = reverificationSummary(task);
                return (
                  <tr
                    key={task.id}
                    className={
                      expanded
                        ? "bg-sky-50 outline outline-2 outline-sky-200"
                        : "bg-white"
                    }
                  >
                    <td className="py-3 pr-4 align-top font-semibold text-slate-900">
                      {displayName(task)}
                      <p className="mt-1 text-xs font-normal text-slate-500">
                        {task.kind === "KYC" ? "KYC review" : "Tier review"} /{" "}
                        {task.submission?.status || "REVIEW"}
                      </p>
                      {renewalSummary ? (
                        <p className="mt-1 max-w-sm text-xs font-normal leading-5 text-amber-800">
                          Re-verification: {renewalSummary}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 align-top text-slate-700">
                      <p className="font-semibold text-slate-800">
                        Automated assessment
                      </p>
                      <p className="mt-1">
                        Recommendation:{" "}
                        {evaluation?.recommendedTier || "Pending"}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Checks: {assessmentSummary.passed} passed,{" "}
                        {assessmentSummary.failed} failed,{" "}
                        {assessmentSummary.review} awaiting review,{" "}
                        {assessmentSummary.notPerformed} not performed
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {evaluation?.risk || "-"} risk /{" "}
                        {evaluation?.confidence ?? "-"}% confidence
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span>
                          Identity: {evaluation?.identityConfidence ?? "-"}
                        </span>
                        <span>
                          Authenticity:{" "}
                          {evaluation?.documentAuthenticityConfidence ?? "-"}
                        </span>
                        <span>
                          Face match:{" "}
                          {biometricAssessmentLabel(
                            evaluation?.faceMatchConfidence,
                          )}
                        </span>
                        <span>
                          Liveness:{" "}
                          {biometricAssessmentLabel(
                            evaluation?.livenessConfidence,
                          )}
                        </span>
                        <span>
                          Credentials: {evaluation?.credentialConfidence ?? "-"}
                        </span>
                        <span>
                          Tier score: {evaluation?.tierEligibilityScore ?? "-"}
                        </span>
                      </div>
                      {evaluation?.completedAt || evaluation?.createdAt ? (
                        <p className="mt-2 text-[11px] text-slate-500">
                          Assessed:{" "}
                          {new Date(
                            evaluation.completedAt ||
                              evaluation.createdAt ||
                              "",
                          ).toLocaleString()}
                        </p>
                      ) : null}
                      {submissionFindings.length ? (
                        <p className="mt-2 text-xs text-amber-800">
                          {submissionFindings
                            .slice(0, 5)
                            .map(
                              (finding) =>
                                finding.code || finding.claim || "Finding",
                            )
                            .join(", ")}
                        </p>
                      ) : null}
                      {task.status === "ASSIGNED" &&
                        task.assignedTo === adminId &&
                        !task.proposedAt && (
                          <button
                            type="button"
                            onClick={() => void reevaluate(task.submission?.id)}
                            disabled={
                              !task.submission?.id ||
                              reevaluating === task.submission?.id
                            }
                            className="mt-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {reevaluating === task.submission?.id
                              ? "Evaluating..."
                              : "Re-evaluate evidence"}
                          </button>
                        )}
                    </td>
                    <td className="py-3 pr-4 align-top text-slate-600">
                      <div className="space-y-2">
                        {task.status === "ASSIGNED" &&
                        task.assignedTo === adminId &&
                        expanded ? (
                          <QualificationEvidenceControls
                            token={token}
                            submissionId={task.submission?.id}
                            documents={documents}
                            findings={evaluation?.findings || []}
                            onChanged={async () => {
                              if (task.kind === "TIER" && task.submission?.id) {
                                await reevaluate(task.submission.id);
                                return;
                              }
                              await load();
                            }}
                            readOnly={Boolean(task.proposedAt)}
                          />
                        ) : (
                          <span>
                            {documents.length} document(s).{" "}
                            {assignedToCurrent
                              ? "Open details to review evidence."
                              : "Start review to inspect evidence."}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="min-w-72 py-3 pr-4 align-top text-slate-700">
                      {expanded &&
                      Array.isArray(task.submission?.fixer?.priceList) &&
                      task.submission.fixer.priceList.length ? (
                        <div className="space-y-1.5">
                          {task.submission.fixer.priceList
                            .slice(0, 30)
                            .map((row, index) => (
                              <div
                                key={`${row.service || "service"}-${index}`}
                                className="flex justify-between gap-4 rounded bg-slate-50 px-2.5 py-1.5"
                              >
                                <span>
                                  {row.service || "Service"}
                                  {row.unit ? ` / ${row.unit}` : ""}
                                </span>
                                <span className="whitespace-nowrap font-semibold">
                                  {Number(row.finalPrice || 0).toLocaleString(
                                    "th-TH",
                                    {
                                      style: "currency",
                                      currency: "THB",
                                      maximumFractionDigits: 0,
                                    },
                                  )}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <span className="text-slate-500">
                          {Array.isArray(task.submission?.fixer?.priceList)
                            ? task.submission.fixer.priceList.length
                            : 0}{" "}
                          price-list item(s)
                        </span>
                      )}
                    </td>
                    <td className="min-w-72 py-3 pr-4 align-top">
                      {task.status === "OPEN" && (
                        <button
                          type="button"
                          onClick={() => void claim(task.id)}
                          disabled={claiming === task.id}
                          className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-60"
                        >
                          {claiming === task.id
                            ? "Starting..."
                            : "Start review"}
                        </button>
                      )}
                      {assignedToCurrent && (
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() =>
                            setExpandedTaskId(expanded ? "" : task.id)
                          }
                          className="mb-2 rounded-lg border border-sky-700 bg-white px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
                        >
                          {expanded ? "Hide details" : "Continue review"}
                        </button>
                      )}
                      {assignedToCurrent && expanded && (
                        <div className="space-y-2 border-t border-sky-200 pt-3">
                          <div className="flex flex-wrap gap-2">
                            <select
                              aria-label={"Decision for " + displayName(task)}
                              value={decision[task.id] || "APPROVE"}
                              onChange={(event) =>
                                setDecision((current) => ({
                                  ...current,
                                  [task.id]: event.target.value as
                                    | "APPROVE"
                                    | "REJECT",
                                }))
                              }
                              className="rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700"
                            >
                              <option value="APPROVE">
                                {task.kind === "KYC"
                                  ? "Approve KYC"
                                  : "Approve tier"}
                              </option>
                              <option value="REJECT">
                                {task.kind === "KYC"
                                  ? "Request KYC resubmission"
                                  : "Decline tier request"}
                              </option>
                            </select>
                            {task.kind !== "KYC" &&
                              (decision[task.id] || "APPROVE") ===
                                "APPROVE" && (
                                <select
                                  aria-label={
                                    "Proposed tier for " + displayName(task)
                                  }
                                  value={
                                    approvedTier[task.id] ||
                                    evaluation?.recommendedTier ||
                                    ""
                                  }
                                  onChange={(event) =>
                                    setApprovedTier((current) => ({
                                      ...current,
                                      [task.id]: event.target.value,
                                    }))
                                  }
                                  className="rounded-lg border border-slate-300 px-2 py-2 text-xs text-slate-700"
                                >
                                  <option value="">Select tier</option>
                                  {allowedTiers(
                                    evaluation?.recommendedTier,
                                  ).map((tier) => (
                                    <option key={tier} value={tier}>
                                      {tier}
                                    </option>
                                  ))}
                                </select>
                              )}
                          </div>
                          {task.kind === "KYC" &&
                            selectedDecision === "APPROVE" && (
                              <div className="grid gap-2 sm:grid-cols-[140px_minmax(180px,1fr)]">
                                <select
                                  aria-label={
                                    "Provider identity type for " +
                                    displayName(task)
                                  }
                                  value={selectedIdentityType}
                                  onChange={(event) =>
                                    setProviderIdentityType((current) => ({
                                      ...current,
                                      [task.id]: event.target.value as
                                        | "PERSONAL"
                                        | "COMPANY",
                                    }))
                                  }
                                  className="rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700"
                                >
                                  <option value="PERSONAL">Personal</option>
                                  <option value="COMPANY">Company</option>
                                </select>
                                {selectedIdentityType === "COMPANY" ? (
                                  <input
                                    aria-label={
                                      "Approved provider name for " +
                                      displayName(task)
                                    }
                                    value={extractedCompanyName(allDocuments)}
                                    readOnly
                                    maxLength={200}
                                    placeholder="Validate the company affidavit first"
                                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs text-slate-700"
                                  />
                                ) : (
                                  <p className="self-center text-xs text-slate-500">
                                    Provider operates under the approved
                                    personal identity.
                                  </p>
                                )}
                              </div>
                            )}
                          <input
                            aria-label={
                              "Decision reason for " + displayName(task)
                            }
                            value={reason[task.id] || ""}
                            onChange={(event) =>
                              setReason((current) => ({
                                ...current,
                                [task.id]: event.target.value,
                              }))
                            }
                            placeholder="Decision reason (10+ characters)"
                            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs text-slate-700"
                          />
                          {approvalBlocked &&
                          task.reviewReadiness?.blockingReason ? (
                            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                              {task.reviewReadiness.blockingReason}
                            </p>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void decide(task)}
                            disabled={deciding === task.id || approvalBlocked}
                            className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {deciding === task.id
                              ? "Saving..."
                              : selectedDecision === "REJECT"
                                ? task.kind === "KYC"
                                  ? "Request resubmission"
                                  : "Decline tier"
                                : task.kind === "KYC"
                                  ? "Approve KYC"
                                  : "Approve tier"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void release(task.id)}
                            disabled={releasing === task.id}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {releasing === task.id
                              ? "Returning..."
                              : "Return to queue"}
                          </button>
                        </div>
                      )}
                      {task.status === "ASSIGNED" && task.proposedAt && (
                        <div className="min-w-80 space-y-2">
                          <p className="font-semibold text-slate-800">
                            Decision recorded:{" "}
                            {task.proposedDecision || "reviewed"}
                            {task.proposedTier ? " / " + task.proposedTier : ""}
                          </p>
                          <p className="text-xs text-slate-600">
                            {task.proposedReason ||
                              "No decision reason supplied."}
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            This decision is being finalized by the assigned
                            administrator.
                          </p>
                        </div>
                      )}
                      {task.submission?.auditLogs?.length ? (
                        <div className="mt-3 rounded bg-slate-50 p-2">
                          <p className="mb-1 text-xs font-bold text-slate-700">
                            Recent audit history
                          </p>
                          {task.submission.auditLogs
                            .slice(0, 5)
                            .map((entry) => (
                              <p
                                key={entry.id}
                                className="text-[11px] text-slate-500"
                              >
                                {entry.createdAt
                                  ? new Date(entry.createdAt).toLocaleString()
                                  : "-"}{" "}
                                - {entry.action || "Updated"}
                                {entry.reason ? " - " + entry.reason : ""}
                              </p>
                            ))}
                        </div>
                      ) : null}
                      {task.status === "ASSIGNED" &&
                        task.assignedTo !== adminId && (
                          <span className="text-xs font-semibold text-slate-500">
                            In review by another administrator
                          </span>
                        )}
                      {task.status !== "OPEN" && task.status !== "ASSIGNED" && (
                        <span className="text-xs font-semibold text-slate-500">
                          {task.status || "DECIDED"}
                        </span>
                      )}
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
