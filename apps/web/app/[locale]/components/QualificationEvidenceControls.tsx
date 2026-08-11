"use client";

import { useEffect, useState } from "react";
import {
  qualificationAssessmentTimestamp,
  qualificationDocumentChecks,
  qualificationFindingsForDocument,
  qualificationReasonLabels,
  safeQualificationExtractedFields,
} from "../../../lib/qualificationAdminProjection.mjs";
import { getApiUrl } from "../lib/api";
import { adminFetchResponse } from "./adminApi";

type EvidenceStatus = "VALIDATED" | "CONTRADICTED" | "INSUFFICIENT" | "EXPIRED";
type CredentialStatus = "PENDING" | "VERIFIED" | "REJECTED" | "UNVERIFIABLE";
type IssuerType =
  | "EDUCATIONAL_INSTITUTION"
  | "PROFESSIONAL_BODY"
  | "SET_LISTED_COMPANY"
  | "INTERNATIONAL_COMPANY"
  | "GOVERNMENT"
  | "OTHER";
type DocumentRow = {
  id: string;
  documentType: string;
  evidenceStatus: string;
  assessmentReasonCodes?: string[] | null;
  identityNumberLast4?: string | null;
  identityExpiryDate?: string | null;
  extractedFields?: Record<string, unknown> | null;
  extractedAt?: string | null;
  createdAt?: string | null;
  assessmentJob?: {
    status?: string;
    completedAt?: string | null;
  } | null;
  credentialVerification?: {
    status: CredentialStatus;
    issuerType?: IssuerType | null;
    issuerName?: string | null;
    credentialType?: string | null;
    credentialCount?: number | null;
    verificationMethod?: string | null;
    externalReference?: string | null;
    projectValueBaht?: number | null;
    corporateEndorsement?: boolean;
    verifiedAt?: string | null;
  } | null;
};
type AutomatedFinding = {
  documentId?: string | null;
  code?: string;
  severity?: string;
  claim?: string;
  result?: string;
  confidence?: number | null;
  createdAt?: string;
};
type ManualReviewChecks = {
  documentTypeConfirmed: boolean;
  documentReadable: boolean;
  applicantNameMatches: boolean;
  identityUnexpiredConfirmed: boolean;
  faceMatchConfirmed: boolean;
  selfieReviewCompleted: boolean;
};
type Props = {
  token: string;
  submissionId?: string;
  documents: DocumentRow[];
  findings?: AutomatedFinding[];
  onChanged: () => Promise<void>;
  readOnly?: boolean;
};

const STATUSES: EvidenceStatus[] = [
  "VALIDATED",
  "CONTRADICTED",
  "INSUFFICIENT",
  "EXPIRED",
];
const CREDENTIAL_STATUSES: CredentialStatus[] = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "UNVERIFIABLE",
];
const ISSUER_TYPES: IssuerType[] = [
  "EDUCATIONAL_INSTITUTION",
  "PROFESSIONAL_BODY",
  "SET_LISTED_COMPANY",
  "INTERNATIONAL_COMPANY",
  "GOVERNMENT",
  "OTHER",
];
const ID_REVIEW_CHECKS: ReadonlyArray<{
  key: keyof ManualReviewChecks;
  label: string;
}> = [
  { key: "documentTypeConfirmed", label: "Thai ID front confirmed" },
  { key: "documentReadable", label: "Document is clear and readable" },
  { key: "applicantNameMatches", label: "Name matches the applicant" },
  {
    key: "identityUnexpiredConfirmed",
    label: "Expiry date is in the future",
  },
];
const SELFIE_REVIEW_CHECKS: ReadonlyArray<{
  key: keyof ManualReviewChecks;
  label: string;
}> = [
  { key: "documentTypeConfirmed", label: "Selfie with ID confirmed" },
  { key: "documentReadable", label: "Face and ID portrait are clear" },
  { key: "faceMatchConfirmed", label: "Faces match on manual comparison" },
  {
    key: "selfieReviewCompleted",
    label: "Manual selfie review completed",
  },
];

function formatTimestamp(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function checkToneClass(tone: string) {
  if (tone === "danger") return "border-red-200 bg-red-50 text-red-800";
  if (tone === "success")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "review") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

async function readError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return typeof payload?.message === "string" ? payload.message : fallback;
}

export default function QualificationEvidenceControls({
  token,
  submissionId,
  documents,
  findings = [],
  onChanged,
  readOnly = false,
}: Props) {
  const [status, setStatus] = useState<Record<string, EvidenceStatus>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [identityNumber, setIdentityNumber] = useState<Record<string, string>>(
    {},
  );
  const [identityExpiryDate, setIdentityExpiryDate] = useState<
    Record<string, string>
  >({});
  const [manualChecks, setManualChecks] = useState<
    Record<string, ManualReviewChecks>
  >({});
  const [credentialStatus, setCredentialStatus] = useState<
    Record<string, CredentialStatus>
  >({});
  const [credentialIssuerType, setCredentialIssuerType] = useState<
    Record<string, IssuerType>
  >({});
  const [credentialIssuerName, setCredentialIssuerName] = useState<
    Record<string, string>
  >({});
  const [credentialType, setCredentialType] = useState<Record<string, string>>(
    {},
  );
  const [credentialCount, setCredentialCount] = useState<
    Record<string, string>
  >({});
  const [credentialMethod, setCredentialMethod] = useState<
    Record<string, string>
  >({});
  const [credentialReference, setCredentialReference] = useState<
    Record<string, string>
  >({});
  const [credentialProjectValue, setCredentialProjectValue] = useState<
    Record<string, string>
  >({});
  const [credentialEndorsement, setCredentialEndorsement] = useState<
    Record<string, boolean>
  >({});
  const [credentialReason, setCredentialReason] = useState<
    Record<string, string>
  >({});
  const [compliancePurpose, setCompliancePurpose] = useState<
    Record<string, string>
  >({});
  const [complianceCaseReference, setComplianceCaseReference] = useState<
    Record<string, string>
  >({});
  const [complianceLegalHold, setComplianceLegalHold] = useState<
    Record<string, boolean>
  >({});
  const [complianceLegalHoldUntil, setComplianceLegalHoldUntil] = useState<
    Record<string, string>
  >({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setUrls({});
    setStatus(
      Object.fromEntries(
        documents.flatMap((document) =>
          STATUSES.includes(document.evidenceStatus as EvidenceStatus)
            ? [[document.id, document.evidenceStatus as EvidenceStatus]]
            : [],
        ),
      ),
    );
    setIdentityNumber({});
    setIdentityExpiryDate(
      Object.fromEntries(
        documents.flatMap((document) =>
          document.identityExpiryDate
            ? [[document.id, document.identityExpiryDate.slice(0, 10)]]
            : [],
        ),
      ),
    );
    setManualChecks(
      Object.fromEntries(
        documents.map((document) => {
          const codes = new Set(document.assessmentReasonCodes || []);
          return [
            document.id,
            {
              documentTypeConfirmed: codes.has("ADMIN_DOCUMENT_TYPE_CONFIRMED"),
              documentReadable: codes.has("ADMIN_READABILITY_CONFIRMED"),
              applicantNameMatches: codes.has("ADMIN_APPLICANT_NAME_CONFIRMED"),
              identityUnexpiredConfirmed: codes.has(
                "ADMIN_ID_UNEXPIRED_CONFIRMED",
              ),
              faceMatchConfirmed: codes.has("ADMIN_FACE_MATCH_CONFIRMED"),
              selfieReviewCompleted: codes.has("ADMIN_SELFIE_REVIEW_COMPLETED"),
            },
          ];
        }),
      ),
    );
    setCompliancePurpose({});
    setComplianceCaseReference({});
    setComplianceLegalHold({});
    setComplianceLegalHoldUntil({});
    setReason({});
    setCredentialStatus({});
    setCredentialIssuerType({});
    setCredentialIssuerName({});
    setCredentialType(
      Object.fromEntries(
        documents.map((document) => [
          document.id,
          document.credentialVerification?.credentialType || "",
        ]),
      ),
    );
    setCredentialCount(
      Object.fromEntries(
        documents.map((document) => [
          document.id,
          String(document.credentialVerification?.credentialCount || 1),
        ]),
      ),
    );
    setCredentialMethod({});
    setCredentialReference({});
    setCredentialProjectValue({});
    setCredentialEndorsement({});
    setCredentialReason({});
    setError("");
    if (!submissionId || readOnly) return;
    const timeout = window.setTimeout(() => setUrls({}), 5 * 60 * 1000);
    return () => window.clearTimeout(timeout);
  }, [documents, readOnly, submissionId]);

  async function createLink(documentId: string) {
    if (!submissionId) return;
    setBusy("link:" + documentId);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl(
          "/qualification/admin/submissions/" +
            submissionId +
            "/documents/" +
            documentId +
            "/url",
        ),
        {
          cache: "no-store",
          headers: { Authorization: "Bearer " + token },
        },
      );
      if (!response.ok)
        throw new Error(
          await readError(response, "Unable to create secure link."),
        );
      const payload = (await response.json()) as { url?: string };
      if (!payload.url)
        throw new Error("Secure document link was not returned.");
      setUrls((current) => ({
        ...current,
        [documentId]: payload.url as string,
      }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create secure link.",
      );
    } finally {
      setBusy("");
    }
  }

  async function createComplianceLink(documentId: string) {
    if (!submissionId) return;
    const purpose = compliancePurpose[documentId]?.trim() || "";
    if (purpose.length < 10) {
      setError("Enter the regulator or compliance retrieval purpose.");
      return;
    }
    setBusy("compliance:" + documentId);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl(
          "/qualification/admin/submissions/" +
            submissionId +
            "/documents/" +
            documentId +
            "/compliance-url",
        ),
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            purpose,
            caseReference:
              complianceCaseReference[documentId]?.trim() || undefined,
            legalHold: Boolean(complianceLegalHold[documentId]),
            legalHoldUntil: complianceLegalHoldUntil[documentId] || undefined,
          }),
        },
      );
      if (!response.ok)
        throw new Error(
          await readError(response, "Unable to create compliance link."),
        );
      const payload = (await response.json()) as { url?: string };
      if (!payload.url)
        throw new Error("Compliance document link was not returned.");
      setUrls((current) => ({
        ...current,
        [documentId]: payload.url as string,
      }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create compliance link.",
      );
    } finally {
      setBusy("");
    }
  }

  async function verify(documentId: string) {
    if (!submissionId) return;
    setBusy("verify:" + documentId);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl(
          "/qualification/admin/submissions/" +
            submissionId +
            "/documents/" +
            documentId +
            "/verify",
        ),
        {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
        },
      );
      if (!response.ok)
        throw new Error(
          await readError(response, "Unable to verify document."),
        );
      await onChanged();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to verify document.",
      );
    } finally {
      setBusy("");
    }
  }

  function updateManualCheck(
    documentId: string,
    key: keyof ManualReviewChecks,
    checked: boolean,
  ) {
    setManualChecks((current) => ({
      ...current,
      [documentId]: {
        documentTypeConfirmed: false,
        documentReadable: false,
        applicantNameMatches: false,
        identityUnexpiredConfirmed: false,
        faceMatchConfirmed: false,
        selfieReviewCompleted: false,
        ...current[documentId],
        [key]: checked,
      },
    }));
  }

  async function save(documentId: string) {
    if (!submissionId || !status[documentId]) {
      setError("Select an evidence status.");
      return;
    }
    const decisionReason = reason[documentId]?.trim() || "";
    if (decisionReason.length < 10) {
      setError("Enter an evidence reason with at least 10 characters.");
      return;
    }
    const document = documents.find((item) => item.id === documentId);
    if (!document) {
      setError("Evidence document is no longer available.");
      return;
    }
    const checks = manualChecks[documentId] || {
      documentTypeConfirmed: false,
      documentReadable: false,
      applicantNameMatches: false,
      identityUnexpiredConfirmed: false,
      faceMatchConfirmed: false,
      selfieReviewCompleted: false,
    };
    if (
      status[documentId] === "VALIDATED" &&
      document.documentType === "id-front"
    ) {
      if (
        (!identityNumber[documentId]?.trim() &&
          !document.identityNumberLast4) ||
        !identityExpiryDate[documentId] ||
        !checks.documentTypeConfirmed ||
        !checks.documentReadable ||
        !checks.applicantNameMatches ||
        !checks.identityUnexpiredConfirmed
      ) {
        setError(
          "Record the ID number and expiry, then confirm all identity checks.",
        );
        return;
      }
    }
    if (
      status[documentId] === "VALIDATED" &&
      document.documentType === "selfie-with-id" &&
      (!checks.documentTypeConfirmed ||
        !checks.documentReadable ||
        !checks.faceMatchConfirmed ||
        !checks.selfieReviewCompleted)
    ) {
      setError("Confirm all selfie and face comparison checks.");
      return;
    }
    setBusy("save:" + documentId);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl(
          "/qualification/admin/submissions/" +
            submissionId +
            "/documents/" +
            documentId +
            "/evidence",
        ),
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            evidenceStatus: status[documentId],
            reason: decisionReason,
            ...(document.documentType === "id-front"
              ? {
                  identityNumber:
                    identityNumber[documentId]?.trim() || undefined,
                  identityExpiryDate:
                    identityExpiryDate[documentId] || undefined,
                  documentTypeConfirmed: checks.documentTypeConfirmed,
                  documentReadable: checks.documentReadable,
                  applicantNameMatches: checks.applicantNameMatches,
                  identityUnexpiredConfirmed: checks.identityUnexpiredConfirmed,
                }
              : {}),
            ...(document.documentType === "selfie-with-id"
              ? {
                  documentTypeConfirmed: checks.documentTypeConfirmed,
                  documentReadable: checks.documentReadable,
                  faceMatchConfirmed: checks.faceMatchConfirmed,
                  selfieReviewCompleted: checks.selfieReviewCompleted,
                }
              : {}),
          }),
        },
      );
      if (!response.ok)
        throw new Error(
          await readError(response, "Unable to save evidence decision."),
        );
      setReason((current) => ({ ...current, [documentId]: "" }));
      await onChanged();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save evidence decision.",
      );
    } finally {
      setBusy("");
    }
  }

  async function saveCredentialVerification(documentId: string) {
    if (!submissionId) return;
    const selectedStatus = credentialStatus[documentId];
    const method = credentialMethod[documentId]?.trim() || "";
    const decisionReason = credentialReason[documentId]?.trim() || "";
    const verifiedCredentialCount = Number(credentialCount[documentId] || 1);
    if (!selectedStatus || method.length < 3 || decisionReason.length < 10) {
      setError(
        "Select a credential result and enter the verification method and reason.",
      );
      return;
    }
    if (
      !Number.isInteger(verifiedCredentialCount) ||
      verifiedCredentialCount < 1 ||
      verifiedCredentialCount > 20
    ) {
      setError("Verified credential count must be between 1 and 20.");
      return;
    }
    setBusy("credential:" + documentId);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl(
          "/qualification/admin/submissions/" +
            submissionId +
            "/documents/" +
            documentId +
            "/credential-verification",
        ),
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: selectedStatus,
            issuerType: credentialIssuerType[documentId] || undefined,
            issuerName: credentialIssuerName[documentId]?.trim() || undefined,
            credentialType: credentialType[documentId]?.trim() || undefined,
            credentialCount: verifiedCredentialCount,
            verificationMethod: method,
            externalReference:
              credentialReference[documentId]?.trim() || undefined,
            projectValueBaht: credentialProjectValue[documentId]
              ? Number(credentialProjectValue[documentId])
              : undefined,
            corporateEndorsement: Boolean(credentialEndorsement[documentId]),
            reason: decisionReason,
          }),
        },
      );
      if (!response.ok)
        throw new Error(
          await readError(response, "Unable to save credential verification."),
        );
      setCredentialReason((current) => ({ ...current, [documentId]: "" }));
      await onChanged();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save credential verification.",
      );
    } finally {
      setBusy("");
    }
  }

  if (!documents.length)
    return <span className="text-slate-500">No evidence documents.</span>;

  return (
    <div className="divide-y divide-slate-200">
      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
      {documents.map((document) => {
        const checks = qualificationDocumentChecks(document);
        const extractedFields = safeQualificationExtractedFields(document);
        const documentFindings = qualificationFindingsForDocument(
          findings,
          document.id,
        );
        const reasonLabels = qualificationReasonLabels(
          document.assessmentReasonCodes,
        );
        const assessmentTimestamp = qualificationAssessmentTimestamp(document);
        const reviewChecks = manualChecks[document.id] || {
          documentTypeConfirmed: false,
          documentReadable: false,
          applicantNameMatches: false,
          identityUnexpiredConfirmed: false,
          faceMatchConfirmed: false,
          selfieReviewCompleted: false,
        };
        return (
          <div key={document.id} className="py-4 first:pt-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">
                {document.documentType
                  .split("-")
                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(" ")}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                Evidence status: {document.evidenceStatus}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void createLink(document.id)}
                disabled={busy === "link:" + document.id}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {busy === "link:" + document.id
                  ? "Preparing..."
                  : "Open securely"}
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => void verify(document.id)}
                  disabled={busy === "verify:" + document.id}
                  className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
                >
                  {busy === "verify:" + document.id
                    ? "Checking..."
                    : "Refresh assessment"}
                </button>
              )}
              {urls[document.id] && (
                <a
                  href={urls[document.id]}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  View document
                </a>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
            {document.identityNumberLast4 ? (
              <span>ID ending {document.identityNumberLast4}</span>
            ) : null}
            {document.identityExpiryDate ? (
              <span>
                Expiry:{" "}
                {new Date(document.identityExpiryDate).toLocaleDateString()}
              </span>
            ) : null}
            {document.credentialVerification ? (
              <span>
                Credential: {document.credentialVerification.status}
                {document.credentialVerification.issuerName
                  ? " / " + document.credentialVerification.issuerName
                  : ""}
                {document.credentialVerification.credentialCount
                  ? " / " +
                    document.credentialVerification.credentialCount +
                    " verified credential(s)"
                  : ""}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500">
            {document.createdAt ? (
              <span>Uploaded: {formatTimestamp(document.createdAt)}</span>
            ) : null}
            {document.extractedAt ? (
              <span>Extracted: {formatTimestamp(document.extractedAt)}</span>
            ) : null}
            {assessmentTimestamp ? (
              <span>
                Automated assessment: {formatTimestamp(assessmentTimestamp)}
              </span>
            ) : (
              <span>Automated assessment: Not performed</span>
            )}
          </div>

          <div className="mt-3 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {checks.map((check) => (
              <div
                key={check.label}
                className={
                  "flex items-center justify-between gap-3 rounded border px-2.5 py-1.5 text-[11px] " +
                  checkToneClass(check.tone)
                }
              >
                <span>{check.label}</span>
                <span className="font-bold">{check.status}</span>
              </div>
            ))}
          </div>

          {extractedFields.length ? (
            <dl className="mt-3 grid gap-x-5 gap-y-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-2">
              {extractedFields.map((field) => (
                <div key={field.key} className="min-w-0">
                  <dt className="font-semibold text-slate-500">
                    {field.label}
                  </dt>
                  <dd className="mt-0.5 break-words text-slate-800">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {documentFindings.length ? (
            <div className="mt-3 rounded border border-slate-200 px-3 py-2">
              <p className="text-xs font-bold text-slate-700">
                Automated findings
              </p>
              <div className="mt-1.5 space-y-1.5">
                {documentFindings.map(
                  (finding: AutomatedFinding, index: number) => (
                    <div
                      key={`${finding.code || "finding"}-${finding.createdAt || index}`}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs"
                    >
                      <span className="text-slate-700">
                          {finding.claim ||
                            finding.code ||
                            "Assessment finding"}
                      </span>
                      <span className="font-semibold text-slate-600">
                        {finding.result || finding.severity || "Recorded"}
                        {finding.confidence != null
                          ? ` / ${finding.confidence}%`
                          : ""}
                        {finding.createdAt
                          ? ` / ${formatTimestamp(finding.createdAt)}`
                          : ""}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : null}

          {reasonLabels.length ? (
            <p className="mt-2 text-xs font-semibold text-amber-800">
              {reasonLabels.join("; ")}
            </p>
          ) : null}

            {!readOnly && document.documentType === "id-front" ? (
              <fieldset className="mt-3 border border-slate-200 bg-slate-50 p-3">
                <legend className="px-1 text-xs font-bold text-slate-800">
                  Administrator identity review
                </legend>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Thai ID number
                    <input
                      aria-label="Thai ID number"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={30}
                      value={identityNumber[document.id] || ""}
                      onChange={(event) =>
                        setIdentityNumber((current) => ({
                          ...current,
                          [document.id]: event.target.value,
                        }))
                      }
                      placeholder={
                        document.identityNumberLast4
                          ? "Already recorded, ending " +
                            document.identityNumberLast4
                          : "13-digit ID number"
                      }
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    ID expiry date
                    <input
                      aria-label="ID expiry date"
                      type="date"
                      value={identityExpiryDate[document.id] || ""}
                      onChange={(event) =>
                        setIdentityExpiryDate((current) => ({
                          ...current,
                          [document.id]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900"
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  The complete ID number is protected after validation. Only the
                  final four digits remain visible.
                </p>
                <p className="mt-2 text-xs font-semibold text-amber-800">
                  Enter the identity facts, confirm all four checks, then select
                  Save ID review. KYC approval uses saved evidence only.
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {ID_REVIEW_CHECKS.map((check) => (
                    <label
                      key={check.key}
                      className="flex items-center gap-2 text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={reviewChecks[check.key]}
                        onChange={(event) =>
                          updateManualCheck(
                            document.id,
                            check.key,
                            event.target.checked,
                          )
                        }
                        className="size-4 accent-emerald-700"
                      />
                      <span>{check.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {!readOnly && document.documentType === "selfie-with-id" ? (
              <fieldset className="mt-3 border border-slate-200 bg-slate-50 p-3">
                <legend className="px-1 text-xs font-bold text-slate-800">
                  Administrator selfie review
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SELFIE_REVIEW_CHECKS.map((check) => (
                    <label
                      key={check.key}
                      className="flex items-center gap-2 text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={reviewChecks[check.key]}
                        onChange={(event) =>
                          updateManualCheck(
                            document.id,
                            check.key,
                            event.target.checked,
                          )
                        }
                        className="size-4 accent-emerald-700"
                      />
                      <span>{check.label}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  This records an administrator comparison. It does not claim an
                  automated liveness result.
                </p>
                <p className="mt-2 text-xs font-semibold text-amber-800">
                  Confirm all four checks, then select Save selfie review. KYC
                  approval uses saved evidence only.
                </p>
              </fieldset>
            ) : null}

          {!readOnly && (
            <div className="mt-3 grid gap-2 md:grid-cols-[160px_minmax(240px,1fr)_auto]">
              <select
                aria-label={"Evidence status for " + document.documentType}
                value={status[document.id] || ""}
                onChange={(event) =>
                  setStatus((current) => ({
                    ...current,
                    [document.id]: event.target.value as EvidenceStatus,
                  }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
              >
                <option value="">Select status</option>
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <input
                aria-label={"Evidence reason for " + document.documentType}
                value={reason[document.id] || ""}
                onChange={(event) =>
                  setReason((current) => ({
                    ...current,
                    [document.id]: event.target.value,
                  }))
                }
                placeholder="Evidence decision reason"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
              />
              <button
                type="button"
                onClick={() => void save(document.id)}
                disabled={busy === "save:" + document.id}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {busy === "save:" + document.id
                  ? "Saving..."
                  : document.documentType === "id-front"
                    ? "Save ID review"
                    : document.documentType === "selfie-with-id"
                      ? "Save selfie review"
                      : "Save evidence"}
              </button>
            </div>
          )}

          {!readOnly &&
            ![
              "id-front",
              "selfie-with-id",
              "company-affidavit",
              "company-letter-of-intent",
            ].includes(document.documentType) && (
              <details className="mt-3 border-t border-slate-100 pt-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                  Credential verification
                </summary>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <select
                    aria-label={
                      "Credential result for " + document.documentType
                    }
                    value={credentialStatus[document.id] || ""}
                    onChange={(event) =>
                      setCredentialStatus((current) => ({
                        ...current,
                        [document.id]: event.target.value as CredentialStatus,
                      }))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                  >
                    <option value="">Credential result</option>
                    {CREDENTIAL_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={
                      "Credential issuer type for " + document.documentType
                    }
                    value={credentialIssuerType[document.id] || ""}
                    onChange={(event) =>
                      setCredentialIssuerType((current) => ({
                        ...current,
                        [document.id]: event.target.value as IssuerType,
                      }))
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                  >
                    <option value="">Issuer type</option>
                    {ISSUER_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={
                      "Credential issuer name for " + document.documentType
                    }
                    value={credentialIssuerName[document.id] || ""}
                    onChange={(event) =>
                      setCredentialIssuerName((current) => ({
                        ...current,
                        [document.id]: event.target.value,
                      }))
                    }
                    placeholder="Issuer name"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                  />
                  <input
                      aria-label={
                        "Credential type for " + document.documentType
                      }
                    value={credentialType[document.id] || ""}
                    onChange={(event) =>
                      setCredentialType((current) => ({
                        ...current,
                        [document.id]: event.target.value,
                      }))
                    }
                    placeholder="Credential type or qualification"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                  />
                  <input
                    aria-label={
                      "Verified credential count for " + document.documentType
                    }
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    value={credentialCount[document.id] || "1"}
                    onChange={(event) =>
                      setCredentialCount((current) => ({
                        ...current,
                        [document.id]: event.target.value,
                      }))
                    }
                    placeholder="Verified credential count"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                  />
                  <input
                    aria-label={
                      "Credential verification method for " +
                      document.documentType
                    }
                    value={credentialMethod[document.id] || ""}
                    onChange={(event) =>
                      setCredentialMethod((current) => ({
                        ...current,
                        [document.id]: event.target.value,
                      }))
                    }
                    placeholder="Verification method"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                  />
                  <input
                    aria-label={
                      "Credential reference for " + document.documentType
                    }
                    value={credentialReference[document.id] || ""}
                    onChange={(event) =>
                      setCredentialReference((current) => ({
                        ...current,
                        [document.id]: event.target.value,
                      }))
                    }
                    placeholder="Source reference"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                  />
                  <input
                    aria-label={
                      "Verified project value for " + document.documentType
                    }
                    type="number"
                    min="0"
                    value={credentialProjectValue[document.id] || ""}
                    onChange={(event) =>
                      setCredentialProjectValue((current) => ({
                        ...current,
                        [document.id]: event.target.value,
                      }))
                    }
                    placeholder="Project value (THB)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                  />
                  <label className="flex items-center gap-2 px-1 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(credentialEndorsement[document.id])}
                      onChange={(event) =>
                        setCredentialEndorsement((current) => ({
                          ...current,
                          [document.id]: event.target.checked,
                        }))
                      }
                    />
                    Corporate endorsement
                  </label>
                  <input
                    aria-label={
                      "Credential verification reason for " +
                      document.documentType
                    }
                    value={credentialReason[document.id] || ""}
                    onChange={(event) =>
                      setCredentialReason((current) => ({
                        ...current,
                        [document.id]: event.target.value,
                      }))
                    }
                    placeholder="Verification reason"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"
                  />
                  <button
                    type="button"
                      onClick={() =>
                        void saveCredentialVerification(document.id)
                      }
                    disabled={busy === "credential:" + document.id}
                    className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-60"
                  >
                    {busy === "credential:" + document.id
                      ? "Saving..."
                      : "Save credential review"}
                  </button>
                </div>
              </details>
            )}

          <details className="mt-3 border-t border-slate-100 pt-3">
            <summary className="cursor-pointer text-xs font-semibold text-slate-600">
              Regulatory retrieval
            </summary>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_auto_160px_auto]">
              <input
                aria-label={
                  "Compliance retrieval purpose for " + document.documentType
                }
                value={compliancePurpose[document.id] || ""}
                onChange={(event) =>
                  setCompliancePurpose((current) => ({
                    ...current,
                    [document.id]: event.target.value,
                  }))
                }
                placeholder="Purpose"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                aria-label={
                  "Compliance case reference for " + document.documentType
                }
                value={complianceCaseReference[document.id] || ""}
                onChange={(event) =>
                  setComplianceCaseReference((current) => ({
                    ...current,
                    [document.id]: event.target.value,
                  }))
                }
                placeholder="Case reference"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <label className="flex items-center gap-2 px-1 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(complianceLegalHold[document.id])}
                  onChange={(event) =>
                    setComplianceLegalHold((current) => ({
                      ...current,
                      [document.id]: event.target.checked,
                    }))
                  }
                />
                Legal hold
              </label>
              {complianceLegalHold[document.id] ? (
                <input
                  type="date"
                  aria-label={
                    "Legal hold end date for " + document.documentType
                  }
                  value={complianceLegalHoldUntil[document.id] || ""}
                  onChange={(event) =>
                    setComplianceLegalHoldUntil((current) => ({
                      ...current,
                      [document.id]: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              ) : (
                <span aria-hidden="true" />
              )}
              <button
                type="button"
                onClick={() => void createComplianceLink(document.id)}
                disabled={busy === "compliance:" + document.id}
                className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-60"
              >
                {busy === "compliance:" + document.id
                  ? "Preparing..."
                  : "Create audited link"}
              </button>
            </div>
          </details>
          </div>
        );
      })}
    </div>
  );
}
