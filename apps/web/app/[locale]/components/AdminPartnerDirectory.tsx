"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "../lib/api";
import { adminFetchResponse, readAdminResponseError } from "./adminApi";
import {
  THAI_DISTRICTS,
  getDistrictsForProvince,
} from "../lib/thai-address-data";
import { getSubdistrictsForDistrict } from "../lib/thai-subdistrict-data";
import QualificationEvidenceControls from "./QualificationEvidenceControls";

type MatchingEligibility = {
  status: string;
  newJobEligible: boolean;
  kycValidUntil?: string | null;
  daysUntilExpiry?: number | null;
  reasons?: string[];
};

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
  serviceSubdistrict?: string | null;
  servicePostalCode?: string | null;
  matchingEligibility?: MatchingEligibility;
  priceList?: Array<{
    service?: string;
    unit?: string;
    finalPrice?: number | string;
  }> | null;
  declineCount90Days?: number;
  recentIncidents?: Array<{
    orderId: string;
    eventType: "PARTNER_DECLINE" | "CUSTOMER_CANCEL";
    reason?: string | null;
    createdAt: string;
  }>;
  cancellationCount12Months?: number;
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
  yearsExperience?: number | null;
  bio?: string | null;
  description?: string | null;
  pastExperience?: string | null;
  pastProjectType?: string | null;
  companyAddress?: Record<string, unknown> | null;
  serviceProvince?: string | null;
  serviceDistrict?: string | null;
  servicePostalCode?: string | null;
  matchingEligibility?: MatchingEligibility;
  skills?: Array<{
    category?: string | null;
    name?: string | null;
    yearsExperience?: number | null;
  }>;
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

const NUMBER_FILTERS = [
  ["minRating", "Minimum rating", "0", "5"],
  ["maxDeclines90Days", "Maximum declines (90 days)", "0", undefined],
  [
    "maxCancellations12Months",
    "Maximum cancellations (12 months)",
    "0",
    undefined,
  ],
] as const;

function displayName(row: DirectoryRow | Detail) {
  return row.user?.name || row.user?.email || row.user?.phone || row.id;
}

function addressValue(detail: Detail, key: string) {
  const value = detail.companyAddress?.[key];
  return typeof value === "string" && value.trim() ? value : "";
}

function eligibilityLabel(eligibility?: MatchingEligibility) {
  if (eligibility?.newJobEligible) return "Eligible";
  if (eligibility?.status === "EXPIRED") return "ID expired";
  if (eligibility?.status === "REVERIFICATION_REQUIRED")
    return "KYC renewal required";
  return "KYC pending";
}

function eligibilityReason(reason: string) {
  const labels: Record<string, string> = {
    ID_EXPIRED: "ID expired",
    MISSING_ID_EXPIRY: "ID expiry not verified",
    ADMIN_RESUBMISSION_REQUIRED: "Resubmission requested",
  };
  return labels[reason] || reason.toLowerCase().replaceAll("_", " ");
}

export default function AdminPartnerDirectory({ token }: Props) {
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<DirectoryRow | null>(
    null,
  );
  const [filters, setFilters] = useState({
    province: "",
    district: "",
    subdistrict: "",
    service: "",
    tier: "",
    minRating: "",
    maxDeclines90Days: "",
    maxCancellations12Months: "",
  });
  const provinceOptions = Object.keys(THAI_DISTRICTS).sort((left, right) =>
    left.localeCompare(right, "th"),
  );
  const districtOptions = getDistrictsForProvince(filters.province);
  const subdistrictOptions = getSubdistrictsForDistrict(
    filters.province,
    filters.district,
  );
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
      const response = await adminFetchResponse(
        getApiUrl("/admin/fixers/directory?" + params.toString()),
        {
          cache: "no-store",
          headers: { Authorization: "Bearer " + token },
        },
      );
      if (!response.ok)
        throw new Error(
          await readAdminResponseError(
            response,
            "Unable to load provider directory.",
          ),
        );
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
    setSelectedSummary(rows.find((row) => row.id === fixerId) || null);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl("/admin/fixers/" + fixerId + "/qualification-detail"),
        {
          cache: "no-store",
          headers: { Authorization: "Bearer " + token },
        },
      );
      if (!response.ok) {
        throw new Error(
          await readAdminResponseError(
            response,
            "Unable to load provider detail.",
          ),
        );
      }
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold text-slate-600">
          Province
          <select
            value={filters.province}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                province: event.target.value,
                district: "",
                subdistrict: "",
              }))
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
          >
            <option value="">All provinces</option>
            {provinceOptions.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          District
          <select
            value={filters.district}
            disabled={!filters.province}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                district: event.target.value,
                subdistrict: "",
              }))
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-100"
          >
            <option value="">All districts</option>
            {districtOptions.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Subdistrict
          <select
            value={filters.subdistrict}
            disabled={!filters.district}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                subdistrict: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-100"
          >
            <option value="">All subdistricts</option>
            {subdistrictOptions.map((subdistrict) => (
              <option key={subdistrict} value={subdistrict}>
                {subdistrict}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Service
          <input
            value={filters.service}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                service: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Tier
          <select
            value={filters.tier}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                tier: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
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
        </label>
        {NUMBER_FILTERS.map(([key, label, min, max]) => (
          <label key={key} className="text-xs font-semibold text-slate-600">
            {label}
            <input
              type="number"
              min={min}
              max={max}
              step={key === "minRating" ? "0.1" : "1"}
              value={filters[key as keyof typeof filters]}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1240px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 pr-4">Provider</th>
              <th className="py-2 pr-4">Area</th>
              <th className="py-2 pr-4">Services</th>
              <th className="py-2 pr-4">Tier</th>
              <th className="py-2 pr-4">Rating</th>
              <th className="py-2 pr-4">New jobs</th>
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
                    row.serviceSubdistrict,
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
                <td className="py-3 pr-4 align-top">
                  <span
                    className={
                      row.matchingEligibility?.newJobEligible
                        ? "font-semibold text-emerald-700"
                        : "font-semibold text-amber-700"
                    }
                  >
                    {eligibilityLabel(row.matchingEligibility)}
                  </span>
                </td>
                <td className="py-3 pr-4 align-top text-slate-600">
                  Declines (90 days): {row.declineCount90Days || 0}
                  <br />
                  Cancellations (12 months):{" "}
                  {row.cancellationCount12Months || 0}
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
        <div className="mt-6 border-t border-slate-200 pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-950">
                {displayName(selected)}
              </h3>
              <p className="text-sm text-slate-600">
                Status {selected.status || "-"} / Tier {selected.tier || "-"} |
                KYC {selected.verified ? "approved" : "pending"} | New jobs{" "}
                {eligibilityLabel(selected.matchingEligibility)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setSelectedSummary(null);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Close detail
            </button>
          </div>
          <div className="mt-5 grid gap-x-6 gap-y-3 border-y border-slate-200 py-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs font-semibold text-slate-500">Email</p>
              <p className="text-sm text-slate-800">
                {selected.user?.email || "Not recorded"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Phone</p>
              <p className="text-sm text-slate-800">
                {selected.user?.phone || "Not recorded"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Experience</p>
              <p className="text-sm text-slate-800">
                {selected.yearsExperience ?? "Not recorded"} years
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Service area
              </p>
              <p className="text-sm text-slate-800">
                {[
                  addressValue(selected, "subdistrict"),
                  selected.serviceDistrict,
                  selected.serviceProvince,
                  selected.servicePostalCode,
                ]
                  .filter(Boolean)
                  .join(", ") || "Not recorded"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Matching eligibility
              </p>
              <p className="text-sm text-slate-800">
                {eligibilityLabel(selected.matchingEligibility)}
              </p>
              {selected.matchingEligibility?.kycValidUntil ? (
                <p className="text-xs text-slate-500">
                  KYC valid until{" "}
                  {new Date(
                    selected.matchingEligibility.kycValidUntil,
                  ).toLocaleDateString()}
                </p>
              ) : null}
              {(selected.matchingEligibility?.reasons || []).map((reason) => (
                <p key={reason} className="text-xs text-amber-700">
                  {eligibilityReason(reason)}
                </p>
              ))}
            </div>
            {selectedSummary?.recentIncidents?.length ? (
              <div className="sm:col-span-2 xl:col-span-4">
                <p className="text-xs font-semibold text-slate-500">
                  Recent declines and cancellations
                </p>
                <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {selectedSummary.recentIncidents.map((incident, index) => (
                    <div
                      key={`${incident.orderId}-${incident.eventType}-${incident.createdAt}-${index}`}
                      className="grid gap-1 px-3 py-2 text-sm md:grid-cols-[180px_1fr_180px]"
                    >
                      <span className="font-semibold text-slate-800">
                        {incident.eventType === "PARTNER_DECLINE"
                          ? "Partner decline"
                          : "Customer cancellation"}
                      </span>
                      <span className="text-slate-700">
                        {incident.reason || "No reason supplied"}
                      </span>
                      <span className="text-slate-500">
                        {new Date(incident.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="sm:col-span-2 xl:col-span-4">
              <p className="text-xs font-semibold text-slate-500">Profile</p>
              <p className="text-sm text-slate-800">
                {selected.bio ||
                  selected.description ||
                  selected.pastExperience ||
                  "Not recorded"}
              </p>
            </div>
            <div className="sm:col-span-2 xl:col-span-4">
              <p className="text-xs font-semibold text-slate-500">Services</p>
              <p className="text-sm text-slate-800">
                {(selected.skills || [])
                  .map((skill) => skill.name || skill.category)
                  .filter(Boolean)
                  .join(", ") || "Not recorded"}
              </p>
            </div>
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
                Qualification submission v{submission.version} |{" "}
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
                    {evaluation.recommendedTier || "No recommendation"} |
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
