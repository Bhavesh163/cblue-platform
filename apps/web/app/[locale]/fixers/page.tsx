"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import PdpaConsent from "../components/PdpaConsent";

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
  { id: 1, service: "Plumbing Repair", serviceTh: "ซ่อมประปา", serviceZh: "管道维修", customer: "Customer #A2X", tier: "Standard", date: "2026-04-15", status: "IN_PROGRESS", progress: 65, earnings: "฿2,500" },
  { id: 2, service: "AC Maintenance", serviceTh: "ซ่อมแอร์", serviceZh: "空调维护", customer: "Customer #B7K", tier: "Corporate", date: "2026-04-16", status: "CONFIRMED", progress: 15, earnings: "฿4,000" },
  { id: 3, service: "Electrical Wiring", serviceTh: "งานไฟฟ้า", serviceZh: "电气布线", customer: "Customer #C4M", tier: "Economy", date: "2026-04-17", status: "PENDING", progress: 0, earnings: "฿1,800" },
];

const DEMO_INCOMING = [
  { id: 4, service: "Interior Design", serviceTh: "ออกแบบภายใน", serviceZh: "室内设计", customer: "Customer #D9P", tier: "Specialist", date: "2026-04-18", budget: "฿15,000", urgency: "normal" },
  { id: 5, service: "Landscaping", serviceTh: "จัดสวน", serviceZh: "园林绿化", customer: "Customer #E3R", tier: "Expert", date: "2026-04-19", budget: "฿25,000", urgency: "urgent" },
  { id: 6, service: "Smart Lock Install", serviceTh: "ติดตั้งสมาร์ทล็อค", serviceZh: "智能锁安装", customer: "Customer #F1A", tier: "Corporate", date: "2026-04-20", budget: "฿8,000", urgency: "normal" },
];

const DEMO_EARNINGS = [
  { month: "Jan", monthTh: "ม.ค.", monthZh: "1月", amount: 12500 },
  { month: "Feb", monthTh: "ก.พ.", monthZh: "2月", amount: 15200 },
  { month: "Mar", monthTh: "มี.ค.", monthZh: "3月", amount: 18800 },
  { month: "Apr", monthTh: "เม.ย.", monthZh: "4月", amount: 18500 },
];

const DEMO_COMPLETED = [
  { id: "c1", service: "Pipe Installation", serviceTh: "ติดตั้งท่อ", serviceZh: "管道安装", customer: "Customer #G2B", tier: "Standard", date: "2026-03-28", rating: 5.0, earnings: "฿3,200" },
  { id: "c2", service: "Wiring Overhaul", serviceTh: "รื้อระบบไฟฟ้า", serviceZh: "线路大修", customer: "Customer #H8J", tier: "Corporate", date: "2026-03-15", rating: 4.9, earnings: "฿7,500" },
  { id: "c3", service: "Air Duct Cleaning", serviceTh: "ล้างท่อแอร์", serviceZh: "风管清洗", customer: "Customer #I5L", tier: "Economy", date: "2026-03-01", rating: 4.7, earnings: "฿1,500" },
  { id: "c4", service: "Full Renovation", serviceTh: "รีโนเวททั้งหมด", serviceZh: "全面装修", customer: "Customer #J3N", tier: "Expert", date: "2026-02-20", rating: 5.0, earnings: "฿45,000" },
];

const DEMO_CHATS = [
  { id: "ch1", name: "Customer #A2X", service: "Plumbing", lastMsg: "Thank you, waiting for you", lastMsgTh: "ขอบคุณครับ รอช่างอยู่", lastMsgZh: "谢谢，等您来", time: "2m ago", timeTh: "2 นาทีที่ผ่านมา", timeZh: "2分钟前", unread: 2, online: true },
  { id: "ch2", name: "Customer #B7K", service: "AC", lastMsg: "Which day works for you?", lastMsgTh: "วันไหนสะดวกคะ?", lastMsgZh: "哪天方便？", time: "30m ago", timeTh: "30 นาทีที่ผ่านมา", timeZh: "30分钟前", unread: 1, online: true },
  { id: "ch3", name: "Customer #C4M", service: "Electrical", lastMsg: "Job is done, thanks!", lastMsgTh: "งานเสร็จแล้วครับ ขอบคุณ", lastMsgZh: "工作完成，谢谢！", time: "2h ago", timeTh: "2 ชั่วโมงที่ผ่านมา", timeZh: "2小时前", unread: 0, online: false },
];

const DEMO_NOTIFICATIONS = [
  { id: "pn1", msg: "Customer #A2X sent a new message", msgTh: "ลูกค้า #A2X ส่งข้อความใหม่", msgZh: "客户#A2X发送了新消息", time: "2m ago", dot: "bg-sky-500", unread: true },
  { id: "pn2", msg: "You have 3 new job requests", msgTh: "คุณมีคำขอใหม่ 3 รายการ", msgZh: "您有3个新工作请求", time: "15m ago", dot: "bg-amber-500", unread: true },
  { id: "pn3", msg: "Payment of ฿3,200 received", msgTh: "ได้รับเงิน ฿3,200", msgZh: "已收到฿3,200付款", time: "1h ago", dot: "bg-green-500", unread: true },
  { id: "pn4", msg: "Customer #H8J rated you 5 stars", msgTh: "ลูกค้า #H8J ให้คะแนน 5 ดาว", msgZh: "客户#H8J给了您5星评价", time: "1d ago", dot: "bg-purple-500", unread: false },
  { id: "pn5", msg: "Your tier upgrade to Corporate is approved", msgTh: "อัปเกรดระดับเป็น Corporate อนุมัติแล้ว", msgZh: "您的等级升级至Corporate已获批", time: "3d ago", dot: "bg-emerald-500", unread: false },
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

const STATUS_LABEL: Record<string, Record<string, string>> = {
  IN_PROGRESS: { en: "In Progress", th: "กำลังดำเนินการ", zh: "进行中" },
  CONFIRMED: { en: "Confirmed", th: "ยืนยันแล้ว", zh: "已确认" },
  PENDING: { en: "Pending", th: "รอดำเนินการ", zh: "待处理" },
  COMPLETED: { en: "Completed", th: "เสร็จสิ้น", zh: "已完成" },
};
const getStatusLabel = (status: string, locale: string) => STATUS_LABEL[status]?.[locale] || status.replace(/_/g, " ");

type TabKey = "overview" | "jobs" | "requests" | "properties" | "history" | "chat" | "notifications" | "profile";

export default function FixerProPage() {
  const locale = useLocale();
  const prefix = `/${locale}`;

  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showPdpa, setShowPdpa] = useState(false);

  useEffect(() => {
    try {
      const sub = localStorage.getItem("subscriber");
      if (sub) {
        setPartner(JSON.parse(sub));
        const consent = localStorage.getItem("pdpa_consent_partner");
        if (!consent) setShowPdpa(true);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const isSubscribed = !!partner;

  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: "overview", label: locale === "th" ? "ภาพรวม" : locale === "zh" ? "概览" : "Overview", icon: "📊" },
    { key: "jobs", label: locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "当前工作" : "Active Jobs", icon: "🔧", badge: DEMO_ACTIVE_JOBS.length },
    { key: "requests", label: locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "Requests", icon: "📋", badge: DEMO_INCOMING.length },
    { key: "properties", label: locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房产" : "Properties", icon: "🏢" },
    { key: "history", label: locale === "th" ? "ประวัติงาน" : locale === "zh" ? "历史" : "History", icon: "📜" },
    { key: "chat", label: locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat", icon: "💬", badge: DEMO_CHATS.reduce((a, c) => a + c.unread, 0) },
    { key: "notifications", label: locale === "th" ? "แจ้งเตือน" : locale === "zh" ? "通知" : "Alerts", icon: "🔔", badge: DEMO_NOTIFICATIONS.filter(n => n.unread).length },
    { key: "profile", label: locale === "th" ? "โปรไฟล์" : locale === "zh" ? "个人资料" : "Profile", icon: "👤" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30">
      {/* PDPA Consent Modal */}
      {showPdpa && (
        <PdpaConsent
          locale={locale}
          prefix={prefix}
          role="fixer"
          onAccept={(ts) => {
            localStorage.setItem("pdpa_consent_partner", ts);
            setShowPdpa(false);
          }}
        />
      )}
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <Image src="/images/scenic-house.jpg" alt="" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 to-purple-800/80" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {locale === "th" ? "พาร์ทเนอร์" : locale === "zh" ? "合作伙伴" : "Partner"}
              </h1>
              <p className="text-purple-200 text-sm mt-1">
                {locale === "th" ? "จัดการงาน คำขอ แชท รายได้ และโปรไฟล์" : locale === "zh" ? "管理工作、请求、聊天、收入和个人资料" : "Manage jobs, requests, chat, earnings, and profile"}
              </p>
            </div>
            {partner ? (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-2.5">
                <div className="w-10 h-10 rounded-full bg-purple-400/30 flex items-center justify-center text-white font-bold">{partner.name?.charAt(0) || "P"}</div>
                <div>
                  <p className="text-white text-sm font-semibold">{partner.name}</p>
                  <p className="text-purple-200 text-xs">{partner.email}</p>
                </div>
                <button
                  onClick={() => { localStorage.removeItem("subscriber"); localStorage.removeItem("subscriber_token"); localStorage.removeItem("pdpa_consent_partner"); window.location.href = prefix; }}
                  className="ml-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition"
                >
                  {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出登录" : "Logout"}
                </button>
              </div>
            ) : !loading ? (
              <Link href={`${prefix}/subscription/login`} className="px-5 py-2.5 bg-white text-purple-700 rounded-xl font-semibold text-sm hover:bg-purple-50 transition shadow">
                {locale === "th" ? "เข้าสู่ระบบ / สมัคร" : locale === "zh" ? "登录 / 注册" : "Log In / Register"}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 pb-12">
        {/* Not logged in CTA */}
        {!isSubscribed && !loading && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold">{locale === "th" ? "เข้าสู่ระบบพาร์ทเนอร์" : locale === "zh" ? "合作伙伴登录" : "Partner Login"}</h2>
                <p className="text-purple-100 mt-2">{locale === "th" ? "รับงาน จัดการแดชบอร์ด และเพิ่มรายได้" : locale === "zh" ? "接受工作、管理仪表板、增加收入" : "Receive jobs, manage your dashboard, and grow earnings"}</p>
              </div>
              <div className="flex gap-3">
                <Link href={`${prefix}/subscription/login`} className="px-6 py-3 bg-white text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-50 transition shadow-lg whitespace-nowrap">
                  {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Log In"}
                </Link>
                <Link href={`${prefix}/fixers/register`} className="px-6 py-3 border-2 border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition whitespace-nowrap">
                  {locale === "th" ? "สมัครสมาชิก" : locale === "zh" ? "注册" : "Register"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation - visible for all users */}
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
        {activeTab === "properties" && <PartnerProperties locale={locale} prefix={prefix} />}
        {activeTab === "history" && <PartnerHistory locale={locale} />}
        {activeTab === "chat" && <PartnerChat locale={locale} />}
        {activeTab === "notifications" && <PartnerNotifications locale={locale} />}
        {activeTab === "profile" && <PartnerProfile locale={locale} prefix={prefix} partner={partner} />}

        <div className="my-10 border-t border-gray-200" />

        {/* Registration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Register as Fixer & Pro */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition">
            <div className="h-2 bg-gradient-to-r from-sky-500 to-blue-600" />
            <div className="p-7">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-4 text-xl">🔧</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{locale === "th" ? "สมัครเป็นช่างและมืออาชีพ CBLUE" : locale === "zh" ? "注册成为CBLUE技工和专业人士" : "Register as CBLUE Fixer & Pro"}</h2>
              <p className="text-gray-500 text-sm mb-5">{locale === "th" ? "เข้าร่วมเครือข่ายช่างมืออาชีพ รับงานทั่วประเทศ" : locale === "zh" ? "加入专业网络，全国接单" : "Join our professional network. Receive jobs nationwide."}</p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
                {[
                  locale === "th" ? "รับงานทั่วประเทศ" : locale === "zh" ? "全国接单" : "Receive jobs nationwide",
                  locale === "th" ? "KYC ยืนยันตัวตน" : locale === "zh" ? "KYC身份验证" : "KYC identity verification",
                  locale === "th" ? "5 ระดับ Economy / Standard / Corporate / Specialist / Expert" : locale === "zh" ? "5个等级：基础到专家" : "5 tiers: Economy to Expert",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span> {item}</li>
                ))}
              </ul>
              <Link href={`${prefix}/fixers/register`} className="block text-center py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow transition">
                {locale === "th" ? "สมัครเป็นช่าง" : locale === "zh" ? "注册成为技工" : "Register as Fixer"}
              </Link>
            </div>
          </div>

          {/* List Property */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition">
            <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
            <div className="p-7">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4 text-xl">🏢</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{locale === "th" ? "ลงประกาศอสังหาริมทรัพย์" : locale === "zh" ? "发布新房产" : "List New Property"}</h2>
              <p className="text-gray-500 text-sm mb-5">{locale === "th" ? "ลงประกาศขายหรือเช่าคอนโด บ้าน ทาวน์เฮาส์ ที่ดิน" : locale === "zh" ? "发布公寓、别墅、联排别墅或土地出售或出租" : "List condo, house, townhouse, or land for sale or rent."}</p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
                {[
                  locale === "th" ? "เข้าถึงผู้ซื้อและผู้เช่าทั่วไทย" : locale === "zh" ? "触达全国买家和租客" : "Reach buyers & renters nationwide",
                  locale === "th" ? "อัปโหลดรูปภาพและรายละเอียด" : locale === "zh" ? "上传照片和详情" : "Upload photos & details",
                  locale === "th" ? "จัดการประกาศจากแดชบอร์ด" : locale === "zh" ? "从仪表板管理列表" : "Manage listings from dashboard",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span> {item}</li>
                ))}
              </ul>
              <Link href={`${prefix}/properties/register`} className="block text-center py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow transition">
                {locale === "th" ? "ลงประกาศ" : locale === "zh" ? "发布房产" : "List Property"}
              </Link>
            </div>
          </div>
        </div>

        {/* Price List Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">
              {locale === "th" ? "ตารางราคาค่าประสานงาน" : locale === "zh" ? "处理费价格表" : "Processing Fee Price List"}
            </h2>
            <p className="text-gray-500 text-sm text-center mb-5">
              {locale === "th" ? "ค่าประสานงานที่ลูกค้าจ่ายต่อการจับคู่ 1 ครั้ง" : locale === "zh" ? "客户每次匹配技工/专业人士支付的一次性费用" : "One-time fee per fixer/professional matching"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ระดับ" : locale === "zh" ? "等级" : "Tier"}</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ค่าประสานงาน" : locale === "zh" ? "费用" : "Fee"}</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ระดับดาว" : locale === "zh" ? "星级" : "Stars"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "คุณสมบัติ" : locale === "zh" ? "资质" : "Qualifications"}</th>
                </tr></thead>
                <tbody>
                  {[
                    { tier: "Economy", fee: "฿200", stars: "⭐", qual: locale === "th" ? "ช่างทั่วไป ประสบการณ์เบื้องต้น" : locale === "zh" ? "普通技工，基础经验" : "General fixer, basic experience", color: "bg-green-50 text-green-700" },
                    { tier: "Standard", fee: "฿400", stars: "⭐⭐", qual: locale === "th" ? "ช่างมีประสบการณ์ ผลงานดี" : locale === "zh" ? "有经验，良好记录" : "Experienced, good track record", color: "bg-blue-50 text-blue-700" },
                    { tier: "Corporate", fee: "฿600", stars: "⭐⭐⭐", qual: locale === "th" ? "ช่างมืออาชีพ หรือทีมงาน" : locale === "zh" ? "专业技工或团队" : "Professional fixer or team", color: "bg-purple-50 text-purple-700" },
                    { tier: "Specialist", fee: "฿800", stars: "⭐⭐⭐⭐", qual: locale === "th" ? "ผู้เชี่ยวชาญเฉพาะทาง มีใบรับรอง" : locale === "zh" ? "认证专家" : "Certified specialist", color: "bg-amber-50 text-amber-700" },
                    { tier: "Expert", fee: "฿1,000", stars: "⭐⭐⭐⭐⭐", qual: locale === "th" ? "ผู้เชี่ยวชาญระดับสูง 10+ ปี" : locale === "zh" ? "高级专家，10+年经验" : "Senior expert, 10+ years", color: "bg-red-50 text-red-700" },
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
              {locale === "th" ? "* ค่าประสานงานเป็นค่าบริการแพลตฟอร์ม ไม่รวมค่าจ้างช่าง" : locale === "zh" ? "* 仅平台费用，不包括技工费用。客户直接协商价格。" : "* Platform fee only, excludes fixer charges. Customers negotiate pricing directly."}
            </p>
          </div>
        </div>

        {/* Tier Qualification Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-600" />
          <div className="p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">
              {locale === "th" ? "คุณสมบัติระดับช่าง (Tier Qualification)" : locale === "zh" ? "等级资质标准" : "Tier Qualification Criteria"}
            </h2>
            <p className="text-gray-500 text-sm text-center mb-5">
              {locale === "th" ? "ระดับบริการกำหนดจากประสบการณ์ ผลงาน และใบรับรอง" : locale === "zh" ? "由经验、业绩和证书决定" : "Determined by experience, track record, and certifications"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ระดับ" : locale === "zh" ? "等级" : "Tier"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ประสบการณ์" : locale === "zh" ? "经验" : "Experience"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ผลงาน" : locale === "zh" ? "过往项目" : "Past Projects"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ใบรับรอง" : locale === "zh" ? "证书" : "Certifications"}</th>
                </tr></thead>
                <tbody>
                  {[
                    { tier: "Economy", exp: "1+ years", projects: locale === "th" ? "ไม่จำเป็น" : locale === "zh" ? "不需要" : "Not required", certs: locale === "th" ? "ไม่จำเป็น" : locale === "zh" ? "不需要" : "Not required", color: "bg-green-50 text-green-700" },
                    { tier: "Standard", exp: "3+ years", projects: "3+", certs: locale === "th" ? "แนะนำ" : locale === "zh" ? "建议" : "Recommended", color: "bg-blue-50 text-blue-700" },
                    { tier: "Corporate", exp: "5+ years", projects: "10+", certs: locale === "th" ? "จำเป็น" : locale === "zh" ? "必需" : "Required", color: "bg-purple-50 text-purple-700" },
                    { tier: "Specialist", exp: "7+ years", projects: "20+", certs: locale === "th" ? "จำเป็น + เฉพาะทาง" : locale === "zh" ? "必需 + 专业" : "Required + specialized", color: "bg-amber-50 text-amber-700" },
                    { tier: "Expert", exp: "10+ years", projects: "50+", certs: locale === "th" ? "จำเป็น + ขั้นสูง" : locale === "zh" ? "必需 + 高级" : "Required + advanced", color: "bg-red-50 text-red-700" },
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
              {locale === "th" ? "* ช่างสามารถอัปเกรดระดับได้เมื่อมีคุณสมบัติครบถ้วน" : locale === "zh" ? "* 技工满足资质后可升级等级" : "* Fixers can upgrade their tier when qualifications are met."}
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">⚠️ {locale === "th" ? "ข้อจำกัดความรับผิดชอบ" : locale === "zh" ? "免责声明" : "Disclaimer"}</p>
          <p>{locale === "th"
            ? "CBLUE เป็นแพลตฟอร์มจับคู่เท่านั้น ราคาที่ตกลง ขอบเขตงาน และการชำระเงินระหว่างคุณกับพาร์ทเนอร์ (ช่าง/ทีมโครงการ/มืออาชีพ/ผู้ลงประกาศอสังหาริมทรัพย์) เป็นข้อตกลงโดยตรงระหว่างทั้งสองฝ่าย CBLUE ไม่รับผิดชอบต่อข้อพิพาทด้านราคา คุณภาพงาน หรือข้อตกลงที่เกิดขึ้นหลังกระบวนการจับคู่"
            : locale === "zh"
            ? "CBLUE 仅作为匹配平台。您与合作伙伴（技工/项目团队/专业人士/房产发布者）之间约定的价格、工作范围和付款为双方直接安排。CBLUE 不对匹配过程后产生的价格争议、工作质量或协议承担责任。"
            : "CBLUE acts as a matching platform only. The agreed price, scope of work, and payment between you and the partner (fixer/project team/professional/property lister) is a direct arrangement between both parties. CBLUE is not responsible for pricing disputes, work quality, or agreements made after the matching process."
          }</p>
          <p className="mt-2 font-semibold text-gray-700">{locale === "th"
            ? "📌 ค่าธรรมเนียมดำเนินการไม่สามารถคืนเงินได้ เนื่องจากบริการจับคู่ได้ดำเนินการเสร็จสิ้นแล้วเมื่อลูกค้าเริ่มกระบวนการ ค่าธรรมเนียมนี้ครอบคลุมการจับคู่ AI, การตรวจสอบพาร์ทเนอร์, การออก PO และการจัดการการสื่อสาร"
            : locale === "zh"
            ? "📌 处理费不可退还，因为匹配服务在客户发起流程后已完成。此费用涵盖AI匹配、合作伙伴验证、PO签发和通信协调。"
            : "📌 The processing fee is non-refundable as the matching service is completed once the customer initiates the process. This fee covers AI matching, partner verification, PO issuance, and communication facilitation."
          }</p>
        </div>
        {/* Data Retention Notice */}
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
          <p className="font-semibold mb-1">🛡️ {locale === "th" ? "นโยบายการเก็บรักษาข้อมูล (PDPA)" : locale === "zh" ? "数据保留政策 (PDPA)" : "Data Retention Policy (PDPA)"}</p>
          <p>{locale === "th"
            ? "ความยินยอม: 3 ปี | ประวัติบริการ: 18 เดือน | บัญชีไม่ใช้งาน: ลบหลัง 12 เดือน"
            : locale === "zh"
            ? "同意记录: 3年 | 服务历史: 18个月 | 非活跃账户: 12个月后删除"
            : "Consent: 3 years | Service history: 18 months | Inactive accounts: deleted after 12 months"
          }</p>
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
          { label: locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "进行中" : "Active Jobs", value: DEMO_PARTNER_STATS.activeJobs, icon: "🔧", color: "text-sky-600" },
          { label: locale === "th" ? "เสร็จสิ้น" : locale === "zh" ? "已完成" : "Completed", value: DEMO_PARTNER_STATS.completedJobs, icon: "✅", color: "text-green-600" },
          { label: locale === "th" ? "รายได้เดือนนี้" : locale === "zh" ? "本月收入" : "Monthly Earn", value: DEMO_PARTNER_STATS.monthlyEarnings, icon: "💰", color: "text-amber-600" },
          { label: locale === "th" ? "คะแนน" : locale === "zh" ? "评分" : "Rating", value: `${DEMO_PARTNER_STATS.rating} ⭐`, icon: "🏆", color: "text-purple-600" },
          { label: locale === "th" ? "อัตราตอบรับ" : locale === "zh" ? "响应率" : "Response", value: DEMO_PARTNER_STATS.responseRate, icon: "⚡", color: "text-indigo-600" },
          { label: locale === "th" ? "ลูกค้าประจำ" : locale === "zh" ? "回头客" : "Repeat", value: DEMO_PARTNER_STATS.repeatClients, icon: "🤝", color: "text-teal-600" },
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
              <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">{locale === "th" ? "ใช้งานอยู่" : locale === "zh" ? "活跃" : "Active"}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">{locale === "th" ? "ระดับ Corporate" : locale === "zh" ? "企业级" : "Corporate Tier"}</span>
              <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold">{locale === "th" ? "ยืนยันแล้ว" : locale === "zh" ? "已验证" : "Verified"}</span>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">{locale === "th" ? "KYC ✓ ยืนยันแล้ว" : locale === "zh" ? "KYC ✓ 已验证" : "KYC ✓"}</span>
            </div>
          </div>
        )}

        {/* Earnings Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">💰 {locale === "th" ? "รายได้รายเดือน" : locale === "zh" ? "月收入" : "Monthly Earnings"}</h3>
          <div className="flex items-end gap-4 h-32">
            {DEMO_EARNINGS.map((e) => (
              <div key={e.month} className="flex-1 flex flex-col items-center">
                <span className="text-xs font-bold text-gray-700 mb-1">฿{(e.amount / 1000).toFixed(1)}k</span>
                <div className="w-full bg-purple-100 rounded-t-lg relative" style={{ height: `${(e.amount / maxEarning) * 100}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500 to-indigo-500 rounded-t-lg" />
                </div>
                <span className="text-xs text-gray-500 mt-1">{locale === "th" ? e.monthTh : locale === "zh" ? e.monthZh : e.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Jobs Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">🔧 {locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "进行中的工作" : "Active Jobs"}</h2>
          <span className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-bold">{DEMO_ACTIVE_JOBS.length}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {DEMO_ACTIVE_JOBS.map((job) => (
            <div key={job.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-lg">🔧</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? job.serviceTh : locale === "zh" ? job.serviceZh : job.service}</p>
                <p className="text-xs text-gray-500">{job.customer} &middot; {job.date}</p>
                <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${job.progress}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[job.tier] || ""}`}>{job.tier}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[job.status] || ""}`}>{getStatusLabel(job.status, locale)}</span>
                <span className="text-xs font-bold text-gray-700">{job.earnings}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incoming Requests Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">📋 {locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新订单" : "Incoming Requests"}</h2>
          <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">{DEMO_INCOMING.length}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {DEMO_INCOMING.slice(0, 2).map((req) => (
            <div key={req.id} className="px-6 py-4 flex items-center gap-4 hover:bg-amber-50/30 transition">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-lg">📋</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? req.serviceTh : locale === "zh" ? req.serviceZh : req.service}</p>
                <p className="text-xs text-gray-500">{req.customer} &middot; {req.date} &middot; {locale === "th" ? "งบ" : locale === "zh" ? "预算" : "Budget"}: {req.budget}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[req.tier] || ""}`}>{req.tier}</span>
                {req.urgency === "urgent" && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">{locale === "th" ? "เร่งด่วน" : locale === "zh" ? "紧急" : "Urgent"}</span>}
                <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">{locale === "th" ? "รับ" : locale === "zh" ? "接受" : "Accept"}</button>
                <button className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">{locale === "th" ? "ปฏิเสธ" : locale === "zh" ? "拒绝" : "Decline"}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications + Chat side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">🔔 {locale === "th" ? "การแจ้งเตือนล่าสุด" : locale === "zh" ? "最近通知" : "Recent Alerts"}</h3>
          <div className="space-y-2">
            {DEMO_NOTIFICATIONS.slice(0, 3).map((n) => (
              <div key={n.id} className={`flex items-center gap-3 p-3 rounded-lg ${n.unread ? "bg-purple-50 border border-purple-100" : "bg-gray-50"}`}>
                <span className={`w-2 h-2 rounded-full ${n.dot} flex-shrink-0`} />
                <p className="text-sm text-gray-700 flex-1">{locale === "th" ? n.msgTh : locale === "zh" ? n.msgZh : n.msg}</p>
                <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">💬 {locale === "th" ? "แชทล่าสุด" : locale === "zh" ? "最近聊天" : "Recent Chats"}</h3>
          <div className="space-y-2">
            {DEMO_CHATS.map((c) => (
              <div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg ${c.unread > 0 ? "bg-purple-50 border border-purple-100" : "bg-gray-50"}`}>
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{c.name.slice(-3)}</div>
                  {c.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{c.name} <span className="text-gray-400 font-normal">· {c.service}</span></p>
                  <p className="text-xs text-gray-500 truncate">{locale === "th" ? c.lastMsgTh : locale === "zh" ? c.lastMsgZh : c.lastMsg}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">{locale === "th" ? c.timeTh : locale === "zh" ? c.timeZh : c.time}</span>
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
        <h2 className="font-bold text-gray-900 flex items-center gap-2">🔧 {locale === "th" ? "งานที่กำลังดำเนินการ" : locale === "zh" ? "进行中的工作" : "Active Jobs"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_ACTIVE_JOBS.map((job) => (
          <div key={job.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">🔧</div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{locale === "th" ? job.serviceTh : locale === "zh" ? job.serviceZh : job.service}</h3>
                <p className="text-sm text-gray-500">{job.customer} &middot; {job.date} &middot; {locale === "th" ? "รายได้" : locale === "zh" ? "收入" : "Earnings"}: {job.earnings}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${TIER_STYLE[job.tier] || ""}`}>{job.tier}</span>
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLE[job.status] || ""}`}>{getStatusLabel(job.status, locale)}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${job.progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{job.progress}% {locale === "th" ? "ดำเนินการแล้ว" : locale === "zh" ? "已完成" : "completed"}</p>
              </div>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition">💬 {locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat"}</button>
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
        <h2 className="font-bold text-gray-900 flex items-center gap-2">📋 {locale === "th" ? "คำขอใหม่ทั้งหมด" : locale === "zh" ? "所有新请求" : "All Incoming Requests"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_INCOMING.map((req) => (
          <div key={req.id} className={`p-6 transition ${req.urgency === "urgent" ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-gray-50/50"}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${req.urgency === "urgent" ? "bg-red-100" : "bg-amber-100"}`}>📋</div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{locale === "th" ? req.serviceTh : locale === "zh" ? req.serviceZh : req.service}</h3>
                <p className="text-sm text-gray-500">{req.customer} &middot; {req.date}</p>
                <p className="text-sm text-gray-600 mt-1">{locale === "th" ? "งบประมาณ" : locale === "zh" ? "预算" : "Budget"}: <span className="font-bold">{req.budget}</span></p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${TIER_STYLE[req.tier] || ""}`}>{req.tier}</span>
                  {req.urgency === "urgent" && <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-700 animate-pulse">🔴 {locale === "th" ? "เร่งด่วน" : locale === "zh" ? "紧急" : "Urgent"}</span>}
                </div>
                <div className="flex gap-2">
                  <button className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">{locale === "th" ? "รับงาน" : locale === "zh" ? "接受" : "Accept"}</button>
                  <button className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">{locale === "th" ? "ปฏิเสธ" : locale === "zh" ? "拒绝" : "Decline"}</button>
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
        <h2 className="font-bold text-gray-900 flex items-center gap-2">📜 {locale === "th" ? "ประวัติงานทั้งหมด" : locale === "zh" ? "完整工作历史" : "Full Job History"}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "บริการ" : locale === "zh" ? "服务" : "Service"}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "ลูกค้า" : locale === "zh" ? "客户" : "Customer"}</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "ระดับ" : locale === "zh" ? "等级" : "Tier"}</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "คะแนน" : locale === "zh" ? "评分" : "Rating"}</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "รายได้" : locale === "zh" ? "收入" : "Earned"}</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "วันที่" : locale === "zh" ? "日期" : "Date"}</th>
          </tr></thead>
          <tbody>
            {DEMO_COMPLETED.map((h) => (
              <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                <td className="py-3 px-4 font-medium text-gray-900">{locale === "th" ? h.serviceTh : locale === "zh" ? h.serviceZh : h.service}</td>
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
        <h2 className="font-bold text-gray-900 flex items-center gap-2">💬 {locale === "th" ? "แชทกับลูกค้า" : locale === "zh" ? "与客户聊天" : "Chat with Customers"}</h2>
        <p className="text-xs text-gray-500 mt-1">{locale === "th" ? "แชทแบบไม่เปิดเผยตัวตนเพื่อความปลอดภัย" : locale === "zh" ? "匿名聊天保障安全" : "Anonymous chat for safety"}</p>
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
              <p className="text-sm text-gray-500 truncate mt-0.5">{locale === "th" ? c.lastMsgTh : locale === "zh" ? c.lastMsgZh : c.lastMsg}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">{locale === "th" ? c.timeTh : locale === "zh" ? c.timeZh : c.time}</p>
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
        <h2 className="font-bold text-gray-900 flex items-center gap-2">🔔 {locale === "th" ? "การแจ้งเตือนทั้งหมด" : locale === "zh" ? "所有通知" : "All Notifications"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_NOTIFICATIONS.map((n) => (
          <div key={n.id} className={`flex items-center gap-4 px-6 py-4 transition ${n.unread ? "bg-purple-50/50" : "hover:bg-gray-50"}`}>
            <span className={`w-3 h-3 rounded-full ${n.dot} flex-shrink-0`} />
            <p className="text-sm text-gray-800 flex-1">{locale === "th" ? n.msgTh : locale === "zh" ? n.msgZh : n.msg}</p>
            <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
            {n.unread && <span className="w-2 h-2 bg-purple-500 rounded-full" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== PARTNER PROFILE ===== */
function PartnerProfile({ locale, prefix, partner }: { locale: string; prefix: string; partner: PartnerInfo | null }) {
  if (!partner) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{locale === "th" ? "เข้าสู่ระบบเพื่อดูโปรไฟล์" : locale === "zh" ? "登录查看个人资料" : "Log in to view profile"}</h2>
        <p className="text-sm text-gray-500 mb-6">{locale === "th" ? "เข้าสู่ระบบเพื่อจัดการข้อมูลและการตั้งค่า" : locale === "zh" ? "登录管理您的合作伙伴账户" : "Sign in to manage your partner account"}</p>
        <Link href={`${prefix}/subscription/login`} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition inline-block">
          {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Log In"}
        </Link>
      </div>
    );
  }

  const SKILLS = [
    { en: "Plumbing", th: "ประปา", zh: "管道" },
    { en: "Electrical", th: "ไฟฟ้า", zh: "电气" },
    { en: "AC", th: "แอร์", zh: "空调" },
    { en: "Interior", th: "ตกแต่งภายใน", zh: "室内" },
    { en: "Smart Home", th: "สมาร์ทโฮม", zh: "智能家居" },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">{partner.name?.charAt(0) || "P"}</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{partner.name}</h2>
            <p className="text-sm text-gray-500">{partner.email}</p>
            <p className="text-sm text-gray-400">{partner.phone}</p>
          </div>
          <div className="ml-auto flex flex-col gap-1.5 items-end">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">{locale === "th" ? "ใช้งานอยู่" : locale === "zh" ? "活跃" : "Active"}</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">{locale === "th" ? "ระดับ Corporate" : locale === "zh" ? "企业级" : "Corporate Tier"}</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700">{locale === "th" ? "KYC ✓ ยืนยันแล้ว" : locale === "zh" ? "KYC ✓ 已验证" : "KYC ✓ Verified"}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: locale === "th" ? "งานทั้งหมด" : locale === "zh" ? "总工作" : "Total Jobs", value: DEMO_PARTNER_STATS.completedJobs + DEMO_PARTNER_STATS.activeJobs, icon: "📋" },
            { label: locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "进行中" : "Active", value: DEMO_PARTNER_STATS.activeJobs, icon: "🔧" },
            { label: locale === "th" ? "คะแนน" : locale === "zh" ? "评分" : "Rating", value: `${DEMO_PARTNER_STATS.rating} ⭐`, icon: "🏆" },
            { label: locale === "th" ? "ลูกค้าประจำ" : locale === "zh" ? "回头客" : "Repeat Clients", value: DEMO_PARTNER_STATS.repeatClients, icon: "🤝" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
              <span className="text-xl block mb-1">{s.icon}</span>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Skills & Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">🛠️ {locale === "th" ? "ทักษะและบริการ" : locale === "zh" ? "技能与服务" : "Skills & Services"}</h3>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((skill) => (
              <span key={skill.en} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold border border-purple-200">{locale === "th" ? skill.th : locale === "zh" ? skill.zh : skill.en}</span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">{locale === "th" ? "ติดต่อแอดมินเพื่อเพิ่มทักษะ" : locale === "zh" ? "联系管理员添加更多技能" : "Contact admin to add more skills"}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">⚙️ {locale === "th" ? "การตั้งค่า" : locale === "zh" ? "设置" : "Settings"}</h3>
          <div className="space-y-3">
            {[
              { label: locale === "th" ? "แก้ไขโปรไฟล์" : locale === "zh" ? "编辑资料" : "Edit Profile", icon: "✏️" },
              { label: locale === "th" ? "เปลี่ยนรหัสผ่าน" : locale === "zh" ? "修改密码" : "Change Password", icon: "🔒" },
              { label: locale === "th" ? "ปฏิทินว่าง" : locale === "zh" ? "空闲日历" : "Availability Calendar", icon: "📅" },
              { label: locale === "th" ? "รัศมีพื้นที่ให้บริการ" : locale === "zh" ? "服务区域半径" : "Service Area Radius", icon: "📍" },
            ].map((item) => (
              <button key={item.label} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition text-left w-full">
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium text-gray-900 text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <button
          onClick={() => { localStorage.removeItem("subscriber"); localStorage.removeItem("subscriber_token"); localStorage.removeItem("pdpa_consent_partner"); window.location.href = prefix; }}
          className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm rounded-xl border border-red-200 transition"
        >
          🚪 {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出登录" : "Logout"}
        </button>
      </div>
    </div>
  );
}

/* ===== PARTNER PROPERTIES ===== */
const DEMO_PROPERTY_LISTINGS = [
  { id: "p1", title: "Condo Sukhumvit 21", titleTh: "คอนโดสุขุมวิท 21", titleZh: "素坤逸21号公寓", description: "Modern condo near BTS, 2 bed 2 bath, city view", descriptionTh: "คอนโดใกล้ BTS 2 ห้องนอน 2 ห้องน้ำ วิวเมือง", descriptionZh: "近BTS的现代公寓，2卧室2卫，城市景观", type: "CONDO", listingType: "SALE", price: "฿5,500,000", status: "active", province: "กรุงเทพมหานคร", views: 234, inquiries: 12, updatedAt: "2026-04-08", images: ["/images/scenic-building.jpg", "/images/scenic-house.jpg"] },
  { id: "p2", title: "House Rama 9", titleTh: "บ้านพระราม 9", titleZh: "拉玛9号别墅", description: "3-storey house with pool, 4 bed 5 bath", descriptionTh: "บ้าน 3 ชั้น มีสระว่ายน้ำ 4 ห้องนอน 5 ห้องน้ำ", descriptionZh: "3层别墅带泳池，4卧室5卫", type: "HOUSE", listingType: "RENT", price: "฿35,000/mo", status: "active", province: "กรุงเทพมหานคร", views: 156, inquiries: 8, updatedAt: "2026-04-05", images: ["/images/scenic-house.jpg"] },
  { id: "p3", title: "Townhouse Bangna", titleTh: "ทาวน์เฮ้าส์บางนา", titleZh: "邦纳联排别墅", description: "Corner townhouse, 3 bed, near expressway", descriptionTh: "ทาวน์เฮ้าส์มุม 3 ห้องนอน ใกล้ทางด่วน", descriptionZh: "转角联排别墅，3卧室，近高速公路", type: "TOWNHOUSE", listingType: "SALE", price: "฿3,200,000", status: "pending", province: "สมุทรปราการ", views: 45, inquiries: 2, updatedAt: "2026-04-01", images: [] },
];

const PROP_STATUS: Record<string, string> = { active: "bg-green-100 text-green-700", pending: "bg-yellow-100 text-yellow-700", sold: "bg-gray-100 text-gray-600" };

function PartnerProperties({ locale, prefix }: { locale: string; prefix: string }) {
  const [listings, setListings] = useState(DEMO_PROPERTY_LISTINGS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", price: "", status: "", images: [] as string[] });

  const startEdit = (p: typeof DEMO_PROPERTY_LISTINGS[0]) => {
    setEditingId(p.id);
    setEditForm({
      title: locale === "th" ? p.titleTh : locale === "zh" ? p.titleZh : p.title,
      description: locale === "th" ? p.descriptionTh : locale === "zh" ? p.descriptionZh : p.description,
      price: p.price,
      status: p.status,
      images: [...p.images],
    });
  };

  const saveEdit = () => {
    setListings(listings.map(l => l.id === editingId ? {
      ...l,
      ...(locale === "th" ? { titleTh: editForm.title } : locale === "zh" ? { titleZh: editForm.title } : { title: editForm.title }),
      ...(locale === "th" ? { descriptionTh: editForm.description } : locale === "zh" ? { descriptionZh: editForm.description } : { description: editForm.description }),
      price: editForm.price,
      status: editForm.status as "active" | "pending" | "sold",
      images: editForm.images,
    } : l));
    setEditingId(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files).map(f => URL.createObjectURL(f));
      setEditForm(prev => ({ ...prev, images: [...prev.images, ...newImages].slice(0, 10) }));
    }
  };

  const removeImage = (idx: number) => {
    setEditForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">🏢 {locale === "th" ? "รายการอสังหาริมทรัพย์ของฉัน" : locale === "zh" ? "我的房产列表" : "My Property Listings"}</h2>
            <p className="text-xs text-gray-500 mt-1">{locale === "th" ? "จัดการรายการประกาศอสังหาริมทรัพย์ของคุณ" : locale === "zh" ? "管理您的房产发布" : "Manage your property listings"}</p>
          </div>
          <Link href={`${prefix}/properties/register`} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition shadow-sm">
            + {locale === "th" ? "ลงประกาศใหม่" : locale === "zh" ? "添加新列表" : "Add Listing"}
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-5xl mb-4">🏢</div>
            <p className="text-gray-500">{locale === "th" ? "ยังไม่มีรายการอสังหาริมทรัพย์" : locale === "zh" ? "暂无房产列表" : "No property listings yet"}</p>
            <Link href={`${prefix}/properties/register`} className="mt-4 inline-block px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition">
              {locale === "th" ? "ลงประกาศแรก" : locale === "zh" ? "发布第一个列表" : "Create Your First Listing"}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {listings.map((p) => (
              <div key={p.id} className="px-6 py-4 hover:bg-gray-50/50 transition">
                {editingId === p.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder={locale === "th" ? "ชื่อรายการ" : locale === "zh" ? "标题" : "Title"} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-500 outline-none" />
                      <input value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} placeholder={locale === "th" ? "ราคา" : locale === "zh" ? "价格" : "Price"} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-500 outline-none" />
                      <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-500 outline-none">
                        <option value="active">{locale === "th" ? "เผยแพร่" : locale === "zh" ? "已发布" : "Active"}</option>
                        <option value="pending">{locale === "th" ? "รอตรวจสอบ" : locale === "zh" ? "待审核" : "Pending"}</option>
                        <option value="sold">{locale === "th" ? "ขายแล้ว" : locale === "zh" ? "已售出" : "Sold"}</option>
                      </select>
                    </div>
                    {/* Description */}
                    <textarea
                      value={editForm.description}
                      onChange={e => setEditForm({...editForm, description: e.target.value})}
                      placeholder={locale === "th" ? "รายละเอียดอสังหาริมทรัพย์..." : locale === "zh" ? "房产描述..." : "Property description..."}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-500 outline-none resize-none"
                    />
                    {/* Image Management */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">📷 {locale === "th" ? "รูปภาพ" : locale === "zh" ? "图片" : "Images"} ({editForm.images.length}/10)</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editForm.images.map((img, idx) => (
                          <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                            <Image src={img} alt={`img-${idx}`} fill className="object-cover" sizes="80px" />
                            <button
                              onClick={() => removeImage(idx)}
                              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >
                              <span className="text-white text-lg">✕</span>
                            </button>
                          </div>
                        ))}
                        {editForm.images.length < 10 && (
                          <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition">
                            <span className="text-2xl text-gray-400">+</span>
                            <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition">{locale === "th" ? "บันทึก" : locale === "zh" ? "保存" : "Save"}</button>
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition">{locale === "th" ? "ยกเลิก" : locale === "zh" ? "取消" : "Cancel"}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    {p.images.length > 0 && (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                        <Image src={p.images[0] ?? ""} alt={p.title} fill className="object-cover" sizes="64px" />
                        {p.images.length > 1 && (
                          <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] px-1 rounded-tl">+{p.images.length - 1}</span>
                        )}
                      </div>
                    )}
                    {p.images.length === 0 && (
                      <div className="w-16 h-16 rounded-lg bg-green-100 flex items-center justify-center text-2xl flex-shrink-0">🏢</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-sm">{locale === "th" ? p.titleTh : locale === "zh" ? p.titleZh : p.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PROP_STATUS[p.status] || ""}`}>
                          {p.status === "active" ? (locale === "th" ? "เผยแพร่" : locale === "zh" ? "已发布" : "Active") : p.status === "pending" ? (locale === "th" ? "รอตรวจสอบ" : locale === "zh" ? "待审核" : "Pending") : (locale === "th" ? "ขายแล้ว" : locale === "zh" ? "已售出" : "Sold")}
                        </span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{p.type}</span>
                        <span className="text-xs bg-blue-50 px-2 py-0.5 rounded text-blue-600">{p.listingType}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{locale === "th" ? p.descriptionTh : locale === "zh" ? p.descriptionZh : p.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>{p.province}</span>
                        <span>📷 {p.images.length} {locale === "th" ? "รูป" : locale === "zh" ? "张照片" : "photos"}</span>
                        <span>👁 {p.views} {locale === "th" ? "ชม" : locale === "zh" ? "次浏览" : "views"}</span>
                        <span>💬 {p.inquiries} {locale === "th" ? "สอบถาม" : locale === "zh" ? "次咨询" : "inquiries"}</span>
                        <span>{locale === "th" ? "อัปเดต" : locale === "zh" ? "更新" : "Updated"}: {p.updatedAt}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-green-700 text-sm">{p.price}</p>
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => startEdit(p)} className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-semibold transition">
                          ✏️ {locale === "th" ? "แก้ไข" : locale === "zh" ? "编辑" : "Edit"}
                        </button>
                        <button onClick={() => setListings(listings.filter(l => l.id !== p.id))} className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold transition">
                          🗑️ {locale === "th" ? "ลบ" : locale === "zh" ? "删除" : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
        <strong>💡 {locale === "th" ? "เคล็ดลับ:" : locale === "zh" ? "提示：" : "Tip:"}</strong>{" "}
        {locale === "th"
          ? "คลิก \"แก้ไข\" เพื่ออัปเดตชื่อ ราคา รายละเอียด รูปภาพ หรือสถานะของรายการ หรือคลิก \"ลงประกาศใหม่\" เพื่อเพิ่มอสังหาริมทรัพย์"
          : locale === "zh"
            ? "点击「编辑」更新标题、价格、描述、图片或状态，或点击「添加新列表」发布新房产"
            : "Click \"Edit\" to update title, price, description, images or status. Click \"Add Listing\" to register a new property."}
      </div>
    </div>
  );
}
