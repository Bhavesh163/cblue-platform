"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import PdpaConsent from "../components/PdpaConsent";

interface SubscriberInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: string;
}

type ServiceType = "household" | "project" | "professional" | "property";





const notifications: any[] = [];

const chats: any[] = [];

const ICON_MAP: Record<string, string> = { household: "", project: "", professional: "", property: "" };
const STATUS_STYLE: Record<string, string> = {
  IN_PROGRESS: "bg-purple-100 text-purple-700",
  CONFIRMED: "bg-green-100 text-green-700",
  DEPOSIT_PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  MATCHING: "bg-yellow-100 text-yellow-700",
  VIEWING_SCHEDULED: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-indigo-100 text-indigo-700",
  DEPOSIT_PAID: "bg-green-100 text-green-700",
};
const TIER_STYLE: Record<string, string> = {
  Economy: "bg-green-50 text-green-700",
  Standard: "bg-blue-50 text-blue-700",
  Corporate: "bg-purple-50 text-purple-700",
  Specialist: "bg-amber-50 text-amber-700",
  Expert: "bg-red-50 text-red-700",
  Upper: "bg-teal-50 text-teal-700",
  Luxury: "bg-amber-50 text-amber-700",
  Grandeur: "bg-purple-50 text-purple-700",
};


const STATUS_LABEL: Record<string, Record<string, string>> = {
  IN_PROGRESS: { en: "In Progress", th: "กำลังดำเนินการ", zh: "进行中" },
  CONFIRMED: { en: "Accepted", th: "ยืนยันแล้ว", zh: "已确认" },
  DEPOSIT_PENDING: { en: "Deposit Pending", th: "รอชำระเงิน", zh: "待付款" },
  COMPLETED: { en: "Completed", th: "เสร็จสิ้น", zh: "已完成" },
  MATCHING: { en: "Matching", th: "กำลังจับคู่", zh: "匹配中" },
  PENDING: { en: "Pending", th: "รอดำเนินการ", zh: "待处理" },
  VIEWING_SCHEDULED: { en: "Viewing Scheduled", th: "นัดดูแล้ว", zh: "已安排看房" },
  CONTACTED: { en: "Contacted", th: "ติดต่อแล้ว", zh: "已联系" },
  DEPOSIT_PAID: { en: "Deposit Paid", th: "ชำระแล้ว", zh: "已付款" },
};
const getStatusLabel = (status: string, locale: string) => STATUS_LABEL[status]?.[locale] || status.replace(/_/g, " ");

type TabKey = "overview" | "bookings" | "property" | "history" | "chat" | "notifications" | "profile";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();
  const prefix = `/${locale}`;

  const [subscriber, setSubscriber] = useState<SubscriberInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showPdpa, setShowPdpa] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);



  
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("subscriber_token");
      if (!token) {
        setSubscriber(null);
      } else {
        const stored = localStorage.getItem("subscriber");
        if (stored) setSubscriber(JSON.parse(stored));
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

        // Eagerly set state from localStorage to prevent flash of logged-out state
        if (isMounted) {
          const stored = localStorage.getItem("subscriber");
          if (stored) {
            const parsed = JSON.parse(stored);
            setSubscriber(parsed);
          }
          const consent = localStorage.getItem("pdpa_consent_customer");
          if (!consent) setShowPdpa(true);
        }

        const res = await fetch("/api/v1/users/me", {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("Failed to fetch user data:", err);
          return null;
        });

        if (!res) {
          if (isMounted) {
            setSubscriber(null);
            setLoading(false);
          }
          return;
        }

        if (res.ok) {
          const user = await res.json();
          if (isMounted) {
            const hasFixer = !!user.fixer;
            let subInfo: any = { 
              id: user.id, 
              name: user.name, 
              email: user.email, 
              phone: user.phone, 
              status: "ACTIVE" 
            };

            // If they are a fixer, inject fixer info
            if (hasFixer) {
              subInfo.tier = user.fixer?.aiTier || user.fixer?.tier || "Standard";
            }

            setSubscriber(subInfo);
            // Overwrite stored to fix any bad hydration
            localStorage.setItem("subscriber", JSON.stringify(subInfo));
          }

          const ordersRes = await fetch("/api/v1/orders/my", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
          if (ordersRes && ordersRes.ok && isMounted) setOrders(await ordersRes.json());

        } else if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("subscriber_token");
          localStorage.removeItem("subscriber");
          if (isMounted) {
            setSubscriber(null);
          }
        }
      } catch { /* ignore */ }
      if (isMounted) setLoading(false);
    };
        fetchUser();
      return () => { isMounted = false; };
  }, [router, prefix]);


  
  const mappedOrders = orders.map(o => ({
    id: o.id,
    type: o.orderType?.toLowerCase() || "household",
    service: (o.serviceCategory || "").replace(/_/g, " "),
    serviceTh: (o.serviceCategory || "").replace(/_/g, " "),
    serviceZh: (o.serviceCategory || "").replace(/_/g, " "),
    partner: o.fixer?.user?.name || "Pending matching",
    date: new Date(o.createdAt).toLocaleDateString(),
    progress: o.status === 'COMPLETED' ? 100 : o.status === 'IN_PROGRESS' ? 50 : 20,
    tier: o.description?.toUpperCase().includes("TIER:ECONOMY") ? "ECONOMY" : o.description?.toUpperCase().includes("TIER:STANDARD") ? "Standard" : o.description?.toUpperCase().includes("TIER:CORPORATE") ? "Corporate" : o.description?.toUpperCase().includes("TIER:SPECIALIST") ? "Specialist" : o.description?.toUpperCase().includes("TIER:EXPERT") ? "Expert" : "Standard",
    status: o.status,
    rating: 0,
    fee: o.estimatedPrice ? `฿${o.estimatedPrice}` : "TBD"
  }));

  const activeOrders = mappedOrders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status));
  const historyOrders = mappedOrders.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status));
  const requests = activeOrders.filter(o => ['CREATED', 'MATCHING', 'PENDING'].includes(o.status));
  const properties = mappedOrders.filter(o => o.type === 'property');

  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: "overview", label: locale === "th" ? "ภาพรวม" : locale === "zh" ? "概览" : "Overview", icon: "" },
    { key: "bookings", label: locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "当前工作" : "Active Jobs", icon: "", badge: activeOrders.length },
    
    { key: "property", label: locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房产" : "Properties", icon: "", badge: properties.length > 0 ? properties.length : undefined },
    { key: "history", label: locale === "th" ? "ประวัติ" : locale === "zh" ? "历史" : "History", icon: "" },
    { key: "chat", label: locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat", icon: "", badge: undefined },
    { key: "notifications", label: locale === "th" ? "แจ้งเตือน" : locale === "zh" ? "通知" : "Alerts", icon: "", badge: undefined },
    { key: "profile", label: locale === "th" ? "โปรไฟล์" : locale === "zh" ? "个人资料" : "Profile", icon: "" },
  ];

    return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30">
      {/* PDPA Consent Modal */}
      {showPdpa && (
        <PdpaConsent
          locale={locale}
          prefix={prefix}
          role="customer"
          onAccept={(ts) => {
            localStorage.setItem("pdpa_consent_customer", ts);
            setShowPdpa(false);
          }}
        />
      )}
      {/* Hero Header with scenic background */}
      <div className="relative overflow-hidden">
        <Image src="/images/scenic-building.jpg" alt="" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/90 to-blue-800/80" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
              <p className="text-sky-200 text-sm mt-1">
                {locale === "th" ? "จัดการบริการ คำสั่ง แชท และข้อมูลบัญชีของคุณ" : locale === "zh" ? "管理您的服务、预约、聊天和账户" : "Manage your services, bookings, chat, and account"}
              </p>
            </div>
            {subscriber ? (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-2.5">
                <div className="w-10 h-10 rounded-full bg-sky-400/30 flex items-center justify-center text-white font-bold">{subscriber.name?.charAt(0) || "U"}</div>
                <div>
                  <p className="text-white text-sm font-semibold">{subscriber.name}</p>
                  <p className="text-sky-200 text-xs">{subscriber.email}</p>
                </div>
                <button
                  onClick={() => { localStorage.removeItem("subscriber"); localStorage.removeItem("subscriber_token"); localStorage.removeItem("pdpa_consent_customer"); localStorage.removeItem("ghis_mock_payments"); localStorage.removeItem("ghis_mock_active"); localStorage.removeItem("ghis_mock_dyn_req"); localStorage.removeItem("ghis_mock_history"); window.dispatchEvent(new Event("storage")); router.push(prefix); }}
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
        {/* Subscribe CTA (when not logged in) */}
        {!subscriber && !loading && (
          <div className="bg-gradient-to-r from-sky-600 to-blue-700 rounded-2xl p-8 mb-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold">{locale === "th" ? "เริ่มต้นกับ CBLUE" : locale === "zh" ? "开始CBLUE之旅" : "Get Started with CBLUE"}</h2>
                <p className="text-sky-100 mt-2">{locale === "th" ? "เข้าถึงช่างซ่อมบ้าน ทีมโครงการ มืออาชีพ และอสังหาริมทรัพย์ที่ผ่านการตรวจสอบ" : locale === "zh" ? "访问经过验证的技工、项目团队、专业人士和房产" : "Access verified fixers, project teams, professionals, and properties"}</p>
              </div>
              <div className="flex gap-3">
                <Link href={`${prefix}/subscription/login`} className="px-6 py-3 bg-white text-sky-700 rounded-xl font-bold text-sm hover:bg-sky-50 transition shadow-lg whitespace-nowrap">
                  {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Log In"}
                </Link>
                <Link href={`${prefix}/subscription/register`} className="px-6 py-3 border-2 border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition whitespace-nowrap">
                  {locale === "th" ? "สมัครสมาชิก" : locale === "zh" ? "注册" : "Register"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Book - 4 Services */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { href: `${prefix}/booking/household`, icon: "", label: locale === "th" ? "จองช่างซ่อมบ้าน" : locale === "zh" ? "预约技工" : "Book Fixer", desc: locale === "th" ? "ประปา ไฟฟ้า แอร์" : locale === "zh" ? "管道、电气、空调" : "Plumbing, Electrical, AC", color: "from-sky-500 to-blue-600" },
            { href: `${prefix}/booking/project`, icon: "", label: locale === "th" ? "จองทีมโครงการ" : locale === "zh" ? "预约项目团队" : "Book Project Team", desc: locale === "th" ? "เว็บ AI สมาร์ทโฮม" : locale === "zh" ? "网站、AI、智能家居" : "Web, AI, Smart Home", color: "from-indigo-500 to-purple-600" },
            { href: `${prefix}/booking/professional`, icon: "", label: locale === "th" ? "จองมืออาชีพ" : locale === "zh" ? "预约专业人士" : "Book Professional", desc: locale === "th" ? "ทนาย สถาปนิก วิศวกร" : locale === "zh" ? "律师、建筑师、工程师" : "Lawyer, Architect, Engineer", color: "from-emerald-500 to-teal-600" },
            { href: `${prefix}/properties`, icon: "", label: locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房产" : "Book Property", desc: locale === "th" ? "ซื้อ ขาย เช่า" : locale === "zh" ? "买、卖、租" : "Buy, Sell, Rent", color: "from-amber-500 to-orange-600" },
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

        
        {/* Main Content */}
        {subscriber && !loading && (
          <CustomerDashboard locale={locale} subscriber={subscriber} prefix={prefix} orders={orders} onLogout={() => {
            localStorage.removeItem("subscriber"); 
            localStorage.removeItem("subscriber_token"); 
            localStorage.removeItem("pdpa_consent_customer"); 
            localStorage.removeItem("ghis_mock_payments");
            localStorage.removeItem("ghis_mock_active");
            localStorage.removeItem("ghis_mock_dyn_req");
            localStorage.removeItem("ghis_mock_history");
            window.dispatchEvent(new Event("storage"));
            router.push(prefix);
          }} />
        )}
{/* Tier Comparison */}
      <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {locale === "th" ? "เปรียบเทียบระดับบริการ" : locale === "zh" ? "服务等级比较" : "Tier Comparison"}
        </h2>
        <p className="text-sm text-gray-500 mb-5">{locale === "th" ? "ค่าธรรมเนียมดำเนินการต่อการจับคู่" : locale === "zh" ? "每次匹配的处理费" : "Processing fee per matching"}</p>

        {/* Fixer & Professional Tiers */}
        <h3 className="text-sm font-semibold text-gray-700 mb-3"> {locale === "th" ? "ช่างซ่อม / มืออาชีพ" : locale === "zh" ? "技工 / 专业人士" : "Fixer / Professional"}</h3>
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { name: "Economy", fee: "฿100", color: "border-green-200 bg-green-50", textColor: "text-green-700", desc: locale === "th" ? "บริการทั่วไป" : locale === "zh" ? "基础服务" : "Basic" },
            { name: "Standard", fee: "฿400", color: "border-blue-200 bg-blue-50", textColor: "text-blue-700", desc: locale === "th" ? "มาตรฐาน" : locale === "zh" ? "标准" : "Standard" },
            { name: "Corporate", fee: "฿600", color: "border-purple-200 bg-purple-50", textColor: "text-purple-700", desc: locale === "th" ? "องค์กร" : locale === "zh" ? "企业" : "Corporate" },
            { name: "Specialist", fee: "฿800", color: "border-amber-200 bg-amber-50", textColor: "text-amber-700", desc: locale === "th" ? "ผู้ชำนาญ" : locale === "zh" ? "专家" : "Specialist" },
            { name: "Expert", fee: "฿1,000", color: "border-red-200 bg-red-50", textColor: "text-red-700", desc: locale === "th" ? "ผู้เชี่ยวชาญ" : locale === "zh" ? "大师" : "Expert" },
          ].map((item) => (
            <div key={item.name} className={`rounded-xl border-2 p-4 text-center ${item.color}`}>
              <h3 className={`font-bold text-sm ${item.textColor}`}>{item.name}</h3>
              <p className={`text-2xl font-extrabold ${item.textColor} mt-1`}>{item.fee}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Property Tiers */}
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房产" : "Property"}</h3>
        <div className="grid grid-cols-5 gap-3">
          {[
            { name: "Economy", fee: "฿100", color: "border-green-200 bg-green-50", textColor: "text-green-700", desc: locale === "th" ? "ห้องเช่า" : locale === "zh" ? "房间" : "Room" },
            { name: "Standard", fee: "฿400", color: "border-blue-200 bg-blue-50", textColor: "text-blue-700", desc: locale === "th" ? "คอนโด" : locale === "zh" ? "公寓" : "Condo" },
            { name: "Upper", fee: "฿600", color: "border-teal-200 bg-teal-50", textColor: "text-teal-700", desc: locale === "th" ? "บ้าน" : locale === "zh" ? "别墅" : "House" },
            { name: "Luxury", fee: "฿800", color: "border-amber-200 bg-amber-50", textColor: "text-amber-700", desc: locale === "th" ? "หรูหรา" : locale === "zh" ? "豪华" : "Luxury" },
            { name: "Grandeur", fee: "฿1,000", color: "border-purple-200 bg-purple-50", textColor: "text-purple-700", desc: locale === "th" ? "พรีเมียม" : locale === "zh" ? "顶级" : "Premium" },
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
function OverviewTab({ locale, subscriber, activeOrders, historyOrders, chats, notifications }: { locale: string; subscriber: any; activeOrders: any[]; onOrderClick?: (o: any) => void; historyOrders: any[]; chats: any[]; notifications: any[] }) {
  const STATUS_STYLE: any = {
    "CREATED": "bg-gray-100 text-gray-700",
    "MATCHING": "bg-yellow-100 text-yellow-700",
    "PENDING": "bg-blue-100 text-blue-700",
    "COMPLETED": "bg-green-100 text-green-700",
    "CANCELLED": "bg-red-100 text-red-700"
  };

  const getStatusLabel = (status: string, locale: string) => {
    const labels: any = {
      "CREATED": { th: "รอดำเนินการ", zh: "等待中", en: "Created" },
      "MATCHING": { th: "กำลังจับคู่", zh: "匹配中", en: "Matching" },
      "PENDING": { th: "กำลังดำเนินการ", zh: "进行中", en: "Pending" },
      "COMPLETED": { th: "เสร็จสิ้น", zh: "已完成", en: "Completed" },
      "CANCELLED": { th: "ยกเลิก", zh: "已取消", en: "Cancelled" }
    };
    return labels[status]?.[locale] || status;
  };

    return (
    <div className="space-y-6 lg:col-span-2">
      {/* Pending Tasks */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "งานที่กำลังดำเนินการ" : locale === "zh" ? "进行中的任务" : "Active Tasks"}</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {activeOrders.length > 0 ? activeOrders.slice(0, 3).map((job: any) => (
            <div key={job.id} className="p-6 flex items-center gap-4 hover:bg-gray-50 transition">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">{job.type === 'household' ? '' : job.type === 'project' ? '' : job.type === 'professional' ? '' : ''}</div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{locale === "th" ? job.serviceTh : locale === "zh" ? job.serviceZh : job.service}</h3>
                    <p className="text-sm text-gray-500 mt-1">{job.date}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLE[job.status] || ""}`}>{getStatusLabel(job.status, locale)}</span>
                </div>
              </div>
            </div>
          )) : (
            <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีงานที่กำลังดำเนินการ" : locale === "zh" ? "没有进行中的任务" : "No active tasks"}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== BOOKINGS TAB ===== */
function BookingsTab({ locale, activeOrders }: { locale: string; activeOrders: any[]; onOrderClick?: (o: any) => void }) {
  const STATUS_STYLE: any = {
    "CREATED": "bg-gray-100 text-gray-700",
    "MATCHING": "bg-yellow-100 text-yellow-700",
    "PENDING": "bg-blue-100 text-blue-700",
  };

  const getStatusLabel = (status: string, locale: string) => {
    const labels: any = {
      "CREATED": { th: "รอดำเนินการ", zh: "等待中", en: "Created" },
      "MATCHING": { th: "กำลังจับคู่", zh: "匹配中", en: "Matching" },
      "PENDING": { th: "กำลังดำเนินการ", zh: "进行中", en: "Pending" }
    };
    return labels[status]?.[locale] || status;
  };

    return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "การจองของฉัน" : locale === "zh" ? "我的预订" : "My Bookings"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {activeOrders.length > 0 ? activeOrders.map((b: any) => (
          <div key={b.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
                {b.type === 'household' ? '' : b.type === 'project' ? '' : b.type === 'professional' ? '' : ''}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{locale === "th" ? b.serviceTh : locale === "zh" ? b.serviceZh : b.service}</h3>
                    <p className="text-sm text-gray-500 mt-1">{b.date}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLE[b.status] || ""}`}>{getStatusLabel(b.status, locale)}</span>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีการจอง" : locale === "zh" ? "没有预订" : "No bookings"}</p>
        )}
      </div>
    </div>
  );
}



/* ===== HISTORY TAB ===== */
function HistoryTab({ locale, historyOrders }: { locale: string; historyOrders: any[] }) {
  const getStatusLabel = (status: string, locale: string) => {
    const labels: any = {
      "COMPLETED": { th: "เสร็จสิ้น", zh: "已完成", en: "Completed" },
      "CANCELLED": { th: "ยกเลิก", zh: "已取消", en: "Cancelled" }
    };
    return labels[status]?.[locale] || status;
  };

    return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "ประวัติการใช้บริการ" : locale === "zh" ? "服务历史" : "Service History"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {historyOrders && historyOrders.length > 0 ? historyOrders.map((h: any) => (
          <div key={h.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                {h.type === 'household' ? '' : h.type === 'project' ? '' : h.type === 'professional' ? '' : ''}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{locale === "th" ? h.serviceTh : locale === "zh" ? h.serviceZh : h.service}</h3>
                    <p className="text-sm text-gray-500 mt-1">{h.date}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${h.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{getStatusLabel(h.status, locale)}</span>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีประวัติการใช้บริการ" : locale === "zh" ? "没有服务历史" : "No service history"}</p>
        )}
      </div>
    </div>
  );
}

/* ===== PROFILE TAB ===== */
function ProfileTab({ locale, prefix, subscriber, activeOrders, historyOrders }: { locale: string; prefix: string; subscriber: any; activeOrders: any[]; onOrderClick?: (o: any) => void; historyOrders: any[] }) {
    return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-50 flex items-center justify-center shadow-inner flex-shrink-0 relative group cursor-pointer overflow-hidden">
          <span className="text-5xl"></span>
        </div>
        
        <div className="flex-1 w-full">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{subscriber?.name || "User"}</h2>
              <p className="text-gray-500 flex items-center gap-2 mt-1">
                <span className="text-green-500">✓</span> {locale === "th" ? "ยืนยันตัวตนแล้ว (KYC)" : locale === "zh" ? "已验证 (KYC)" : "Verified (KYC)"}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 transition text-sm font-semibold">
                {locale === "th" ? "แก้ไขโปรไฟล์" : locale === "zh" ? "编辑资料" : "Edit Profile"}
              </button>
              <button onClick={() => {
                if (confirm(locale === "th" ? "ยืนยันการลบบัญชีและข้อมูลทั้งหมดตามกฎหมาย PDPA?" : "Accept deleting your account and all data per PDPA law?")) {
                  fetch('/api/v1/users/me', { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('subscriber_token') || ''}` } })
                  .then(() => { localStorage.clear(); window.location.href = `/${locale}/subscription/login`; });
                }
              }} className="px-4 py-2 border border-red-200 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition text-sm font-semibold">
                {locale === "th" ? "ลบบัญชี" : locale === "zh" ? "删除账户" : "Delete Account"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">{locale === "th" ? "เบอร์โทรศัพท์" : locale === "zh" ? "电话号码" : "Phone Number"}</h3>
              <p className="text-gray-900 font-medium">{subscriber?.phone || "-"}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">{locale === "th" ? "อีเมล" : locale === "zh" ? "电子邮件" : "Email"}</h3>
              <p className="text-gray-900 font-medium">{subscriber?.email || "-"}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">{locale === "th" ? "วันที่สมัคร" : locale === "zh" ? "注册日期" : "Member Since"}</h3>
              <p className="text-gray-900 font-medium">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== CHAT TAB ===== */
function ChatTab({ locale, chats }: { locale: string; chats: any[] }) {
    return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chats"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {chats && chats.length > 0 ? chats.map((c: any) => (
          <div key={c.id} className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition ${c.unread > 0 ? "bg-sky-50/50 hover:bg-sky-50" : "hover:bg-gray-50"}`}>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">{c.name.slice(-4)}</div>
              {c.online && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <p className="font-bold text-gray-900 truncate">{c.name} <span className="text-gray-400 font-normal">· {c.service}</span></p>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{locale === "th" ? c.timeTh : locale === "zh" ? c.timeZh : c.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <p className={`text-sm truncate ${c.unread > 0 ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                  {locale === "th" ? c.lastMsgTh : locale === "zh" ? c.lastMsgZh : c.lastMsg}
                </p>
                {c.unread > 0 && <span className="flex-shrink-0 ml-2 w-5 h-5 bg-sky-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{c.unread}</span>}
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

/* ===== NOTIFICATIONS TAB ===== */
function NotificationsTab({ locale, notifications }: { locale: string; notifications: any[] }) {
    return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "การแจ้งเตือน" : locale === "zh" ? "通知" : "Notifications"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {notifications && notifications.length > 0 ? notifications.map((n: any) => (
          <div key={n.id} className={`flex items-center gap-4 px-6 py-4 transition ${n.unread ? "bg-sky-50/50" : "hover:bg-gray-50"}`}>
            <span className={`w-3 h-3 rounded-full ${n.dot} flex-shrink-0`} />
            <p className="text-sm text-gray-800 flex-1">{locale === "th" ? n.msgTh : locale === "zh" ? n.msgZh : n.msg}</p>
            <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
            {n.unread && <span className="w-2.5 h-2.5 bg-sky-500 rounded-full" />}
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีการแจ้งเตือน" : locale === "zh" ? "没有通知" : "No recent alerts"}</p>
        )}
      </div>
    </div>
  );
}

/* ===== PROPERTY TAB ===== */
function PropertyTab({ locale, prefix, properties }: { locale: string; prefix: string; properties: any[] }) {
  const STATUS_STYLE: any = {
    "CREATED": "bg-gray-100 text-gray-700",
    "MATCHING": "bg-yellow-100 text-yellow-700",
    "PENDING": "bg-blue-100 text-blue-700",
    "COMPLETED": "bg-green-100 text-green-700",
    "CANCELLED": "bg-red-100 text-red-700"
  };

  const getStatusLabel = (status: string, locale: string) => {
    const labels: any = {
      "CREATED": { th: "รอดำเนินการ", zh: "等待中", en: "Created" },
      "MATCHING": { th: "กำลังจับคู่", zh: "匹配中", en: "Matching" },
      "PENDING": { th: "กำลังดำเนินการ", zh: "进行中", en: "Pending" },
      "COMPLETED": { th: "เสร็จสิ้น", zh: "已完成", en: "Completed" },
      "CANCELLED": { th: "ยกเลิก", zh: "已取消", en: "Cancelled" }
    };
    return labels[status]?.[locale] || status;
  };

    return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "การนัดหมายดูอสังหาริมทรัพย์" : locale === "zh" ? "房产查询" : "Property Inquiries"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {properties && properties.length > 0 ? properties.map((p: any) => (
          <div key={p.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-2xl"></div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{locale === "th" ? p.serviceTh : locale === "zh" ? p.serviceZh : p.service} <span className="text-gray-400 font-normal">· {p.partner}</span></h3>
                    <p className="text-sm text-gray-500 mt-1">{p.fee}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLE[p.status] || ""}`}>{getStatusLabel(p.status, locale)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <Link href={`${prefix}/chat/${p.id}`} className="flex-1 text-center py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition">
                {locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat"}
              </Link>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีรายการอสังหาริมทรัพย์" : locale === "zh" ? "没有房产查询" : "No property inquiries"}</p>
        )}
      </div>
    </div>
  );
}



/* ===== DASHBOARD LOGGED IN STATE ===== */
function CustomerDashboard({ locale, subscriber, prefix, onLogout, orders }: { locale: string; subscriber: any; prefix: string; onLogout: () => void, orders: any[] }) {
  const [activeTab, setActiveTab] = useState<"overview"|"requests"|"profile"|"active"|"properties"|"history"|"chat"|"alerts">("overview");
  const [waitModalOrder, setWaitModalOrder] = useState<any>(null);
  const [chatFeed, setChatFeed] = useState<any[]>([]);
  const toDisplayDateTime = (value: any) => {
    const ts = typeof value === "number" ? value : new Date(value || 0).getTime();
    if (!Number.isFinite(ts) || ts <= 0) return "";
    return new Date(ts).toLocaleString();
  };
  const parseDateMs = (value: any) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const asNum = Number(value);
      if (Number.isFinite(asNum) && asNum > 0) return asNum;
    }
    const ts = new Date(value || 0).getTime();
    return Number.isFinite(ts) ? ts : 0;
  };
  const extractPo = (orderLike: any) => {
    if (!orderLike) return "";
    if (typeof orderLike.po === "string" && orderLike.po.trim()) return orderLike.po.trim();
    const desc = String(orderLike.description || orderLike.desc || "");
    const fromDesc = desc.match(/PO-[A-Za-z0-9-]+/)?.[0] || "";
    return fromDesc;
  };
  const isPoCode = (value: string) => /^PO-[A-Za-z0-9-]+$/.test(value);
  const handleOrderClick = (o: any) => {
    const status = String(o?.status || "").trim().toUpperCase();
    if (["MATCHING", "CREATED", "PENDING"].includes(status)) {
      window.location.href = `${prefix}/booking/resume/${o.id}`;
      return;
    }
    const chatId = extractPo(o) || o.id;
    try {
      localStorage.setItem(`chat_from_${chatId}`, "dashboard");
    } catch {
      // Non-blocking fallback for demo mode.
    }
    window.location.href = `${prefix}/chat/${chatId}`;
  };

    // MOCK CARDS - SSR-safe: never read localStorage in useState init (runs on server → throws)
  const [mockPayments, setMockPayments] = useState<Record<string, boolean>>({});
  const [mockActiveItems, setMockActiveItems] = useState<any[]>([]);
  const [mockDynRequests, setMockDynRequests] = useState<any[]>([]);
  const [mockHistory, setMockHistory] = useState<any[]>([]);
  const [mockReady, setMockReady] = useState(false);
  // Load from localStorage AFTER mount (useEffect never runs on server)
  useEffect(() => {
    try {
      const p = localStorage.getItem("ghis_mock_payments");
      const a = localStorage.getItem("ghis_mock_active");
      const d = localStorage.getItem("ghis_mock_dyn_req");
      const h = localStorage.getItem("ghis_mock_history");
      if (p) setMockPayments(JSON.parse(p));
      if (a) setMockActiveItems(JSON.parse(a));
      if (d) setMockDynRequests(JSON.parse(d));
      if (h) setMockHistory(JSON.parse(h));
    } catch {}
    setMockReady(true);
  }, []);
  // Persist (mockReady guard prevents overwriting storage on first empty render)
  useEffect(() => { if (mockReady) try { localStorage.setItem("ghis_mock_payments", JSON.stringify(mockPayments)); } catch {} }, [mockPayments, mockReady]);
  useEffect(() => { if (mockReady) try { localStorage.setItem("ghis_mock_active", JSON.stringify(mockActiveItems)); } catch {} }, [mockActiveItems, mockReady]);
  useEffect(() => { if (mockReady) try { localStorage.setItem("ghis_mock_dyn_req", JSON.stringify(mockDynRequests)); } catch {} }, [mockDynRequests, mockReady]);
  useEffect(() => { if (mockReady) try { localStorage.setItem("ghis_mock_history", JSON.stringify(mockHistory)); } catch {} }, [mockHistory, mockReady]);

  useEffect(() => {
    try {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab && ["overview", "requests", "profile", "active", "properties", "history", "chat", "alerts"].includes(tab)) {
        setActiveTab(tab as any);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const syncMockState = () => {
      try {
        const p = localStorage.getItem("ghis_mock_payments");
        const a = localStorage.getItem("ghis_mock_active");
        const d = localStorage.getItem("ghis_mock_dyn_req");
        const h = localStorage.getItem("ghis_mock_history");
        if (p) setMockPayments(JSON.parse(p));
        if (a) setMockActiveItems(JSON.parse(a));
        if (d) setMockDynRequests(JSON.parse(d));
        if (h) setMockHistory(JSON.parse(h));
      } catch {}
    };
    window.addEventListener("storage", syncMockState);
    const timer = setInterval(syncMockState, 1200);
    return () => {
      window.removeEventListener("storage", syncMockState);
      clearInterval(timer);
    };
  }, []);

  const buildChatFeed = () => {
    if (typeof window === "undefined") return [];
    let viewerEmail = "";
    let viewerUserId = "";
    try {
      const sub = JSON.parse(localStorage.getItem("subscriber") || "{}");
      viewerEmail = sub?.email || "";
      viewerUserId = sub?.id || "";
    } catch {}
    const normalizedViewerEmail = String(viewerEmail || "").trim().toLowerCase();
    const normalizedViewerUserId = String(viewerUserId || "").trim().toLowerCase();
    const parseChatSort = (msg: any) => {
      const numericId = Number(String(msg?.id || "").replace(/[^0-9]/g, ""));
      if (Number.isFinite(numericId) && numericId > 0) return numericId;
      return parseDateMs(msg?.createdAt || msg?.time || 0);
    };
    const isOwnSender = (sender: any) => {
      const normalizedSender = String(sender || "").trim().toLowerCase();
      if (!normalizedSender) return true;
      if (normalizedSender === normalizedViewerEmail) return true;
      if (normalizedViewerUserId && normalizedSender === normalizedViewerUserId) return true;
      return ["customer", "me", "guest", "system"].includes(normalizedSender);
    };
    const isVisibleMessage = (m: any) => {
      if (!m || typeof m.text !== "string") return false;
      if (!m.text.trim()) return false;
      if (m.sender === "system") return false;
      const lowerText = m.text.toLowerCase();
      if (lowerText.includes("just be paid by customer")) return false;
      if (lowerText.includes("notify to proceed")) return false;
      return true;
    };
    const isIncomingMessage = (m: any) => isVisibleMessage(m) && !isOwnSender(m.sender);
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("chat_messages_"));
    const items: any[] = [];
    for (const key of keys) {
      try {
        const po = key.replace("chat_messages_", "");
        if (!isPoCode(po)) continue;
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(parsed) || parsed.length === 0) continue;
        const reversed = [...parsed].reverse();
        const latestVisible = reversed.find((m: any) => isVisibleMessage(m));
        if (!latestVisible) continue;
        const latestIncoming = reversed.find((m: any) => isIncomingMessage(m));
        const title = localStorage.getItem(`chat_title_${po}`) || `Chat - ${po}`;
        items.push({
          id: po,
          po,
          name: title,
          lastMsg: latestVisible.text,
          time: latestVisible.time || toDisplayDateTime(latestVisible.createdAt) || "",
          incomingMsg: latestIncoming?.text || "",
          incomingTime: latestIncoming?.time || toDisplayDateTime(latestIncoming?.createdAt) || "",
          hasIncoming: Boolean(latestIncoming),
          sort: parseChatSort(latestVisible),
        });
      } catch {}
    }
    items.sort((a, b) => b.sort - a.sort);
    return items;
  };

  const buildBackendChatFeed = async () => {
    if (typeof window === "undefined") return [];
    const token = localStorage.getItem("subscriber_token") || "";
    if (!token) return [];

    const viewerUserId = String(subscriber?.id || "");
    const items: any[] = [];

    for (const order of (orders || [])) {
      const orderId = order?.id;
      if (!orderId) continue;

      try {
        const res = await fetch(`/api/v1/orders/${orderId}/chat`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) continue;

        const messages = await res.json();
        if (!Array.isArray(messages) || messages.length === 0) continue;

        const po = extractPo(order) || `PO-${String(orderId).slice(0, 8).toUpperCase()}`;
        if (!isPoCode(po)) continue;

        const visible = messages.filter((m: any) => {
          const text = String(m?.text || "").trim();
          if (!text) return false;
          const lowerText = text.toLowerCase();
          if (lowerText.includes("just be paid by customer")) return false;
          if (lowerText.includes("notify to proceed")) return false;
          return true;
        });
        if (visible.length === 0) continue;

        const latestVisible = visible[visible.length - 1];
        const incoming = [...visible].reverse().find((m: any) => String(m?.senderUserId || "") !== viewerUserId);
        const title =
          localStorage.getItem(`chat_title_${po}`) ||
          `${String(order?.serviceCategory || "Service").replace(/_/g, " ")} - ${po} - ${order?.estimatedPrice ? `฿${Number(order.estimatedPrice).toLocaleString()}` : "฿0"}`;

        items.push({
          id: po,
          po,
          name: title,
          lastMsg: String(latestVisible?.text || ""),
          time: toDisplayDateTime(latestVisible?.createdAt) || "",
          incomingMsg: incoming ? String(incoming?.text || "") : "",
          incomingTime: incoming ? (toDisplayDateTime(incoming?.createdAt) || "") : "",
          hasIncoming: Boolean(incoming),
          sort: parseDateMs(latestVisible?.createdAt),
          source: "backend",
        });
      } catch {
        // Ignore per-order failures and continue with available data.
      }
    }

    items.sort((a, b) => b.sort - a.sort);
    return items;
  };

  useEffect(() => {
    let isMounted = true;

    const syncChats = async () => {
      const localItems = buildChatFeed();
      const backendItems = await buildBackendChatFeed();

      const merged = new Map<string, any>();
      for (const item of localItems) merged.set(item.po, item);
      for (const item of backendItems) merged.set(item.po, item);

      const mergedList = Array.from(merged.values()).sort((a: any, b: any) => Number(b.sort || 0) - Number(a.sort || 0));
      if (isMounted) setChatFeed(mergedList);
    };

    void syncChats();

    const syncEvent = () => {
      void syncChats();
    };

    window.addEventListener("storage", syncEvent);
    window.addEventListener("cblue-chat-updated", syncEvent as EventListener);
    const timer = setInterval(() => {
      void syncChats();
    }, 5000);
    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncEvent);
      window.removeEventListener("cblue-chat-updated", syncEvent as EventListener);
      clearInterval(timer);
    };
  }, [orders, subscriber?.id]);

  const REQUESTS_MOCK = [
    { id: "req1", title: "REINSTATEMENT", customer: "Suppadesh", date: "5/11/2026, 2:30:00 PM", budget: "฿5,000,000", po: "PO-2605-1200", tier: "ECONOMY", desc: "I want a team to carry out a 3000 sq.m. housing project." },
    { id: "req2", title: "FITOUT", customer: "Suppadesh", date: "5/11/2026, 2:35:00 PM", budget: "฿25,000,000", po: "PO-2605-6812", tier: "STANDARD", desc: "I want to have a project team to carry out a 1000 sq.m. office fitout in Bangkok" },
    { id: "req3", title: "GREEN CONSTRUCTION", customer: "Suppadesh", date: "5/11/2026, 2:40:00 PM", budget: "฿45,000,000", po: "PO-2605-8471", tier: "ECONOMY", desc: "I want a team to carry out a 3000 sq.m. green housing project in Bangkok." },
  ];

  const ACTIVE_MOCK = [
    { title: "REINSTATEMENT", customer: "Suppadesh", date: "5/11/2026, 2:30:00 PM", budget: "฿5,000,000", po: "PO-2605-1200", location: "Saphansong", tier: "ECONOMY", actionNeeded: true, step: 6 },
    { title: "FITOUT", customer: "Suppadesh", date: "5/11/2026, 2:32:00 PM", budget: "฿25,000,000", po: "PO-2605-0265", location: "Saphansong", tier: "Standard", actionNeeded: false, step: 6 },
    { title: "FITOUT", customer: "Suppadesh", date: "5/11/2026, 2:35:00 PM", budget: "฿25,000,000", po: "PO-2605-6812", location: "Saphansong", tier: "Standard", actionNeeded: true, step: 6 },
    { title: "GREEN CONSTRUCTION", customer: "Suppadesh", date: "5/11/2026, 2:40:00 PM", budget: "฿45,000,000", po: "PO-2605-8471", location: "Saphansong", tier: "ECONOMY", actionNeeded: true, step: 6 },
    { title: "FITOUT", customer: "Suppadesh", date: "5/11/2026, 2:45:00 PM", budget: "฿25,000,000", po: "PO-2605-6716", location: "Saphansong", tier: "Standard", actionNeeded: false, step: 5 },
    { title: "REINSTATEMENT", customer: "Suppadesh", date: "5/11/2026, 2:50:00 PM", budget: "฿5,000,000", po: "PO-2605-9605", location: "Saphansong", tier: "ECONOMY", actionNeeded: false, step: 7 },
  ];

  // Merge: mockActiveItems overrides ACTIVE_MOCK items with same po (for step progression)
  const paidPOs = new Set(mockActiveItems.map((x: any) => x.po));
  const completedPOs = new Set(mockHistory.map((x: any) => x.po));
  const filteredStaticMock = (subscriber?.email?.includes('ghis') ? ACTIVE_MOCK : []).filter((item: any) => !paidPOs.has(item.po) && !completedPOs.has(item.po));
  const backendActiveItems = (orders || [])
    .filter((o: any) => !['COMPLETED', 'CANCELLED', 'DONE'].includes(String(o?.status || '').toUpperCase()))
    .map((o: any) => {
      const status = String(o?.status || '').toUpperCase();
      const po = extractPo(o) || `PO-${String(o?.id || '').slice(0, 8).toUpperCase()}`;
      const tier = String(o?.description || '').match(/TIER:([A-Za-z]+)/)?.[1] || "Standard";
      const stepByStatus: Record<string, number> = {
        CREATED: 5,
        MATCHING: 5,
        PENDING: 5,
        CONFIRMED: 6,
        ACCEPTED: 6,
        IN_PROGRESS: 7,
        CHAT_READY: 7,
        MEETING_REQUESTED: 8,
        MEETING_CONFIRMED: 8,
        VARIATION_PENDING: 9,
        COMPLETE_PENDING: 10,
        WORKING: 10,
        RATING_PENDING: 11,
      };
      const step = stepByStatus[status] || 5;
      return {
        id: o.id,
        orderId: o.id,
        po,
        title: (o.serviceCategory || '').replace(/_/g, ' '),
        customer: o.fixer?.user?.name || o.partnerName || 'Suppadesh',
        customerName: o.fixer?.user?.name || o.partnerName || 'Suppadesh',
        fixerAlias: o.fixer?.user?.name || o.partnerName || 'Suppadesh',
        partnerName: o.fixer?.user?.name || o.partnerName || 'Suppadesh',
        date: toDisplayDateTime(o.createdAt),
        createdAt: parseDateMs(o.createdAt),
        budget: o.estimatedPrice ? `฿${Number(o.estimatedPrice).toLocaleString()}` : '฿0',
        location: o.subdistrict || 'Saphansong',
        tier,
        actionNeeded: [6, 8, 9, 10, 11].includes(step),
        step,
        description: o.description || '',
      };
    });
  const existingActivePos = new Set([...filteredStaticMock, ...mockActiveItems].map((x: any) => x.po));
  const mergedBackendActive = backendActiveItems.filter((x: any) => !completedPOs.has(x.po) && !existingActivePos.has(x.po));
  const combinedActive = [...filteredStaticMock, ...mockActiveItems.filter((x: any) => !completedPOs.has(x.po)), ...mergedBackendActive]
    .sort((a: any, b: any) => parseDateMs(b.createdAt || b.date) - parseDateMs(a.createdAt || a.date));
  const allRequestItems = [...(subscriber?.email?.includes('ghis') ? REQUESTS_MOCK : []), ...mockDynRequests]
    .filter((m: any) => !mockPayments[m.id])
    .sort((a: any, b: any) => parseDateMs(b.createdAt || b.date) - parseDateMs(a.createdAt || a.date));
  const overviewRequestItems = allRequestItems.slice(0, 3);
  const upcomingMeetings = mockDynRequests
    .filter((x: any) => x.type === "meeting_scheduled")
    .sort((a: any, b: any) => parseDateMs(a.createdAt || a.date) - parseDateMs(b.createdAt || b.date));
  const workflowAlerts = mockDynRequests
    .map((x: any) => {
      const stableTime = x.date || toDisplayDateTime(x.createdAt) || "";
      const createdAt = x.createdAt || parseDateMs(x.date);
      if (x.type === "payment_pending") return { id: `a-${x.id}`, msg: "Partner accepted PO — please proceed to pay fee.", time: stableTime, createdAt, dot: "bg-blue-500" };
      if (x.type === "chat_ready") return { id: `a-${x.id}`, msg: "Chat is active — send meeting invitation when ready.", time: stableTime, createdAt, dot: "bg-sky-500" };
      if (x.type === "meeting_pending_partner") return { id: `a-${x.id}`, msg: "Meeting invitation sent — waiting for partner confirmation.", time: stableTime, createdAt, dot: "bg-amber-500" };
      if (x.type === "meeting_scheduled") return { id: `a-${x.id}`, msg: "Confirm meeting at site", time: stableTime, createdAt, dot: "bg-teal-500" };
      if (x.type === "variation_pending") return { id: `a-${x.id}`, msg: "Request for Approval of Variation", time: stableTime, createdAt, dot: "bg-purple-500" };
      if (x.type === "complete_pending") return { id: `a-${x.id}`, msg: "Request for job complete", time: stableTime, createdAt, dot: "bg-green-500" };
      return null;
    })
    .filter(Boolean) as any[];
  const baseAlerts: any[] = [];
  const allAlerts = [...workflowAlerts, ...baseAlerts].sort((a: any, b: any) => parseDateMs(b.createdAt || b.time) - parseDateMs(a.createdAt || a.time));
  const overviewAlerts = allAlerts.slice(0, 3);
  const overviewIncomingChats = chatFeed.filter((c: any) => c.hasIncoming).slice(0, 2);

  // Auto-create chat_ready requests for active jobs stuck at step 7 with no pending workflow request.
  // This repairs the dashboard for users whose payment completed but the dynamic request wasn't written.
  useEffect(() => {
    if (!mockReady) return;
    if (!subscriber?.email?.includes('ghis')) return;
    try {
      const dynReqs = JSON.parse(localStorage.getItem('ghis_mock_dyn_req') || '[]');
      const active = JSON.parse(localStorage.getItem('ghis_mock_active') || '[]');
      const existingPos = new Set(dynReqs.map((x: any) => x.po));
      // Gather all step-7 (or higher) jobs from static mock that aren't already in dynamic requests
      const step7StaticJobs = ACTIVE_MOCK.filter(
        (j: any) => Number(j.step) >= 7 && !existingPos.has(j.po) && !active.find((a: any) => a.po === j.po)
      );
      const step7ActiveJobs = active.filter((j: any) => Number(j.step) >= 7 && !existingPos.has(j.po));
      const toCreate: any[] = [];
      for (const job of [...step7StaticJobs, ...step7ActiveJobs]) {
        const createdAt = job.createdAt || Date.now();
        toCreate.push({
          id: `chat-${job.po}`,
          po: job.po,
          title: job.title,
          customer: job.fixerAlias || job.customer || 'Suppadesh',
          budget: job.budget || '฿0',
          tier: job.tier || 'Standard',
          desc: 'Chat is active. Send meeting invitation when you are ready.',
          type: 'chat_ready',
          date: new Date(createdAt).toLocaleString(),
          createdAt,
          step: 7,
        });
      }
      if (toCreate.length > 0) {
        const updated = [...dynReqs, ...toCreate];
        localStorage.setItem('ghis_mock_dyn_req', JSON.stringify(updated));
        setMockDynRequests(updated);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockReady]);

  const STEPS_FULL = ["Match", "Select", "PO", "Notify", "Accept", "Fee & Proceed", "Chat", "Meet", "Variation", "Complete", "Rate"];
  const STEPS = ["Notify", "Accept", "Fee & Proceed", "Chat", "Meet", "Variation", "Complete", "Rate"];

    const Progress12Steps = ({ currentStep, showCurrent = true }: { currentStep: number; showCurrent?: boolean }) => (
    <div className="w-full mt-4 overflow-x-auto pb-4 hide-scrollbar">
      <div className="flex items-center min-w-max relative px-2">
        <div className="absolute left-4 right-4 top-3 -translate-y-1/2 h-1 bg-gray-200 rounded-full"></div>
        <div className="absolute left-4 top-3 -translate-y-1/2 h-1 bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, ((currentStep - 4) / (STEPS.length - 1)) * 100))}%` }}></div>
        
        {STEPS.map((s, i) => {
          const stepNum = i + 4; // Notify starts at 4
          const isCompleted = stepNum < currentStep;
          const isCurrent = showCurrent && stepNum === currentStep;
            return (
            <div key={s} className="relative z-10 flex flex-col items-center flex-1 px-1">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${isCompleted ? 'bg-sky-500 text-white' : isCurrent ? 'bg-sky-500 text-white shadow-[0_0_0_4px_rgba(14,165,233,0.2)]' : 'bg-gray-300'}`}>
                {isCompleted ? '✓' : ''}
              </div>
              <span className={`text-[10px] mt-2 whitespace-nowrap ${isCurrent ? 'text-sky-600 font-bold' : isCompleted ? 'text-sky-500' : 'text-gray-400'}`}>
                {s}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  
  const renderRequestCard = (item: any) => {
    if (mockPayments[item.id]) return null;
    if (item.type === 'chat_ready') {
      return (
        <div key={item.id} className="bg-white border border-sky-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg">💬</div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · Step 7 of 11</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">Chat is now active. Send a meeting invitation when ready.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">Budget: {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-sky-50 text-sky-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-sky-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-sky-700 transition shadow-sm whitespace-nowrap" onClick={() => {
                setMockActiveItems(prev => prev.map((x: any) => x.po === item.po ? { ...x, step: 8, actionNeeded: false } : x));
                const pendingId = `meet-pending-${item.po}`;
                const createdAt = Date.now();
                setMockDynRequests(prev => {
                  const f = prev.filter((x: any) => x.id !== item.id && x.id !== pendingId);
                  return [...f, { id: pendingId, po: item.po, title: item.title, customer: item.customer, date: new Date(createdAt).toLocaleString(), createdAt, budget: item.budget, tier: item.tier, desc: 'Meeting invitation sent. Waiting for partner to confirm date and time.', type: 'meeting_pending_partner', step: 8 }];
                });
                // Push MEETING_REQUESTED to backend so partner sees it cross-browser
                try {
                  const token = localStorage.getItem('subscriber_token');
                  const backendOrder = (orders || []).find((o: any) => extractPo(o) === item.po);
                  if (token && backendOrder?.id) {
                    fetch(`/api/v1/orders/${backendOrder.id}/status`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ status: 'MEETING_REQUESTED', note: 'Customer sent meeting invitation' }),
                    }).catch(() => { /* non-blocking */ });
                  }
                } catch {}
              }}>Send Meeting Invitation</button>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === 'meeting_invite') {
      return (
        <div key={item.id} className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg"></div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · Step 8 of 11</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">Budget: {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-amber-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-amber-700 transition shadow-sm whitespace-nowrap" onClick={() => {
                setMockActiveItems(prev => prev.map((x: any) => x.po === item.po ? { ...x, step: 8, actionNeeded: false } : x));
                const schedId = `sched-${item.po}`;
                const createdAt = Date.now();
                setMockDynRequests(prev => { const f = prev.filter((x: any) => x.id !== item.id && x.id !== schedId); return [...f, { id: schedId, po: item.po, title: item.title, customer: item.customer, date: new Date(createdAt).toLocaleString(), createdAt, budget: item.budget, tier: item.tier, desc: 'Waiting for partner to confirm meeting time...', type: 'meeting_pending_partner', step: 8 }]; });
                setActiveTab("requests");
              }}>Invite to Meet</button>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === 'meeting_pending_partner') {
      return (
        <div key={item.id} className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border-2 border-amber-200 border-dashed rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg animate-pulse">⏳</div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · Step 8 of 11</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">Waiting for partner to confirm meeting time...</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">Budget: {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button disabled className="bg-gray-300 text-gray-500 px-5 py-2 rounded-lg text-sm font-bold shadow-sm whitespace-nowrap cursor-not-allowed">Pending Partner</button>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === 'meeting_scheduled') {
      return (
        <div key={item.id} className="bg-white border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg">📅</div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · Step 8 of 11</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">Budget: {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-teal-50 text-teal-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-teal-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 transition shadow-sm whitespace-nowrap" onClick={() => {
                setMockActiveItems(prev => prev.map((x: any) => x.po === item.po ? { ...x, step: 9, actionNeeded: true } : x));
                const varId = `variation-${item.po}`;
                const createdAt = Date.now();
                setMockDynRequests(prev => { const f = prev.filter((x: any) => x.id !== item.id && x.id !== varId); return [...f, { id: varId, po: item.po, title: item.title, customer: item.customer, date: new Date(createdAt).toLocaleString(), createdAt, budget: item.budget, tier: item.tier, desc: 'Your partner has submitted a variation for your approval. Please review and confirm to proceed.', type: 'variation_pending', step: 9 }]; });
                setActiveTab("requests");
              }}>Meeting Complete ✓</button>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === 'variation_pending') {
      return (
        <div key={item.id} className="bg-white border border-purple-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">V</div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · Step 9 of 11</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">Budget: {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-purple-50 text-purple-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-purple-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition shadow-sm whitespace-nowrap" onClick={() => {
                setMockActiveItems(prev => prev.map((x: any) => x.po === item.po ? { ...x, step: 9, actionNeeded: false } : x));
                const complId = `complete-${item.po}`;
                const createdAt = Date.now();
                setMockDynRequests(prev => { const f = prev.filter((x: any) => x.id !== item.id && x.id !== complId); return [...f, { id: complId, po: item.po, title: item.title, customer: item.customer, date: new Date(createdAt).toLocaleString(), createdAt, budget: item.budget, tier: item.tier, desc: 'Work is completed. Please review and mark as complete to close this project.', type: 'complete_pending', step: 10 }]; });
                setActiveTab("requests");
              }}>Approve Variation</button>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === 'complete_pending') {
      return (
        <div key={item.id} className="bg-white border border-green-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold text-lg">✓</div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · Step 10 of 11</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">Budget: {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-green-50 text-green-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-green-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition shadow-sm whitespace-nowrap" onClick={() => {
                setMockActiveItems(prev => prev.map((x: any) => x.po === item.po ? { ...x, step: 10, actionNeeded: false } : x));
                const rateId = `rate-${item.po}`;
                const createdAt = Date.now();
                setMockDynRequests(prev => { const f = prev.filter((x: any) => x.id !== item.id && x.id !== rateId); return [...f, { id: rateId, po: item.po, title: item.title, customer: item.customer, date: new Date(createdAt).toLocaleString(), createdAt, budget: item.budget, tier: item.tier, desc: 'Job complete! Please rate your partner and close this project.', type: 'rate_pending', step: 11 }]; });
                setActiveTab("requests");
              }}>Mark Complete</button>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === 'rate_pending') {
      return (
        <div key={item.id} className="bg-white border border-yellow-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center font-bold text-lg">⭐</div>
            <div>
              <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po} · Step 11 of 11</span></h3>
              <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <div className="text-left sm:text-right flex flex-col gap-1">
              <span className="font-bold text-gray-900 pr-2">Budget: {item.budget}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-yellow-50 text-yellow-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
            </div>
            <div className="flex gap-2">
              <button className="bg-yellow-500 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-yellow-600 transition shadow-sm whitespace-nowrap" onClick={() => {
                const job = mockActiveItems.find((x: any) => x.po === item.po);
                if (job) setMockHistory(prev => [...prev, { ...job, step: 11, completedAt: new Date().toISOString(), status: 'COMPLETED' }]);
                setMockActiveItems(prev => prev.filter((x: any) => x.po !== item.po));
                setMockDynRequests(prev => prev.filter((x: any) => x.id !== item.id));
                setActiveTab("history");
              }}>Rate & Close ⭐</button>
            </div>
          </div>
        </div>
      );
    }
      return (
      <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">{(item.title || "R").charAt(0)}</div>
           <div>
             <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po}{item.step ? ` · Step ${item.step} of 11` : ''}</span></h3>
             <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
             <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
           </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
          <div className="text-left sm:text-right flex flex-col gap-1">
             <span className="font-bold text-gray-900 pr-2">Budget: {item.budget}</span>
             <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
          </div>
          <div className="flex gap-2">
            <button className="bg-sky-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-sky-700 transition shadow-sm whitespace-nowrap" onClick={() => setWaitModalOrder({ id: item.id, status: 'MATCHING', request: item })}>Pay Fee & Proceed</button>
            <button className="border border-gray-300 text-gray-600 px-5 py-2 outline-none rounded-lg text-sm font-bold hover:bg-gray-100 transition shadow-sm w-full md:w-auto">Decline</button>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveCard = (item: any, idx: number) => (
    <div key={idx} className="p-5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
         <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center font-bold">{(item.title || item.service || "C").charAt(0)}</div>
         <div>
           <h3 className="font-bold text-gray-900">{item.title || item.service} <span className="text-sm font-normal text-gray-400">· {item.po || `PO-${item.id?.slice(0,8) || '2605-8471'}`} | {item.subdistrict || 'Saphansong'}</span></h3>
           <p className="text-sm text-gray-600 mt-0.5">{item.fixerAlias || item.partnerName || item.customer || "Customer"} · {item.date || "11/5/2026 14:30"} · Budget: {item.budget || ('฿' + Number(item.price || 0).toLocaleString())}</p>
         </div>
      </div>
      <div className="w-full xl:w-[620px] shrink-0 mt-2 xl:mt-0">
        <Progress12Steps currentStep={item.step || 5} showCurrent={true} />
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${item.tier === 'ECONOMY' || item.tier === 'Economy' ? 'bg-green-50 text-green-700' : item.tier === 'Standard' || item.tier === 'STANDARD' ? 'bg-blue-50 text-blue-700' : item.tier === 'Corporate' ? 'bg-purple-50 text-purple-700' : item.tier === 'Specialist' ? 'bg-amber-50 text-amber-700' : item.tier === 'Expert' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{item.tier || 'Standard'}</span>
          {item.actionNeeded && <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-50 text-red-700">Action Needed</span>}
        </div>
      </div>
    </div>
  );
const activeOrders = orders ? orders.filter((o: any) => !['COMPLETED', 'CANCELLED', 'DONE'].includes(o.status)) : [];
  const historyOrders = orders ? orders.filter((o: any) => ['COMPLETED', 'CANCELLED', 'DONE'].includes(o.status)) : [];
  const allHistory = [...historyOrders, ...mockHistory.map((x: any) => ({ service: x.title, fixerName: x.customer, createdAt: x.completedAt || new Date().toISOString(), fee: x.budget, status: 'COMPLETED', id: x.po }))];
  const propertiesCount = orders ? orders.filter((o: any) => o.type === "property").length : 0;
  const stats = { active: activeOrders.length, completed: historyOrders.length, messages: 0, rating: "4.8" };
  const totalReqCount = allRequestItems.length;

    return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pb-12 -mt-6">
      
      {/* Top Navigation Pills */}
      <div className="flex gap-2 bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 overflow-x-auto no-scrollbar">
        {[
          { key: "overview", icon: "", label: locale === "th" ? "ภาพรวม" : "Overview", count: null },
          { key: "requests", icon: "", label: locale === "th" ? "คำขอของคุณ" : "Requests", count: totalReqCount || null },
          { key: "active", icon: "", label: locale === "th" ? "งานที่ใช้งานอยู่" : "Active Jobs", count: combinedActive.length || null },
          
          { key: "properties", icon: "", label: locale === "th" ? "อสังหาฯ" : "Properties", count: propertiesCount || null },
          { key: "history", icon: "", label: locale === "th" ? "ประวัติ" : "History", count: historyOrders.length || null },
          { key: "chat", icon: "", label: locale === "th" ? "แชท" : "Chat", count: null },
          { key: "alerts", icon: "", label: locale === "th" ? "การแจ้งเตือน" : "Alerts", count: null },
          { key: "profile", icon: "", label: locale === "th" ? "โปรไฟล์" : "Profile", count: null },
        ].map((tab, i) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === tab.key ? 'bg-sky-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
            <span>{tab.icon}</span> {tab.label}
            {tab.count && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-red-100 text-red-700'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>
      
      {activeTab === "profile" && <ProfileTab locale={locale} prefix={prefix} subscriber={subscriber} activeOrders={activeOrders} onOrderClick={handleOrderClick} historyOrders={historyOrders} />}
      
      {activeTab === "requests" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6 pb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Incoming Requests</h2>
            <div className="text-sm text-gray-500 font-bold">{totalReqCount}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50 mt-4 mx-6">
              {allRequestItems.map((m: any) => renderRequestCard(m))}
          </div>
        </div>
      )}

      {activeTab === "active" && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Active Jobs <span className="text-sm font-normal text-gray-400 ml-2">{combinedActive.length}</span></h2>
          </div>
          {/* Pill container — each job is its own card, scrollable horizontally on small screens */}
          <div className="flex flex-col gap-4">
            {combinedActive.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {renderActiveCard(m, i)}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "properties" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Properties</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {orders.filter((o: any) => o.type === "property").length === 0 ? (
              <div className="p-8 text-center text-gray-500">No property orders found.</div>
            ) : (
              orders.filter((o: any) => o.type === "property").map((o: any, i: number) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer" onClick={() => handleOrderClick ? handleOrderClick(o) : null}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl shadow-sm"></div>
                    <div>
                      <h3 className="font-bold text-gray-900">{o.service} <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">{o.description?.toUpperCase().includes('TIER:ECONOMY') ? 'ECONOMY' : o.description?.toUpperCase().includes('TIER:STANDARD') ? 'Standard' : (o.tier || 'Standard')}</span></h3>
                      <p className="text-sm text-gray-500 mt-1">{o.status} &middot; {new Date(o.createdAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                    <Link href={`${prefix}/properties/edit/${o.id}`} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-lg transition">Edit</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">History</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {allHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No history found.</div>
            ) : (
              allHistory.map((o: any, i: number) => (
                <div key={i} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shadow-sm"></div>
                    <div>
                      <h3 className="font-bold text-gray-900">{o.service}</h3>
                      <p className="text-sm text-gray-500 mt-1">{o.fixerName || 'Partner'} &middot; {new Date(o.createdAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-bold text-gray-900">{o.fee || '฿0'}</span>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded-full">{o.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "chat" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Chat</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {chatFeed.length > 0 ? (
              chatFeed.map((c: any) => (
                <div
                  key={c.id}
                  className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => {
                    try { localStorage.setItem(`chat_from_${c.po}`, "dashboard"); } catch {}
                    window.location.href = `${prefix}/chat/${c.po}`;
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">C</div>
                    <div>
                      <h3 className="font-bold text-gray-900">{c.name}</h3>
                      <p className="text-sm text-sky-600 mt-1 font-medium">{c.lastMsg}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">{c.time || "-"}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 p-6 text-center">No recent chats.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Alerts</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {allAlerts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No recent alerts.</div>
            ) : (
              allAlerts.map((a: any, i: number) => (
                <div key={i} className="p-6 flex items-center gap-4 hover:bg-gray-50 transition cursor-pointer">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${a.dot}`}></span>
                  <div>
                    <p className="text-sm text-gray-800">{a.msg}</p>
                    <p className="text-xs text-gray-400 mt-1">{a.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      <div className={`flex flex-col gap-6 ${activeTab !== 'overview' ? 'hidden' : ''}`}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">Recent Incoming Chats <span className="text-xs text-sky-600 cursor-pointer" onClick={() => setActiveTab("chat")}>View All</span></h3>
                <div className="space-y-4">
                      {overviewIncomingChats.length > 0 ? (
                    <>
                      {overviewIncomingChats.map((c: any) => (
                        <div key={c.id} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                          <p className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">C</span> {c.name} <span className="text-xs text-gray-400 font-normal ml-auto">{c.incomingTime || ""}</span></p>
                          <p className="text-sm text-gray-600">{c.incomingMsg}</p>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">No recent incoming chats.</p>
                  )}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">Recent Alerts <span className="text-xs text-sky-600 cursor-pointer" onClick={() => setActiveTab("alerts")}>View All</span></h3>
                <div className="space-y-4">
                  {overviewAlerts.length > 0 ? (
                    <>
                      {overviewAlerts.map((a: any) => (
                        <div key={a.id} className="flex items-start gap-3 text-sm text-gray-700"><div className={`w-2 h-2 mt-1.5 rounded-full ${a.dot} flex-shrink-0`}></div><p>{a.msg} <span className="text-xs text-gray-400 ml-1">{a.time}</span></p></div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">No recent alerts.</p>
                  )}
                </div>
              </div>
          </div>
<div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">Incoming Requests</h2>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("requests")}>View All</button>
            </div>
            <div className="flex flex-col gap-3">
              {overviewRequestItems.map((m: any) => renderRequestCard(m))}
            </div>
          </div>

          
          
          <div>
            <div className="flex justify-between items-center mb-4 mt-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">⏰ Upcoming Meetings</h2>
                <span className="text-gray-500 font-bold text-sm">{upcomingMeetings.length}</span>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("requests")}>View All</button>
            </div>
            {upcomingMeetings.length > 0 ? (
              <div className="space-y-3 mt-4">
                {upcomingMeetings.slice(0, 2).map((m: any) => (
                  <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-gray-900 font-bold">{m.title} ({m.po})</span>
                       <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">{m.date}</span>
                    </div>
                    <p className="text-sm text-gray-600">Location: Saphansong | Provider: {m.customer}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mt-4 text-center text-sm text-gray-400">No upcoming meetings</div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-4 mt-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">Active Jobs</h2>
                <span className="text-gray-500 font-bold text-sm">{combinedActive.length}</span>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("active")}>View All</button>
            </div>
            <div className="flex flex-col gap-3 mt-4">
              {combinedActive.slice(0, 5).map((m, i) => renderActiveCard(m, i))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4 mt-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">Recent History</h2>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("history")}>View All</button>
            </div>
            <div className="divide-y divide-gray-50 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4">
              {allHistory.slice(0, 3).length === 0 ? (
                <div className="p-8 text-center text-gray-500">No history found.</div>
              ) : (
                allHistory.slice(0, 3).map((o: any, i: number) => (
                  <div key={i} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shadow-sm"></div>
                      <div>
                        <h3 className="font-bold text-gray-900">{o.service}</h3>
                        <p className="text-sm text-gray-500 mt-1">{o.fixerName || 'Partner'} &middot; {new Date(o.createdAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-bold text-gray-900">{o.fee || '฿0'}</span>
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded-full">{o.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      {waitModalOrder && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto pt-24 pb-10">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl flex flex-col p-6 relative">
            
            <div className="text-center text-sm font-bold text-sky-700 bg-sky-50 rounded-xl px-4 py-2 mb-2">Step 6 of 11</div>
            <h3 className="text-center font-bold text-gray-800 text-lg mt-4">Pay Fee & Notification to Proceed</h3>
            
            <div className="mt-4 flex flex-col items-center mx-auto">
              {/* Type of service and provider details added */}
              <div className="w-full flex justify-between border-b border-gray-100 pb-3 mb-3">
                <div className="flex flex-col">
                  <span className="text-gray-500 text-xs uppercase tracking-wider">Service</span>
                  <span className="font-bold text-gray-900">{waitModalOrder.request?.title || 'Fit out'}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-gray-500 text-xs uppercase tracking-wider">Budget</span>
                  <span className="font-bold text-sky-600">{waitModalOrder.request?.budget || '฿25,000,000'}</span>
                </div>
              </div>
              
              <div className="w-full flex justify-between items-center mb-4">
                 <span className="text-gray-600 text-sm">Provider</span>
                 <span className="text-gray-900 font-semibold">{waitModalOrder.request?.customer || 'Suppadesh'}</span>
              </div>
              
              <div className="bg-sky-50 text-sky-800 text-[13px] p-3 rounded-xl mb-4 border border-sky-100 text-center font-medium">
                Please pay the processing fee and notify to proceed.
              </div>
              
              <div className="w-full bg-gray-50 rounded-xl p-3 space-y-2 text-sm text-left mb-4">
                <div className="flex justify-between items-center"><span className="text-gray-500 text-xs">PO Number</span><span className="font-mono font-bold text-gray-800">{waitModalOrder.request?.po || 'PO-SYS-202'}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-500 text-xs">Processing Fee</span><span className="font-bold text-gray-800">฿100</span></div>
              </div>

              <div className="w-full text-center text-[10px] text-gray-400 mt-2 px-2">
                Processing fee is non-refundable. CBLUE acts solely as a matching platform.
              </div>

              <button 
                onClick={() => setWaitModalOrder(null)} 
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition mt-4"
              >
                Cancel
              </button>
              <button
                className="mt-4 px-6 py-3 w-full bg-sky-100 border border-sky-300 text-sky-800 font-bold rounded-xl shadow-sm hover:bg-sky-200 transition"
                onClick={() => {
                  const createdAt = Date.now();
                  const now = new Date(createdAt).toLocaleString();
                  setMockPayments(prev => ({...prev, [waitModalOrder.id]: true}));
                  setMockActiveItems(prev => [
                    ...prev.filter((x: any) => x.po !== waitModalOrder.request?.po),
                    { ...waitModalOrder.request, actionNeeded: true, step: 7, createdAt }
                  ]);
                  const po = waitModalOrder.request?.po;
                  const chatReqId = `chat-${po}`;
                  setMockDynRequests(prev => [
                    ...prev.filter((x: any) => x.po !== po && x.id !== chatReqId),
                    { id: chatReqId, po, title: waitModalOrder.request?.title, customer: waitModalOrder.request?.customer || 'Suppadesh', date: now, createdAt, budget: waitModalOrder.request?.budget, tier: waitModalOrder.request?.tier, desc: 'Chat is active. Send meeting invitation when you are ready.', type: 'chat_ready', step: 7 }
                  ]);
                  try {
                    const chatKey = `chat_messages_${waitModalOrder.request?.po}`;
                    const existing = JSON.parse(localStorage.getItem(chatKey) || '[]');
                    if (existing.length === 0) localStorage.setItem(chatKey, JSON.stringify([{ id: Date.now(), sender: 'system', text: 'Payment confirmed. Your project chat is now active. Please coordinate with your partner here.', time: now, createdAt }]));
                    const title = waitModalOrder.request?.title || '';
                    const budget = waitModalOrder.request?.budget || '';
                    if (po) {
                      localStorage.setItem(`chat_title_${po}`, `${title} - ${po} - ${budget}`);
                      localStorage.setItem(`chat_from_${po}`, "dashboard");
                      window.dispatchEvent(new Event("storage"));
                      window.dispatchEvent(new CustomEvent("cblue-chat-updated", { detail: { orderId: po } }));
                    }
                  } catch {}
                  // Push backend order to IN_PROGRESS so partner sees step 7 cross-browser
                  try {
                    const token = localStorage.getItem('subscriber_token');
                    if (token && po) {
                      const backendOrder = (orders || []).find((o: any) => extractPo(o) === po);
                      if (backendOrder?.id) {
                        fetch(`/api/v1/orders/${backendOrder.id}/status`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ status: 'IN_PROGRESS', note: 'Customer paid processing fee' }),
                        }).catch(() => { /* non-blocking */ });
                      }
                    }
                  } catch {}
                  setWaitModalOrder(null);
                  setActiveTab("requests");
                }}
              >
                🚧 Testing Period Payment Pill 🚧
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
