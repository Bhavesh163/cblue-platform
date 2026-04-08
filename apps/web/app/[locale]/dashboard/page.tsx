"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";

interface SubscriberInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

const DEMO_ACTIVE = [
  { id: "as-1", type: "household" as const, service: "Plumbing Repair", serviceTh: "ซ่อมประปา", fixer: "Fixer-1042", tier: "Standard", status: "IN_PROGRESS", date: "2026-04-10", progress: 60 },
  { id: "as-2", type: "professional" as const, service: "Architect Consult", serviceTh: "ปรึกษาสถาปนิก", fixer: "Pro-3087", tier: "Corporate", status: "CONFIRMED", date: "2026-04-12", progress: 20 },
  { id: "as-3", type: "project" as const, service: "Smart Home Setup", serviceTh: "ติดตั้งสมาร์ทโฮม", fixer: "Team-5512", tier: "Specialist", status: "DEPOSIT_PENDING", date: "2026-04-15", progress: 10 },
];

const DEMO_HISTORY = [
  { id: "h-1", type: "household" as const, service: "Electrical", fixer: "Fixer-0921", tier: "Economy", date: "2026-03-15", rating: 4.8, fee: "฿200" },
  { id: "h-2", type: "project" as const, service: "Website Dev", fixer: "Team-4401", tier: "Corporate", date: "2026-03-01", rating: 4.9, fee: "฿600" },
  { id: "h-3", type: "professional" as const, service: "Lawyer", fixer: "Pro-1100", tier: "Expert", date: "2026-02-10", rating: 5.0, fee: "฿1,000" },
  { id: "h-4", type: "household" as const, service: "AC Maintenance", fixer: "Fixer-2200", tier: "Standard", date: "2026-01-20", rating: 4.5, fee: "฿400" },
];

const DEMO_NOTIFICATIONS = [
  { id: "n1", msg: "Fixer-1042 is on the way to your location", msgTh: "Fixer-1042 กำลังเดินทางมาที่ตำแหน่งของคุณ", time: "5m ago", dot: "bg-sky-500", unread: true },
  { id: "n2", msg: "Payment for Architect Consult confirmed", msgTh: "ยืนยันการชำระเงินปรึกษาสถาปนิก", time: "1h ago", dot: "bg-green-500", unread: true },
  { id: "n3", msg: "Rate your Electrical service with Fixer-0921", msgTh: "ให้คะแนนบริการไฟฟ้ากับ Fixer-0921", time: "2d ago", dot: "bg-amber-500", unread: false },
  { id: "n4", msg: "Welcome to CBLUE! Start booking now", msgTh: "ยินดีต้อนรับสู่ CBLUE! เริ่มจองเลย", time: "1w ago", dot: "bg-gray-400", unread: false },
];

const DEMO_CHATS = [
  { id: "c1", name: "Fixer-1042", service: "Plumbing", lastMsg: "On my way, ETA 15 min", lastMsgTh: "กำลังเดินทาง ถึงใน 15 นาที", time: "5m ago", unread: 2, online: true },
  { id: "c2", name: "Pro-3087", service: "Architect", lastMsg: "I've prepared the design draft", lastMsgTh: "เตรียมแบบร่างเรียบร้อยแล้ว", time: "2h ago", unread: 0, online: true },
  { id: "c3", name: "Team-5512", service: "Smart Home", lastMsg: "Waiting for your confirmation", lastMsgTh: "รอการยืนยันจากคุณ", time: "1d ago", unread: 1, online: false },
];

const ICON_MAP = { household: "🏠", project: "💼", professional: "👔", property: "🏢" };
const STATUS_STYLE: Record<string, string> = {
  IN_PROGRESS: "bg-purple-100 text-purple-700",
  CONFIRMED: "bg-green-100 text-green-700",
  DEPOSIT_PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  MATCHING: "bg-yellow-100 text-yellow-700",
};
const TIER_STYLE: Record<string, string> = {
  Economy: "bg-green-50 text-green-700",
  Standard: "bg-blue-50 text-blue-700",
  Corporate: "bg-purple-50 text-purple-700",
  Specialist: "bg-amber-50 text-amber-700",
  Expert: "bg-red-50 text-red-700",
};

type TabKey = "overview" | "bookings" | "history" | "chat" | "notifications";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const prefix = `/${locale}`;

  const [subscriber, setSubscriber] = useState<SubscriberInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("subscriber");
      if (stored) setSubscriber(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: "overview", label: locale === "th" ? "ภาพรวม" : "Overview", icon: "📊" },
    { key: "bookings", label: locale === "th" ? "บริการปัจจุบัน" : "Active", icon: "⚡", badge: DEMO_ACTIVE.length },
    { key: "history", label: locale === "th" ? "ประวัติ" : "History", icon: "📜" },
    { key: "chat", label: locale === "th" ? "แชท" : "Chat", icon: "💬", badge: DEMO_CHATS.reduce((a, c) => a + c.unread, 0) },
    { key: "notifications", label: locale === "th" ? "แจ้งเตือน" : "Alerts", icon: "🔔", badge: DEMO_NOTIFICATIONS.filter(n => n.unread).length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30">
      {/* Hero Header with scenic background */}
      <div className="relative overflow-hidden">
        <Image src="/images/scenic-building.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/90 to-blue-800/80" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
              <p className="text-sky-200 text-sm mt-1">
                {locale === "th" ? "จัดการบริการ คำสั่ง แชท และข้อมูลบัญชีของคุณ" : "Manage your services, bookings, chat, and account"}
              </p>
            </div>
            {subscriber ? (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-2.5">
                <div className="w-10 h-10 rounded-full bg-sky-400/30 flex items-center justify-center text-white font-bold">{subscriber.name?.charAt(0) || "U"}</div>
                <div>
                  <p className="text-white text-sm font-semibold">{subscriber.name}</p>
                  <p className="text-sky-200 text-xs">{subscriber.email}</p>
                </div>
              </div>
            ) : !loading ? (
              <Link href={`${prefix}/subscription/login`} className="px-5 py-2.5 bg-white text-sky-700 rounded-xl font-semibold text-sm hover:bg-sky-50 transition shadow">
                {locale === "th" ? "เข้าสู่ระบบ" : "Log In"}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 pb-12">
        {/* Subscribe CTA (when not logged in) */}
        {!subscriber && !loading && (
          <div className="bg-gradient-to-r from-sky-600 to-blue-700 rounded-2xl p-8 mb-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold">{locale === "th" ? "เริ่มต้นกับ CBLUE" : "Get Started with CBLUE"}</h2>
                <p className="text-sky-100 mt-2">{locale === "th" ? "เข้าถึงช่างซ่อมบ้าน ทีมโครงการ มืออาชีพ และอสังหาริมทรัพย์ที่ผ่านการตรวจสอบ" : "Access verified fixers, project teams, professionals, and properties"}</p>
              </div>
              <div className="flex gap-3">
                <Link href={`${prefix}/subscription/login`} className="px-6 py-3 bg-white text-sky-700 rounded-xl font-bold text-sm hover:bg-sky-50 transition shadow-lg whitespace-nowrap">
                  {locale === "th" ? "เข้าสู่ระบบ" : "Log In"}
                </Link>
                <Link href={`${prefix}/subscription/register`} className="px-6 py-3 border-2 border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition whitespace-nowrap">
                  {locale === "th" ? "สมัครสมาชิก" : "Register"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Book - 4 Services */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { href: `${prefix}/booking/household`, icon: "🏠", label: locale === "th" ? "จองช่างซ่อมบ้าน" : "Book Fixer", desc: locale === "th" ? "ประปา ไฟฟ้า แอร์" : "Plumbing, Electrical, AC", color: "from-sky-500 to-blue-600" },
            { href: `${prefix}/booking/project`, icon: "💼", label: locale === "th" ? "จองทีมโครงการ" : "Book Project Team", desc: locale === "th" ? "เว็บ AI สมาร์ทโฮม" : "Web, AI, Smart Home", color: "from-indigo-500 to-purple-600" },
            { href: `${prefix}/booking/professional`, icon: "👔", label: locale === "th" ? "จองมืออาชีพ" : "Book Professional", desc: locale === "th" ? "ทนาย สถาปนิก วิศวกร" : "Lawyer, Architect, Engineer", color: "from-emerald-500 to-teal-600" },
            { href: `${prefix}/properties`, icon: "🏢", label: locale === "th" ? "อสังหาริมทรัพย์" : "Book Property", desc: locale === "th" ? "ซื้อ ขาย เช่า" : "Buy, Sell, Rent", color: "from-amber-500 to-orange-600" },
          ].map((s) => (
            <Link key={s.href} href={s.href} className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
              <div className={`h-2 bg-gradient-to-r ${s.color}`} />
              <div className="p-5">
                <span className="text-3xl block mb-2">{s.icon}</span>
                <h3 className="font-bold text-gray-900 text-sm">{s.label}</h3>
                <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.key ? "bg-sky-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
              {tab.badge ? (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? "bg-white/30 text-white" : "bg-red-100 text-red-700"}`}>{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && <OverviewTab locale={locale} prefix={prefix} subscriber={subscriber} />}
        {activeTab === "bookings" && <BookingsTab locale={locale} />}
        {activeTab === "history" && <HistoryTab locale={locale} />}
        {activeTab === "chat" && <ChatTab locale={locale} />}
        {activeTab === "notifications" && <NotificationsTab locale={locale} />}

        {/* Tier Comparison */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {locale === "th" ? "เปรียบเทียบระดับบริการ" : "Tier Comparison"}
          </h2>
          <p className="text-sm text-gray-500 mb-5">{locale === "th" ? "ค่าธรรมเนียมดำเนินการต่อการจับคู่" : "Processing fee per matching"}</p>
          <div className="grid grid-cols-5 gap-3">
            {[
              { name: "Economy", fee: "฿200", color: "border-green-200 bg-green-50", textColor: "text-green-700", desc: locale === "th" ? "บริการทั่วไป" : "Basic" },
              { name: "Standard", fee: "฿400", color: "border-blue-200 bg-blue-50", textColor: "text-blue-700", desc: locale === "th" ? "มาตรฐาน" : "Standard" },
              { name: "Corporate", fee: "฿600", color: "border-purple-200 bg-purple-50", textColor: "text-purple-700", desc: locale === "th" ? "องค์กร" : "Corporate" },
              { name: "Specialist", fee: "฿800", color: "border-amber-200 bg-amber-50", textColor: "text-amber-700", desc: locale === "th" ? "ผู้ชำนาญ" : "Specialist" },
              { name: "Expert", fee: "฿1,000", color: "border-red-200 bg-red-50", textColor: "text-red-700", desc: locale === "th" ? "ผู้เชี่ยวชาญ" : "Expert" },
            ].map((item) => (
              <div key={item.name} className={`rounded-xl border-2 p-4 text-center ${item.color}`}>
                <h3 className={`font-bold text-sm ${item.textColor}`}>{item.name}</h3>
                <p className={`text-2xl font-extrabold ${item.textColor} mt-1`}>{item.fee}</p>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== OVERVIEW TAB ===== */
function OverviewTab({ locale, prefix, subscriber }: { locale: string; prefix: string; subscriber: SubscriberInfo | null }) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: locale === "th" ? "บริการปัจจุบัน" : "Active", value: DEMO_ACTIVE.length, icon: "⚡", color: "text-sky-600" },
          { label: locale === "th" ? "เสร็จสิ้น" : "Completed", value: DEMO_HISTORY.length, icon: "✅", color: "text-green-600" },
          { label: locale === "th" ? "ข้อความใหม่" : "Messages", value: DEMO_CHATS.reduce((a, c) => a + c.unread, 0), icon: "💬", color: "text-indigo-600" },
          { label: locale === "th" ? "ความพึงพอใจ" : "Satisfaction", value: "4.8 ⭐", icon: "🏆", color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">{s.label}</span>
              <span className="text-xl">{s.icon}</span>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Profile Card (if subscriber) */}
      {subscriber && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">{subscriber.name?.charAt(0)}</div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{subscriber.name}</h3>
              <p className="text-sm text-gray-500">{subscriber.email} &middot; {subscriber.phone}</p>
              {subscriber.company && <p className="text-xs text-gray-400">{subscriber.company}</p>}
            </div>
            <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${subscriber.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{subscriber.status}</span>
          </div>
        </div>
      )}

      {/* Active Services Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">⚡ {locale === "th" ? "บริการที่กำลังดำเนินการ" : "Active Services"}</h2>
          <span className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-bold">{DEMO_ACTIVE.length}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {DEMO_ACTIVE.map((s) => (
            <div key={s.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition">
              <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-lg">{ICON_MAP[s.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? s.serviceTh : s.service}</p>
                <p className="text-xs text-gray-500">{s.fixer} &middot; {s.date}</p>
                {/* Progress bar */}
                <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-sky-500 h-1.5 rounded-full transition-all" style={{ width: `${s.progress}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[s.tier] || ""}`}>{s.tier}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[s.status] || ""}`}>{s.status.replace("_", " ")}</span>
                <button className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition">💬</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Notifications + Chat side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">🔔 {locale === "th" ? "การแจ้งเตือนล่าสุด" : "Recent Alerts"}</h3>
          <div className="space-y-2">
            {DEMO_NOTIFICATIONS.slice(0, 3).map((n) => (
              <div key={n.id} className={`flex items-center gap-3 p-3 rounded-lg ${n.unread ? "bg-sky-50 border border-sky-100" : "bg-gray-50"}`}>
                <span className={`w-2 h-2 rounded-full ${n.dot} flex-shrink-0`} />
                <p className="text-sm text-gray-700 flex-1">{locale === "th" ? n.msgTh : n.msg}</p>
                <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">💬 {locale === "th" ? "แชทล่าสุด" : "Recent Chats"}</h3>
          <div className="space-y-2">
            {DEMO_CHATS.map((c) => (
              <div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg ${c.unread > 0 ? "bg-sky-50 border border-sky-100" : "bg-gray-50"}`}>
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{c.name.slice(-4)}</div>
                  {c.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{c.name} <span className="text-gray-400 font-normal">· {c.service}</span></p>
                  <p className="text-xs text-gray-500 truncate">{locale === "th" ? c.lastMsgTh : c.lastMsg}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">{c.time}</span>
                  {c.unread > 0 && <span className="block mt-0.5 ml-auto w-5 h-5 bg-sky-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{c.unread}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">📜 {locale === "th" ? "ประวัติล่าสุด" : "Recent History"}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "บริการ" : "Service"}</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "ช่าง/มืออาชีพ" : "Fixer / Pro"}</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "ระดับ" : "Tier"}</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "คะแนน" : "Rating"}</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "ค่าบริการ" : "Fee"}</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "วันที่" : "Date"}</th>
            </tr></thead>
            <tbody>
              {DEMO_HISTORY.slice(0, 3).map((h) => (
                <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="py-3 px-4"><span className="mr-2">{ICON_MAP[h.type]}</span><span className="font-medium text-gray-900">{h.service}</span></td>
                  <td className="py-3 px-4 text-gray-600">{h.fixer}</td>
                  <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TIER_STYLE[h.tier] || ""}`}>{h.tier}</span></td>
                  <td className="py-3 px-4 text-center text-amber-600 font-semibold">{h.rating} ⭐</td>
                  <td className="py-3 px-4 text-center font-semibold text-gray-800">{h.fee}</td>
                  <td className="py-3 px-4 text-center text-gray-500">{h.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===== BOOKINGS TAB ===== */
function BookingsTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">⚡ {locale === "th" ? "บริการที่กำลังดำเนินการ" : "Active Services"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_ACTIVE.map((s) => (
          <div key={s.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center text-2xl">{ICON_MAP[s.type]}</div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{locale === "th" ? s.serviceTh : s.service}</h3>
                <p className="text-sm text-gray-500">{s.fixer} &middot; {s.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${TIER_STYLE[s.tier] || ""}`}>{s.tier}</span>
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLE[s.status] || ""}`}>{s.status.replace("_", " ")}</span>
              </div>
            </div>
            {/* Progress */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-sky-500 h-2 rounded-full transition-all" style={{ width: `${s.progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{s.progress}% {locale === "th" ? "ดำเนินการแล้ว" : "completed"}</p>
              </div>
              <button className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition">💬 {locale === "th" ? "แชท" : "Chat"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== HISTORY TAB ===== */
function HistoryTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">📜 {locale === "th" ? "ประวัติการใช้บริการทั้งหมด" : "Full Service History"}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "บริการ" : "Service"}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "ช่าง/มืออาชีพ" : "Fixer / Pro"}</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "ระดับ" : "Tier"}</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "คะแนน" : "Rating"}</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "ค่าบริการ" : "Fee"}</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "วันที่" : "Date"}</th>
          </tr></thead>
          <tbody>
            {DEMO_HISTORY.map((h) => (
              <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                <td className="py-3 px-4"><span className="mr-2">{ICON_MAP[h.type]}</span><span className="font-medium text-gray-900">{h.service}</span></td>
                <td className="py-3 px-4 text-gray-600">{h.fixer}</td>
                <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TIER_STYLE[h.tier] || ""}`}>{h.tier}</span></td>
                <td className="py-3 px-4 text-center text-amber-600 font-semibold">{h.rating} ⭐</td>
                <td className="py-3 px-4 text-center font-semibold text-gray-800">{h.fee}</td>
                <td className="py-3 px-4 text-center text-gray-500">{h.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== CHAT TAB ===== */
function ChatTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">💬 {locale === "th" ? "แชทกับช่าง/มืออาชีพ" : "Chat with Fixers & Professionals"}</h2>
        <p className="text-xs text-gray-500 mt-1">{locale === "th" ? "แชทแบบไม่เปิดเผยตัวตนเพื่อความปลอดภัย" : "Anonymous chat for your safety"}</p>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_CHATS.map((c) => (
          <div key={c.id} className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition ${c.unread > 0 ? "bg-sky-50/50 hover:bg-sky-50" : "hover:bg-gray-50"}`}>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">{c.name.slice(-4)}</div>
              {c.online && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-900">{c.name}</p>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{c.service}</span>
              </div>
              <p className="text-sm text-gray-500 truncate mt-0.5">{locale === "th" ? c.lastMsgTh : c.lastMsg}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">{c.time}</p>
              {c.unread > 0 && (
                <span className="inline-flex items-center justify-center mt-1 w-5 h-5 bg-sky-600 text-white text-[10px] font-bold rounded-full">{c.unread}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== NOTIFICATIONS TAB ===== */
function NotificationsTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">🔔 {locale === "th" ? "การแจ้งเตือนทั้งหมด" : "All Notifications"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_NOTIFICATIONS.map((n) => (
          <div key={n.id} className={`flex items-center gap-4 px-6 py-4 transition ${n.unread ? "bg-sky-50/50" : "hover:bg-gray-50"}`}>
            <span className={`w-3 h-3 rounded-full ${n.dot} flex-shrink-0`} />
            <p className="text-sm text-gray-800 flex-1">{locale === "th" ? n.msgTh : n.msg}</p>
            <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
            {n.unread && <span className="w-2 h-2 bg-sky-500 rounded-full" />}
          </div>
        ))}
      </div>
    </div>
  );
}
