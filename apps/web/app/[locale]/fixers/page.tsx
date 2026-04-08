"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";

interface PartnerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: string;
}

const DEMO_PARTNER_STATS = {
  activeJobs: 3,
  completedJobs: 47,
  monthlyEarnings: "฿18,500",
  rating: 4.8,
  responseRate: "96%",
  repeatClients: 12,
};

const DEMO_ACTIVE_JOBS = [
  { id: 1, service: "Plumbing Repair", serviceTh: "ซ่อมประปา", customer: "Customer #A2X", tier: "Standard", date: "2026-04-15", status: "IN_PROGRESS", progress: 65, earnings: "฿2,500" },
  { id: 2, service: "AC Maintenance", serviceTh: "ซ่อมแอร์", customer: "Customer #B7K", tier: "Corporate", date: "2026-04-16", status: "CONFIRMED", progress: 15, earnings: "฿4,000" },
  { id: 3, service: "Electrical Wiring", serviceTh: "งานไฟฟ้า", customer: "Customer #C4M", tier: "Economy", date: "2026-04-17", status: "PENDING", progress: 0, earnings: "฿1,800" },
];

const DEMO_INCOMING = [
  { id: 4, service: "Interior Design", serviceTh: "ออกแบบภายใน", customer: "Customer #D9P", tier: "Specialist", date: "2026-04-18", budget: "฿15,000", urgency: "normal" },
  { id: 5, service: "Landscaping", serviceTh: "จัดสวน", customer: "Customer #E3R", tier: "Expert", date: "2026-04-19", budget: "฿25,000", urgency: "urgent" },
  { id: 6, service: "Smart Lock Install", serviceTh: "ติดตั้งสมาร์ทล็อค", customer: "Customer #F1A", tier: "Corporate", date: "2026-04-20", budget: "฿8,000", urgency: "normal" },
];

const DEMO_EARNINGS = [
  { month: "Jan", amount: 12500 },
  { month: "Feb", amount: 15200 },
  { month: "Mar", amount: 18800 },
  { month: "Apr", amount: 18500 },
];

const DEMO_COMPLETED = [
  { id: "c1", service: "Pipe Installation", customer: "Customer #G2B", tier: "Standard", date: "2026-03-28", rating: 5.0, earnings: "฿3,200" },
  { id: "c2", service: "Wiring Overhaul", customer: "Customer #H8J", tier: "Corporate", date: "2026-03-15", rating: 4.9, earnings: "฿7,500" },
  { id: "c3", service: "Air Duct Cleaning", customer: "Customer #I5L", tier: "Economy", date: "2026-03-01", rating: 4.7, earnings: "฿1,500" },
  { id: "c4", service: "Full Renovation", customer: "Customer #J3N", tier: "Expert", date: "2026-02-20", rating: 5.0, earnings: "฿45,000" },
];

const DEMO_CHATS = [
  { id: "ch1", name: "Customer #A2X", service: "Plumbing", lastMsg: "Thank you, waiting for you", lastMsgTh: "ขอบคุณครับ รอช่างอยู่", time: "2m ago", unread: 2, online: true },
  { id: "ch2", name: "Customer #B7K", service: "AC", lastMsg: "Which day works for you?", lastMsgTh: "วันไหนสะดวกคะ?", time: "30m ago", unread: 1, online: true },
  { id: "ch3", name: "Customer #C4M", service: "Electrical", lastMsg: "Job is done, thanks!", lastMsgTh: "งานเสร็จแล้วครับ ขอบคุณ", time: "2h ago", unread: 0, online: false },
];

const DEMO_NOTIFICATIONS = [
  { id: "pn1", msg: "Customer #A2X sent a new message", msgTh: "ลูกค้า #A2X ส่งข้อความใหม่", time: "2m ago", dot: "bg-sky-500", unread: true },
  { id: "pn2", msg: "You have 3 new job requests", msgTh: "คุณมีคำขอใหม่ 3 รายการ", time: "15m ago", dot: "bg-amber-500", unread: true },
  { id: "pn3", msg: "Payment of ฿3,200 received", msgTh: "ได้รับเงิน ฿3,200", time: "1h ago", dot: "bg-green-500", unread: true },
  { id: "pn4", msg: "Customer #H8J rated you 5 stars", msgTh: "ลูกค้า #H8J ให้คะแนน 5 ดาว", time: "1d ago", dot: "bg-purple-500", unread: false },
  { id: "pn5", msg: "Your tier upgrade to Corporate is approved", msgTh: "อัปเกรดระดับเป็น Corporate อนุมัติแล้ว", time: "3d ago", dot: "bg-emerald-500", unread: false },
];

const STATUS_STYLE: Record<string, string> = {
  IN_PROGRESS: "bg-purple-100 text-purple-700",
  CONFIRMED: "bg-green-100 text-green-700",
  PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};
const TIER_STYLE: Record<string, string> = {
  Economy: "bg-green-50 text-green-700",
  Standard: "bg-blue-50 text-blue-700",
  Corporate: "bg-purple-50 text-purple-700",
  Specialist: "bg-amber-50 text-amber-700",
  Expert: "bg-red-50 text-red-700",
};

type TabKey = "overview" | "jobs" | "requests" | "history" | "chat" | "notifications";

export default function FixerProPage() {
  const t = useTranslations("nav");
  const ft = useTranslations("fixer");
  const locale = useLocale();
  const prefix = `/${locale}`;

  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  useEffect(() => {
    try {
      const sub = localStorage.getItem("subscriber");
      if (sub) setPartner(JSON.parse(sub));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const isSubscribed = !!partner;

  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: "overview", label: locale === "th" ? "ภาพรวม" : "Overview", icon: "📊" },
    { key: "jobs", label: locale === "th" ? "งานปัจจุบัน" : "Active Jobs", icon: "🔧", badge: DEMO_ACTIVE_JOBS.length },
    { key: "requests", label: locale === "th" ? "คำขอใหม่" : "Requests", icon: "📋", badge: DEMO_INCOMING.length },
    { key: "history", label: locale === "th" ? "ประวัติงาน" : "History", icon: "📜" },
    { key: "chat", label: locale === "th" ? "แชท" : "Chat", icon: "💬", badge: DEMO_CHATS.reduce((a, c) => a + c.unread, 0) },
    { key: "notifications", label: locale === "th" ? "แจ้งเตือน" : "Alerts", icon: "🔔", badge: DEMO_NOTIFICATIONS.filter(n => n.unread).length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <Image src="/images/scenic-house.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 to-purple-800/80" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {locale === "th" ? "พาร์ทเนอร์" : locale === "zh" ? "合作伙伴" : "Partner"}
              </h1>
              <p className="text-purple-200 text-sm mt-1">
                {locale === "th" ? "จัดการงาน คำขอ แชท รายได้ และโปรไฟล์" : "Manage jobs, requests, chat, earnings, and profile"}
              </p>
            </div>
            {partner ? (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-2.5">
                <div className="w-10 h-10 rounded-full bg-purple-400/30 flex items-center justify-center text-white font-bold">{partner.name?.charAt(0) || "P"}</div>
                <div>
                  <p className="text-white text-sm font-semibold">{partner.name}</p>
                  <p className="text-purple-200 text-xs">{partner.email}</p>
                </div>
              </div>
            ) : !loading ? (
              <Link href={`${prefix}/subscription/login`} className="px-5 py-2.5 bg-white text-purple-700 rounded-xl font-semibold text-sm hover:bg-purple-50 transition shadow">
                {locale === "th" ? "เข้าสู่ระบบ / สมัคร" : "Log In / Register"}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 pb-12">
        {/* Dashboard Area (when logged in) */}
        {isSubscribed && (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 mb-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    activeTab === tab.key ? "bg-purple-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"
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
            {activeTab === "overview" && <PartnerOverview locale={locale} partner={partner} />}
            {activeTab === "jobs" && <PartnerJobs locale={locale} />}
            {activeTab === "requests" && <PartnerRequests locale={locale} />}
            {activeTab === "history" && <PartnerHistory locale={locale} />}
            {activeTab === "chat" && <PartnerChat locale={locale} />}
            {activeTab === "notifications" && <PartnerNotifications locale={locale} />}

            <div className="my-10 border-t border-gray-200" />
          </>
        )}

        {/* Not logged in CTA */}
        {!isSubscribed && !loading && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold">{locale === "th" ? "เข้าสู่ระบบพาร์ทเนอร์" : "Partner Login"}</h2>
                <p className="text-purple-100 mt-2">{locale === "th" ? "รับงาน จัดการแดชบอร์ด และเพิ่มรายได้" : "Receive jobs, manage your dashboard, and grow earnings"}</p>
              </div>
              <div className="flex gap-3">
                <Link href={`${prefix}/subscription/login`} className="px-6 py-3 bg-white text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-50 transition shadow-lg whitespace-nowrap">
                  {locale === "th" ? "เข้าสู่ระบบ" : "Log In"}
                </Link>
                <Link href={`${prefix}/fixers/register`} className="px-6 py-3 border-2 border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition whitespace-nowrap">
                  {locale === "th" ? "สมัครสมาชิก" : "Register"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Registration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Register as Fixer & Pro */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition">
            <div className="h-2 bg-gradient-to-r from-sky-500 to-blue-600" />
            <div className="p-7">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-4 text-xl">🔧</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{locale === "th" ? "สมัครเป็นช่างและมืออาชีพ CBLUE" : "Register as CBLUE Fixer & Pro"}</h2>
              <p className="text-gray-500 text-sm mb-5">{locale === "th" ? "เข้าร่วมเครือข่ายช่างมืออาชีพ รับงานทั่วประเทศ" : "Join our professional network. Receive jobs nationwide."}</p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
                {[
                  locale === "th" ? "รับงานทั่วประเทศ" : "Receive jobs nationwide",
                  locale === "th" ? "KYC ยืนยันตัวตน" : "KYC identity verification",
                  locale === "th" ? "5 ระดับ Economy / Standard / Corporate / Specialist / Expert" : "5 tiers: Economy to Expert",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span> {item}</li>
                ))}
              </ul>
              <Link href={`${prefix}/fixers/register`} className="block text-center py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow transition">
                {locale === "th" ? "สมัครเป็นช่าง" : "Register as Fixer"}
              </Link>
            </div>
          </div>

          {/* List Property */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition">
            <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
            <div className="p-7">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4 text-xl">🏢</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{locale === "th" ? "ลงประกาศอสังหาริมทรัพย์" : "List New Property"}</h2>
              <p className="text-gray-500 text-sm mb-5">{locale === "th" ? "ลงประกาศขายหรือเช่าคอนโด บ้าน ทาวน์เฮาส์ ที่ดิน" : "List condo, house, townhouse, or land for sale or rent."}</p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
                {[
                  locale === "th" ? "เข้าถึงผู้ซื้อและผู้เช่าทั่วไทย" : "Reach buyers & renters nationwide",
                  locale === "th" ? "อัปโหลดรูปภาพและรายละเอียด" : "Upload photos & details",
                  locale === "th" ? "จัดการประกาศจากแดชบอร์ด" : "Manage listings from dashboard",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span> {item}</li>
                ))}
              </ul>
              <Link href={`${prefix}/properties/register`} className="block text-center py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow transition">
                {locale === "th" ? "ลงประกาศ" : "List Property"}
              </Link>
            </div>
          </div>
        </div>

        {/* Price List Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">
              {locale === "th" ? "ตารางราคาค่าประสานงาน" : "Processing Fee Price List"}
            </h2>
            <p className="text-gray-500 text-sm text-center mb-5">
              {locale === "th" ? "ค่าประสานงานที่ลูกค้าจ่ายต่อการจับคู่ 1 ครั้ง" : "One-time fee per fixer/professional matching"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ระดับ" : "Tier"}</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ค่าประสานงาน" : "Fee"}</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ระดับดาว" : "Stars"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "คุณสมบัติ" : "Qualifications"}</th>
                </tr></thead>
                <tbody>
                  {[
                    { tier: "Economy", fee: "฿200", stars: "⭐", qual: locale === "th" ? "ช่างทั่วไป ประสบการณ์เบื้องต้น" : "General fixer, basic experience", color: "bg-green-50 text-green-700" },
                    { tier: "Standard", fee: "฿400", stars: "⭐⭐", qual: locale === "th" ? "ช่างมีประสบการณ์ ผลงานดี" : "Experienced, good track record", color: "bg-blue-50 text-blue-700" },
                    { tier: "Corporate", fee: "฿600", stars: "⭐⭐⭐", qual: locale === "th" ? "ช่างมืออาชีพ หรือทีมงาน" : "Professional fixer or team", color: "bg-purple-50 text-purple-700" },
                    { tier: "Specialist", fee: "฿800", stars: "⭐⭐⭐⭐", qual: locale === "th" ? "ผู้เชี่ยวชาญเฉพาะทาง มีใบรับรอง" : "Certified specialist", color: "bg-amber-50 text-amber-700" },
                    { tier: "Expert", fee: "฿1,000", stars: "⭐⭐⭐⭐⭐", qual: locale === "th" ? "ผู้เชี่ยวชาญระดับสูง 10+ ปี" : "Senior expert, 10+ years", color: "bg-red-50 text-red-700" },
                  ].map((r) => (
                    <tr key={r.tier} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${r.color}`}>{r.tier}</span></td>
                      <td className="py-3 px-4 text-center font-bold text-gray-900">{r.fee}</td>
                      <td className="py-3 px-4 text-center">{r.stars}</td>
                      <td className="py-3 px-4 text-gray-600">{r.qual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              {locale === "th" ? "* ค่าประสานงานเป็นค่าบริการแพลตฟอร์ม ไม่รวมค่าจ้างช่าง" : "* Platform fee only, excludes fixer charges. Customers negotiate pricing directly."}
            </p>
          </div>
        </div>

        {/* Tier Qualification Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-600" />
          <div className="p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">
              {locale === "th" ? "คุณสมบัติระดับช่าง (Tier Qualification)" : "Tier Qualification Criteria"}
            </h2>
            <p className="text-gray-500 text-sm text-center mb-5">
              {locale === "th" ? "ระดับบริการกำหนดจากประสบการณ์ ผลงาน และใบรับรอง" : "Determined by experience, track record, and certifications"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ระดับ" : "Tier"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ประสบการณ์" : "Experience"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ผลงาน" : "Past Projects"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ใบรับรอง" : "Certifications"}</th>
                </tr></thead>
                <tbody>
                  {[
                    { tier: "Economy", exp: "1+ years", projects: locale === "th" ? "ไม่จำเป็น" : "Not required", certs: locale === "th" ? "ไม่จำเป็น" : "Not required", color: "bg-green-50 text-green-700" },
                    { tier: "Standard", exp: "3+ years", projects: "3+", certs: locale === "th" ? "แนะนำ" : "Recommended", color: "bg-blue-50 text-blue-700" },
                    { tier: "Corporate", exp: "5+ years", projects: "10+", certs: locale === "th" ? "จำเป็น" : "Required", color: "bg-purple-50 text-purple-700" },
                    { tier: "Specialist", exp: "7+ years", projects: "20+", certs: locale === "th" ? "จำเป็น + เฉพาะทาง" : "Required + specialized", color: "bg-amber-50 text-amber-700" },
                    { tier: "Expert", exp: "10+ years", projects: "50+", certs: locale === "th" ? "จำเป็น + ขั้นสูง" : "Required + advanced", color: "bg-red-50 text-red-700" },
                  ].map((r) => (
                    <tr key={r.tier} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${r.color}`}>{r.tier}</span></td>
                      <td className="py-3 px-4 text-gray-600">{r.exp}</td>
                      <td className="py-3 px-4 text-gray-600">{r.projects}</td>
                      <td className="py-3 px-4 text-gray-600">{r.certs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              {locale === "th" ? "* ช่างสามารถอัปเกรดระดับได้เมื่อมีคุณสมบัติครบถ้วน" : "* Fixers can upgrade their tier when qualifications are met."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== PARTNER OVERVIEW ===== */
function PartnerOverview({ locale, partner }: { locale: string; partner: PartnerInfo | null }) {
  const maxEarning = Math.max(...DEMO_EARNINGS.map(e => e.amount));
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: locale === "th" ? "งานปัจจุบัน" : "Active Jobs", value: DEMO_PARTNER_STATS.activeJobs, icon: "🔧", color: "text-sky-600" },
          { label: locale === "th" ? "เสร็จสิ้น" : "Completed", value: DEMO_PARTNER_STATS.completedJobs, icon: "✅", color: "text-green-600" },
          { label: locale === "th" ? "รายได้เดือนนี้" : "Monthly Earn", value: DEMO_PARTNER_STATS.monthlyEarnings, icon: "💰", color: "text-amber-600" },
          { label: locale === "th" ? "คะแนน" : "Rating", value: `${DEMO_PARTNER_STATS.rating} ⭐`, icon: "🏆", color: "text-purple-600" },
          { label: locale === "th" ? "อัตราตอบรับ" : "Response", value: DEMO_PARTNER_STATS.responseRate, icon: "⚡", color: "text-indigo-600" },
          { label: locale === "th" ? "ลูกค้าประจำ" : "Repeat", value: DEMO_PARTNER_STATS.repeatClients, icon: "🤝", color: "text-teal-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Profile + Earnings row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile */}
        {partner && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">{partner.name?.charAt(0)}</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{partner.name}</h3>
                <p className="text-sm text-gray-500">{partner.email}</p>
                <p className="text-xs text-gray-400">{partner.phone}</p>
              </div>
              <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Active</span>
            </div>
            <div className="flex gap-2 mt-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">Corporate Tier</span>
              <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold">Verified</span>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">KYC ✓</span>
            </div>
          </div>
        )}

        {/* Earnings Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">💰 {locale === "th" ? "รายได้รายเดือน" : "Monthly Earnings"}</h3>
          <div className="flex items-end gap-4 h-32">
            {DEMO_EARNINGS.map((e) => (
              <div key={e.month} className="flex-1 flex flex-col items-center">
                <span className="text-xs font-bold text-gray-700 mb-1">฿{(e.amount / 1000).toFixed(1)}k</span>
                <div className="w-full bg-purple-100 rounded-t-lg relative" style={{ height: `${(e.amount / maxEarning) * 100}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500 to-indigo-500 rounded-t-lg" />
                </div>
                <span className="text-xs text-gray-500 mt-1">{e.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Jobs Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">🔧 {locale === "th" ? "งานปัจจุบัน" : "Active Jobs"}</h2>
          <span className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-bold">{DEMO_ACTIVE_JOBS.length}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {DEMO_ACTIVE_JOBS.map((job) => (
            <div key={job.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-lg">🔧</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? job.serviceTh : job.service}</p>
                <p className="text-xs text-gray-500">{job.customer} &middot; {job.date}</p>
                <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${job.progress}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[job.tier] || ""}`}>{job.tier}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[job.status] || ""}`}>{job.status.replace("_", " ")}</span>
                <span className="text-xs font-bold text-gray-700">{job.earnings}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incoming Requests Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">📋 {locale === "th" ? "คำขอใหม่" : "Incoming Requests"}</h2>
          <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">{DEMO_INCOMING.length}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {DEMO_INCOMING.slice(0, 2).map((req) => (
            <div key={req.id} className="px-6 py-4 flex items-center gap-4 hover:bg-amber-50/30 transition">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-lg">📋</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? req.serviceTh : req.service}</p>
                <p className="text-xs text-gray-500">{req.customer} &middot; {req.date} &middot; {locale === "th" ? "งบ" : "Budget"}: {req.budget}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[req.tier] || ""}`}>{req.tier}</span>
                {req.urgency === "urgent" && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">Urgent</span>}
                <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">{locale === "th" ? "รับ" : "Accept"}</button>
                <button className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">{locale === "th" ? "ปฏิเสธ" : "Decline"}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications + Chat side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">🔔 {locale === "th" ? "การแจ้งเตือนล่าสุด" : "Recent Alerts"}</h3>
          <div className="space-y-2">
            {DEMO_NOTIFICATIONS.slice(0, 3).map((n) => (
              <div key={n.id} className={`flex items-center gap-3 p-3 rounded-lg ${n.unread ? "bg-purple-50 border border-purple-100" : "bg-gray-50"}`}>
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
              <div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg ${c.unread > 0 ? "bg-purple-50 border border-purple-100" : "bg-gray-50"}`}>
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{c.name.slice(-3)}</div>
                  {c.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{c.name} <span className="text-gray-400 font-normal">· {c.service}</span></p>
                  <p className="text-xs text-gray-500 truncate">{locale === "th" ? c.lastMsgTh : c.lastMsg}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">{c.time}</span>
                  {c.unread > 0 && <span className="block mt-0.5 ml-auto w-5 h-5 bg-purple-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{c.unread}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== PARTNER JOBS (Active) ===== */
function PartnerJobs({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">🔧 {locale === "th" ? "งานที่กำลังดำเนินการ" : "Active Jobs"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_ACTIVE_JOBS.map((job) => (
          <div key={job.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">🔧</div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{locale === "th" ? job.serviceTh : job.service}</h3>
                <p className="text-sm text-gray-500">{job.customer} &middot; {job.date} &middot; {locale === "th" ? "รายได้" : "Earnings"}: {job.earnings}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${TIER_STYLE[job.tier] || ""}`}>{job.tier}</span>
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLE[job.status] || ""}`}>{job.status.replace("_", " ")}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${job.progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{job.progress}% {locale === "th" ? "ดำเนินการแล้ว" : "completed"}</p>
              </div>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition">💬 {locale === "th" ? "แชท" : "Chat"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== PARTNER REQUESTS ===== */
function PartnerRequests({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">📋 {locale === "th" ? "คำขอใหม่ทั้งหมด" : "All Incoming Requests"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_INCOMING.map((req) => (
          <div key={req.id} className={`p-6 transition ${req.urgency === "urgent" ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-gray-50/50"}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${req.urgency === "urgent" ? "bg-red-100" : "bg-amber-100"}`}>📋</div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{locale === "th" ? req.serviceTh : req.service}</h3>
                <p className="text-sm text-gray-500">{req.customer} &middot; {req.date}</p>
                <p className="text-sm text-gray-600 mt-1">{locale === "th" ? "งบประมาณ" : "Budget"}: <span className="font-bold">{req.budget}</span></p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${TIER_STYLE[req.tier] || ""}`}>{req.tier}</span>
                  {req.urgency === "urgent" && <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-700 animate-pulse">🔴 Urgent</span>}
                </div>
                <div className="flex gap-2">
                  <button className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">{locale === "th" ? "รับงาน" : "Accept"}</button>
                  <button className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">{locale === "th" ? "ปฏิเสธ" : "Decline"}</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== PARTNER HISTORY ===== */
function PartnerHistory({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">📜 {locale === "th" ? "ประวัติงานทั้งหมด" : "Full Job History"}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "บริการ" : "Service"}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "ลูกค้า" : "Customer"}</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "ระดับ" : "Tier"}</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "คะแนน" : "Rating"}</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "รายได้" : "Earned"}</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "วันที่" : "Date"}</th>
          </tr></thead>
          <tbody>
            {DEMO_COMPLETED.map((h) => (
              <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                <td className="py-3 px-4 font-medium text-gray-900">{h.service}</td>
                <td className="py-3 px-4 text-gray-600">{h.customer}</td>
                <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TIER_STYLE[h.tier] || ""}`}>{h.tier}</span></td>
                <td className="py-3 px-4 text-center text-amber-600 font-semibold">{h.rating} ⭐</td>
                <td className="py-3 px-4 text-center font-bold text-green-700">{h.earnings}</td>
                <td className="py-3 px-4 text-center text-gray-500">{h.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== PARTNER CHAT ===== */
function PartnerChat({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">💬 {locale === "th" ? "แชทกับลูกค้า" : "Chat with Customers"}</h2>
        <p className="text-xs text-gray-500 mt-1">{locale === "th" ? "แชทแบบไม่เปิดเผยตัวตนเพื่อความปลอดภัย" : "Anonymous chat for safety"}</p>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_CHATS.map((c) => (
          <div key={c.id} className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition ${c.unread > 0 ? "bg-purple-50/50 hover:bg-purple-50" : "hover:bg-gray-50"}`}>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">{c.name.slice(-3)}</div>
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
              {c.unread > 0 && <span className="inline-flex items-center justify-center mt-1 w-5 h-5 bg-purple-600 text-white text-[10px] font-bold rounded-full">{c.unread}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== PARTNER NOTIFICATIONS ===== */
function PartnerNotifications({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">🔔 {locale === "th" ? "การแจ้งเตือนทั้งหมด" : "All Notifications"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_NOTIFICATIONS.map((n) => (
          <div key={n.id} className={`flex items-center gap-4 px-6 py-4 transition ${n.unread ? "bg-purple-50/50" : "hover:bg-gray-50"}`}>
            <span className={`w-3 h-3 rounded-full ${n.dot} flex-shrink-0`} />
            <p className="text-sm text-gray-800 flex-1">{locale === "th" ? n.msgTh : n.msg}</p>
            <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
            {n.unread && <span className="w-2 h-2 bg-purple-500 rounded-full" />}
          </div>
        ))}
      </div>
    </div>
  );
}
