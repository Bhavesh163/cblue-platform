"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import PdpaConsent from "../components/PdpaConsent";

interface PartnerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: string;
}

const stats = {
  activeJobs: 0,
  completedJobs: 0,
  monthlyEarnings: "฿0",
  rating: 0,
  responseRate: "0%",
  repeatClients: 0,
};





const chats: any[] = [];

const notifications: any[] = [];

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
  const router = useRouter();
  const prefix = `/${locale}`;

  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showPdpa, setShowPdpa] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);



  const [isFixer, setIsFixer] = useState(false);

  
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("subscriber_token");
      if (!token) {
        setPartner(null);
        setIsFixer(false);
      } else {
        const stored = localStorage.getItem("subscriber");
        if (stored) setPartner(JSON.parse(stored));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("subscriber_token");
        if (!token) {
          setLoading(false);
          return;
        }
        const res = await fetch("/api/v1/users/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const user = await res.json();
          if (isMounted) {
            setIsFixer(!!user.fixer);
            const stored = localStorage.getItem("subscriber");
            if (stored) setPartner(JSON.parse(stored));
            else setPartner({ id: user.id, name: user.name, email: user.email, phone: user.phone, status: "ACTIVE" });
            const consent = localStorage.getItem("pdpa_consent_partner");
            if (!consent) setShowPdpa(true);
          }

            const ordersRes = await fetch("/api/v1/orders/fixer", { headers: { Authorization: `Bearer ${token}` } });
            if (ordersRes.ok && isMounted) setOrders(await ordersRes.json());

        } else if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("subscriber_token");
          localStorage.removeItem("subscriber");
        }
      } catch { /* ignore */ }
      if (isMounted) setLoading(false);
    };
    fetchUser();
    return () => { isMounted = false; };
  }, []);

  const isSubscribed = !!partner;


  
  const mappedOrders = orders.map(o => ({
        id: o.id,
    customer: o.user?.name || "Customer",
    type: o.orderType?.toLowerCase() || "household",
    phone: o.user?.phone || "",
    service: (o.serviceCategory || "").replace(/_/g, " "),
    serviceTh: (o.serviceCategory || "").replace(/_/g, " "),
    serviceZh: (o.serviceCategory || "").replace(/_/g, " "),
    date: new Date(o.createdAt).toLocaleDateString(),
    tier: "Standard",
    status: o.status,
    progress: o.status === 'COMPLETED' ? 100 : o.status === 'IN_PROGRESS' ? 50 : 20,
    fee: o.estimatedPrice ? `฿${o.estimatedPrice}` : "TBD"
  }));

  
  const properties = mappedOrders.filter(o => o.type === 'property');
  const chats: any[] = [];
  const notifications: any[] = [];

  const activeJobs = mappedOrders.filter(o => !['COMPLETED', 'CANCELLED', 'CREATED', 'PENDING'].includes(o.status));
  const completedJobs = mappedOrders.filter(o => o.status === 'COMPLETED');
  const incomingJobs = mappedOrders.filter(o => ['CREATED', 'PENDING', 'MATCHING'].includes(o.status));

  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: "overview", label: locale === "th" ? "ภาพรวม" : locale === "zh" ? "概览" : "Overview", icon: "📊" },
    { key: "jobs", label: locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "当前工作" : "Active Jobs", icon: "🔧", badge: 0 },
    { key: "requests", label: locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "Requests", icon: "📋", badge: 0 },
    { key: "properties", label: locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房产" : "Properties", icon: "🏢" },
    { key: "history", label: locale === "th" ? "ประวัติงาน" : locale === "zh" ? "历史" : "History", icon: "📜" },
    { key: "chat", label: locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat", icon: "💬", badge: 0 },
    { key: "notifications", label: locale === "th" ? "แจ้งเตือน" : locale === "zh" ? "通知" : "Alerts", icon: "🔔", badge: 0 },
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
                {locale === "th" ? "พาร์ทเนอร์ของเรา" : locale === "zh" ? "我们的合作伙伴" : "Our Partner"}
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
                  onClick={() => { localStorage.removeItem("subscriber"); localStorage.removeItem("subscriber_token"); localStorage.removeItem("pdpa_consent_partner"); window.dispatchEvent(new Event("storage")); router.push(prefix); }}
                  className="ml-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition"
                >
                  {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出登录" : "Logout"}
                </button>
              </div>
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

        {/* Main Content Area */}
        {isSubscribed && !isFixer && !loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 text-center max-w-2xl mx-auto">
            <div className="text-5xl mb-4">👷‍♂️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {locale === "th" ? "คุณยังไม่ได้ลงทะเบียนเป็นพาร์ทเนอร์" : locale === "zh" ? "您尚未注册成为合作伙伴" : "You are not yet a registered Partner"}
            </h2>
            <p className="text-gray-500 mb-6">
              {locale === "th" ? "สมัครเข้าร่วมกับ CBLUE วันนี้เพื่อรับงานและเพิ่มรายได้ของคุณ" : locale === "zh" ? "立即注册CBLUE，开始接单并增加您的收入。" : "Register with CBLUE today to start receiving jobs and growing your income."}
            </p>
            <Link href={`${prefix}/fixers/register`} className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-lg">
              {locale === "th" ? "ลงทะเบียนเลย" : locale === "zh" ? "立即注册" : "Register Now"}
            </Link>
          </div>
        )}

        {isSubscribed && isFixer && (
          <>
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
        {activeTab === "overview" && <PartnerOverview locale={locale} partner={partner} activeJobs={activeJobs} incomingJobs={incomingJobs} completedJobs={completedJobs} earnings={[]} stats={stats} notifications={notifications} />}
        {activeTab === "jobs" && <PartnerJobs locale={locale} activeJobs={activeJobs} />}
        {activeTab === "requests" && <PartnerRequests locale={locale} incomingJobs={incomingJobs} />}
        {activeTab === "properties" && <PartnerProperties locale={locale} prefix={prefix} properties={properties} />}
        {activeTab === "history" && <PartnerHistory locale={locale} completedJobs={completedJobs} />}
        {activeTab === "chat" && <PartnerChats locale={locale} chats={chats} />}
        {activeTab === "notifications" && <PartnerNotifications locale={locale} notifications={notifications} />}
        {activeTab === "profile" && <PartnerProfile locale={locale} prefix={prefix} partner={partner} />}

                  </>
        )}

        <div className="my-10 border-t border-gray-200" />

        {/* Registration Cards */}
        {(!isSubscribed || !isFixer) && !loading && (
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

        )}

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
                  
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "คุณสมบัติ" : locale === "zh" ? "资质" : "Qualifications"}</th>
                </tr></thead>
                <tbody>
                  {[
                    { tier: "Economy", fee: "฿100", stars: "⭐", qual: locale === "th" ? "ช่างทั่วไป ประสบการณ์เบื้องต้น" : locale === "zh" ? "普通技工，基础经验" : "General fixer, basic experience", color: "bg-green-50 text-green-700" },
                    { tier: "Standard", fee: "฿400", stars: "⭐⭐", qual: locale === "th" ? "ช่างมีประสบการณ์ ผลงานดี" : locale === "zh" ? "有经验，良好记录" : "Experienced, good track record", color: "bg-blue-50 text-blue-700" },
                    { tier: "Corporate", fee: "฿600", stars: "⭐⭐⭐", qual: locale === "th" ? "ช่างมืออาชีพ หรือทีมงาน" : locale === "zh" ? "专业技工或团队" : "Professional fixer or team", color: "bg-purple-50 text-purple-700" },
                    { tier: "Specialist", fee: "฿800", stars: "⭐⭐⭐⭐", qual: locale === "th" ? "ผู้เชี่ยวชาญเฉพาะทาง มีใบรับรอง" : locale === "zh" ? "认证专家" : "Certified specialist", color: "bg-amber-50 text-amber-700" },
                    { tier: "Expert", fee: "฿1,000", stars: "⭐⭐⭐⭐⭐", qual: locale === "th" ? "ผู้เชี่ยวชาญระดับสูง 10+ ปี" : locale === "zh" ? "高级专家，10+年经验" : "Senior expert, 10+ years", color: "bg-red-50 text-red-700" },
                  ].map((r) => (
                    <tr key={r.tier} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${r.color}`}>{r.tier}</span></td>
                      <td className="py-3 px-4 text-center font-bold text-gray-900">{r.fee}</td>
                      
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
function PartnerOverview({ locale, partner, activeJobs, incomingJobs, completedJobs, earnings, stats, notifications }: { locale: string; partner: PartnerInfo | null; activeJobs: any[]; incomingJobs: any[]; completedJobs: any[]; earnings: any[]; stats: any; notifications: any[] }) {
  const maxEarning = earnings.length > 0 ? Math.max(...earnings.map(e => e.amount)) : 0;
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "进行中" : "Active Jobs", value: stats.activeJobs, icon: "🔧", color: "text-sky-600" },
          { label: locale === "th" ? "เสร็จสิ้น" : locale === "zh" ? "已完成" : "Completed", value: stats.completedJobs, icon: "✅", color: "text-green-600" },
          { label: locale === "th" ? "รายได้เดือนนี้" : locale === "zh" ? "本月收入" : "Monthly Earn", value: stats.monthlyEarnings, icon: "💰", color: "text-amber-600" },
          { label: locale === "th" ? "คะแนน" : locale === "zh" ? "评分" : "Rating", value: `${stats.rating} ⭐`, icon: "🏆", color: "text-purple-600" },
          { label: locale === "th" ? "อัตราตอบรับ" : locale === "zh" ? "响应率" : "Response", value: stats.responseRate, icon: "⚡", color: "text-indigo-600" },
          { label: locale === "th" ? "ลูกค้าประจำ" : locale === "zh" ? "回头客" : "Repeat", value: stats.repeatClients, icon: "🤝", color: "text-teal-600" },
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
            {earnings.map((e) => (
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
          <span className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-bold">{activeJobs.length}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {activeJobs.map((job) => (
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
          <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">{incomingJobs.length}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {incomingJobs.slice(0, 2).map((req) => (
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
            {notifications.slice(0, 3).map((n) => (
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
            {chats && chats.length > 0 ? chats.map((c: any) => (
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
            )) : <p className="text-sm text-gray-500 py-4 text-center">{locale === "th" ? "ไม่มีแชทล่าสุด" : locale === "zh" ? "没有最近的聊天" : "No recent chats"}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== PARTNER JOBS (Active) ===== */
function PartnerJobs({ locale, activeJobs }: { locale: string; activeJobs: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">🔧 {locale === "th" ? "งานที่กำลังดำเนินการ" : locale === "zh" ? "进行中的工作" : "Active Jobs"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {activeJobs.map((job) => (
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
function PartnerRequests({ locale, incomingJobs }: { locale: string; incomingJobs: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">📋 {locale === "th" ? "คำขอใหม่ทั้งหมด" : locale === "zh" ? "所有新请求" : "All Incoming Requests"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {incomingJobs.map((req) => (
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
function PartnerHistory({ locale, completedJobs }: { locale: string; completedJobs: any[] }) {
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
            {completedJobs.map((h) => (
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

/* ===== PARTNER CHATS ===== */
function PartnerChats({ locale, chats }: { locale: string; chats: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">💬 {locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chats"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {chats && chats.length > 0 ? chats.map((c: any) => (
          <div key={c.id} className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition ${c.unread > 0 ? "bg-purple-50/50 hover:bg-purple-50" : "hover:bg-gray-50"}`}>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">{c.name.slice(-4)}</div>
              {c.online && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 truncate">{c.name}</p>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{c.service}</span>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{locale === "th" ? c.timeTh : locale === "zh" ? c.timeZh : c.time}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className={`text-sm truncate ${c.unread > 0 ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                  {locale === "th" ? c.lastMsgTh : locale === "zh" ? c.lastMsgZh : c.lastMsg}
                </p>
                {c.unread > 0 && <span className="flex-shrink-0 ml-2 w-5 h-5 bg-purple-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{c.unread}</span>}
              </div>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีแชทล่าสุด" : locale === "zh" ? "没有最近的聊天" : "No recent chats"}</p>
        )}
      </div>
    </div>
  );
}

/* ===== PARTNER NOTIFICATIONS ===== */
function PartnerNotifications({ locale, notifications }: { locale: string; notifications: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">🔔 {locale === "th" ? "การแจ้งเตือนทั้งหมด" : locale === "zh" ? "所有通知" : "All Notifications"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {notifications.map((n) => (
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
  const router = useRouter();
  if (!partner) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{locale === "th" ? "เข้าสู่ระบบเพื่อดูโปรไฟล์" : locale === "zh" ? "登录查看个人资料" : "Log in to view profile"}</h2>
        <p className="text-sm text-gray-500 mb-6">{locale === "th" ? "เข้าสู่ระบบเพื่อจัดการข้อมูลและการตั้งค่า" : locale === "zh" ? "登录管理您的合作伙伴账户" : "Sign in to manage your partner account"}</p>
        <Link href={`${prefix}/subscription/login?redirect=/fixers`} className="px-6 py-2.5 bg-sky-600 text-white rounded-lg font-bold hover:bg-sky-700 transition inline-block">
          {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Log In"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-50 flex items-center justify-center shadow-inner flex-shrink-0 relative">
            <span className="text-5xl">👤</span>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow">
              <span className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-full text-xs font-bold">✓</span>
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{partner.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">Specialist Tier</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><span className="text-green-500">✓</span> {locale === "th" ? "ยืนยันตัวตนแล้ว (KYC)" : "Verified (KYC)"}</span>
                </div>
              </div>
              <button className="px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-semibold shadow-sm">
                {locale === "th" ? "แก้ไขโปรไฟล์" : locale === "zh" ? "编辑资料" : "Edit Profile"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4 pt-4 border-t border-gray-100">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{locale === "th" ? "อีเมล" : "Email"}</h3>
                <p className="text-gray-900 font-medium text-sm truncate">{partner.email}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{locale === "th" ? "เบอร์โทรศัพท์" : "Phone"}</h3>
                <p className="text-gray-900 font-medium text-sm">{partner.phone || "-"}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{locale === "th" ? "เข้าร่วมเมื่อ" : "Member Since"}</h3>
                <p className="text-gray-900 font-medium text-sm">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise AI Assessment Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">🤖 CBLUE AI Tier Assessment</h2>
          <span className="text-xs text-gray-500 px-2 py-1 bg-white rounded border border-gray-200">Overall Score: <strong className="text-gray-900">69/100</strong></span>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h4 className="font-bold text-amber-900 text-sm">Partially Verified — Complete profile to improve</h4>
              <p className="text-xs text-amber-700 mt-1">
                Gain more experience, upload portfolio work, update certifications, and maintain good reviews — CBLUE AI will automatically re-evaluate and upgrade your tier.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Evaluation Breakdown */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Evaluation Breakdown</h3>
              <div className="space-y-4">
                {[
                  { label: "Experience", score: 25, max: 25, color: "bg-green-500" },
                  { label: "Skills Breadth", score: 12, max: 15, color: "bg-green-500" },
                  { label: "KYC Verification", score: 15, max: 15, color: "bg-green-500" },
                  { label: "Portfolio & Evidence", score: 0, max: 15, color: "bg-gray-200" },
                  { label: "Profile Completeness", score: 7, max: 10, color: "bg-amber-400" },
                  { label: "Price List", score: 6, max: 10, color: "bg-amber-400" },
                  { label: "Credential Verification", score: 4, max: 10, color: "bg-red-400" },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{item.label}</span>
                      <span className="text-gray-500 font-bold">{item.score}/{item.max}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${(item.score / item.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Verification Results */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">🔍 AI Verification Results</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2 text-gray-600">
                  <span className="text-red-500 mt-0.5">❌</span>
                  <span>No company info provided</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600">
                  <span className="text-green-500 mt-0.5">✅</span>
                  <span>Experience consistent with project type</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600">
                  <span className="text-red-500 mt-0.5">❌</span>
                  <span>No work description provided</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600">
                  <span className="text-green-500 mt-0.5">✅</span>
                  <span>KYC documents complete (front & back)</span>
                </li>
              </ul>

              <div className="mt-8 p-4 bg-gray-50 rounded-xl text-xs text-gray-500 border border-gray-100">
                <p className="flex items-center gap-2 font-medium text-gray-700 mb-1">
                  <span className="text-lg">🔒</span> Security Notice
                </p>
                Your data is encrypted and protected under PDPA. Credentials are verified to maintain platform integrity.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




/* ===== PARTNER PROPERTIES ===== */
function PartnerProperties({ locale, prefix, properties }: { locale: string; prefix: string; properties: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">🏢 {locale === "th" ? "อสังหาริมทรัพย์ของคุณ" : locale === "zh" ? "您的房产" : "Your Properties"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {properties && properties.length > 0 ? properties.map((p: any) => (
          <div key={p.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-teal-100 flex items-center justify-center text-3xl">🏢</div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{locale === "th" ? p.serviceTh : locale === "zh" ? p.serviceZh : p.service}</h3>
                    <p className="text-sm text-gray-500 mt-1">{p.location || "-"} &middot; {p.fee}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${p.status === 'AVAILABLE' || p.status === 'CREATED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm mt-4 pt-4 border-t border-gray-100">
              <Link href={`${prefix}/properties/${p.id}/edit`} className="ml-auto px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition">
                {locale === "th" ? "แก้ไข" : locale === "zh" ? "编辑" : "Edit"}
              </Link>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีประกาศอสังหาริมทรัพย์" : locale === "zh" ? "没有房产列表" : "No properties listed"}</p>
        )}
      </div>
    </div>
  );
}



/* ===== DASHBOARD LOGGED IN STATE ===== */
function PartnerDashboard({ locale, partner, prefix, onLogout }: { locale: string; partner: any; prefix: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview"|"profile">("overview");
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pb-12 -mt-6">
      
      {/* Top Navigation Pills */}
      
      <div className="flex gap-2 bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 overflow-x-auto no-scrollbar">
        {[
          { key: "overview", icon: "📊", label: "Overview", count: null },
          { key: "active", icon: "🔧", label: "Active Jobs", count: 3 },
          { key: "requests", icon: "📋", label: "Requests", count: 3 },
          { key: "properties", icon: "🏢", label: "Properties", count: null },
          { key: "history", icon: "📜", label: "History", count: null },
          { key: "chat", icon: "💬", label: "Chat", count: 3 },
          { key: "alerts", icon: "🔔", label: "Alerts", count: 3 },
          { key: "profile", icon: "👤", label: "Profile", count: null },
        ].map((tab, i) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === tab.key ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
            <span>{tab.icon}</span> {tab.label}
            {tab.count && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-red-100 text-red-700'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === "profile" && <PartnerProfile locale={locale} prefix={prefix} partner={partner} />}
      
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${activeTab !== 'overview' ? 'hidden' : ''}`}>


      
        
        {/* LEFT COLUMN: Profile & Stats */}
        <div className="space-y-6">
          
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-0 opacity-50"></div>
            <div className="relative z-10 flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-2xl font-bold shadow-inner">
                {partner.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{partner.name}</h2>
                <p className="text-sm text-gray-500">{partner.email} &middot; {partner.phone || "0819852846"}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded">Active</span>
                  <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded">Corporate Tier</span>
                  <span className="text-xs bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded">KYC ✓</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Active Jobs</p>
                <p className="text-lg font-bold text-gray-900">3</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Completed</p>
                <p className="text-lg font-bold text-gray-900">47</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Rating</p>
                <p className="text-lg font-bold text-gray-900 text-amber-500">4.8 ⭐</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Response</p>
                <p className="text-lg font-bold text-green-600">96%</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Repeat Clients</p>
                <p className="text-lg font-bold text-gray-900">12</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Monthly Earn</p>
                <p className="text-lg font-bold text-sky-600">฿18,500</p>
              </div>
            </div>
            <button onClick={onLogout} className="w-full py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-bold rounded-lg transition">
              {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出登录" : "Logout"}
            </button>
          </div>

          {/* Monthly Earnings Chart (Simplified UI) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">💰 Monthly Earnings</h3>
              <span className="text-sky-600 font-bold text-sm">฿18,500 (Apr)</span>
            </div>
            <div className="p-5 flex items-end justify-between h-32">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-200 rounded-t-sm h-12 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿12.5k</span></div>
                <span className="text-xs font-bold text-gray-500">Jan</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-300 rounded-t-sm h-16 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿15.2k</span></div>
                <span className="text-xs font-bold text-gray-500">Feb</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-400 rounded-t-sm h-20 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿18.8k</span></div>
                <span className="text-xs font-bold text-gray-500">Mar</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-500 rounded-t-sm h-16 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿18.5k</span></div>
                <span className="text-xs font-bold text-gray-900">Apr</span>
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">🔔 Recent Alerts</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-3">
                <span className="w-2 h-2 mt-1.5 rounded-full bg-purple-500 flex-shrink-0"></span>
                <div>
                  <p className="text-sm text-gray-800 font-medium">Customer #A2X sent a new message</p>
                  <p className="text-xs text-gray-400 mt-1">2m ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-2 h-2 mt-1.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                <div>
                  <p className="text-sm text-gray-800">You have 3 new job requests</p>
                  <p className="text-xs text-gray-400 mt-1">15m ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-2 h-2 mt-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                <div>
                  <p className="text-sm text-gray-800">Payment of ฿3,200 received</p>
                  <p className="text-xs text-gray-400 mt-1">1h ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Jobs & Requests */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Jobs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">🔧 Active Jobs</h2>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">3</span>
            </div>
            <div className="divide-y divide-gray-50">
              
              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer border-l-4 border-sky-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl shadow-sm">🔧</div>
                  <div>
                    <h3 className="font-bold text-gray-900">Plumbing Repair <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Standard</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Customer #A2X &middot; 2026-04-15</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">In Progress</span>
                  <span className="font-bold text-gray-900">฿2,500</span>
                </div>
              </div>

              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer border-l-4 border-emerald-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl shadow-sm">🔧</div>
                  <div>
                    <h3 className="font-bold text-gray-900">AC Maintenance <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Corporate</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Customer #B7K &middot; 2026-04-16</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Confirmed</span>
                  <span className="font-bold text-gray-900">฿4,000</span>
                </div>
              </div>

              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer border-l-4 border-amber-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl shadow-sm">🔧</div>
                  <div>
                    <h3 className="font-bold text-gray-900">Electrical Wiring <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Economy</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Customer #C4M &middot; 2026-04-17</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Pending</span>
                  <span className="font-bold text-gray-900">฿1,800</span>
                </div>
              </div>

            </div>
          </div>

          {/* Incoming Requests */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-amber-50/30">
              <h2 className="font-bold text-amber-900 flex items-center gap-2">📋 Incoming Requests</h2>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">3</span>
            </div>
            <div className="divide-y divide-gray-50">
              
              <div className="p-6 hover:bg-gray-50 transition cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shadow-sm">📋</div>
                    <div>
                      <h3 className="font-bold text-gray-900">Interior Design <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Specialist</span></h3>
                      <p className="text-sm text-gray-500 mt-1">Customer #D9P &middot; 2026-04-18</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="font-bold text-gray-900">฿15,000</p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end border-t border-gray-100 pt-4">
                  <button className="px-6 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200 transition">Decline</button>
                  <button className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition">Accept</button>
                </div>
              </div>

              <div className="p-6 hover:bg-gray-50 transition cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shadow-sm relative">
                      📋
                      <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">Urgent</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Landscaping <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Expert</span></h3>
                      <p className="text-sm text-gray-500 mt-1">Customer #E3R &middot; 2026-04-19</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="font-bold text-gray-900">฿25,000</p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end border-t border-gray-100 pt-4">
                  <button className="px-6 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200 transition">Decline</button>
                  <button className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition">Accept</button>
                </div>
              </div>

            </div>
          </div>

          {/* Recent Chats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">💬 Recent Chats</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { id: "A2X", svc: "Plumbing", msg: "Thank you, waiting for you", time: "2m ago", unread: 2 },
                { id: "B7K", svc: "AC", msg: "Which day works for you?", time: "30m ago", unread: 1 },
                { id: "C4M", svc: "Electrical", msg: "Job is done, thanks!", time: "2h ago", unread: 0 },
              ].map(c => (
                <div key={c.id} className={`p-4 flex items-center gap-4 cursor-pointer transition ${c.unread ? 'bg-purple-50/30 hover:bg-purple-50' : 'hover:bg-gray-50'}`}>
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                    {c.id}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className="font-bold text-gray-900 text-sm">Customer #{c.id} <span className="text-gray-400 font-normal">&middot; {c.svc}</span></p>
                      <span className="text-xs text-gray-400">{c.time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm ${c.unread ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{c.msg}</p>
                      {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">{c.unread}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

