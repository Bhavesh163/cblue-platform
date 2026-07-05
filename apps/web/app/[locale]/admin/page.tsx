"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import ReCaptcha from "../components/ReCaptcha";
import { getApiUrl } from "../lib/api";

const ADMIN_TOKEN_KEY = "cblue_admin_token";
const ADMIN_USER_KEY = "cblue_admin_user";

const ACTIVE_ORDER_STATUSES = new Set([
  "CREATED",
  "MATCHING",
  "ASSIGNED",
  "DEPOSIT_PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "MEETING_REQUESTED",
]);

type AdminUser = {
  id: string;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  name?: string | null;
};

type DashboardStats = {
  totalUsers?: number;
  totalFixers?: number;
  pendingFixers?: number;
  totalOrders?: number;
  activeOrders?: number;
  completedOrders?: number;
};

type SkillRow = {
  name?: string | null;
  skillName?: string | null;
  category?: string | null;
};

type FixerRow = {
  id: string;
  tier?: string | null;
  aiTier?: string | null;
  status?: string | null;
  reviewStatus?: string | null;
  reviewReason?: string | null;
  rating?: number | null;
  completedJobs?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  user?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  skills?: SkillRow[] | null;
};

type OrderRow = {
  id: string;
  poNumber?: string | null;
  status?: string | null;
  serviceType?: string | null;
  description?: string | null;
  totalAmount?: number | string | null;
  budget?: number | string | null;
  createdAt?: string | null;
  user?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  fixer?: {
    user?: {
      name?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
  } | null;
};

type FraudFlag = {
  fixerId?: string | null;
  type?: string | null;
  detail?: string | null;
  user?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
};

type AdminPayload<T extends string, R> = {
  total?: number;
  page?: number;
  limit?: number;
} & Record<T, R[]>;

type AuthResponse = {
  accessToken?: string;
  user?: AdminUser;
};

type ApiError = Error & { status?: number };

function makeApiError(message: string, status?: number): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  return error;
}

async function readErrorMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  const message = payload?.message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}

async function postJson<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(getApiUrl(endpoint), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw makeApiError(await readErrorMessage(response, "Request failed"), response.status);
  }

  return response.json() as Promise<T>;
}

async function adminFetch<T>(endpoint: string, token: string): Promise<T> {
  const response = await fetch(getApiUrl(endpoint), {
    cache: "no-store",
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  if (!response.ok) {
    throw makeApiError(await readErrorMessage(response, "Admin request failed"), response.status);
  }

  return response.json() as Promise<T>;
}

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "-";
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFixerName(fixer: FixerRow) {
  return fixer.user?.name || fixer.user?.email || fixer.user?.phone || "Unnamed fixer";
}

function getCustomerName(order: OrderRow) {
  return order.user?.name || order.user?.email || order.user?.phone || "-";
}

function getProviderName(order: OrderRow) {
  return order.fixer?.user?.name || order.fixer?.user?.email || order.fixer?.user?.phone || "Unassigned";
}

function getSkillText(fixer: FixerRow) {
  const skills = fixer.skills || [];
  if (!skills.length) return "No skills recorded";
  return skills
    .map((skill) => skill.name || skill.skillName || skill.category || "")
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
}

function isAuthError(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && [401, 403].includes(Number((error as ApiError).status));
}

function StatusBadge({ value }: { value?: string | null }) {
  const normalized = String(value || "UNKNOWN");
  const tone = ACTIVE_ORDER_STATUSES.has(normalized)
    ? "bg-sky-50 text-sky-700 ring-sky-200"
    : normalized.includes("REVIEW") || normalized === "PENDING"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : normalized === "APPROVED" || normalized === "COMPLETED"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : "bg-slate-50 text-slate-700 ring-slate-200";

  return (
    <span className={"inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 " + tone}>
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{label}</p>;
}

export default function AdminPage() {
  const locale = useLocale();
  const router = useRouter();
  const prefix = "/" + locale;

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [token, setToken] = useState("");
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [consoleLoading, setConsoleLoading] = useState(false);
  const [consoleError, setConsoleError] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingFixers, setPendingFixers] = useState<FixerRow[]>([]);
  const [tierReviewFixers, setTierReviewFixers] = useState<FixerRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);

  const activeOrdersFromRows = useMemo(
    () => orders.filter((order) => ACTIVE_ORDER_STATUSES.has(String(order.status || ""))).length,
    [orders],
  );

  const clearAdminSession = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    setToken("");
    setAdminUser(null);
    setStats(null);
    setPendingFixers([]);
    setTierReviewFixers([]);
    setOrders([]);
    setFraudFlags([]);
  }, []);

  const loadConsole = useCallback(
    async (nextToken: string) => {
      setConsoleLoading(true);
      setConsoleError("");
      try {
        const [dashboardData, pendingData, tierData, ordersData, fraudData] = await Promise.all([
          adminFetch<DashboardStats>("/admin/dashboard", nextToken),
          adminFetch<AdminPayload<"fixers", FixerRow>>("/admin/fixers/pending?limit=8", nextToken),
          adminFetch<AdminPayload<"fixers", FixerRow>>("/admin/fixers/tier-review?limit=8", nextToken),
          adminFetch<AdminPayload<"orders", OrderRow>>("/admin/orders?limit=12", nextToken),
          adminFetch<AdminPayload<"flags", FraudFlag>>("/admin/fraud/flags", nextToken),
        ]);

        setStats(dashboardData);
        setPendingFixers(Array.isArray(pendingData.fixers) ? pendingData.fixers : []);
        setTierReviewFixers(Array.isArray(tierData.fixers) ? tierData.fixers : []);
        setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : []);
        setFraudFlags(Array.isArray(fraudData.flags) ? fraudData.flags : []);
      } catch (error) {
        if (isAuthError(error)) {
          clearAdminSession();
          setAuthError("Admin session expired. Please log in again.");
          return;
        }
        setConsoleError(error instanceof Error ? error.message : "Unable to load admin console.");
      } finally {
        setConsoleLoading(false);
      }
    },
    [clearAdminSession],
  );

  useEffect(() => {
    const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
    const storedUser = localStorage.getItem(ADMIN_USER_KEY);
    if (!storedToken) return;

    setToken(storedToken);
    if (storedUser) {
      try {
        setAdminUser(JSON.parse(storedUser) as AdminUser);
      } catch {
        localStorage.removeItem(ADMIN_USER_KEY);
      }
    }
    void loadConsole(storedToken);
  }, [loadConsole]);

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setAuthError("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setAuthError("Please enter a valid admin email address.");
      return;
    }
    if (!recaptchaToken) {
      setAuthError("Please complete reCAPTCHA before requesting the admin OTP.");
      return;
    }

    setAuthLoading(true);
    try {
      await postJson("/auth/admin/otp/send", {
        email: normalizedEmail,
        recaptchaToken,
      });
      setOtpSent(true);
      setOtp("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to send admin OTP.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();
    setAuthError("");

    if (!/^\d{6}$/.test(normalizedOtp)) {
      setAuthError("Please enter the 6-digit admin OTP.");
      return;
    }

    setAuthLoading(true);
    try {
      const data = await postJson<AuthResponse>("/auth/admin/otp/verify", {
        email: normalizedEmail,
        code: normalizedOtp,
      });
      if (!data.accessToken || data.user?.role !== "ADMIN") {
        throw new Error("Admin access required.");
      }

      localStorage.setItem(ADMIN_TOKEN_KEY, data.accessToken);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.user));
      setToken(data.accessToken);
      setAdminUser(data.user);
      setOtpSent(false);
      setRecaptchaToken("");
      await loadConsole(data.accessToken);
      router.replace(prefix + "/admin");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to verify admin OTP.");
    } finally {
      setAuthLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_420px]">
          <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <Link href={prefix} className="text-sm font-semibold text-sky-700 hover:text-sky-800">
              Back to CBLUE
            </Link>
            <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-950">Admin Control Center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Secure operations for CBLUE.co.th, fixer and pro review, fraud checks, active order monitoring, and BLUE workflow support. This page never renders mock admin data.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["ADMIN role only", "reCAPTCHA before OTP", "Live API records"].map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Admin login</h2>
            <p className="mt-1 text-sm text-slate-500">Use the email address of a CBLUE user with role ADMIN.</p>

            {authError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {authError}
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="mt-5 space-y-4" noValidate>
                <div>
                  <label htmlFor="admin-email" className="block text-sm font-semibold text-slate-700">
                    Admin email
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@example.com"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <ReCaptcha onVerify={setRecaptchaToken} onExpire={() => setRecaptchaToken("")} />
                </div>
                <button
                  type="submit"
                  disabled={authLoading || !recaptchaToken}
                  className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {authLoading ? "Sending OTP..." : "Send admin email OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4" noValidate>
                <div>
                  <label htmlFor="admin-otp" className="block text-sm font-semibold text-slate-700">
                    6-digit OTP
                  </label>
                  <input
                    id="admin-otp"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm tracking-[0.35em] outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading || otp.length !== 6}
                  className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {authLoading ? "Verifying..." : "Open admin console"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    setRecaptchaToken("");
                  }}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Use another email
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-700">CBLUE.co.th + BLUE service operations</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Admin Control Center</h1>
            <p className="mt-2 text-sm text-slate-500">
              Signed in as {adminUser?.name || adminUser?.email || adminUser?.phone || "admin"}. Protected by ADMIN role APIs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadConsole(token)}
              disabled={consoleLoading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {consoleLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={clearAdminSession}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Log out
            </button>
          </div>
        </header>

        {consoleError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {consoleError}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {[
            ["Users", stats?.totalUsers],
            ["Fixers", stats?.totalFixers],
            ["Pending", stats?.pendingFixers],
            ["Orders", stats?.totalOrders],
            ["Active", stats?.activeOrders ?? activeOrdersFromRows],
            ["Completed", stats?.completedOrders],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{formatNumber(Number(value ?? 0))}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Fixer tier review</h2>
                <p className="text-sm text-slate-500">Corporate, Specialist, and Expert tiers waiting for human evidence review.</p>
              </div>
              <StatusBadge value={tierReviewFixers.length ? "NEEDS REVIEW" : "CLEAR"} />
            </div>
            {tierReviewFixers.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Partner</th>
                      <th className="py-2 pr-3">Tier</th>
                      <th className="py-2 pr-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tierReviewFixers.map((fixer) => (
                      <tr key={fixer.id}>
                        <td className="py-3 pr-3 align-top font-semibold text-slate-900">
                          {getFixerName(fixer)}
                          <p className="mt-1 text-xs font-normal text-slate-500">{getSkillText(fixer)}</p>
                        </td>
                        <td className="py-3 pr-3 align-top"><StatusBadge value={fixer.tier || fixer.aiTier} /></td>
                        <td className="py-3 pr-3 align-top text-slate-600">{fixer.reviewReason || "Evidence review required"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState label="No upper-tier fixer review records returned by the admin API." />
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-950">Pending fixer and pro registrations</h2>
              <p className="text-sm text-slate-500">Human queue for new CBLUE fixer and pro approvals.</p>
            </div>
            {pendingFixers.length ? (
              <div className="space-y-3">
                {pendingFixers.map((fixer) => (
                  <div key={fixer.id} className="rounded-lg border border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{getFixerName(fixer)}</p>
                      <StatusBadge value={fixer.status || "PENDING"} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{getSkillText(fixer)}</p>
                    <p className="mt-2 text-xs text-slate-400">Submitted {formatDate(fixer.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No pending fixer registrations returned by the admin API." />
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-950">Fraud and credential flags</h2>
              <p className="text-sm text-slate-500">Signals that need admin judgement before promotion or public trust display.</p>
            </div>
            {fraudFlags.length ? (
              <div className="space-y-3">
                {fraudFlags.map((flag, index) => (
                  <div key={(flag.fixerId || "flag") + String(index)} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-amber-950">{flag.user?.name || flag.user?.phone || "Unknown partner"}</p>
                      <StatusBadge value={flag.type || "FLAG"} />
                    </div>
                    <p className="mt-1 text-sm text-amber-800">{flag.detail || "Review required"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No fraud flags returned by the admin API." />
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Orders and BLUE workflow feed</h2>
                <p className="text-sm text-slate-500">Latest real CBLUE orders used for CBLUE.co.th operations and BLUE service workflow support.</p>
              </div>
              <p className="text-xs font-semibold text-slate-500">No canceled, declined, or finished jobs are counted as active.</p>
            </div>
            {orders.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">PO / Order</th>
                      <th className="py-2 pr-3">Customer</th>
                      <th className="py-2 pr-3">Provider</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="py-3 pr-3 align-top font-semibold text-slate-900">
                          {order.poNumber || order.id}
                          <p className="mt-1 text-xs font-normal text-slate-500">{formatDate(order.createdAt)}</p>
                        </td>
                        <td className="py-3 pr-3 align-top text-slate-600">{getCustomerName(order)}</td>
                        <td className="py-3 pr-3 align-top text-slate-600">{getProviderName(order)}</td>
                        <td className="py-3 pr-3 align-top"><StatusBadge value={order.status} /></td>
                        <td className="py-3 pr-3 align-top text-slate-600">{formatMoney(order.totalAmount ?? order.budget)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState label="No order records returned by the admin API." />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
