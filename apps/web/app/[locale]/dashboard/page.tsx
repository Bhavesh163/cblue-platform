"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
}

interface Order {
  id: string;
  serviceCategory: string;
  description: string;
  status: string;
  orderType: string;
  isUrgent: boolean;
  scheduledAt: string | null;
  createdAt: string;
  fixer?: { user: { name: string } } | null;
}

interface SubscriberInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: "bg-gray-100 text-gray-800",
  MATCHING: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  DEPOSIT_PENDING: "bg-orange-100 text-orange-800",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const locale = useLocale();
  const prefix = `/${locale}`;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscriber, setSubscriber] = useState<SubscriberInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          fetch(`${API_BASE}/api/dashboard/stats`, { credentials: "include" }),
          fetch(`${API_BASE}/api/orders?limit=5`, { credentials: "include" }),
        ]);

        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrders(data.orders || []);
        }
      } catch {
        // API not available — show demo state
      }

      // Load subscriber info from localStorage
      try {
        const stored = localStorage.getItem("subscriber");
        if (stored) {
          setSubscriber(JSON.parse(stored));
        }
      } catch {
        // ignore parse errors
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t("title")}
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          label={t("orders")}
          value={stats?.totalOrders ?? "—"}
          icon="📋"
          loading={loading}
        />
        <StatCard
          label={t("active")}
          value={stats?.activeOrders ?? "—"}
          icon="🔄"
          color="text-blue-600"
          loading={loading}
        />
        <StatCard
          label={t("completed")}
          value={stats?.completedOrders ?? "—"}
          icon="✅"
          color="text-green-600"
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href={`${prefix}/booking/household`}
          className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition"
        >
          <span className="text-2xl">🏠</span>
          <div>
            <p className="font-semibold text-blue-900">{t("bookHousehold")}</p>
            <p className="text-sm text-blue-700">{t("bookHouseholdDesc")}</p>
          </div>
        </Link>
        <Link
          href={`${prefix}/booking/project`}
          className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition"
        >
          <span className="text-2xl">💼</span>
          <div>
            <p className="font-semibold text-indigo-900">{t("bookProject")}</p>
            <p className="text-sm text-indigo-700">{t("bookProjectDesc")}</p>
          </div>
        </Link>
        <Link
          href={`${prefix}/booking/professional`}
          className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition"
        >
          <span className="text-2xl">👔</span>
          <div>
            <p className="font-semibold text-emerald-900">{t("bookProfessional")}</p>
            <p className="text-sm text-emerald-700">{t("bookProfessionalDesc")}</p>
          </div>
        </Link>
      </div>

      {/* Subscription Status */}
      {subscriber && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("subscriptionStatus")}
            </h2>
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${
                subscriber.status === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : subscriber.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-700"
              }`}
            >
              {t(`subStatus.${subscriber.status}`)}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t("subName")}:</span>{" "}
              <span className="font-medium text-gray-900">{subscriber.name}</span>
            </div>
            <div>
              <span className="text-gray-500">{t("subEmail")}:</span>{" "}
              <span className="font-medium text-gray-900">{subscriber.email}</span>
            </div>
            <div>
              <span className="text-gray-500">{t("subPhone")}:</span>{" "}
              <span className="font-medium text-gray-900">{subscriber.phone}</span>
            </div>
            {subscriber.company && (
              <div>
                <span className="text-gray-500">{t("subCompany")}:</span>{" "}
                <span className="font-medium text-gray-900">{subscriber.company}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!subscriber && !loading && (
        <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-sky-900">{t("subscriptionCta")}</h2>
              <p className="text-sm text-sky-700 mt-1">{t("subscriptionCtaDesc")}</p>
            </div>
            <Link
              href={`${prefix}/subscription/login`}
              className="px-5 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition text-sm font-semibold whitespace-nowrap"
            >
              {t("subscriptionLogin")}
            </Link>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("recentOrders")}
          </h2>
          <Link
            href={`${prefix}/dashboard/orders`}
            className="text-sm text-blue-600 hover:underline"
          >
            {t("viewAll")}
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">{tc("loading")}</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">{t("noOrders")}</p>
            <Link
              href={`${prefix}/services`}
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {t("viewServices")}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {orders.map((order) => (
              <li key={order.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {order.serviceCategory}
                      {order.isUrgent && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {t("urgent")}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                      {order.description}
                    </p>
                    {order.fixer?.user?.name && (
                      <p className="text-xs text-gray-400 mt-1">
                        {t("fixer")}: {order.fixer.user.name}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}`}
                  >
                    {t(`statusLabels.${order.status}`)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color = "text-gray-900",
  loading,
}: {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>
        {loading ? "…" : value}
      </p>
    </div>
  );
}
