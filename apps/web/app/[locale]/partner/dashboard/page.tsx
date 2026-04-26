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

const DEMO_ACTIVE = [
  {
    id: "as-1",
    type: "household" as ServiceType,
    service: "Plumbing Repair",
    serviceTh: "ซ่อมประปา",
    serviceZh: "管道维修",
    partner: "Customer #A2X",
    tier: "Standard",
    status: "IN_PROGRESS",
    date: "2026-04-15",
    fee: "฿2,500",
  },
  {
    id: "as-2",
    type: "household" as ServiceType,
    service: "AC Maintenance",
    serviceTh: "ซ่อมแอร์",
    serviceZh: "空调维护",
    partner: "Customer #B7K",
    tier: "Corporate",
    status: "CONFIRMED",
    date: "2026-04-16",
    fee: "฿4,000",
  },
  {
    id: "as-3",
    type: "household" as ServiceType,
    service: "Electrical Work",
    serviceTh: "งานไฟฟ้า",
    serviceZh: "电气工程",
    partner: "Customer #C4M",
    tier: "Economy",
    status: "PENDING",
    date: "2026-04-17",
    fee: "฿1,800",
  },
];

const DEMO_HISTORY = [];

const DEMO_NOTIFICATIONS = [
  {
    id: "n1",
    msg: "Customer #A2X sent a new message",
    msgTh: "ลูกค้า #A2X ส่งข้อความใหม่",
    msgZh: "客户 #A2X 发送了新消息",
    time: "2m ago",
    timeTh: "2 นาทีที่ผ่านมา",
    timeZh: "2分钟前",
    dot: "bg-sky-500",
    unread: true,
  },
  {
    id: "n2",
    msg: "You have 3 new requests",
    msgTh: "คุณมีคำขอใหม่ 3 รายการ",
    msgZh: "您有3个新请求",
    time: "15m ago",
    timeTh: "15 นาทีที่ผ่านมา",
    timeZh: "15分钟前",
    dot: "bg-amber-500",
    unread: true,
  },
  {
    id: "n3",
    msg: "Payment received ฿3,200",
    msgTh: "ได้รับเงิน ฿3,200",
    msgZh: "收到付款 ฿3,200",
    time: "1h ago",
    timeTh: "1 ชั่วโมงที่ผ่านมา",
    timeZh: "1小时前",
    dot: "bg-green-500",
    unread: true,
  },
];

const DEMO_CHATS = [
  {
    id: "c1",
    name: "Customer #A2X",
    service: "Plumbing",
    lastMsg: "Thanks, waiting for you",
    lastMsgTh: "ขอบคุณครับ รอช่างอยู่",
    lastMsgZh: "谢谢，在等你",
    time: "2m ago",
    timeTh: "2 นาทีที่ผ่านมา",
    timeZh: "2分钟前",
    unread: 2,
    online: true,
  },
  {
    id: "c2",
    name: "Customer #B7K",
    service: "AC",
    lastMsg: "Which day is convenient?",
    lastMsgTh: "วันไหนสะดวกคะ?",
    lastMsgZh: "哪天方便？",
    time: "30m ago",
    timeTh: "30 นาทีที่ผ่านมา",
    timeZh: "30分钟前",
    unread: 1,
    online: true,
  },
  {
    id: "c3",
    name: "Customer #C4M",
    service: "Electrical",
    lastMsg: "Job is done, thanks",
    lastMsgTh: "งานเสร็จแล้วครับ ขอบคุณ",
    lastMsgZh: "工作完成了，谢谢",
    time: "2h ago",
    timeTh: "2 ชั่วโมงที่ผ่านมา",
    timeZh: "2小时前",
    unread: 0,
    online: false,
  },
];

const DEMO_REQUESTS = [
  {
    id: "r1",
    service: "Interior Design",
    serviceTh: "ออกแบบภายใน",
    serviceZh: "室内设计",
    customer: "Customer #D9P",
    date: "2026-04-18",
    budget: "฿15,000",
    tier: "Specialist",
    urgent: false,
  },
  {
    id: "r2",
    service: "Landscaping",
    serviceTh: "จัดสวน",
    serviceZh: "园林绿化",
    customer: "Customer #E3R",
    date: "2026-04-19",
    budget: "฿25,000",
    tier: "Expert",
    urgent: true,
  },
];

const DEMO_HISTORY = [
  {
    id: "h-1",
    type: "household" as ServiceType,
    service: "Electrical",
    serviceTh: "ไฟฟ้า",
    serviceZh: "电气维修",
    partner: "Fixer-0921",
    tier: "Economy",
    date: "2026-03-15",
    rating: 4.8,
    fee: "฿100",
  },
  {
    id: "h-2",
    type: "project" as ServiceType,
    service: "Website Dev",
    serviceTh: "พัฒนาเว็บไซต์",
    serviceZh: "网站开发",
    partner: "Team-4401",
    tier: "Corporate",
    date: "2026-03-01",
    rating: 4.9,
    fee: "฿600",
  },
  {
    id: "h-3",
    type: "professional" as ServiceType,
    service: "Lawyer",
    serviceTh: "ทนายความ",
    serviceZh: "律师",
    partner: "Pro-1100",
    tier: "Expert",
    date: "2026-02-10",
    rating: 5.0,
    fee: "฿1,000",
  },
  {
    id: "h-4",
    type: "household" as ServiceType,
    service: "AC Maintenance",
    serviceTh: "ซ่อมแอร์",
    serviceZh: "空调维护",
    partner: "Fixer-2200",
    tier: "Standard",
    date: "2026-01-20",
    rating: 4.5,
    fee: "฿400",
  },
  {
    id: "h-5",
    type: "property" as ServiceType,
    service: "House Rental",
    serviceTh: "เช่าบ้าน",
    serviceZh: "房屋租赁",
    partner: "Lister-3300",
    tier: "Luxury",
    date: "2025-12-05",
    rating: 4.7,
    fee: "฿800",
  },
];

const DEMO_PROPERTY_INQUIRIES = [
  {
    id: "p-1",
    title: "Sukhumvit Condo 2BR",
    titleTh: "คอนโดสุขุมวิท 2 ห้องนอน",
    titleZh: "素坤逸公寓2卧",
    price: "฿5,500,000",
    type: "SALE",
    status: "VIEWING_SCHEDULED",
    lister: "Lister-7890",
    date: "2026-04-14",
    image: "🏢",
  },
  {
    id: "p-2",
    title: "Thonglor House 4BR",
    titleTh: "บ้านทองหล่อ 4 ห้องนอน",
    titleZh: "通罗别墅4卧",
    price: "฿45,000/mo",
    type: "RENT",
    status: "CONTACTED",
    lister: "Lister-4455",
    date: "2026-04-11",
    image: "🏠",
  },
  {
    id: "p-3",
    title: "Phuket Villa",
    titleTh: "วิลล่าภูเก็ต",
    titleZh: "普吉岛别墅",
    price: "฿18,000,000",
    type: "SALE",
    status: "DEPOSIT_PAID",
    lister: "Lister-6677",
    date: "2026-04-08",
    image: "🏡",
  },
];

const DEMO_NOTIFICATIONS = [
  {
    id: "n1",
    msg: "Fixer-1042 is on the way to your location",
    msgTh: "Fixer-1042 กำลังเดินทางมาที่ตำแหน่งของคุณ",
    msgZh: "Fixer-1042 正在前往您的位置",
    time: "5m ago",
    timeTh: "5 นาทีที่ผ่านมา",
    timeZh: "5分钟前",
    dot: "bg-sky-500",
    unread: true,
  },
  {
    id: "n2",
    msg: "Payment for Architect Consult confirmed",
    msgTh: "ยืนยันการชำระเงินปรึกษาสถาปนิก",
    msgZh: "建筑师咨询付款已确认",
    time: "1h ago",
    timeTh: "1 ชั่วโมงที่ผ่านมา",
    timeZh: "1小时前",
    dot: "bg-green-500",
    unread: true,
  },
  {
    id: "n3",
    msg: "Property viewing confirmed for Apr 14",
    msgTh: "นัดดูทรัพย์สิน 14 เม.ย. ยืนยันแล้ว",
    msgZh: "4月14日看房已确认",
    time: "3h ago",
    timeTh: "3 ชั่วโมงที่ผ่านมา",
    timeZh: "3小时前",
    dot: "bg-emerald-500",
    unread: true,
  },
  {
    id: "n4",
    msg: "Rate your Electrical service with Fixer-0921",
    msgTh: "ให้คะแนนบริการไฟฟ้ากับ Fixer-0921",
    msgZh: "为Fixer-0921的电气服务评分",
    time: "2d ago",
    timeTh: "2 วันที่ผ่านมา",
    timeZh: "2天前",
    dot: "bg-amber-500",
    unread: false,
  },
  {
    id: "n5",
    msg: "Meeting with Fixer-1042 in 2 hours",
    msgTh: "การนัดพบกับ Fixer-1042 ในอีก 2 ชั่วโมง",
    msgZh: "与Fixer-1042的会面在2小时后",
    time: "2h ago",
    timeTh: "2 ชั่วโมงที่ผ่านมา",
    timeZh: "2小时前",
    dot: "bg-red-500",
    unread: true,
  },
];

const DEMO_CHATS = [
  {
    id: "c1",
    name: "Fixer-1042",
    service: "Plumbing",
    lastMsg: "On my way, ETA 15 min",
    lastMsgTh: "กำลังเดินทาง ถึงใน 15 นาที",
    lastMsgZh: "正在路上，预计15分钟到达",
    time: "5m ago",
    timeTh: "5 นาทีที่ผ่านมา",
    timeZh: "5分钟前",
    unread: 2,
    online: true,
  },
  {
    id: "c2",
    name: "Pro-3087",
    service: "Architect",
    lastMsg: "I've prepared the design draft",
    lastMsgTh: "เตรียมแบบร่างเรียบร้อยแล้ว",
    lastMsgZh: "设计草图已准备好",
    time: "2h ago",
    timeTh: "2 ชั่วโมงที่ผ่านมา",
    timeZh: "2小时前",
    unread: 0,
    online: true,
  },
  {
    id: "c3",
    name: "Team-5512",
    service: "Smart Home",
    lastMsg: "Waiting for your confirmation",
    lastMsgTh: "รอการยืนยันจากคุณ",
    lastMsgZh: "等待您的确认",
    time: "1d ago",
    timeTh: "1 วันที่ผ่านมา",
    timeZh: "1天前",
    unread: 1,
    online: false,
  },
  {
    id: "c4",
    name: "Lister-7890",
    service: "Property",
    lastMsg: "Condo available for viewing Saturday",
    lastMsgTh: "คอนโดเปิดให้ชมวันเสาร์",
    lastMsgZh: "公寓周六可看房",
    time: "3h ago",
    timeTh: "3 ชั่วโมงที่ผ่านมา",
    timeZh: "3小时前",
    unread: 1,
    online: true,
  },
];

const ICON_MAP = {
  household: "🏠",
  project: "💼",
  professional: "👔",
  property: "🏢",
};
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

const DEMO_REQUESTS = [
  {
    id: "r-1",
    type: "household" as ServiceType,
    service: "AC Cleaning",
    serviceTh: "ล้างแอร์",
    serviceZh: "空调清洗",
    status: "MATCHING",
    date: "2026-04-13",
    tier: "Standard",
    area: "Bangkok",
  },
  {
    id: "r-2",
    type: "professional" as ServiceType,
    service: "Architect Consult",
    serviceTh: "ปรึกษาสถาปนิก",
    serviceZh: "建筑师咨询",
    status: "MATCHING",
    date: "2026-04-12",
    tier: "Corporate",
    area: "Nonthaburi",
  },
  {
    id: "r-3",
    type: "project" as ServiceType,
    service: "Solar Panel Install",
    serviceTh: "ติดตั้งแผงโซลาร์",
    serviceZh: "太阳能板安装",
    status: "PENDING",
    date: "2026-04-11",
    tier: "Specialist",
    area: "Phuket",
  },
];

const STATUS_LABEL: Record<string, Record<string, string>> = {
  IN_PROGRESS: { en: "In Progress", th: "กำลังดำเนินการ", zh: "进行中" },
  CONFIRMED: { en: "Confirmed", th: "ยืนยันแล้ว", zh: "已确认" },
  DEPOSIT_PENDING: { en: "Deposit Pending", th: "รอชำระเงิน", zh: "待付款" },
  COMPLETED: { en: "Completed", th: "เสร็จสิ้น", zh: "已完成" },
  MATCHING: { en: "Matching", th: "กำลังจับคู่", zh: "匹配中" },
  PENDING: { en: "Pending", th: "รอดำเนินการ", zh: "待处理" },
  VIEWING_SCHEDULED: {
    en: "Viewing Scheduled",
    th: "นัดดูแล้ว",
    zh: "已安排看房",
  },
  CONTACTED: { en: "Contacted", th: "ติดต่อแล้ว", zh: "已联系" },
  DEPOSIT_PAID: { en: "Deposit Paid", th: "ชำระแล้ว", zh: "已付款" },
};
const getStatusLabel = (status: string, locale: string) =>
  STATUS_LABEL[status]?.[locale] || status.replace(/_/g, " ");

type TabKey =
  | "overview"
  | "bookings"
  | "requests"
  | "property"
  | "history"
  | "chat"
  | "notifications"
  | "profile";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();
  const prefix = `/${locale}`;

  const [subscriber, setSubscriber] = useState<SubscriberInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showPdpa, setShowPdpa] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("subscriber");
      if (stored) {
        setSubscriber(JSON.parse(stored));
        // Check PDPA consent
        const consent = localStorage.getItem("pdpa_consent_customer");
        if (!consent) setShowPdpa(true);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    {
      key: "overview",
      label: locale === "th" ? "ภาพรวม" : locale === "zh" ? "概览" : "Overview",
      icon: "📊",
    },
    {
      key: "bookings",
      label:
        locale === "th"
          ? "งานปัจจุบัน"
          : locale === "zh"
            ? "当前工作"
            : "Active Jobs",
      icon: "🔧",
      badge: DEMO_ACTIVE.length,
    },
    {
      key: "requests",
      label: locale === "th" ? "คำขอ" : locale === "zh" ? "请求" : "Requests",
      icon: "📋",
      badge: DEMO_REQUESTS.length,
    },
    {
      key: "property",
      label:
        locale === "th"
          ? "อสังหาริมทรัพย์"
          : locale === "zh"
            ? "房产"
            : "Properties",
      icon: "🏢",
      badge: DEMO_PROPERTY_INQUIRIES.length,
    },
    {
      key: "history",
      label: locale === "th" ? "ประวัติ" : locale === "zh" ? "历史" : "History",
      icon: "📜",
    },
    {
      key: "chat",
      label: locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat",
      icon: "💬",
      badge: DEMO_CHATS.reduce((a, c) => a + c.unread, 0),
    },
    {
      key: "notifications",
      label:
        locale === "th" ? "แจ้งเตือน" : locale === "zh" ? "通知" : "Alerts",
      icon: "🔔",
      badge: DEMO_NOTIFICATIONS.filter((n) => n.unread).length,
    },
    {
      key: "profile",
      label:
        locale === "th" ? "โปรไฟล์" : locale === "zh" ? "个人资料" : "Profile",
      icon: "👤",
    },
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
        <Image
          src="/images/scenic-building.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/90 to-blue-800/80" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
              <p className="text-sky-200 text-sm mt-1">
                {locale === "th"
                  ? "จัดการบริการ คำสั่ง แชท และข้อมูลบัญชีของคุณ"
                  : locale === "zh"
                    ? "管理您的服务、预约、聊天和账户"
                    : "Manage your services, bookings, chat, and account"}
              </p>
            </div>
            {subscriber ? (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-2.5">
                <div className="w-10 h-10 rounded-full bg-sky-400/30 flex items-center justify-center text-white font-bold">
                  {subscriber.name?.charAt(0) || "U"}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">
                    {subscriber.name}
                  </p>
                  <p className="text-sky-200 text-xs">{subscriber.email}</p>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem("subscriber");
                    localStorage.removeItem("subscriber_token");
                    localStorage.removeItem("pdpa_consent_customer");
                    router.push(prefix);
                  }}
                  className="ml-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition"
                >
                  {locale === "th"
                    ? "ออกจากระบบ"
                    : locale === "zh"
                      ? "退出登录"
                      : "Logout"}
                </button>
              </div>
            ) : !loading ? (
              <Link
                href={`${prefix}/subscription/login`}
                className="px-5 py-2.5 bg-white text-sky-700 rounded-xl font-semibold text-sm hover:bg-sky-50 transition shadow"
              >
                {locale === "th"
                  ? "เข้าสู่ระบบ"
                  : locale === "zh"
                    ? "登录"
                    : "Log In"}
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
                <h2 className="text-2xl font-bold">
                  {locale === "th"
                    ? "เริ่มต้นกับ CBLUE"
                    : locale === "zh"
                      ? "开始CBLUE之旅"
                      : "Get Started with CBLUE"}
                </h2>
                <p className="text-sky-100 mt-2">
                  {locale === "th"
                    ? "เข้าถึงช่างซ่อมบ้าน ทีมโครงการ มืออาชีพ และอสังหาริมทรัพย์ที่ผ่านการตรวจสอบ"
                    : locale === "zh"
                      ? "访问经过验证的技工、项目团队、专业人士和房产"
                      : "Access verified fixers, project teams, professionals, and properties"}
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`${prefix}/subscription/login`}
                  className="px-6 py-3 bg-white text-sky-700 rounded-xl font-bold text-sm hover:bg-sky-50 transition shadow-lg whitespace-nowrap"
                >
                  {locale === "th"
                    ? "เข้าสู่ระบบ"
                    : locale === "zh"
                      ? "登录"
                      : "Log In"}
                </Link>
                <Link
                  href={`${prefix}/subscription/register`}
                  className="px-6 py-3 border-2 border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition whitespace-nowrap"
                >
                  {locale === "th"
                    ? "สมัครสมาชิก"
                    : locale === "zh"
                      ? "注册"
                      : "Register"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Book - 4 Services */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              href: `${prefix}/booking/household`,
              icon: "🏠",
              label:
                locale === "th"
                  ? "จองช่างซ่อมบ้าน"
                  : locale === "zh"
                    ? "预约技工"
                    : "Book Fixer",
              desc:
                locale === "th"
                  ? "ประปา ไฟฟ้า แอร์"
                  : locale === "zh"
                    ? "管道、电气、空调"
                    : "Plumbing, Electrical, AC",
              color: "from-sky-500 to-blue-600",
            },
            {
              href: `${prefix}/booking/project`,
              icon: "💼",
              label:
                locale === "th"
                  ? "จองทีมโครงการ"
                  : locale === "zh"
                    ? "预约项目团队"
                    : "Book Project Team",
              desc:
                locale === "th"
                  ? "เว็บ AI สมาร์ทโฮม"
                  : locale === "zh"
                    ? "网站、AI、智能家居"
                    : "Web, AI, Smart Home",
              color: "from-indigo-500 to-purple-600",
            },
            {
              href: `${prefix}/booking/professional`,
              icon: "👔",
              label:
                locale === "th"
                  ? "จองมืออาชีพ"
                  : locale === "zh"
                    ? "预约专业人士"
                    : "Book Professional",
              desc:
                locale === "th"
                  ? "ทนาย สถาปนิก วิศวกร"
                  : locale === "zh"
                    ? "律师、建筑师、工程师"
                    : "Lawyer, Architect, Engineer",
              color: "from-emerald-500 to-teal-600",
            },
            {
              href: `${prefix}/properties`,
              icon: "🏢",
              label:
                locale === "th"
                  ? "อสังหาริมทรัพย์"
                  : locale === "zh"
                    ? "房产"
                    : "Book Property",
              desc:
                locale === "th"
                  ? "ซื้อ ขาย เช่า"
                  : locale === "zh"
                    ? "买、卖、租"
                    : "Buy, Sell, Rent",
              color: "from-amber-500 to-orange-600",
            },
          ].map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1"
            >
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
                activeTab === tab.key
                  ? "bg-sky-600 text-white shadow"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
              {tab.badge ? (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? "bg-white/30 text-white" : "bg-red-100 text-red-700"}`}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <OverviewTab locale={locale} subscriber={subscriber} />
        )}
        {activeTab === "bookings" && <BookingsTab locale={locale} />}
        {activeTab === "requests" && <RequestsTab locale={locale} />}
        {activeTab === "property" && (
          <PropertyTab locale={locale} prefix={prefix} />
        )}
        {activeTab === "history" && <HistoryTab locale={locale} />}
        {activeTab === "chat" && <ChatTab locale={locale} />}
        {activeTab === "notifications" && <NotificationsTab locale={locale} />}
        {activeTab === "profile" && (
          <ProfileTab locale={locale} prefix={prefix} subscriber={subscriber} />
        )}

        {/* Meeting Reminders */}
        {subscriber && (
          <div className="mt-6 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-5">
            <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3">
              ⏰{" "}
              {locale === "th"
                ? "การนัดหมายที่กำลังจะมาถึง"
                : locale === "zh"
                  ? "即将到来的预约"
                  : "Upcoming Meetings"}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-red-100">
                <span className="text-xl">🏠</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">
                    Fixer-1042 &middot;{" "}
                    {locale === "th"
                      ? "ซ่อมประปา"
                      : locale === "zh"
                        ? "管道维修"
                        : "Plumbing Repair"}
                  </p>
                  <p className="text-xs text-red-600 font-medium">
                    {locale === "th"
                      ? "วันนี้ เวลา 14:00 น."
                      : locale === "zh"
                        ? "今天下午2:00"
                        : "Today at 2:00 PM"}
                  </p>
                </div>
                <button className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg">
                  {locale === "th"
                    ? "ยืนยัน"
                    : locale === "zh"
                      ? "确认"
                      : "Confirm"}
                </button>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-red-100">
                <span className="text-xl">🏢</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">
                    Lister-7890 &middot;{" "}
                    {locale === "th"
                      ? "ดูคอนโด"
                      : locale === "zh"
                        ? "看公寓"
                        : "Condo Viewing"}
                  </p>
                  <p className="text-xs text-orange-600 font-medium">
                    {locale === "th"
                      ? "14 เม.ย. 2026 เวลา 10:00 น."
                      : locale === "zh"
                        ? "2026年4月14日 上午10:00"
                        : "Apr 14, 2026 at 10:00 AM"}
                  </p>
                </div>
                <button className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg">
                  {locale === "th"
                    ? "ยืนยัน"
                    : locale === "zh"
                      ? "确认"
                      : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rating Reminders */}
        {subscriber && (
          <div className="mt-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="font-bold text-amber-800 flex items-center gap-2 mb-3">
              ⭐{" "}
              {locale === "th"
                ? "รอให้คะแนน"
                : locale === "zh"
                  ? "待评价"
                  : "Pending Ratings"}
            </h3>
            <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-amber-100">
              <span className="text-xl">⚡</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">
                  Fixer-0921 &middot;{" "}
                  {locale === "th"
                    ? "บริการไฟฟ้า"
                    : locale === "zh"
                      ? "电气服务"
                      : "Electrical Service"}
                </p>
                <p className="text-xs text-gray-500">
                  {locale === "th"
                    ? "เสร็จสิ้น 15 มี.ค. 2026"
                    : locale === "zh"
                      ? "2026年3月15日完成"
                      : "Completed Mar 15, 2026"}
                </p>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className="text-2xl text-gray-300 hover:text-amber-400 transition"
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tier Comparison */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {locale === "th"
              ? "เปรียบเทียบระดับบริการ"
              : locale === "zh"
                ? "服务等级比较"
                : "Tier Comparison"}
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            {locale === "th"
              ? "ค่าธรรมเนียมดำเนินการต่อการจับคู่"
              : locale === "zh"
                ? "每次匹配的处理费"
                : "Processing fee per matching"}
          </p>

          {/* Fixer & Professional Tiers */}
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            🏠👔{" "}
            {locale === "th"
              ? "ช่างซ่อม / มืออาชีพ"
              : locale === "zh"
                ? "技工 / 专业人士"
                : "Fixer / Professional"}
          </h3>
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              {
                name: "Economy",
                fee: "฿100",
                color: "border-green-200 bg-green-50",
                textColor: "text-green-700",
                desc:
                  locale === "th"
                    ? "บริการทั่วไป"
                    : locale === "zh"
                      ? "基础服务"
                      : "Basic",
              },
              {
                name: "Standard",
                fee: "฿400",
                color: "border-blue-200 bg-blue-50",
                textColor: "text-blue-700",
                desc:
                  locale === "th"
                    ? "มาตรฐาน"
                    : locale === "zh"
                      ? "标准"
                      : "Standard",
              },
              {
                name: "Corporate",
                fee: "฿600",
                color: "border-purple-200 bg-purple-50",
                textColor: "text-purple-700",
                desc:
                  locale === "th"
                    ? "องค์กร"
                    : locale === "zh"
                      ? "企业"
                      : "Corporate",
              },
              {
                name: "Specialist",
                fee: "฿800",
                color: "border-amber-200 bg-amber-50",
                textColor: "text-amber-700",
                desc:
                  locale === "th"
                    ? "ผู้ชำนาญ"
                    : locale === "zh"
                      ? "专家"
                      : "Specialist",
              },
              {
                name: "Expert",
                fee: "฿1,000",
                color: "border-red-200 bg-red-50",
                textColor: "text-red-700",
                desc:
                  locale === "th"
                    ? "ผู้เชี่ยวชาญ"
                    : locale === "zh"
                      ? "大师"
                      : "Expert",
              },
            ].map((item) => (
              <div
                key={item.name}
                className={`rounded-xl border-2 p-4 text-center ${item.color}`}
              >
                <h3 className={`font-bold text-sm ${item.textColor}`}>
                  {item.name}
                </h3>
                <p className={`text-2xl font-extrabold ${item.textColor} mt-1`}>
                  {item.fee}
                </p>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Property Tiers */}
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            🏢{" "}
            {locale === "th"
              ? "อสังหาริมทรัพย์"
              : locale === "zh"
                ? "房产"
                : "Property"}
          </h3>
          <div className="grid grid-cols-5 gap-3">
            {[
              {
                name: "Economy",
                fee: "฿100",
                color: "border-green-200 bg-green-50",
                textColor: "text-green-700",
                desc:
                  locale === "th"
                    ? "ห้องเช่า"
                    : locale === "zh"
                      ? "房间"
                      : "Room",
              },
              {
                name: "Standard",
                fee: "฿400",
                color: "border-blue-200 bg-blue-50",
                textColor: "text-blue-700",
                desc:
                  locale === "th"
                    ? "คอนโด"
                    : locale === "zh"
                      ? "公寓"
                      : "Condo",
              },
              {
                name: "Upper",
                fee: "฿600",
                color: "border-teal-200 bg-teal-50",
                textColor: "text-teal-700",
                desc:
                  locale === "th" ? "บ้าน" : locale === "zh" ? "别墅" : "House",
              },
              {
                name: "Luxury",
                fee: "฿800",
                color: "border-amber-200 bg-amber-50",
                textColor: "text-amber-700",
                desc:
                  locale === "th"
                    ? "หรูหรา"
                    : locale === "zh"
                      ? "豪华"
                      : "Luxury",
              },
              {
                name: "Grandeur",
                fee: "฿1,000",
                color: "border-purple-200 bg-purple-50",
                textColor: "text-purple-700",
                desc:
                  locale === "th"
                    ? "พรีเมียม"
                    : locale === "zh"
                      ? "顶级"
                      : "Premium",
              },
            ].map((item) => (
              <div
                key={item.name}
                className={`rounded-xl border-2 p-4 text-center ${item.color}`}
              >
                <h3 className={`font-bold text-sm ${item.textColor}`}>
                  {item.name}
                </h3>
                <p className={`text-2xl font-extrabold ${item.textColor} mt-1`}>
                  {item.fee}
                </p>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">
            ⚠️{" "}
            {locale === "th"
              ? "ข้อจำกัดความรับผิดชอบ"
              : locale === "zh"
                ? "免责声明"
                : "Disclaimer"}
          </p>
          <p>
            {locale === "th"
              ? "CBLUE เป็นแพลตฟอร์มจับคู่เท่านั้น ราคาที่ตกลง ขอบเขตงาน และการชำระเงินระหว่างคุณกับพาร์ทเนอร์ (ช่าง/ทีมโครงการ/มืออาชีพ/ผู้ลงประกาศอสังหาริมทรัพย์) เป็นข้อตกลงโดยตรงระหว่างทั้งสองฝ่าย CBLUE ไม่รับผิดชอบต่อข้อพิพาทด้านราคา คุณภาพงาน หรือข้อตกลงที่เกิดขึ้นหลังกระบวนการจับคู่"
              : locale === "zh"
                ? "CBLUE 仅作为匹配平台。您与合作伙伴（技工/项目团队/专业人士/房产发布者）之间约定的价格、工作范围和付款为双方直接安排。CBLUE 不对匹配过程后产生的价格争议、工作质量或协议承担责任。"
                : "CBLUE acts as a matching platform only. The agreed price, scope of work, and payment between you and the partner (fixer/project team/professional/property lister) is a direct arrangement between both parties. CBLUE is not responsible for pricing disputes, work quality, or agreements made after the matching process."}
          </p>
          <p className="mt-2 font-semibold text-gray-700">
            {locale === "th"
              ? "📌 ค่าธรรมเนียมดำเนินการไม่สามารถคืนเงินได้ เนื่องจากบริการจับคู่ได้ดำเนินการเสร็จสิ้นแล้วเมื่อลูกค้าเริ่มกระบวนการ ค่าธรรมเนียมนี้ครอบคลุมการจับคู่ AI, การตรวจสอบพาร์ทเนอร์, การออก PO และการจัดการการสื่อสาร"
              : locale === "zh"
                ? "📌 处理费不可退还，因为匹配服务在客户发起流程后已完成。此费用涵盖AI匹配、合作伙伴验证、PO签发和通信协调。"
                : "📌 The processing fee is non-refundable as the matching service is completed once the customer initiates the process. This fee covers AI matching, partner verification, PO issuance, and communication facilitation."}
          </p>
        </div>

        {/* Data Retention Notice */}
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
          <p className="font-semibold mb-1">
            🛡️{" "}
            {locale === "th"
              ? "นโยบายการเก็บรักษาข้อมูล (PDPA)"
              : locale === "zh"
                ? "数据保留政策 (PDPA)"
                : "Data Retention Policy (PDPA)"}
          </p>
          <p>
            {locale === "th"
              ? "ความยินยอม: 3 ปี | ประวัติบริการ: 18 เดือน | บัญชีไม่ใช้งาน: ลบหลัง 12 เดือน"
              : locale === "zh"
                ? "同意记录: 3年 | 服务历史: 18个月 | 非活跃账户: 12个月后删除"
                : "Consent: 3 years | Service history: 18 months | Inactive accounts: deleted after 12 months"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ===== OVERVIEW TAB ===== */
function OverviewTab({
  locale,
  subscriber,
}: {
  locale: string;
  subscriber: SubscriberInfo | null;
}) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label:
              locale === "th"
                ? "บริการปัจจุบัน"
                : locale === "zh"
                  ? "进行中"
                  : "Active",
            value: DEMO_ACTIVE.length,
            icon: "⚡",
            color: "text-sky-600",
          },
          {
            label:
              locale === "th"
                ? "เสร็จสิ้น"
                : locale === "zh"
                  ? "已完成"
                  : "Completed",
            value: DEMO_HISTORY.length,
            icon: "✅",
            color: "text-green-600",
          },
          {
            label:
              locale === "th"
                ? "ข้อความใหม่"
                : locale === "zh"
                  ? "消息"
                  : "Messages",
            value: DEMO_CHATS.reduce((a, c) => a + c.unread, 0),
            icon: "💬",
            color: "text-indigo-600",
          },
          {
            label:
              locale === "th"
                ? "ความพึงพอใจ"
                : locale === "zh"
                  ? "满意度"
                  : "Satisfaction",
            value: "4.8 ⭐",
            icon: "🏆",
            color: "text-amber-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">
                {s.label}
              </span>
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {subscriber.name?.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {subscriber.name}
              </h3>
              <p className="text-sm text-gray-500">
                {subscriber.email} &middot; {subscriber.phone}
              </p>
              {subscriber.company && (
                <p className="text-xs text-gray-400">{subscriber.company}</p>
              )}
            </div>
            <span
              className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${subscriber.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
            >
              {subscriber.status}
            </span>
          </div>
        </div>
      )}

      {/* Active Services Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            ⚡{" "}
            {locale === "th"
              ? "บริการที่กำลังดำเนินการ"
              : locale === "zh"
                ? "进行中的服务"
                : "Active Services"}
          </h2>
          <span className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-bold">
            {DEMO_ACTIVE.length}
          </span>
        </div>
        <div className="divide-y divide-gray-50">
          {DEMO_ACTIVE.map((s) => (
            <div
              key={s.id}
              className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition"
            >
              <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-lg">
                {ICON_MAP[s.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">
                  {locale === "th"
                    ? s.serviceTh
                    : locale === "zh"
                      ? s.serviceZh
                      : s.service}
                </p>
                <p className="text-xs text-gray-500">
                  {s.partner} &middot; {s.date}
                </p>
                {/* Progress bar */}
                <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-sky-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${s.progress}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[s.tier] || ""}`}
                >
                  {s.tier}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[s.status] || ""}`}
                >
                  {getStatusLabel(s.status, locale)}
                </span>
                <button className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition">
                  💬
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Notifications + Chat side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            🔔{" "}
            {locale === "th"
              ? "การแจ้งเตือนล่าสุด"
              : locale === "zh"
                ? "最近通知"
                : "Recent Alerts"}
          </h3>
          <div className="space-y-2">
            {DEMO_NOTIFICATIONS.slice(0, 3).map((n) => (
              <div
                key={n.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${n.unread ? "bg-sky-50 border border-sky-100" : "bg-gray-50"}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${n.dot} flex-shrink-0`}
                />
                <p className="text-sm text-gray-700 flex-1">
                  {locale === "th"
                    ? n.msgTh
                    : locale === "zh"
                      ? n.msgZh
                      : n.msg}
                </p>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {locale === "th"
                    ? n.timeTh
                    : locale === "zh"
                      ? n.timeZh
                      : n.time}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            💬{" "}
            {locale === "th"
              ? "แชทล่าสุด"
              : locale === "zh"
                ? "最近聊天"
                : "Recent Chats"}
          </h3>
          <div className="space-y-2">
            {DEMO_CHATS.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${c.unread > 0 ? "bg-sky-50 border border-sky-100" : "bg-gray-50"}`}
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                    {c.name.slice(-4)}
                  </div>
                  {c.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {c.name}{" "}
                    <span className="text-gray-400 font-normal">
                      · {c.service}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {locale === "th"
                      ? c.lastMsgTh
                      : locale === "zh"
                        ? c.lastMsgZh
                        : c.lastMsg}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">
                    {locale === "th"
                      ? c.timeTh
                      : locale === "zh"
                        ? c.timeZh
                        : c.time}
                  </span>
                  {c.unread > 0 && (
                    <span className="block mt-0.5 ml-auto w-5 h-5 bg-sky-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            📜{" "}
            {locale === "th"
              ? "ประวัติล่าสุด"
              : locale === "zh"
                ? "最近历史"
                : "Recent History"}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">
                  {locale === "th"
                    ? "บริการ"
                    : locale === "zh"
                      ? "服务"
                      : "Service"}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">
                  {locale === "th"
                    ? "ช่าง/มืออาชีพ"
                    : locale === "zh"
                      ? "技工/专业人士"
                      : "Fixer / Pro"}
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">
                  {locale === "th"
                    ? "ระดับ"
                    : locale === "zh"
                      ? "等级"
                      : "Tier"}
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">
                  {locale === "th"
                    ? "คะแนน"
                    : locale === "zh"
                      ? "评分"
                      : "Rating"}
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">
                  {locale === "th"
                    ? "ค่าบริการ"
                    : locale === "zh"
                      ? "费用"
                      : "Fee"}
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600">
                  {locale === "th"
                    ? "วันที่"
                    : locale === "zh"
                      ? "日期"
                      : "Date"}
                </th>
              </tr>
            </thead>
            <tbody>
              {DEMO_HISTORY.slice(0, 3).map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition"
                >
                  <td className="py-3 px-4">
                    <span className="mr-2">{ICON_MAP[h.type]}</span>
                    <span className="font-medium text-gray-900">
                      {locale === "th"
                        ? h.serviceTh
                        : locale === "zh"
                          ? h.serviceZh
                          : h.service}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{h.partner}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${TIER_STYLE[h.tier] || ""}`}
                    >
                      {h.tier}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-amber-600 font-semibold">
                    {h.rating} ⭐
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-gray-800">
                    {h.fee}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-500">
                    {h.date}
                  </td>
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
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          ⚡{" "}
          {locale === "th"
            ? "บริการที่กำลังดำเนินการ"
            : locale === "zh"
              ? "进行中的服务"
              : "Active Services"}
        </h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_ACTIVE.map((s) => (
          <div key={s.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center text-2xl">
                {ICON_MAP[s.type]}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">
                  {locale === "th"
                    ? s.serviceTh
                    : locale === "zh"
                      ? s.serviceZh
                      : s.service}
                </h3>
                <p className="text-sm text-gray-500">
                  {s.partner} &middot; {s.date}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold ${TIER_STYLE[s.tier] || ""}`}
                >
                  {s.tier}
                </span>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLE[s.status] || ""}`}
                >
                  {getStatusLabel(s.status, locale)}
                </span>
              </div>
            </div>
            {/* Progress */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-sky-500 h-2 rounded-full transition-all"
                    style={{ width: `${s.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {s.progress}%{" "}
                  {locale === "th"
                    ? "ดำเนินการแล้ว"
                    : locale === "zh"
                      ? "已完成"
                      : "completed"}
                </p>
              </div>
              <button className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition">
                💬 {locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== REQUESTS TAB ===== */
function RequestsTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          📋{" "}
          {locale === "th"
            ? "คำขอบริการทั้งหมด"
            : locale === "zh"
              ? "所有服务请求"
              : "All Service Requests"}
        </h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_REQUESTS.map((r) => (
          <div key={r.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">
                {ICON_MAP[r.type]}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">
                  {locale === "th"
                    ? r.serviceTh
                    : locale === "zh"
                      ? r.serviceZh
                      : r.service}
                </h3>
                <p className="text-sm text-gray-500">
                  {r.area} &middot; {r.date}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold ${TIER_STYLE[r.tier] || ""}`}
                >
                  {r.tier}
                </span>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLE[r.status] || ""}`}
                >
                  {getStatusLabel(r.status, locale)}
                </span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition">
                👀{" "}
                {locale === "th"
                  ? "ดูรายละเอียด"
                  : locale === "zh"
                    ? "查看详情"
                    : "View Details"}
              </button>
              <button className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition">
                ✕{" "}
                {locale === "th"
                  ? "ยกเลิก"
                  : locale === "zh"
                    ? "取消"
                    : "Cancel"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== PROPERTY TAB ===== */
function PropertyTab({ locale, prefix }: { locale: string; prefix: string }) {
  return (
    <div className="space-y-6">
      {/* Property Inquiries */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            🏢{" "}
            {locale === "th"
              ? "การสอบถามอสังหาริมทรัพย์"
              : locale === "zh"
                ? "房产询问"
                : "Property Inquiries"}
          </h2>
          <Link
            href={`${prefix}/properties`}
            className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
          >
            {locale === "th"
              ? "ค้นหาเพิ่ม →"
              : locale === "zh"
                ? "浏览更多 →"
                : "Browse More →"}
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {DEMO_PROPERTY_INQUIRIES.map((p) => (
            <div key={p.id} className="p-6 hover:bg-gray-50/50 transition">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 rounded-xl bg-sky-100 flex items-center justify-center text-3xl">
                  {p.image}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">
                    {locale === "th"
                      ? p.titleTh
                      : locale === "zh"
                        ? p.titleZh
                        : p.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {p.lister} &middot; {p.date}
                  </p>
                  <p className="text-lg font-extrabold text-sky-700 mt-0.5">
                    {p.price}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold ${p.type === "SALE" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}
                  >
                    {p.type === "SALE"
                      ? locale === "th"
                        ? "ขาย"
                        : locale === "zh"
                          ? "出售"
                          : "Sale"
                      : locale === "th"
                        ? "เช่า"
                        : locale === "zh"
                          ? "出租"
                          : "Rent"}
                  </span>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_STYLE[p.status] || "bg-gray-100 text-gray-700"}`}
                  >
                    {getStatusLabel(p.status, locale)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition">
                  💬{" "}
                  {locale === "th"
                    ? "แชทกับผู้ลงประกาศ"
                    : locale === "zh"
                      ? "与发布者聊天"
                      : "Chat with Lister"}
                </button>
                <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition">
                  📅{" "}
                  {locale === "th"
                    ? "นัดดูทรัพย์สิน"
                    : locale === "zh"
                      ? "预约看房"
                      : "Schedule Viewing"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Property Tier Info */}
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-5">
        <h3 className="font-bold text-sky-900 mb-3">
          🏢{" "}
          {locale === "th"
            ? "ระดับอสังหาริมทรัพย์"
            : locale === "zh"
              ? "房产等级"
              : "Property Tiers"}
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {[
            { tier: "Economy", fee: "฿100", icon: "🏠" },
            { tier: "Standard", fee: "฿400", icon: "🏢" },
            { tier: "Upper", fee: "฿600", icon: "🏘️" },
            { tier: "Luxury", fee: "฿800", icon: "🏰" },
            { tier: "Grandeur", fee: "฿1,000", icon: "🏛️" },
          ].map((t) => (
            <div
              key={t.tier}
              className="bg-white rounded-lg p-3 text-center border border-sky-100"
            >
              <span className="text-xl block">{t.icon}</span>
              <p className="text-xs font-bold text-gray-800 mt-1">{t.tier}</p>
              <p className="text-sm font-extrabold text-sky-700">{t.fee}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-sky-700 mt-3">
          {locale === "th"
            ? "ค่าธรรมเนียมดำเนินการจะชำระก่อนเข้าถึงข้อมูลติดต่อผู้ลงประกาศ ราคาทรัพย์สินตกลงโดยตรงระหว่างผู้ซื้อ/ผู้เช่าและผู้ลงประกาศ"
            : locale === "zh"
              ? "处理费在获取发布者联系信息前支付。房产价格由买家/租客和发布者直接协商。"
              : "Processing fee is paid before accessing lister contact info. Property price is agreed directly between buyer/renter and lister."}
        </p>
      </div>
    </div>
  );
}

/* ===== HISTORY TAB ===== */
function HistoryTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          📜{" "}
          {locale === "th"
            ? "ประวัติการใช้บริการทั้งหมด"
            : locale === "zh"
              ? "完整服务历史"
              : "Full Service History"}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-600">
                {locale === "th"
                  ? "บริการ"
                  : locale === "zh"
                    ? "服务"
                    : "Service"}
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">
                {locale === "th"
                  ? "ช่าง/มืออาชีพ"
                  : locale === "zh"
                    ? "技工/专业人士"
                    : "Fixer / Pro"}
              </th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">
                {locale === "th" ? "ระดับ" : locale === "zh" ? "等级" : "Tier"}
              </th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">
                {locale === "th"
                  ? "คะแนน"
                  : locale === "zh"
                    ? "评分"
                    : "Rating"}
              </th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">
                {locale === "th"
                  ? "ค่าบริการ"
                  : locale === "zh"
                    ? "费用"
                    : "Fee"}
              </th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">
                {locale === "th" ? "วันที่" : locale === "zh" ? "日期" : "Date"}
              </th>
            </tr>
          </thead>
          <tbody>
            {DEMO_HISTORY.map((h) => (
              <tr
                key={h.id}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition"
              >
                <td className="py-3 px-4">
                  <span className="mr-2">{ICON_MAP[h.type]}</span>
                  <span className="font-medium text-gray-900">
                    {locale === "th"
                      ? h.serviceTh
                      : locale === "zh"
                        ? h.serviceZh
                        : h.service}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600">{h.partner}</td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${TIER_STYLE[h.tier] || ""}`}
                  >
                    {h.tier}
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-amber-600 font-semibold">
                  {h.rating} ⭐
                </td>
                <td className="py-3 px-4 text-center font-semibold text-gray-800">
                  {h.fee}
                </td>
                <td className="py-3 px-4 text-center text-gray-500">
                  {h.date}
                </td>
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
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          💬{" "}
          {locale === "th"
            ? "แชทกับช่าง/มืออาชีพ"
            : locale === "zh"
              ? "与技工和专业人士聊天"
              : "Chat with Fixers & Professionals"}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {locale === "th"
            ? "แชทแบบไม่เปิดเผยตัวตนเพื่อความปลอดภัย"
            : locale === "zh"
              ? "匿名聊天保障您的安全"
              : "Anonymous chat for your safety"}
        </p>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_CHATS.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition ${c.unread > 0 ? "bg-sky-50/50 hover:bg-sky-50" : "hover:bg-gray-50"}`}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                {c.name.slice(-4)}
              </div>
              {c.online && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-900">{c.name}</p>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                  {c.service}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate mt-0.5">
                {locale === "th"
                  ? c.lastMsgTh
                  : locale === "zh"
                    ? c.lastMsgZh
                    : c.lastMsg}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">
                {locale === "th"
                  ? c.timeTh
                  : locale === "zh"
                    ? c.timeZh
                    : c.time}
              </p>
              {c.unread > 0 && (
                <span className="inline-flex items-center justify-center mt-1 w-5 h-5 bg-sky-600 text-white text-[10px] font-bold rounded-full">
                  {c.unread}
                </span>
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
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          🔔{" "}
          {locale === "th"
            ? "การแจ้งเตือนทั้งหมด"
            : locale === "zh"
              ? "所有通知"
              : "All Notifications"}
        </h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_NOTIFICATIONS.map((n) => (
          <div
            key={n.id}
            className={`flex items-center gap-4 px-6 py-4 transition ${n.unread ? "bg-sky-50/50" : "hover:bg-gray-50"}`}
          >
            <span className={`w-3 h-3 rounded-full ${n.dot} flex-shrink-0`} />
            <p className="text-sm text-gray-800 flex-1">
              {locale === "th" ? n.msgTh : locale === "zh" ? n.msgZh : n.msg}
            </p>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {locale === "th" ? n.timeTh : locale === "zh" ? n.timeZh : n.time}
            </span>
            {n.unread && <span className="w-2 h-2 bg-sky-500 rounded-full" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== PROFILE TAB ===== */
function ProfileTab({
  locale,
  prefix,
  subscriber,
}: {
  locale: string;
  prefix: string;
  subscriber: SubscriberInfo | null;
}) {
  const router = useRouter();
  if (!subscriber) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {locale === "th"
            ? "เข้าสู่ระบบเพื่อดูโปรไฟล์"
            : locale === "zh"
              ? "登录查看个人资料"
              : "Log in to view profile"}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {locale === "th"
            ? "เข้าสู่ระบบเพื่อจัดการข้อมูลบัญชีและการตั้งค่า"
            : locale === "zh"
              ? "登录管理账户详情和设置"
              : "Sign in to manage account details and preferences"}
        </p>
        <Link
          href={`${prefix}/subscription/login`}
          className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition inline-block"
        >
          {locale === "th"
            ? "เข้าสู่ระบบ"
            : locale === "zh"
              ? "登录"
              : "Log In"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {subscriber.name?.charAt(0) || "U"}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {subscriber.name}
            </h2>
            <p className="text-sm text-gray-500">{subscriber.email}</p>
            <p className="text-sm text-gray-400">{subscriber.phone}</p>
            {subscriber.company && (
              <p className="text-xs text-gray-400 mt-0.5">
                {subscriber.company}
              </p>
            )}
          </div>
          <span
            className={`ml-auto px-3 py-1.5 rounded-full text-xs font-bold ${subscriber.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
          >
            {subscriber.status}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label:
                locale === "th"
                  ? "บริการทั้งหมด"
                  : locale === "zh"
                    ? "总预约"
                    : "Total Bookings",
              value: DEMO_HISTORY.length + DEMO_ACTIVE.length,
              icon: "📋",
            },
            {
              label:
                locale === "th"
                  ? "กำลังดำเนินการ"
                  : locale === "zh"
                    ? "进行中"
                    : "Active",
              value: DEMO_ACTIVE.length,
              icon: "⚡",
            },
            {
              label:
                locale === "th"
                  ? "ความพึงพอใจ"
                  : locale === "zh"
                    ? "平均评分"
                    : "Avg Rating",
              value: "4.8 ⭐",
              icon: "🏆",
            },
            {
              label:
                locale === "th"
                  ? "สมาชิกตั้งแต่"
                  : locale === "zh"
                    ? "注册时间"
                    : "Member Since",
              value: "Mar 2026",
              icon: "📅",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-gray-50 rounded-xl p-4 text-center"
            >
              <span className="text-xl block mb-1">{s.icon}</span>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          ⚙️{" "}
          {locale === "th"
            ? "การตั้งค่า"
            : locale === "zh"
              ? "设置"
              : "Settings"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              label:
                locale === "th"
                  ? "แก้ไขโปรไฟล์"
                  : locale === "zh"
                    ? "编辑资料"
                    : "Edit Profile",
              icon: "✏️",
              desc:
                locale === "th"
                  ? "อัปเดตชื่อ อีเมล เบอร์โทร"
                  : locale === "zh"
                    ? "更新姓名、邮箱、电话"
                    : "Update name, email, phone",
            },
            {
              label:
                locale === "th"
                  ? "เปลี่ยนรหัสผ่าน"
                  : locale === "zh"
                    ? "修改密码"
                    : "Change Password",
              icon: "🔒",
              desc:
                locale === "th"
                  ? "อัปเดตรหัสผ่านเพื่อความปลอดภัย"
                  : locale === "zh"
                    ? "更新密码以确保安全"
                    : "Update password for security",
            },
            {
              label:
                locale === "th"
                  ? "การแจ้งเตือน"
                  : locale === "zh"
                    ? "通知偏好"
                    : "Notification Preferences",
              icon: "🔔",
              desc:
                locale === "th"
                  ? "จัดการอีเมลและ Push"
                  : locale === "zh"
                    ? "管理邮件和推送提醒"
                    : "Manage email & push alerts",
            },
            {
              label:
                locale === "th"
                  ? "ที่อยู่"
                  : locale === "zh"
                    ? "保存的地址"
                    : "Saved Addresses",
              icon: "📍",
              desc:
                locale === "th"
                  ? "จัดการที่อยู่ที่บันทึกไว้"
                  : locale === "zh"
                    ? "管理保存的位置"
                    : "Manage saved locations",
            },
          ].map((item) => (
            <button
              key={item.label}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-sky-300 hover:bg-sky-50/50 transition text-left w-full"
            >
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <button
          onClick={() => {
            localStorage.removeItem("subscriber");
            localStorage.removeItem("subscriber_token");
            localStorage.removeItem("pdpa_consent_customer");
            router.push(prefix);
          }}
          className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm rounded-xl border border-red-200 transition"
        >
          🚪{" "}
          {locale === "th"
            ? "ออกจากระบบ"
            : locale === "zh"
              ? "退出登录"
              : "Logout"}
        </button>
      </div>
    </div>
  );
}
export default function PartnerDashboard() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState("overview");
  const [subscriber, setSubscriber] = useState<SubscriberInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("subscriber");
    if (saved) {
      try {
        setSubscriber(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const prefix = `/${locale}`;

  const tabs = [
    {
      id: "overview",
      icon: "📊",
      label: locale === "th" ? "ภาพรวม" : locale === "zh" ? "概览" : "Overview",
    },
    {
      id: "active",
      icon: "🔧",
      label:
        locale === "th"
          ? "งานปัจจุบัน"
          : locale === "zh"
            ? "进行中"
            : "Active Work",
      badge: 3,
    },
    {
      id: "requests",
      icon: "📋",
      label:
        locale === "th"
          ? "คำขอใหม่"
          : locale === "zh"
            ? "新请求"
            : "New Requests",
      badge: 3,
    },
    {
      id: "chat",
      icon: "💬",
      label: locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chats",
      badge: 3,
    },
    {
      id: "notifications",
      icon: "🔔",
      label:
        locale === "th" ? "แจ้งเตือน" : locale === "zh" ? "通知" : "Alerts",
      badge: 3,
    },
    {
      id: "profile",
      icon: "👤",
      label:
        locale === "th" ? "โปรไฟล์" : locale === "zh" ? "个人资料" : "Profile",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 md:pb-0">
      {/* Header logic ... */}
      <div className="bg-sky-600 text-white pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl"></div>
          <div className="absolute top-40 -left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-overlay filter blur-3xl"></div>
        </div>
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {locale === "th"
                ? "พาร์ทเนอร์แดชบอร์ด"
                : locale === "zh"
                  ? "合作伙伴仪表板"
                  : "Partner Dashboard"}
            </h1>
            <p className="text-sky-100">
              {subscriber
                ? `${locale === "th" ? "ยินดีต้อนรับ" : locale === "zh" ? "欢迎" : "Welcome back"}, ${subscriber.name}`
                : locale === "th"
                  ? "จัดการงานและการนัดหมาย"
                  : locale === "zh"
                    ? "管理您的工作和预约"
                    : "Manage your work and appointments"}
            </p>
          </div>
          {subscriber && (
            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-sky-600 text-xl font-bold shadow-inner">
                {subscriber.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold">{subscriber.name}</p>
                <div className="flex gap-2 text-xs text-sky-100">
                  <span>{subscriber.phone}</span>
                  <span className="bg-green-500/20 text-green-100 px-1.5 rounded">
                    Corporate
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-12 relative z-20">
        {/* Desktop Tabs */}
        <div className="hidden md:flex bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6 gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition ${
                activeTab === t.id
                  ? "bg-sky-50 text-sky-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
              {t.badge && (
                <span
                  className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === t.id ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-500"}`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mb-6">
          {activeTab === "overview" && <OverviewTab locale={locale} />}
          {activeTab === "active" && <ActiveTab locale={locale} />}
          {activeTab === "requests" && <RequestsTab locale={locale} />}
          {activeTab === "chat" && <ChatTab locale={locale} />}
          {activeTab === "notifications" && (
            <NotificationsTab locale={locale} />
          )}
          {activeTab === "profile" && (
            <ProfileTab
              locale={locale}
              prefix={prefix}
              subscriber={subscriber}
            />
          )}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around p-2 z-50 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {tabs.slice(0, 5).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl relative transition-all ${
              activeTab === t.id
                ? "text-sky-600"
                : "text-gray-400 hover:text-sky-500"
            }`}
          >
            {activeTab === t.id && (
              <span className="absolute top-0 w-8 h-1 bg-sky-500 rounded-b-full"></span>
            )}
            <span
              className={`text-2xl mb-1 ${activeTab === t.id ? "transform -translate-y-1" : ""} transition-transform duration-200`}
            >
              {t.icon}
            </span>
            <span className="text-[10px] font-medium leading-none">
              {t.label}
            </span>
            {t.badge && (
              <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ locale }: { locale: string }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label:
              locale === "th"
                ? "งานปัจจุบัน"
                : locale === "zh"
                  ? "进行中"
                  : "Active Work",
            value: "3",
            icon: "🔧",
            color: "bg-blue-50 text-blue-600",
          },
          {
            label:
              locale === "th"
                ? "เสร็จสิ้น"
                : locale === "zh"
                  ? "已完成"
                  : "Completed",
            value: "47",
            icon: "✅",
            color: "bg-green-50 text-green-600",
          },
          {
            label:
              locale === "th"
                ? "รายได้เดือนนี้"
                : locale === "zh"
                  ? "本月收入"
                  : "Monthly Revenue",
            value: "฿18,500",
            icon: "💰",
            color: "bg-purple-50 text-purple-600",
          },
          {
            label:
              locale === "th" ? "คะแนน" : locale === "zh" ? "评分" : "Rating",
            value: "4.8 ⭐",
            icon: "🏆",
            color: "bg-amber-50 text-amber-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center hover:shadow-md transition cursor-pointer group"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 ${s.color} group-hover:scale-110 transition-transform`}
            >
              {s.icon}
            </div>
            <p className="text-gray-500 text-xs font-medium mb-1">{s.label}</p>
            <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              💰{" "}
              {locale === "th"
                ? "รายได้รายเดือน"
                : locale === "zh"
                  ? "月度收入"
                  : "Monthly Revenue"}
            </h3>
          </div>
          <div className="flex justify-between items-end h-40 gap-2">
            {[
              {
                val: 12500,
                label: locale === "th" ? "ม.ค." : "Jan",
                height: "50%",
              },
              {
                val: 15200,
                label: locale === "th" ? "ก.พ." : "Feb",
                height: "65%",
              },
              {
                val: 18800,
                label: locale === "th" ? "มี.ค." : "Mar",
                height: "85%",
              },
              {
                val: 18500,
                label: locale === "th" ? "เม.ย." : "Apr",
                height: "80%",
              },
            ].map((bar, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-2 group"
              >
                <span className="text-xs font-bold text-gray-400 group-hover:text-sky-600">
                  ฿{(bar.val / 1000).toFixed(1)}k
                </span>
                <div className="w-full bg-gray-100 rounded-t-xl relative overflow-hidden h-full flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-sky-400 to-sky-300 rounded-t-xl transition-all duration-1000 group-hover:opacity-80"
                    style={{ height: bar.height }}
                  ></div>
                </div>
                <span className="text-[10px] text-gray-500 font-medium">
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              📋{" "}
              {locale === "th"
                ? "คำขอใหม่"
                : locale === "zh"
                  ? "新请求"
                  : "New Requests"}
            </h3>
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-lg">
              2 {locale === "th" ? "รอรับงาน" : "Pending"}
            </span>
          </div>
          <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
            {DEMO_REQUESTS.map((r) => (
              <div key={r.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-sm text-gray-900">
                    {locale === "th"
                      ? r.serviceTh
                      : locale === "zh"
                        ? r.serviceZh
                        : r.service}
                  </span>
                  <span className="text-sky-600 font-bold text-sm">
                    {r.budget}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {r.customer} &middot; {r.date}
                </p>
                <div className="flex gap-2">
                  <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1.5 rounded font-bold text-xs">
                    {locale === "th" ? "รับงาน" : "Accept"}
                  </button>
                  <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded font-bold text-xs">
                    {locale === "th" ? "ปฏิเสธ" : "Decline"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActiveTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          🔧{" "}
          {locale === "th"
            ? "งานปัจจุบัน"
            : locale === "zh"
              ? "进行中"
              : "Active Work"}
        </h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_ACTIVE.map((job) => (
          <div key={job.id} className="p-6 hover:bg-gray-50 transition">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🔧</span>
                  <h3 className="font-bold text-gray-900">
                    {locale === "th"
                      ? job.serviceTh
                      : locale === "zh"
                        ? job.serviceZh
                        : job.service}
                  </h3>
                </div>
                <p className="text-sm text-gray-500">
                  {job.partner} &middot; {job.date}
                </p>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 bg-sky-100 text-sky-700 text-[10px] font-bold rounded-md block mb-1">
                  {job.tier}
                </span>
                <span className="font-bold text-gray-900 text-sm">
                  {job.fee}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-amber-600">
                {locale === "th" ? "กำลังดำเนินการ" : "In Progress"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestsTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          📋{" "}
          {locale === "th"
            ? "คำขอใหม่"
            : locale === "zh"
              ? "新请求"
              : "New Requests"}
        </h2>
      </div>
      <div className="p-4 grid gap-4">
        {DEMO_REQUESTS.map((r) => (
          <div
            key={r.id}
            className="border border-gray-200 rounded-xl p-5 hover:border-sky-300 transition"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  {locale === "th"
                    ? r.serviceTh
                    : locale === "zh"
                      ? r.serviceZh
                      : r.service}
                </h3>
                <p className="text-sm text-gray-500">
                  {r.customer} &middot; {r.date}
                </p>
                {r.urgent && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md">
                    {locale === "th" ? "เร่งด่วน" : "Urgent"}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="block text-lg font-bold text-sky-600">
                  {r.budget}
                </span>
                <span className="text-xs text-gray-400">{r.tier}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold text-sm">
                {locale === "th" ? "รับ" : "Accept"}
              </button>
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-bold text-sm">
                {locale === "th" ? "ปฏิเสธ" : "Decline"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          💬 {locale === "th" ? "แชททั้งหมด" : "All Chats"}
        </h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_CHATS.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition cursor-pointer"
          >
            <div className="relative">
              <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center font-bold text-lg">
                {c.name.charAt(0)}
              </div>
              {c.online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-1">
                <h3 className="font-bold text-gray-900 truncate pr-2">
                  {c.name}
                </h3>
                <span className="text-xs text-gray-400">
                  {locale === "th" ? c.timeTh : c.time}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">
                {locale === "th" ? c.lastMsgTh : c.lastMsg}
              </p>
            </div>
            {c.unread > 0 && (
              <span className="w-5 h-5 flex items-center justify-center bg-sky-600 text-white text-[10px] font-bold rounded-full">
                {c.unread}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          🔔 {locale === "th" ? "การแจ้งเตือน" : "Notifications"}
        </h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_NOTIFICATIONS.map((n) => (
          <div
            key={n.id}
            className={`flex gap-4 p-4 hover:bg-gray-50 transition ${n.unread ? "bg-sky-50/30" : ""}`}
          >
            <span
              className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${n.dot}`}
            ></span>
            <div>
              <p className="text-sm text-gray-800">
                {locale === "th" ? n.msgTh : n.msg}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {locale === "th" ? n.timeTh : n.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileTab({
  locale,
  prefix,
  subscriber,
}: {
  locale: string;
  prefix: string;
  subscriber: SubscriberInfo | null;
}) {
  const router = useRouter();
  if (!subscriber)
    return <div>{locale === "th" ? "กรุณาเข้าสู่ระบบ" : "Please log in"}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
              {subscriber.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {subscriber.name}
              </h2>
              <p className="text-sm text-gray-500">{subscriber.email}</p>
              <p className="text-sm text-gray-500">{subscriber.phone}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md mb-2">
              KYC ✓ {locale === "th" ? "ยืนยันแล้ว" : "Verified"}
            </span>
            <span className="block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-md">
              Corporate
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-xl text-center">
            <p className="text-xs text-gray-500 mb-1">
              {locale === "th" ? "อัตราตอบรับ" : "Acceptance Rate"}
            </p>
            <p className="text-xl font-bold text-gray-900">96%</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl text-center">
            <p className="text-xs text-gray-500 mb-1">
              {locale === "th" ? "ลูกค้าประจำ" : "Repeat Clients"}
            </p>
            <p className="text-xl font-bold text-gray-900">12</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <button
          onClick={() => {
            localStorage.removeItem("subscriber");
            localStorage.removeItem("subscriber_token");
            router.push(prefix);
          }}
          className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm rounded-xl transition"
        >
          🚪 {locale === "th" ? "ออกจากระบบ" : "Logout"}
        </button>
      </div>
    </div>
  );
}
