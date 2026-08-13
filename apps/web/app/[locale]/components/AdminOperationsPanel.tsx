"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiUrl } from "../lib/api";
import { adminFetchResponse, readAdminResponseError } from "./adminApi";

type DemandGap = {
  id: string;
  service: string;
  bookingType?: string | null;
  requestText?: string | null;
  requestedServices?: Array<{
    canonicalKey?: string;
    quantity?: number;
    unit?: string;
  }> | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  status: string;
  occurrenceCount: number;
  lastSeenAt: string;
  assignedAdminId?: string | null;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
};
type Incident = {
  id: string;
  reference: string;
  workflowType: string;
  eventType: string;
  actorName: string;
  reason?: string | null;
  createdAt: string;
};
type Risk = {
  actorId: string;
  actorName: string;
  count: number;
  partnerDeclines: number;
  customerCancellations: number;
  reviewLevel: string;
  recommendation: string;
  lastOccurredAt?: string | null;
};
type RevenuePoint = { period: string; amount: number; count: number };
type IncidentPoint = {
  period: string;
  partnerDeclines: number;
  customerCancellations: number;
  total: number;
};
type RevenueDetail = {
  id: string;
  orderId: string;
  sourceLabel: string;
  amount: number;
  currency: string;
  method: string;
  customer?: string | null;
  partner?: string | null;
  paidAt: string;
};
type Overview = {
  generatedAt: string;
  windowDays: number;
  demandGaps: DemandGap[];
  incidents: Incident[];
  repeatRisk: Risk[];
  incidentSeries: {
    daily: IncidentPoint[];
    weekly: IncidentPoint[];
    monthly: IncidentPoint[];
  };
  demandOccurrences: Array<{
    id: string;
    service: string;
    district?: string | null;
    province?: string | null;
    occurredAt: string;
  }>;
  revenue: {
    currency: string;
    paymentRecords?: number;
    statusCounts?: {
      completed: number;
      pending: number;
      failed: number;
      refunded: number;
    };
    total: number;
    daily: RevenuePoint[];
    weekly: RevenuePoint[];
    monthly: RevenuePoint[];
    details: RevenueDetail[];
  };
};

const money = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});
const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function AdminOperationsPanel() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [grain, setGrain] = useState<"daily" | "weekly" | "monthly">("daily");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminFetchResponse(
        getApiUrl("/admin/operations/overview?days=90"),
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(
          await readAdminResponseError(
            response,
            "Unable to load operational analytics.",
          ),
        );
      }
      setOverview((await response.json()) as Overview);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load operational analytics.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const series = useMemo(
    () => overview?.revenue[grain] || [],
    [grain, overview?.revenue],
  );
  const maxAmount = useMemo(
    () => Math.max(1, ...series.map((point) => point.amount)),
    [series],
  );
  const demandByLocation = useMemo(() => {
    const counts = new Map<string, number>();
    for (const occurrence of overview?.demandOccurrences || []) {
      const location =
        [occurrence.district, occurrence.province].filter(Boolean).join(", ") ||
        "Location not supplied";
      counts.set(location, (counts.get(location) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [overview?.demandOccurrences]);
  const activeDemandGaps = useMemo(
    () =>
      (overview?.demandGaps || []).filter((gap) =>
        ["OPEN", "IN_PROGRESS"].includes(gap.status),
      ),
    [overview?.demandGaps],
  );
  const recentDemandOutcomes = useMemo(
    () =>
      (overview?.demandGaps || [])
        .filter((gap) => ["RESOLVED", "DISMISSED"].includes(gap.status))
        .slice(0, 20),
    [overview?.demandGaps],
  );

  async function updateGap(gap: DemandGap, status: string) {
    const note = notes[gap.id]?.trim() || "";
    if (status !== "OPEN" && note.length < 5) {
      setError("Enter a short assignment or resolution note first.");
      return;
    }
    setUpdating(gap.id);
    setError("");
    setNotice("");
    try {
      const response = await adminFetchResponse(
        getApiUrl("/admin/demand-gaps/" + gap.id),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, ...(note ? { note } : {}) }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await readAdminResponseError(
            response,
            "Unable to update the demand gap.",
          ),
        );
      }
      const updated = (await response.json()) as DemandGap;
      setOverview((current) =>
        current
          ? {
              ...current,
              demandGaps: current.demandGaps.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      setNotes((current) => ({ ...current, [gap.id]: "" }));
      setNotice(
        status === "IN_PROGRESS"
          ? "Demand review assigned and saved."
          : status === "RESOLVED"
            ? "Demand gap resolved and saved."
            : "Demand gap dismissed and saved.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update the demand gap.",
      );
    } finally {
      setUpdating("");
    }
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            Operations and revenue
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Persisted payments, unmatched demand, declines, and cancellations
            from CBLUE.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh operations"}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          {notice}
        </p>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-950">Recognized revenue</h3>
            <p className="text-sm text-slate-600">
              Completed payment records only. Free passes are excluded.
            </p>
          </div>
          <div className="flex rounded-lg border border-slate-300 p-1">
            {(["daily", "weekly", "monthly"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setGrain(item)}
                className={
                  (grain === item
                    ? "bg-emerald-700 text-white"
                    : "text-slate-700 hover:bg-slate-50") +
                  " rounded-md px-3 py-1.5 text-xs font-semibold capitalize"
                }
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 text-2xl font-bold text-slate-950">
          {money.format(overview?.revenue.total || 0)}
        </p>
        <div className="mt-4 grid gap-3 border-y border-slate-200 py-3 sm:grid-cols-2 xl:grid-cols-5">
          <p className="text-sm text-slate-600">
            Payment records
            <strong className="ml-2 text-slate-950">
              {overview?.revenue.paymentRecords || 0}
            </strong>
          </p>
          <p className="text-sm text-slate-600">
            Completed
            <strong className="ml-2 text-slate-950">
              {overview?.revenue.statusCounts?.completed || 0}
            </strong>
          </p>
          <p className="text-sm text-slate-600">
            Pending
            <strong className="ml-2 text-slate-950">
              {overview?.revenue.statusCounts?.pending || 0}
            </strong>
          </p>
          <p className="text-sm text-slate-600">
            Failed
            <strong className="ml-2 text-slate-950">
              {overview?.revenue.statusCounts?.failed || 0}
            </strong>
          </p>
          <p className="text-sm text-slate-600">
            Refunded
            <strong className="ml-2 text-slate-950">
              {overview?.revenue.statusCounts?.refunded || 0}
            </strong>
          </p>
        </div>
        <div
          className="mt-5 flex min-h-44 items-end gap-2 overflow-x-auto border-b border-slate-200 pb-2"
          aria-label={`${grain} revenue chart`}
        >
          {series.length ? (
            series.map((point) => (
              <div
                key={point.period}
                className="flex min-w-16 flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-xs font-semibold text-slate-700">
                  {money.format(point.amount)}
                </span>
                <div
                  className="w-full max-w-20 rounded-t bg-emerald-600"
                  style={{
                    height: Math.max(
                      4,
                      Math.round((point.amount / maxAmount) * 110),
                    ),
                  }}
                />
                <span className="text-[11px] text-slate-600">
                  {point.period}
                </span>
              </div>
            ))
          ) : (
            <p className="self-center text-sm text-slate-500">
              No completed payments in this reporting window.
            </p>
          )}
        </div>
        {!!overview?.revenue.details.length && (
          <div className="mt-5 max-h-[480px] overflow-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Paid at</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Partner</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.revenue.details.slice(0, 25).map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap py-3 pr-4 text-slate-600">
                      {dateTime.format(new Date(row.paidAt))}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">
                      {row.sourceLabel}
                      <p className="text-xs font-normal text-slate-500">
                        {row.orderId} / {row.method}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {row.customer || "-"}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {row.partner || "-"}
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-900">
                      {money.format(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <h3 className="font-bold text-slate-950">Unmatched service demand</h3>
          <p className="text-sm text-slate-600">
            Zero-result requests recorded by the authoritative CBLUE matcher,
            grouped by exact request and location.
          </p>
        </div>
        {demandByLocation.length > 0 && (
          <div
            className="mb-5 flex min-h-36 items-end gap-2 overflow-x-auto border-b border-slate-200 pb-2"
            aria-label="unmatched demand by location chart"
          >
            {demandByLocation.map((row) => {
              const maxCount = Math.max(
                ...demandByLocation.map((item) => item.count),
              );
              return (
                <div
                  key={row.location}
                  className="flex min-w-24 flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-[11px] font-semibold text-slate-700">
                    {row.count}
                  </span>
                  <div
                    className="w-full max-w-16 rounded-t bg-sky-600"
                    style={{
                      height: Math.max(
                        4,
                        Math.round((row.count / maxCount) * 90),
                      ),
                    }}
                  />
                  <span className="max-w-24 truncate text-[10px] text-slate-600">
                    {row.location}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {activeDemandGaps.length ? (
          <div className="max-h-[560px] overflow-auto">
            <table className="min-w-[1180px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Request</th>
                  <th className="py-2 pr-4">Location</th>
                  <th className="py-2 pr-4">Demand</th>
                  <th className="py-2 pr-4">Last seen</th>
                  <th className="py-2">Operations action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeDemandGaps.map((gap) => (
                  <tr key={gap.id}>
                    <td className="max-w-xl py-3 pr-4 align-top">
                      <p className="font-semibold text-slate-900">
                        {gap.service}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {gap.requestText || "No request detail supplied"}
                      </p>
                    </td>
                    <td className="py-3 pr-4 align-top text-slate-700">
                      {[gap.district, gap.province, gap.postalCode]
                        .filter(Boolean)
                        .join(", ") || "Not supplied"}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <span className="font-semibold text-slate-900">
                        {gap.occurrenceCount}
                      </span>
                      <p className="text-xs text-slate-500">
                        {gap.status.replaceAll("_", " ")}
                      </p>
                      {gap.resolutionNote && (
                        <p className="mt-1 max-w-64 text-xs text-slate-600">
                          {gap.resolutionNote}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 align-top text-slate-600">
                      {dateTime.format(new Date(gap.lastSeenAt))}
                    </td>
                    <td className="min-w-80 py-3 align-top">
                      <input
                        value={notes[gap.id] || ""}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [gap.id]: event.target.value,
                          }))
                        }
                        placeholder="Assignment or resolution note"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            updating === gap.id || gap.status === "IN_PROGRESS"
                          }
                          onClick={() => void updateGap(gap, "IN_PROGRESS")}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          {gap.status === "IN_PROGRESS"
                            ? "Review assigned"
                            : "Assign review"}
                        </button>
                        <button
                          type="button"
                          disabled={updating === gap.id}
                          onClick={() => void updateGap(gap, "RESOLVED")}
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          disabled={updating === gap.id}
                          onClick={() => void updateGap(gap, "DISMISSED")}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600"
                        >
                          Dismiss
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
            No unmatched service demand is currently open.
          </p>
        )}
        {recentDemandOutcomes.length > 0 && (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <h4 className="font-bold text-slate-900">Recent outcomes</h4>
            <div className="mt-3 max-h-72 overflow-auto">
              <table className="min-w-[880px] w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Request</th>
                    <th className="py-2 pr-4">Location</th>
                    <th className="py-2 pr-4">Outcome</th>
                    <th className="py-2">Saved note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDemandOutcomes.map((gap) => (
                    <tr key={gap.id}>
                      <td className="py-3 pr-4 font-semibold text-slate-900">
                        {gap.service}
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {[gap.district, gap.province, gap.postalCode]
                          .filter(Boolean)
                          .join(", ") || "Not supplied"}
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {gap.status.replaceAll("_", " ")}
                      </td>
                      <td className="py-3 text-slate-700">
                        {gap.resolutionNote || "No note recorded"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-950">
          Declines and cancellations over time
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Counts are grouped from persisted workflow events; no client-side
          reconstruction.
        </p>
        <div className="max-h-[560px] overflow-y-auto pr-1">
          <div
            className="mt-4 flex min-h-36 items-end gap-2 overflow-x-auto border-b border-slate-200 pb-2"
            aria-label="daily decline and cancellation chart"
          >
            {(overview?.incidentSeries.daily || []).map((row) => {
              const maxTotal = Math.max(
                1,
                ...(overview?.incidentSeries.daily || []).map(
                  (item) => item.total,
                ),
              );
              return (
                <div
                  key={row.period}
                  className="flex min-w-20 flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-[11px] font-semibold text-slate-700">
                    {row.total}
                  </span>
                  <div
                    className="w-full max-w-16 rounded-t bg-amber-500"
                    style={{
                      height: Math.max(
                        4,
                        Math.round((row.total / maxTotal) * 90),
                      ),
                    }}
                  />
                  <span className="text-[10px] text-slate-600">
                    {row.period}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Period</th>
                  <th className="py-2 pr-4">Partner declines</th>
                  <th className="py-2 pr-4">Customer cancellations</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(overview?.incidentSeries.daily || []).map((row) => (
                  <tr key={row.period}>
                    <td className="py-3 pr-4 font-semibold text-slate-800">
                      {row.period}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {row.partnerDeclines}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {row.customerCancellations}
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-900">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!overview?.incidentSeries.daily.length && (
              <p className="py-4 text-sm text-slate-500">
                No persisted incidents in this reporting window.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-slate-950">Repeat-pattern review</h3>
          <p className="mb-4 text-sm text-slate-600">
            Operational review guidance only. No account is restricted
            automatically.
          </p>
          {overview?.repeatRisk.length ? (
            <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
              {overview.repeatRisk.slice(0, 12).map((risk) => (
                <div key={risk.actorId} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold text-slate-900">
                      {risk.actorName}
                    </p>
                    <span className="text-xs font-bold text-slate-600">
                      {risk.reviewLevel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {risk.partnerDeclines} partner declines /{" "}
                    {risk.customerCancellations} customer cancellations
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {risk.recommendation}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No repeat patterns in this reporting window.
            </p>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-slate-950">
            Decline and cancellation ledger
          </h3>
          <p className="mb-4 text-sm text-slate-600">
            Persisted participant action, reason when supplied, and server
            timestamp.
          </p>
          {overview?.incidents.length ? (
            <div className="max-h-[520px] overflow-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-slate-200 bg-white text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Actor</th>
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.incidents.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap py-3 pr-4 text-slate-600">
                        {dateTime.format(new Date(row.createdAt))}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-900">
                        {row.actorName}
                        <p className="text-xs font-normal text-slate-500">
                          {row.reference}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {row.eventType.replaceAll("_", " ")}
                      </td>
                      <td className="py-3 text-slate-700">
                        {row.reason || "No reason recorded"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No decline or cancellation events in this reporting window.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
