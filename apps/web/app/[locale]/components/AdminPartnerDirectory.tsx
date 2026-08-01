"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "../lib/api";
import QualificationEvidenceControls from "./QualificationEvidenceControls";

type DirectoryRow = {
  id: string;
  tier?: string | null;
  status?: string | null;
  verified?: boolean;
  rating?: number | null;
  completedJobs?: number | null;
  yearsExperience?: number | null;
  serviceProvince?: string | null;
  serviceDistrict?: string | null;
  servicePostalCode?: string | null;
  priceList?: Array<{
    service?: string;
    unit?: string;
    finalPrice?: number | string;
  }> | null;
  declineCount?: number;
  cancellationCount?: number;
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  skills?: Array<{
    category?: string | null;
    name?: string | null;
    yearsExperience?: number | null;
  }>;
  qualificationSubmissions?: Array<{
    id: string;
    status?: string;
    submittedAt?: string | null;
    documents?: Array<{
      id: string;
      documentType: string;
      evidenceStatus: string;
    }>;
  }>;
};

type Detail = {
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  id: string;
  tier?: string | null;
  status?: string | null;
  verified?: boolean;
  priceList?: Array<{
    service?: string;
    unit?: string;
    finalPrice?: number | string;
  }> | null;
  qualificationSubmissions?: Array<{
    id: string;
    version: number;
    status: string;
    submittedAt?: string | null;
    documents: Array<{
      id: string;
      documentType: string;
      contentType: string;
      sizeBytes: number;
      evidenceStatus: string;
    }>;
    evaluations: Array<{
      id: string;
      provider: string;
      status: string;
      recommendedTier?: string | null;
      confidence?: number | null;
    }>;
  }>;
};

type Props = { token: string };

function displayName(row: DirectoryRow | Detail) {
  return row.user?.name || row.user?.email || row.user?.phone || row.id;
}

export default function AdminPartnerDirectory({ token }: Props) {
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [filters, setFilters] = useState({
    province: "",
    district: "",
    service: "",
    tier: "",
  });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "20" });
      for (const [key, value] of Object.entries(filters))
        if (value.trim()) params.set(key, value.trim());
      const response = await fetch(
        getApiUrl("/admin/fixers/directory?" + params.toString()),
        {
          cache: "no-store",
          headers: { Authorization: "Bearer " + token },
        },
      );
      if (!response.ok) throw new Error("Unable to load provider directory.");
      const payload = (await response.json()) as { rows?: DirectoryRow[] };
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load provider directory.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(fixerId: string) {
    setDetailLoading(fixerId);
    setError("");
    try {
      const response = await fetch(
        getApiUrl("/admin/fixers/" + fixerId + "/qualification-detail"),
        {
          cache: "no-store",
          headers: { Authorization: "Bearer " + token },
        },
      );
      if (!response.ok) throw new Error("Unable to load provider detail.");
      setSelected((await response.json()) as Detail);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load provider detail.",
      );
    } finally {
      setDetailLoading("");
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Provider directory
          </h2>
          <p className="text-sm text-slate-500">
            Latest 20 service providers from persisted CBLUE records. Search by
            service area, service, or tier.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh directory"}
        </button>
      </div>
      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-2 md:grid-cols-4">
        {(["province", "district", "service"] as const).map((key) => (
          <input
            key={key}
            value={filters[key]}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                [key]: event.target.value,
              }))
            }
            placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        ))}
        <select
          value={filters.tier}
          onChange={(event) =>
            setFilters((current) => ({ ...current, tier: event.target.value }))
          }
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All tiers</option>
          {["ECONOMY", "STANDARD", "CORPORATE", "SPECIALIST", "EXPERT"].map(
            (tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ),
          )}
        </select>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 pr-4">Provider</th>
              <th className="py-2 pr-4">Area</th>
              <th className="py-2 pr-4">Services</th>
              <th className="py-2 pr-4">Tier</th>
              <th className="py-2 pr-4">Rating</th>
              <th className="py-2 pr-4">Incidents</th>
              <th className="py-2 pr-4">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-3 pr-4 align-top font-semibold text-slate-900">
                  {displayName(row)}
                  <p className="mt-1 text-xs font-normal text-slate-500">
                    {row.user?.email || row.user?.phone || ""}
                  </p>
                </td>
                <td className="py-3 pr-4 align-top text-slate-600">
                  {[
                    row.serviceDistrict,
                    row.serviceProvince,
                    row.servicePostalCode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Not recorded"}
                </td>
                <td className="py-3 pr-4 align-top text-slate-600">
                  {(row.skills || [])
                    .map((skill) => skill.name || skill.category)
                    .filter(Boolean)
                    .slice(0, 5)
                    .join(", ") || "Not recorded"}
                </td>
                <td className="py-3 pr-4 align-top font-semibold text-slate-700">
                  {row.tier || "-"}
                </td>
                <td className="py-3 pr-4 align-top text-slate-600">
                  {row.rating ?? "-"} / 5
                </td>
                <td className="py-3 pr-4 align-top text-slate-600">
                  Declines {row.declineCount || 0}
                  <br />
                  Cancellations {row.cancellationCount || 0}
                </td>
                <td className="py-3 pr-4 align-top">
                  <button
                    type="button"
                    onClick={() => void openDetail(row.id)}
                    disabled={detailLoading === row.id}
                    className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-60"
                  >
                    {detailLoading === row.id ? "Loading..." : "View detail"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !rows.length && (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No providers match the selected filters.
        </p>
      )}
      {selected && (
        <div className="mt-6 rounded-lg border border-sky-200 bg-sky-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-950">
                {displayName(selected)}
              </h3>
              <p className="text-sm text-slate-600">
                Status {selected.status || "-"} � Tier {selected.tier || "-"} �
                KYC {selected.verified ? "approved" : "pending"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Close detail
            </button>
          </div>
          <h4 className="mt-4 font-semibold text-slate-900">
            Proposed price list
          </h4>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {(selected.priceList || []).map((item, index) => (
              <div
                key={index}
                className="flex justify-between gap-3 rounded bg-white px-3 py-2 text-sm"
              >
                <span>
                  {item.service || "Service"}
                  {item.unit ? " / " + item.unit : ""}
                </span>
                <span className="font-semibold">{item.finalPrice ?? "-"}</span>
              </div>
            ))}
          </div>
          {(selected.qualificationSubmissions || []).map((submission) => (
            <div
              key={submission.id}
              className="mt-5 rounded-lg border border-slate-200 bg-white p-3"
            >
              <h4 className="font-semibold text-slate-900">
                Qualification submission v{submission.version} �{" "}
                {submission.status}
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Submitted{" "}
                {submission.submittedAt
                  ? new Date(submission.submittedAt).toLocaleString()
                  : "not submitted"}
              </p>
              <div className="mt-3">
                <QualificationEvidenceControls
                  token={token}
                  submissionId={submission.id}
                  documents={submission.documents}
                  onChanged={async () => openDetail(selected.id)}
                  readOnly
                />
              </div>
              <div className="mt-3 text-xs text-slate-600">
                {submission.evaluations.map((evaluation) => (
                  <p key={evaluation.id}>
                    {evaluation.provider}:{" "}
                    {evaluation.recommendedTier || "No recommendation"} �
                    confidence {evaluation.confidence ?? "-"}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
