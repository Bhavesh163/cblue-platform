"use client";

import { useState } from "react";
import { getApiUrl } from "../lib/api";

type EvidenceStatus = "VALIDATED" | "CONTRADICTED" | "INSUFFICIENT" | "EXPIRED";
type DocumentRow = { id: string; documentType: string; evidenceStatus: string };
type Props = {
  token: string;
  submissionId?: string;
  documents: DocumentRow[];
  onChanged: () => Promise<void>;
  readOnly?: boolean;
};

const STATUSES: EvidenceStatus[] = [
  "VALIDATED",
  "CONTRADICTED",
  "INSUFFICIENT",
  "EXPIRED",
];

async function readError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return typeof payload?.message === "string" ? payload.message : fallback;
}

export default function QualificationEvidenceControls({
  token,
  submissionId,
  documents,
  onChanged,
  readOnly = false,
}: Props) {
  const [status, setStatus] = useState<Record<string, EvidenceStatus>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function createLink(documentId: string) {
    if (!submissionId) return;
    setBusy("link:" + documentId);
    setError("");
    try {
      const response = await fetch(getApiUrl(
        "/qualification/admin/submissions/" + submissionId +
        "/documents/" + documentId + "/url",
      ), {
        cache: "no-store",
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) throw new Error(await readError(response, "Unable to create secure link."));
      const payload = await response.json() as { url?: string };
      if (!payload.url) throw new Error("Secure document link was not returned.");
      setUrls((current) => ({ ...current, [documentId]: payload.url as string }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create secure link.");
    } finally {
      setBusy("");
    }
  }

  async function verify(documentId: string) {
    if (!submissionId) return;
    setBusy("verify:" + documentId);
    setError("");
    try {
      const response = await fetch(getApiUrl(
        "/qualification/admin/submissions/" + submissionId +
        "/documents/" + documentId + "/verify",
      ), {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      if (!response.ok) throw new Error(await readError(response, "Unable to verify document."));
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to verify document.");
    } finally {
      setBusy("");
    }
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
    setBusy("save:" + documentId);
    setError("");
    try {
      const response = await fetch(getApiUrl(
        "/qualification/admin/submissions/" + submissionId +
        "/documents/" + documentId + "/evidence",
      ), {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evidenceStatus: status[documentId],
          reason: decisionReason,
        }),
      });
      if (!response.ok) throw new Error(await readError(response, "Unable to save evidence decision."));
      setReason((current) => ({ ...current, [documentId]: "" }));
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save evidence decision.");
    } finally {
      setBusy("");
    }
  }

  if (!documents.length) return <span className="text-slate-500">No evidence documents.</span>;

  return (
    <div className="min-w-[520px] divide-y divide-slate-200">
      {error && <p className="mb-2 text-xs font-semibold text-red-700">{error}</p>}
      {documents.map((document) => (
        <div key={document.id} className="py-3 first:pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-40 font-semibold text-slate-800">{document.documentType}</span>
            <span className="text-xs font-semibold text-slate-500">{document.evidenceStatus}</span>
            <button
              type="button"
              onClick={() => void createLink(document.id)}
              disabled={busy === "link:" + document.id}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {busy === "link:" + document.id ? "Creating link..." : "Create secure link"}
            </button>
            {!readOnly && (
            <button
              type="button"
              onClick={() => void verify(document.id)}
              disabled={busy === "verify:" + document.id}
              className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {busy === "verify:" + document.id ? "Verifying..." : "Run server verification"}
            </button>
            )}
            {urls[document.id] && (
              <a
                href={urls[document.id]}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Open document
              </a>
            )}
          </div>
          {!readOnly && (
          <div className="mt-2 grid gap-2 md:grid-cols-[150px_minmax(220px,1fr)_auto]">
            <select
              aria-label={"Evidence status for " + document.documentType}
              value={status[document.id] || ""}
              onChange={(event) => setStatus((current) => ({
                ...current,
                [document.id]: event.target.value as EvidenceStatus,
              }))}
              className="rounded-lg border border-slate-300 px-2 py-2 text-xs text-slate-700"
            >
              <option value="">Select status</option>
              {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <input
              aria-label={"Evidence reason for " + document.documentType}
              value={reason[document.id] || ""}
              onChange={(event) => setReason((current) => ({
                ...current,
                [document.id]: event.target.value,
              }))}
              placeholder="Evidence decision reason"
              className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs text-slate-700"
            />
            <button
              type="button"
              onClick={() => void save(document.id)}
              disabled={busy === "save:" + document.id}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {busy === "save:" + document.id ? "Saving..." : "Save evidence"}
            </button>
          </div>
          )}
        </div>
      ))}
    </div>
  );
}
