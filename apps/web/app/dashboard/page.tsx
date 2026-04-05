"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

const STATUS_LABELS: Record<string, string> = {
  CREATED: "รอดำเนินการ",
  MATCHING: "กำลังจับคู่ช่าง",
  ASSIGNED: "จับคู่ช่างแล้ว",
  DEPOSIT_PENDING: "รอชำระมัดจำ",
  CONFIRMED: "ยืนยันแล้ว",
  IN_PROGRESS: "กำลังดำเนินงาน",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
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
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        แดชบอร์ด (Dashboard)
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          label="งานทั้งหมด"
          value={stats?.totalOrders ?? "—"}
          icon="📋"
          loading={loading}
        />
        <StatCard
          label="กำลังดำเนินการ"
          value={stats?.activeOrders ?? "—"}
          icon="🔄"
          color="text-blue-600"
          loading={loading}
        />
        <StatCard
          label="เสร็จสิ้นแล้ว"
          value={stats?.completedOrders ?? "—"}
          icon="✅"
          color="text-green-600"
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          href="/booking/household"
          className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition"
        >
          <span className="text-2xl">🏠</span>
          <div>
            <p className="font-semibold text-blue-900">จองงานซ่อมบ้าน</p>
            <p className="text-sm text-blue-700">ประปา ไฟฟ้า แอร์ และอื่น ๆ</p>
          </div>
        </Link>
        <Link
          href="/booking/project"
          className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition"
        >
          <span className="text-2xl">💼</span>
          <div>
            <p className="font-semibold text-indigo-900">จองงานโปรเจกต์</p>
            <p className="text-sm text-indigo-700">เว็บไซต์ การตลาด ที่ปรึกษา</p>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            งานล่าสุด (Recent Orders)
          </h2>
          <Link
            href="/dashboard/orders"
            className="text-sm text-blue-600 hover:underline"
          >
            ดูทั้งหมด →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">ยังไม่มีงาน</p>
            <Link
              href="/services"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              ดูบริการทั้งหมด
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
                          ด่วน
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                      {order.description}
                    </p>
                    {order.fixer?.user?.name && (
                      <p className="text-xs text-gray-400 mt-1">
                        ช่าง: {order.fixer.user.name}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}`}
                  >
                    {STATUS_LABELS[order.status] || order.status}
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
