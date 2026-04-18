"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { getApiUrl } from "../../lib/api";

interface Order {
  id: string;
  serviceCategory: string;
  description: string;
  status: string;
  orderType: string;
  isUrgent: boolean;
  scheduledAt: string | null;
  estimatedPrice: number | null;
  finalPrice: number | null;
  createdAt: string;
  fixer?: { user: { name: string } } | null;
  address?: { province: string; district: string } | null;
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

const STATUS_STEPS = [
  "CREATED",
  "MATCHING",
  "ASSIGNED",
  "DEPOSIT_PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
];



export default function OrdersPage() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const locale = useLocale();
  const prefix = `/${locale}`;

  const dateFmtLocale = locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-US";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch(getApiUrl("/orders"), {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const filtered =
    statusFilter === "ALL"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link href={`${prefix}/dashboard`} className="hover:underline">
          {t("title")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{t("myOrders")}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t("myOrders")}
      </h1>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { value: "ALL", label: t("allOrders") },
          { value: "IN_PROGRESS", label: t("inProgress") },
          { value: "COMPLETED", label: t("completed") },
          { value: "CANCELLED", label: t("cancelled") },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              statusFilter === tab.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="bg-white border rounded-xl p-8 text-center text-gray-500">
              {tc("loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border rounded-xl p-8 text-center">
              <p className="text-gray-500 mb-4">{t("noOrdersFound")}</p>
              <Link
                href={`${prefix}/services`}
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {t("bookService")}
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((order) => (
                <li
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition hover:shadow-md ${
                    selectedOrder?.id === order.id
                      ? "ring-2 ring-blue-500"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {order.serviceCategory}
                      {order.isUrgent && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {t("urgent")}
                        </span>
                      )}
                    </h3>
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[order.status] || "bg-gray-100"}`}
                    >
                      {t(`statusLabels.${order.status}`)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {order.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>
                      {new Date(order.createdAt).toLocaleDateString(dateFmtLocale)}
                    </span>
                    {order.address && (
                      <span>
                        {order.address.district}, {order.address.province}
                      </span>
                    )}
                    {order.fixer?.user?.name && (
                      <span>{t("fixer")}: {order.fixer.user.name}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Order Detail / Progress */}
        <div className="lg:col-span-1">
          {selectedOrder ? (
            <div className="bg-white border rounded-xl p-5 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {t("orderDetail")}
              </h2>

              <dl className="space-y-3 text-sm mb-6">
                <div>
                  <dt className="text-gray-500">{t("type")}</dt>
                  <dd className="font-medium">
                    {selectedOrder.orderType === "HOUSEHOLD"
                      ? t("household")
                      : t("project")}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t("category")}</dt>
                  <dd className="font-medium">
                    {selectedOrder.serviceCategory}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t("details")}</dt>
                  <dd>{selectedOrder.description}</dd>
                </div>
                {selectedOrder.scheduledAt && (
                  <div>
                    <dt className="text-gray-500">{t("scheduledDate")}</dt>
                    <dd>
                      {new Date(selectedOrder.scheduledAt).toLocaleDateString(
                        dateFmtLocale,
                        { dateStyle: "long" },
                      )}
                    </dd>
                  </div>
                )}
                {selectedOrder.estimatedPrice && (
                  <div>
                    <dt className="text-gray-500">{t("estimatedPrice")}</dt>
                    <dd>฿{selectedOrder.estimatedPrice.toLocaleString()}</dd>
                  </div>
                )}
                {selectedOrder.finalPrice && (
                  <div>
                    <dt className="text-gray-500">{t("finalPrice")}</dt>
                    <dd className="font-bold text-green-700">
                      ฿{selectedOrder.finalPrice.toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Progress Tracker */}
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {t("statusProgress")}
              </h3>
              {selectedOrder.status === "CANCELLED" ? (
                <p className="text-sm text-red-600 font-medium">
                  {t("orderCancelled")}
                </p>
              ) : (
                <ol className="space-y-2">
                  {STATUS_STEPS.map((step, i) => {
                    const currentIdx = STATUS_STEPS.indexOf(
                      selectedOrder.status,
                    );
                    const isDone = i <= currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <li key={step} className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCurrent
                              ? "bg-blue-600 text-white"
                              : isDone
                                ? "bg-green-500 text-white"
                                : "bg-gray-200 text-gray-400"
                          }`}
                        >
                          {isDone && !isCurrent ? "✓" : i + 1}
                        </span>
                        <span
                          className={`text-sm ${isCurrent ? "font-semibold text-blue-700" : isDone ? "text-gray-700" : "text-gray-400"}`}
                        >
                          {t(`statusLabels.${step}`)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
              <p>{t("selectOrder")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
