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
  CONFIRMED: { en: "Confirmed", th: "ยืนยันแล้ว", zh: "已确认" },
  DEPOSIT_PENDING: { en: "Deposit Pending", th: "รอชำระเงิน", zh: "待付款" },
  COMPLETED: { en: "Completed", th: "เสร็จสิ้น", zh: "已完成" },
  MATCHING: { en: "Matching", th: "กำลังจับคู่", zh: "匹配中" },
  PENDING: { en: "Pending", th: "รอดำเนินการ", zh: "待处理" },
  VIEWING_SCHEDULED: { en: "Viewing Scheduled", th: "นัดดูแล้ว", zh: "已安排看房" },
  CONTACTED: { en: "Contacted", th: "ติดต่อแล้ว", zh: "已联系" },
  DEPOSIT_PAID: { en: "Deposit Paid", th: "ชำระแล้ว", zh: "已付款" },
};
const getStatusLabel = (status: string, locale: string) => STATUS_LABEL[status]?.[locale] || status.replace(/_/g, " ");

type TabKey = "overview" | "bookings" | "requests" | "property" | "history" | "chat" | "notifications" | "profile";

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
                  onClick={() => { localStorage.removeItem("subscriber"); localStorage.removeItem("subscriber_token"); localStorage.removeItem("pdpa_consent_customer"); window.dispatchEvent(new Event("storage")); router.push(prefix); }}
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
    <div className="space-y-6">
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

/* ===== REQUESTS TAB ===== */
function RequestsTab({ locale, requests }: { locale: string; requests: any[] }) {
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
        <h2 className="font-bold text-gray-900 flex items-center gap-2">🔄 {locale === "th" ? "คำขอจัดซื้อ" : locale === "zh" ? "采购请求" : "Procurement Requests"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {requests && requests.length > 0 ? requests.map((r: any) => (
          <div key={r.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">📦</div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{locale === "th" ? r.serviceTh : locale === "zh" ? r.serviceZh : r.service}</h3>
                    <p className="text-sm text-gray-500 mt-1">{r.date}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLE[r.status] || ""}`}>{getStatusLabel(r.status, locale)}</span>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีคำขอ" : locale === "zh" ? "没有请求" : "No requests"}</p>
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
                if (confirm(locale === "th" ? "ยืนยันการลบบัญชีและข้อมูลทั้งหมดตามกฎหมาย PDPA?" : "Confirm deleting your account and all data per PDPA law?")) {
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
  const [activeTab, setActiveTab] = useState<"overview"|"profile"|"active"|"requests"|"properties"|"history"|"chat"|"alerts">("overview");
  const [waitModalOrder, setWaitModalOrder] = useState<any>(null);
  const handleOrderClick = (o: any) => { if (o.status && ['MATCHING', 'CREATED'].includes(o.status.toUpperCase())) setWaitModalOrder(o); else window.location.href = `${prefix}/chat/${o.id}`; };
  const activeOrders = orders ? orders.filter((o: any) => !['COMPLETED', 'CANCELLED', 'DONE'].includes(o.status)) : [];
  const historyOrders = orders ? orders.filter((o: any) => ['COMPLETED', 'CANCELLED', 'DONE'].includes(o.status)) : [];
  const propertiesCount = orders ? orders.filter((o: any) => o.type === "property").length : 0;
  const stats = { active: activeOrders.length, completed: historyOrders.length, messages: 0, rating: "4.8" };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pb-12 -mt-6">
      
      {/* Top Navigation Pills */}
      <div className="flex gap-2 bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 overflow-x-auto no-scrollbar">
        {[
          { key: "overview", icon: "", label: locale === "th" ? "ภาพรวม" : "Overview", count: null },
          { key: "active", icon: "", label: locale === "th" ? "งานที่ใช้งานอยู่" : "Active Jobs", count: activeOrders.length || null },
          
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
      
      {activeTab === "active" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">Active Jobs</h2>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{activeOrders.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {activeOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No active services currently.</div>
            ) : (
              activeOrders.map((o: any, i: number) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer" onClick={() => handleOrderClick ? handleOrderClick(o) : null}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shadow-sm">{o.type === 'property' ? '' : o.type === 'project' ? '' : o.type === 'professional' ? '' : ''}</div>
                    <div>
                      <h3 className="font-bold text-gray-900">{o.service} <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">{o.description?.toUpperCase().includes('TIER:ECONOMY') ? 'ECONOMY' : o.description?.toUpperCase().includes('TIER:STANDARD') ? 'Standard' : (o.tier || 'Standard')}</span></h3>
                      <p className="text-sm text-gray-500 mt-1">{o.fixerName || 'Awaiting Partner'} &middot; {new Date(o.createdAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{o.status}</span>
                    {o.status !== 'PENDING' && o.status !== 'CREATED' && <Link href={`${prefix}/chat/${o.id}`} className="text-gray-400 hover:text-sky-600 transition" onClick={(e) => e.stopPropagation()}><span className="text-xl"></span></Link>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "requests" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Requests</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {activeOrders.filter((o: any) => ['CREATED', 'MATCHING', 'PENDING'].includes(o.status)).length === 0 ? (
              <div className="p-8 text-center text-gray-500">No active requests.</div>
            ) : (
              activeOrders.filter((o: any) => ['CREATED', 'MATCHING', 'PENDING'].includes(o.status)).map((o: any, i: number) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer" onClick={() => handleOrderClick ? handleOrderClick(o) : null}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl shadow-sm"></div>
                    <div>
                      <h3 className="font-bold text-gray-900">{o.service}</h3>
                      <p className="text-sm text-gray-500 mt-1">Status: {o.status} &middot; {new Date(o.createdAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
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
            {historyOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No history found.</div>
            ) : (
              historyOrders.map((o: any, i: number) => (
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
            {activeOrders.filter((o: any) => o.status !== 'PENDING' && o.status !== 'CREATED').length === 0 ? (
              <div className="p-8 text-center text-gray-500">No active chats.</div>
            ) : (
              activeOrders.filter((o: any) => o.status !== 'PENDING' && o.status !== 'CREATED').map((o: any, i: number) => (
                <Link key={i} href={`${prefix}/chat/${o.id}`} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer block">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-xl font-bold text-sky-700">
                      {(o.fixerName || 'P').charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{o.fixerName || 'Partner'}</h3>
                      <p className="text-sm text-gray-500 mt-1">{o.service}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl"></span>
                  </div>
                </Link>
              ))
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
            {orders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No recent alerts.</div>
            ) : (
              orders.slice(0, 10).map((o: any, i: number) => (
                <div key={i} className="p-6 flex items-center gap-4 hover:bg-gray-50 transition cursor-pointer">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${o.status === 'COMPLETED' ? 'bg-green-500' : 'bg-sky-500'}`}></span>
                  <div>
                    <p className="text-sm text-gray-800"><span className="font-bold">System:</span> Order {o.id.slice(0,6)} status updated to {o.status}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(o.updatedAt || Date.now()).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${activeTab !== 'overview' ? 'hidden' : ''}`}>

        {/* LEFT COLUMN: Profile & Alerts */}
        <div className="space-y-6">
          
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-full -z-0 opacity-50"></div>
            <div className="relative z-10 flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 text-2xl font-bold shadow-inner">
                {subscriber.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{subscriber.name}</h2>
                <p className="text-sm text-gray-500">{subscriber.email} &middot; {subscriber.phone || "0819852846"}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Active</p>
                <p className="text-lg font-bold text-gray-900 flex items-center gap-1">{stats.active}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Completed</p>
                <p className="text-lg font-bold text-gray-900 flex items-center gap-1">{stats.completed}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Messages</p>
                <p className="text-lg font-bold text-gray-900 flex items-center gap-1">{stats.messages}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Satisfaction</p>
                <p className="text-lg font-bold text-gray-900 flex items-center gap-1">4.8 </p>
              </div>
            </div>
            <button onClick={onLogout} className="w-full py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-bold rounded-lg transition">
              {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出登录" : "Logout"}
            </button>
          </div>

          {/* Upcoming Meetings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">⏰ Upcoming Meetings</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {activeOrders.filter((o: any) => o.status === 'CONFIRMED' || o.status === 'IN_PROGRESS').slice(0, 2).map((o: any, i: number) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{o.type === 'property' ? '' : ''}</span>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{o.fixerName || 'Partner'} &middot; {o.service}</p>
                      <p className="text-xs text-sky-600 font-medium mt-0.5">Soon</p>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-sky-100 text-sky-700 text-xs font-bold rounded-md hover:bg-sky-200">Confirm</button>
                </div>
              ))}
              {activeOrders.filter((o: any) => o.status === 'CONFIRMED' || o.status === 'IN_PROGRESS').length === 0 && (
                <div className="p-4 text-sm text-gray-500">No upcoming meetings.</div>
              )}
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">Recent Alerts</h3>
            </div>
            <div className="p-4 space-y-4">
              {activeOrders.slice(0, 3).map((o: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <span className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${o.status === 'CONFIRMED' ? 'bg-green-500' : o.status === 'PENDING' ? 'bg-amber-500' : 'bg-sky-500'}`}></span>
                  <div>
                    <p className="text-sm text-gray-800">Your {o.service} order is {o.status.toLowerCase()}</p>
                    <p className="text-xs text-gray-400 mt-1">Recently</p>
                  </div>
                </div>
              ))}
              {activeOrders.length === 0 && <p className="text-sm text-gray-500">No recent alerts.</p>}
            </div>
          </div>

          {/* Pending Ratings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/50">
              <h3 className="font-bold text-amber-900 flex items-center gap-2"> Pending Ratings</h3>
            </div>
            <div className="p-5">
              {historyOrders.slice(0, 1).map((o: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-2xl"></span>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-gray-900">{o.fixerName || 'Partner'} &middot; {o.service}</p>
                    <p className="text-xs text-gray-500 mt-0.5 mb-2">Completed Recently</p>
                    <div className="flex gap-1 text-2xl text-gray-300 hover:text-amber-400 cursor-pointer transition-colors">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                  </div>
                </div>
              ))}
              {historyOrders.length === 0 && <p className="text-sm text-gray-500">No pending ratings.</p>}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Main content feeds */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Jobs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">Active Jobs</h2>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{activeOrders.length}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {activeOrders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No active services currently.</div>
              ) : (
                activeOrders.map((o: any, i: number) => (
                  <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer" onClick={() => handleOrderClick ? handleOrderClick(o) : null}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shadow-sm">{o.type === 'property' ? '' : o.type === 'project' ? '' : o.type === 'professional' ? '' : ''}</div>
                      <div>
                        <h3 className="font-bold text-gray-900">{o.service} <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">{o.description?.toUpperCase().includes('TIER:ECONOMY') ? 'ECONOMY' : o.description?.toUpperCase().includes('TIER:STANDARD') ? 'Standard' : (o.tier || 'Standard')}</span></h3>
                        <p className="text-sm text-gray-500 mt-1">{o.fixerName || 'Awaiting Partner'} &middot; {new Date(o.createdAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{o.status}</span>
                      {o.status !== 'PENDING' && o.status !== 'CREATED' && <Link href={`${prefix}/chat/${o.id}`} className="text-gray-400 hover:text-sky-600 transition" onClick={(e) => e.stopPropagation()}><span className="text-xl"></span></Link>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Chats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">Recent Chats</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {activeOrders.filter((o: any) => o.status !== 'PENDING' && o.status !== 'CREATED').slice(0, 3).map((o: any, i: number) => (
                <Link key={i} href={`${prefix}/chat/${o.id}`} className="p-4 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer block" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm">
                      {(o.fixerName || 'P').charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{o.fixerName || 'Partner'} &middot; <span className="font-normal text-gray-500">{o.service}</span></p>
                      <p className="text-xs text-gray-600 mt-0.5 truncate max-w-[200px]">Check chat for updates</p>
                    </div>
                  </div>
                </Link>
              ))}
              {activeOrders.filter((o: any) => o.status !== 'PENDING' && o.status !== 'CREATED').length === 0 && (
                <div className="p-4 text-sm text-gray-500">No active chats.</div>
              )}
            </div>
          </div>

          {/* Recent History */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">Recent History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 bg-gray-50/50 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Service</th>
                    <th className="px-6 py-3 font-semibold">Fixer / Pro</th>
                    <th className="px-6 py-3 font-semibold">Tier</th>
                    <th className="px-6 py-3 font-semibold">Rating</th>
                    <th className="px-6 py-3 font-semibold">Fee</th>
                    <th className="px-6 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {historyOrders.slice(0, 3).map((o: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 transition cursor-pointer">
                      <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-lg">{o.type === 'property' ? '' : ''}</span> {o.service}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{o.fixerName || 'Partner'}</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-medium">{o.description?.toUpperCase().includes('TIER:ECONOMY') ? 'ECONOMY' : o.description?.toUpperCase().includes('TIER:STANDARD') ? 'Standard' : (o.tier || 'Standard')}</span></td>
                      <td className="px-6 py-4 text-amber-500 font-bold">5 </td>
                      <td className="px-6 py-4 font-bold text-gray-900">฿{o.finalPrice || o.estimatedPrice || '0'}</td>
                      <td className="px-6 py-4 text-gray-500">{new Date(o.updatedAt || Date.now()).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {historyOrders.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No completed orders yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {waitModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-2 text-sm font-semibold text-sky-600 bg-sky-50 inline-block px-3 py-1 rounded-full">Step 5 of 12</div>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">Waiting for Partner Confirmation</h2>
            <p className="text-gray-500 mt-2">We've notified {waitModalOrder.fixerName || 'the partner'} about your booking. They will review and confirm shortly.</p>
            
            <div className="mt-6 flex flex-col items-center">
              <span className="inline-block w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sky-600 font-bold mb-6">Waiting for confirmation...</p>
              
              <div className="w-full bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-left">
                <div className="flex justify-between"><span className="text-gray-500">PO Number</span><span className="font-mono font-bold text-gray-800">PO-2605-{waitModalOrder.id.slice(0, 4)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Processing Fee</span><span className="font-bold text-gray-800">฿{(() => {
                  const desc = waitModalOrder.description || '';
                  if (desc.includes('TIER:ECONOMY')) return '100';
                  if (desc.includes('TIER:Standard')) return '400';
                  if (desc.includes('TIER:Corporate') || desc.includes('TIER:Upper')) return '600';
                  if (desc.includes('TIER:Specialist') || desc.includes('TIER:Manager') || desc.includes('TIER:Luxury')) return '800';
                  if (desc.includes('TIER:Expert') || desc.includes('TIER:Director') || desc.includes('TIER:Grandeur')) return '1,000';
                  return '100';
                })()}</span></div>
              </div>
            </div>

            <div className="bg-amber-50 text-amber-800 text-xs p-4 rounded-xl mt-6">
              The final service price is negotiated directly between you and the service provider. CBLUE acts only as a matching platform and does not determine or guarantee final pricing. The processing fee is non-refundable as the matching service is completed once the customer initiates the process.
            </div>

            <button 
              onClick={() => {
                setWaitModalOrder(null);
                window.location.href = `${prefix}/partner-zone`; 
              }} 
              className="mt-6 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition"
            >
              Go to Our Customer Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
