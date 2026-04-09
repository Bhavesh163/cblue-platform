"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

/* --- Interfaces --- */
interface ChatMessage { id: string; sender: "customer" | "provider"; text: string; timestamp: string; }
interface Job { id: string; customerAlias: string; serviceCategory: string; status: "pending" | "in_progress" | "completed" | "cancelled"; description: string; createdAt: string; type: "household" | "project" | "professional" | "property"; tier: string; }
interface ProviderProfile { name: string; profession: string; tier: "economy" | "standard" | "corporate" | "specialist" | "expert"; rating: number; totalJobs: number; email: string; phone: string; company?: string; priceList: { service: string; price: number }[]; }
interface Notification { id: string; msg: string; msgTh: string; time: string; dot: string; unread: boolean; }
interface PropertyListing { id: string; title: string; titleTh: string; type: string; listingType: string; price: string; status: "active" | "pending" | "sold"; province: string; views: number; inquiries: number; }

type Tab = "overview" | "jobs" | "properties" | "chat" | "notifications" | "history" | "profile";

/* --- Translations --- */
type TKey = "title" | "subtitle" | "overview" | "jobs" | "properties" | "chat" | "notifications" | "history" | "profile" | "activeJobs" | "pastJobs" | "noJobs" | "pending" | "inProgress" | "completed" | "cancelled" | "sendMessage" | "typePlaceholder" | "selectConversation" | "anonymousCustomer" | "yourProfile" | "profession" | "tier" | "rating" | "totalJobs" | "priceList" | "service" | "price" | "economy" | "standard" | "corporate" | "specialist" | "expert" | "deposit" | "loginRequired" | "goToLogin" | "goToRegister" | "statsActive" | "statsCompleted" | "statsMessages" | "statsSatisfaction" | "myListings" | "addListing" | "listingActive" | "listingPending" | "listingSold" | "views" | "inquiries" | "editListing" | "noListings" | "recentAlerts" | "allNotifications" | "realNamesHidden" | "editProfile" | "changePassword" | "notifPrefs" | "savedAddresses" | "registerFixer" | "registerProperty" | "editTitle" | "editDescription" | "editPrice" | "editType" | "editListingType" | "editProvince" | "editSave" | "editCancel" | "editSuccess" | "sale" | "rent" | "condo" | "house" | "townhouse" | "land" | "commercial" | "apartment" | "editArea" | "editBedrooms" | "editFloors" | "editContact" | "editStatus" | "deactivate" | "activate" | "deleteListing";
type Translations = { [K in TKey]: string };
const T: { en: Translations; th: Translations; zh: Translations; [k: string]: Translations } = {
  en: {
    title: "Partner Dashboard", subtitle: "Manage your jobs, property listings, chat & profile",
    overview: "Overview", jobs: "Jobs", properties: "Properties", chat: "Chat",
    notifications: "Alerts", history: "History", profile: "Profile",
    activeJobs: "Active Jobs", pastJobs: "Past Jobs", noJobs: "No jobs yet",
    pending: "Pending", inProgress: "In Progress", completed: "Completed", cancelled: "Cancelled",
    sendMessage: "Send", typePlaceholder: "Type a message...",
    selectConversation: "Select a job to start chatting",
    anonymousCustomer: "Customer", yourProfile: "Your Profile",
    profession: "Profession", tier: "Tier", rating: "Rating",
    totalJobs: "Total Jobs", priceList: "Price List", service: "Service", price: "Price (THB)",
    economy: "Economy", standard: "Standard", corporate: "Corporate", specialist: "Specialist", expert: "Expert",
    deposit: "Processing Fee",
    loginRequired: "Please log in to access Partner Dashboard",
    goToLogin: "Log In", goToRegister: "Register as Partner",
    statsActive: "Active", statsCompleted: "Completed", statsMessages: "Messages", statsSatisfaction: "Satisfaction",
    myListings: "My Property Listings", addListing: "Add New Listing",
    listingActive: "Active", listingPending: "Pending Review", listingSold: "Sold/Rented",
    views: "Views", inquiries: "Inquiries", editListing: "Edit", noListings: "No property listings yet",
    recentAlerts: "Recent Alerts", allNotifications: "All Notifications",
    realNamesHidden: "Real names hidden for privacy",
    editProfile: "Edit Profile", changePassword: "Change Password",
    notifPrefs: "Notification Preferences", savedAddresses: "Saved Addresses",
    registerFixer: "Register as Fixer / Pro", registerProperty: "Register Property Listing",
    editTitle: "Edit Property Listing", editDescription: "Description", editPrice: "Price",
    editType: "Property Type", editListingType: "Listing Type", editProvince: "Province",
    editSave: "Save Changes", editCancel: "Cancel", editSuccess: "Changes saved successfully!",
    sale: "Sale", rent: "Rent", condo: "Condo", house: "House", townhouse: "Townhouse",
    land: "Land", commercial: "Commercial", apartment: "Apartment",
    editArea: "Area (sq.m.)", editBedrooms: "Bedrooms", editFloors: "Floors", editContact: "Contact Phone",
    editStatus: "Status", deactivate: "Deactivate Listing", activate: "Activate Listing", deleteListing: "Delete Listing",
  },
  th: {
    title: "แดชบอร์ดพาร์ทเนอร์", subtitle: "จัดการงาน รายการอสังหาริมทรัพย์ แชท และโปรไฟล์ของคุณ",
    overview: "ภาพรวม", jobs: "งาน", properties: "อสังหาริมทรัพย์", chat: "แชท",
    notifications: "แจ้งเตือน", history: "ประวัติ", profile: "โปรไฟล์",
    activeJobs: "งานที่กำลังดำเนินการ", pastJobs: "งานที่ผ่านมา", noJobs: "ยังไม่มีงาน",
    pending: "รอดำเนินการ", inProgress: "กำลังดำเนินการ", completed: "เสร็จสิ้น", cancelled: "ยกเลิก",
    sendMessage: "ส่ง", typePlaceholder: "พิมพ์ข้อความ...",
    selectConversation: "เลือกงานเพื่อเริ่มแชท",
    anonymousCustomer: "ลูกค้า", yourProfile: "โปรไฟล์ของคุณ",
    profession: "อาชีพ", tier: "ระดับ", rating: "คะแนน",
    totalJobs: "งานทั้งหมด", priceList: "รายการราคา", service: "บริการ", price: "ราคา (บาท)",
    economy: "ประหยัด", standard: "มาตรฐาน", corporate: "องค์กร", specialist: "ผู้ชำนาญ", expert: "ผู้เชี่ยวชาญ",
    deposit: "ค่าดำเนินการ",
    loginRequired: "กรุณาเข้าสู่ระบบเพื่อเข้าใช้แดชบอร์ดพาร์ทเนอร์",
    goToLogin: "เข้าสู่ระบบ", goToRegister: "สมัครเป็นพาร์ทเนอร์",
    statsActive: "กำลังดำเนินการ", statsCompleted: "เสร็จสิ้น", statsMessages: "ข้อความ", statsSatisfaction: "ความพึงพอใจ",
    myListings: "รายการอสังหาริมทรัพย์ของฉัน", addListing: "เพิ่มรายการใหม่",
    listingActive: "เผยแพร่อยู่", listingPending: "รอตรวจสอบ", listingSold: "ขายแล้ว/ปล่อยแล้ว",
    views: "ยอดเข้าชม", inquiries: "สอบถาม", editListing: "แก้ไข", noListings: "ยังไม่มีรายการอสังหาริมทรัพย์",
    recentAlerts: "การแจ้งเตือนล่าสุด", allNotifications: "การแจ้งเตือนทั้งหมด",
    realNamesHidden: "ซ่อนชื่อจริงเพื่อความปลอดภัย",
    editProfile: "แก้ไขโปรไฟล์", changePassword: "เปลี่ยนรหัสผ่าน",
    notifPrefs: "ตั้งค่าการแจ้งเตือน", savedAddresses: "ที่อยู่ที่บันทึก",
    registerFixer: "สมัครเป็นช่าง / มืออาชีพ", registerProperty: "ลงประกาศอสังหาริมทรัพย์",
    editTitle: "แก้ไขรายการอสังหาริมทรัพย์", editDescription: "รายละเอียด", editPrice: "ราคา",
    editType: "ประเภทอสังหาริมทรัพย์", editListingType: "ประเภทประกาศ", editProvince: "จังหวัด",
    editSave: "บันทึกการเปลี่ยนแปลง", editCancel: "ยกเลิก", editSuccess: "บันทึกการเปลี่ยนแปลงสำเร็จ!",
    sale: "ขาย", rent: "เช่า", condo: "คอนโด", house: "บ้าน", townhouse: "ทาวน์เฮ้าส์",
    land: "ที่ดิน", commercial: "พาณิชย์", apartment: "อพาร์ทเมนต์",
    editArea: "พื้นที่ (ตร.ม.)", editBedrooms: "ห้องนอน", editFloors: "จำนวนชั้น", editContact: "เบอร์ติดต่อ",
    editStatus: "สถานะ", deactivate: "ปิดการแสดง", activate: "เปิดการแสดง", deleteListing: "ลบรายการ",
  },
  zh: {
    title: "合作伙伴仪表板", subtitle: "管理您的工作、房产列表、聊天和个人资料",
    overview: "概览", jobs: "工作", properties: "房产", chat: "聊天",
    notifications: "通知", history: "历史", profile: "个人资料",
    activeJobs: "进行中的工作", pastJobs: "过去的工作", noJobs: "暂无工作",
    pending: "待处理", inProgress: "进行中", completed: "已完成", cancelled: "已取消",
    sendMessage: "发送", typePlaceholder: "输入消息...",
    selectConversation: "选择一个工作开始聊天",
    anonymousCustomer: "客户", yourProfile: "您的个人资料",
    profession: "专业", tier: "等级", rating: "评分",
    totalJobs: "总工作量", priceList: "价格表", service: "服务", price: "价格 (泰铢)",
    economy: "经济", standard: "标准", corporate: "企业", specialist: "专员", expert: "专家",
    deposit: "手续费",
    loginRequired: "请先登录以访问合作伙伴仪表板",
    goToLogin: "登录", goToRegister: "注册为合作伙伴",
    statsActive: "进行中", statsCompleted: "已完成", statsMessages: "消息", statsSatisfaction: "满意度",
    myListings: "我的房产列表", addListing: "添加新列表",
    listingActive: "已发布", listingPending: "待审核", listingSold: "已出售/出租",
    views: "浏览量", inquiries: "咨询", editListing: "编辑", noListings: "暂无房产列表",
    recentAlerts: "最近通知", allNotifications: "所有通知",
    realNamesHidden: "为保护隐私，真实姓名已隐藏",
    editProfile: "编辑个人资料", changePassword: "更改密码",
    notifPrefs: "通知偏好设置", savedAddresses: "已保存的地址",
    registerFixer: "注册为技工/专业人士", registerProperty: "发布房产列表",
    editTitle: "编辑房产列表", editDescription: "描述", editPrice: "价格",
    editType: "房产类型", editListingType: "列表类型", editProvince: "省份",
    editSave: "保存更改", editCancel: "取消", editSuccess: "更改保存成功！",
    sale: "出售", rent: "出租", condo: "公寓", house: "别墅", townhouse: "联排别墅",
    land: "土地", commercial: "商业", apartment: "公寓楼",
    editArea: "面积 (平方米)", editBedrooms: "卧室", editFloors: "楼层", editContact: "联系电话",
    editStatus: "状态", deactivate: "停用列表", activate: "激活列表", deleteListing: "删除列表",
  },
};

/* --- Demo Data --- */
const DEMO_JOBS: Job[] = [
  { id: "j1", customerAlias: "C-1824", serviceCategory: "Plumbing", status: "in_progress", description: "Fix kitchen sink leak", createdAt: new Date(Date.now() - 86400000).toISOString(), type: "household", tier: "Standard" },
  { id: "j2", customerAlias: "C-3901", serviceCategory: "Electrical", status: "pending", description: "Install new ceiling fan", createdAt: new Date(Date.now() - 172800000).toISOString(), type: "household", tier: "Economy" },
  { id: "j3", customerAlias: "C-7752", serviceCategory: "Plumbing", status: "completed", description: "Replace bathroom faucet", createdAt: new Date(Date.now() - 604800000).toISOString(), type: "household", tier: "Corporate" },
  { id: "j4", customerAlias: "C-4409", serviceCategory: "Smart Home", status: "completed", description: "Smart home setup", createdAt: new Date(Date.now() - 1209600000).toISOString(), type: "project", tier: "Specialist" },
  { id: "j5", customerAlias: "C-5510", serviceCategory: "Architect", status: "completed", description: "Building design consultation", createdAt: new Date(Date.now() - 2000000000).toISOString(), type: "professional", tier: "Expert" },
];

const DEMO_PROFILE: ProviderProfile = {
  name: "Partner Demo", profession: "Plumber / Electrician", tier: "corporate",
  rating: 4.7, totalJobs: 142, email: "partner@cblue.co.th", phone: "091-xxx-xxxx",
  company: "Demo Services Co.",
  priceList: [
    { service: "Basic Repair", price: 500 }, { service: "Pipe Installation", price: 1500 },
    { service: "Drain Cleaning", price: 800 }, { service: "Water Heater Install", price: 3500 },
    { service: "Full Bathroom Plumbing", price: 12000 },
  ],
};

const DEMO_MESSAGES: Record<string, ChatMessage[]> = {
  j1: [
    { id: "m1", sender: "customer", text: "Hi, the kitchen sink has been leaking for 2 days", timestamp: new Date(Date.now() - 80000000).toISOString() },
    { id: "m2", sender: "provider", text: "I can come check it tomorrow morning. Can you send a photo?", timestamp: new Date(Date.now() - 79000000).toISOString() },
    { id: "m3", sender: "customer", text: "Sure, here is the photo. It is under the sink pipe connection.", timestamp: new Date(Date.now() - 78000000).toISOString() },
    { id: "m4", sender: "provider", text: "Looks like a worn gasket. I will bring replacement parts.", timestamp: new Date(Date.now() - 77000000).toISOString() },
  ],
  j2: [
    { id: "m5", sender: "customer", text: "I need a ceiling fan installed in my living room", timestamp: new Date(Date.now() - 160000000).toISOString() },
    { id: "m6", sender: "provider", text: "What size fan? And do you already have a mounting bracket?", timestamp: new Date(Date.now() - 159000000).toISOString() },
  ],
};

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: "n1", msg: "New job request from Customer C-1824", msgTh: "คำขอใหม่จากลูกค้า C-1824 — ประปา", time: "5m ago", dot: "bg-sky-500", unread: true },
  { id: "n2", msg: "Customer C-3901 confirmed appointment", msgTh: "ลูกค้า C-3901 ยืนยันนัดหมาย", time: "1h ago", dot: "bg-green-500", unread: true },
  { id: "n3", msg: "You received a 5-star review!", msgTh: "คุณได้รับรีวิว 5 ดาว!", time: "2d ago", dot: "bg-amber-500", unread: false },
  { id: "n4", msg: "Reminder: appointment with C-1824 tomorrow 10:00 AM", msgTh: "แจ้งเตือน: นัดหมายกับ C-1824 พรุ่งนี้ 10:00 น.", time: "3d ago", dot: "bg-purple-500", unread: false },
  { id: "n5", msg: "Property inquiry: Customer interested in Condo Sukhumvit", msgTh: "สอบถามอสังหาฯ: ลูกค้าสนใจคอนโดสุขุมวิท", time: "5d ago", dot: "bg-emerald-500", unread: false },
];

const DEMO_PROPERTIES: PropertyListing[] = [
  { id: "p1", title: "Condo Sukhumvit 21", titleTh: "คอนโดสุขุมวิท 21", type: "CONDO", listingType: "SALE", price: "5,500,000", status: "active", province: "กรุงเทพมหานคร", views: 234, inquiries: 12 },
  { id: "p2", title: "House Rama 9", titleTh: "บ้านพระราม 9", type: "HOUSE", listingType: "RENT", price: "35,000/mo", status: "active", province: "กรุงเทพมหานคร", views: 156, inquiries: 8 },
  { id: "p3", title: "Townhouse Bangna", titleTh: "ทาวน์เฮ้าส์บางนา", type: "TOWNHOUSE", listingType: "SALE", price: "3,200,000", status: "pending", province: "สมุทรปราการ", views: 45, inquiries: 2 },
];

const ICON_MAP: Record<string, string> = { household: "\u{1F3E0}", project: "\u{1F4BC}", professional: "\u{1F454}", property: "\u{1F3E2}" };
const STATUS_STYLE: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", in_progress: "bg-blue-100 text-blue-800", completed: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };
const TIER_STYLE: Record<string, string> = { Economy: "bg-green-50 text-green-700", Standard: "bg-blue-50 text-blue-700", Corporate: "bg-purple-50 text-purple-700", Specialist: "bg-amber-50 text-amber-700", Expert: "bg-red-50 text-red-700" };
const LISTING_STATUS_STYLE: Record<string, string> = { active: "bg-green-100 text-green-700", pending: "bg-yellow-100 text-yellow-700", sold: "bg-gray-100 text-gray-600" };
const tierDeposit: Record<string, number> = { economy: 200, standard: 400, corporate: 600, specialist: 800, expert: 1000 };

/* --- Main Component --- */
export default function ProZonePage() {
  const locale = useLocale();
  const prefix = `/${locale}`;
  const t: Translations = T[locale] ?? T.en;

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(DEMO_MESSAGES);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setIsAuthenticated(!!localStorage.getItem("subscriber")); } catch { setIsAuthenticated(false); }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedJob]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    );
  }

  /* --- Not logged in --- */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50/30">
        <div className="relative overflow-hidden">
          <Image src="/images/scenic-building.jpg" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-amber-900/90 to-orange-800/80" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
            <div className="text-6xl mb-6">{"\u{1F527}"}</div>
            <h1 className="text-3xl font-bold text-white mb-3">{t.title}</h1>
            <p className="text-amber-200 mb-8">{t.loginRequired}</p>
            <div className="flex gap-4 justify-center">
              <Link href={`${prefix}/subscription/login`} className="px-8 py-3 bg-white text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-50 transition shadow-lg">{t.goToLogin}</Link>
              <Link href={`${prefix}/subscription/register`} className="px-8 py-3 border-2 border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition">{t.goToRegister}</Link>
            </div>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              <Link href={`${prefix}/fixers/register`} className="bg-white/10 backdrop-blur rounded-xl p-5 text-left hover:bg-white/20 transition">
                <span className="text-2xl">{"\u{1F527}"}</span>
                <h3 className="text-white font-bold text-sm mt-2">{t.registerFixer}</h3>
              </Link>
              <Link href={`${prefix}/properties/register`} className="bg-white/10 backdrop-blur rounded-xl p-5 text-left hover:bg-white/20 transition">
                <span className="text-2xl">{"\u{1F3E2}"}</span>
                <h3 className="text-white font-bold text-sm mt-2">{t.registerProperty}</h3>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --- Authenticated content --- */
  const activeJobs = DEMO_JOBS.filter((j) => j.status === "pending" || j.status === "in_progress");
  const pastJobs = DEMO_JOBS.filter((j) => j.status === "completed" || j.status === "cancelled");
  const statusLabels: Record<string, string> = { pending: t.pending, in_progress: t.inProgress, completed: t.completed, cancelled: t.cancelled };

  function sendMessage() {
    if (!newMessage.trim() || !selectedJob) return;
    const msg: ChatMessage = { id: `m${Date.now()}`, sender: "provider", text: newMessage.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => ({ ...prev, [selectedJob]: [...(prev[selectedJob] || []), msg] }));
    setNewMessage("");
  }

  function renderStars(rating: number) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return (
      <span className="text-amber-400 text-lg">
        {"\u2605".repeat(full)}{half && "\u2606"}{"\u2606".repeat(5 - full - (half ? 1 : 0))}
        <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>
      </span>
    );
  }

  const tabs: { key: Tab; label: string; icon: string; badge?: number }[] = [
    { key: "overview", label: t.overview, icon: "\u{1F4CA}" },
    { key: "jobs", label: t.jobs, icon: "\u{1F4CB}", badge: activeJobs.length },
    { key: "properties", label: t.properties, icon: "\u{1F3E2}", badge: DEMO_PROPERTIES.length },
    { key: "chat", label: t.chat, icon: "\u{1F4AC}" },
    { key: "notifications", label: t.notifications, icon: "\u{1F514}", badge: DEMO_NOTIFICATIONS.filter((n) => n.unread).length },
    { key: "history", label: t.history, icon: "\u{1F4DC}" },
    { key: "profile", label: t.profile, icon: "\u{1F464}" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/30 to-orange-50/20">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <Image src="/images/scenic-building.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900/90 to-orange-800/80" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{t.title}</h1>
              <p className="text-amber-200 text-sm mt-1">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-2.5">
              <div className="w-10 h-10 rounded-full bg-amber-400/30 flex items-center justify-center text-white font-bold">{DEMO_PROFILE.name?.charAt(0)}</div>
              <div>
                <p className="text-white text-sm font-semibold">{DEMO_PROFILE.name}</p>
                <p className="text-amber-200 text-xs">{DEMO_PROFILE.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 pb-12">
        {/* Tab Bar */}
        <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === tab.key ? "bg-amber-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"}`}
            >
              <span>{tab.icon}</span> {tab.label}
              {tab.badge ? (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? "bg-white/30 text-white" : "bg-red-100 text-red-700"}`}>{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && <OverviewTab t={t} locale={locale} prefix={prefix} profile={DEMO_PROFILE} activeJobs={activeJobs} pastJobs={pastJobs} notifications={DEMO_NOTIFICATIONS} properties={DEMO_PROPERTIES} />}
        {activeTab === "jobs" && <JobsTab t={t} locale={locale} activeJobs={activeJobs} pastJobs={pastJobs} statusLabels={statusLabels} onSelectJob={(id) => { setSelectedJob(id); setActiveTab("chat"); }} />}
        {activeTab === "properties" && <PropertiesTab t={t} locale={locale} prefix={prefix} properties={DEMO_PROPERTIES} />}
        {activeTab === "chat" && <ChatTabContent t={t} locale={locale} messages={messages} selectedJob={selectedJob} setSelectedJob={setSelectedJob} newMessage={newMessage} setNewMessage={setNewMessage} sendMessage={sendMessage} statusLabels={statusLabels} chatEndRef={chatEndRef} />}
        {activeTab === "notifications" && <NotificationsTab t={t} locale={locale} notifications={DEMO_NOTIFICATIONS} />}
        {activeTab === "history" && <HistoryTab t={t} locale={locale} pastJobs={pastJobs} statusLabels={statusLabels} />}
        {activeTab === "profile" && <ProfileTab t={t} locale={locale} prefix={prefix} profile={DEMO_PROFILE} renderStars={renderStars} />}

        {/* Tier Info */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {locale === "th" ? "ระดับบริการและค่าดำเนินการ" : locale === "zh" ? "服务等级和处理费" : "Service Tiers & Processing Fees"}
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            {locale === "th" ? "ค่าดำเนินการที่ลูกค้าจ่ายต่อการจับคู่" : locale === "zh" ? "客户支付的匹配处理费" : "Processing fee paid by customer per matching"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { name: "Economy", fee: "200", color: "border-green-200 bg-green-50", textColor: "text-green-700" },
              { name: "Standard", fee: "400", color: "border-blue-200 bg-blue-50", textColor: "text-blue-700" },
              { name: "Corporate", fee: "600", color: "border-purple-200 bg-purple-50", textColor: "text-purple-700" },
              { name: "Specialist", fee: "800", color: "border-amber-200 bg-amber-50", textColor: "text-amber-700" },
              { name: "Expert", fee: "1,000", color: "border-red-200 bg-red-50", textColor: "text-red-700" },
            ].map((item) => (
              <div key={item.name} className={`rounded-xl border-2 p-4 text-center ${item.color}`}>
                <h3 className={`font-bold text-sm ${item.textColor}`}>{item.name}</h3>
                <p className={`text-2xl font-extrabold ${item.textColor} mt-1`}>{"\u0E3F"}{item.fee}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== OVERVIEW TAB ===== */
function OverviewTab({ t, locale, prefix, profile, activeJobs, pastJobs, notifications, properties }: {
  t: Translations; locale: string; prefix: string; profile: ProviderProfile;
  activeJobs: Job[]; pastJobs: Job[]; notifications: Notification[]; properties: PropertyListing[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.statsActive, value: activeJobs.length, icon: "\u26A1", color: "text-amber-600" },
          { label: t.statsCompleted, value: pastJobs.filter((j) => j.status === "completed").length, icon: "\u2705", color: "text-green-600" },
          { label: t.statsMessages, value: "3", icon: "\u{1F4AC}", color: "text-indigo-600" },
          { label: t.statsSatisfaction, value: `${profile.rating} \u2B50`, icon: "\u{1F3C6}", color: "text-amber-600" },
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">{profile.name?.charAt(0)}</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{profile.name}</h3>
            <p className="text-sm text-gray-500">{profile.profession} {"\u00B7"} {t[profile.tier]}</p>
            {profile.company && <p className="text-xs text-gray-400">{profile.company}</p>}
          </div>
          <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">{"\u{1F4CB}"} {t.activeJobs}</h2>
            <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">{activeJobs.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {activeJobs.map((job) => (
              <div key={job.id} className="px-6 py-4 flex items-center gap-3 hover:bg-gray-50/50 transition">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-lg">{ICON_MAP[job.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{job.serviceCategory}</p>
                  <p className="text-xs text-gray-500">{t.anonymousCustomer} #{job.customerAlias}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[job.tier] || ""}`}>{job.tier}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[job.status] || ""}`}>{job.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">{"\u{1F3E2}"} {t.myListings}</h2>
            <Link href={`${prefix}/properties/register`} className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-amber-700 transition">+ {t.addListing}</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {properties.map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center gap-3 hover:bg-gray-50/50 transition">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-lg">{"\u{1F3E2}"}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? p.titleTh : p.title}</p>
                  <p className="text-xs text-gray-500">{p.type} {"\u00B7"} {p.listingType} {"\u00B7"} {"\u0E3F"}{p.price}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${LISTING_STATUS_STYLE[p.status] || ""}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">{"\u{1F514}"} {t.recentAlerts}</h3>
        <div className="space-y-2">
          {notifications.slice(0, 3).map((n) => (
            <div key={n.id} className={`flex items-center gap-3 p-3 rounded-lg ${n.unread ? "bg-amber-50 border border-amber-100" : "bg-gray-50"}`}>
              <span className={`w-2 h-2 rounded-full ${n.dot} flex-shrink-0`} />
              <p className="text-sm text-gray-700 flex-1">{locale === "th" ? n.msgTh : n.msg}</p>
              <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===== JOBS TAB ===== */
function JobsTab({ t, locale, activeJobs, pastJobs, statusLabels, onSelectJob }: {
  t: Translations; locale: string; activeJobs: Job[]; pastJobs: Job[];
  statusLabels: Record<string, string>; onSelectJob: (id: string) => void;
}) {
  function JobCard({ job, clickable }: { job: Job; clickable?: boolean }) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-5 ${clickable ? "hover:shadow-md cursor-pointer" : "opacity-80"} transition`} onClick={clickable ? () => onSelectJob(job.id) : undefined}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900">{ICON_MAP[job.type]} {t.anonymousCustomer} #{job.customerAlias}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[job.status]}`}>{statusLabels[job.status]}</span>
        </div>
        <p className="text-sm text-gray-600 mb-2">{job.description}</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{job.serviceCategory}</span>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[job.tier] || ""}`}>{job.tier}</span>
            <span>{new Date(job.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t.activeJobs}</h2>
        {activeJobs.length === 0 ? <p className="text-gray-500">{t.noJobs}</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{activeJobs.map((job) => <JobCard key={job.id} job={job} clickable />)}</div>
        )}
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t.pastJobs}</h2>
        {pastJobs.length === 0 ? <p className="text-gray-500">{t.noJobs}</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{pastJobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
        )}
      </div>
    </div>
  );
}

/* ===== PROPERTIES TAB ===== */
function PropertiesTab({ t, locale, prefix, properties }: {
  t: Translations; locale: string; prefix: string; properties: PropertyListing[];
}) {
  const [editingProperty, setEditingProperty] = useState<PropertyListing | null>(null);
  const [editForm, setEditForm] = useState({ title: "", titleTh: "", price: "", type: "", listingType: "", province: "", description: "", area: "", bedrooms: "", floors: "", contactPhone: "" });
  const [showSuccess, setShowSuccess] = useState(false);

  function openEdit(p: PropertyListing) {
    setEditForm({ title: p.title, titleTh: p.titleTh, price: p.price, type: p.type, listingType: p.listingType, province: p.province, description: "", area: "", bedrooms: "", floors: "", contactPhone: "" });
    setEditingProperty(p);
    setShowSuccess(false);
  }

  function handleSave() {
    setShowSuccess(true);
    setTimeout(() => { setEditingProperty(null); setShowSuccess(false); }, 1500);
  }

  const PROPERTY_TYPE_OPTIONS = ["CONDO", "HOUSE", "TOWNHOUSE", "LAND", "COMMERCIAL", "APARTMENT"] as const;
  const typeLabels: Record<string, string> = { CONDO: t.condo, HOUSE: t.house, TOWNHOUSE: t.townhouse, LAND: t.land, COMMERCIAL: t.commercial, APARTMENT: t.apartment };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">{t.myListings}</h2>
        <Link href={`${prefix}/properties/register`} className="px-5 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition shadow">+ {t.addListing}</Link>
      </div>
      {properties.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="text-5xl mb-4">{"\u{1F3E2}"}</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{t.noListings}</h3>
          <Link href={`${prefix}/properties/register`} className="inline-block mt-4 px-6 py-3 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition">{t.addListing}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition">
              <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-600" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${LISTING_STATUS_STYLE[p.status]}`}>
                    {p.status === "active" ? t.listingActive : p.status === "pending" ? t.listingPending : t.listingSold}
                  </span>
                  <span className="text-xs text-gray-400">{p.type} {"\u00B7"} {p.listingType}</span>
                </div>
                <h3 className="font-bold text-gray-900">{locale === "th" ? p.titleTh : p.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{p.province}</p>
                <p className="text-lg font-extrabold text-amber-700 mt-2">{"\u0E3F"}{p.price}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span>{"\u{1F441}"} {p.views} {t.views}</span>
                  <span>{"\u{1F4AC}"} {p.inquiries} {t.inquiries}</span>
                  <button onClick={() => openEdit(p)} className="text-amber-600 font-bold hover:text-amber-700">{t.editListing}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Property Modal */}
      {editingProperty && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold">{t.editTitle}</h2>
              <button onClick={() => setEditingProperty(null)} className="text-white/80 hover:text-white text-xl">&times;</button>
            </div>
            <div className="p-6">
              {showSuccess ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">{"\u2705"}</div>
                  <h3 className="text-lg font-bold text-gray-900">{t.editSuccess}</h3>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title (EN)</label>
                      <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title (TH)</label>
                      <input type="text" value={editForm.titleTh} onChange={(e) => setEditForm({ ...editForm, titleTh: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.editDescription}</label>
                    <textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                      placeholder={locale === "th" ? "รายละเอียดอสังหาริมทรัพย์..." : "Property description..."} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.editPrice}</label>
                    <input type="text" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.editArea}</label>
                      <input type="number" value={editForm.area} onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" placeholder="120" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.editBedrooms}</label>
                      <input type="number" value={editForm.bedrooms} onChange={(e) => setEditForm({ ...editForm, bedrooms: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" placeholder="2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.editFloors}</label>
                      <input type="number" value={editForm.floors} onChange={(e) => setEditForm({ ...editForm, floors: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" placeholder="2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.editType}</label>
                      <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 bg-white">
                        {PROPERTY_TYPE_OPTIONS.map((pt) => (
                          <option key={pt} value={pt}>{typeLabels[pt]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.editListingType}</label>
                      <select value={editForm.listingType} onChange={(e) => setEditForm({ ...editForm, listingType: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 bg-white">
                        <option value="SALE">{t.sale}</option>
                        <option value="RENT">{t.rent}</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.editProvince}</label>
                      <input type="text" value={editForm.province} onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.editContact}</label>
                      <input type="tel" value={editForm.contactPhone} onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" placeholder="091-xxx-xxxx" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditingProperty(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                      {t.editCancel}
                    </button>
                    <button onClick={handleSave} className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition">
                      {t.editSave}
                    </button>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <button className="w-full py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition">
                      {t.deactivate}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== CHAT TAB ===== */
function ChatTabContent({ t, locale, messages, selectedJob, setSelectedJob, newMessage, setNewMessage, sendMessage, statusLabels, chatEndRef }: {
  t: Translations; locale: string; messages: Record<string, ChatMessage[]>;
  selectedJob: string | null; setSelectedJob: (id: string) => void;
  newMessage: string; setNewMessage: (s: string) => void; sendMessage: () => void;
  statusLabels: Record<string, string>; chatEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex gap-6 h-[600px]">
      <div className="w-80 bg-white rounded-xl border border-gray-200 overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{t.jobs}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{t.realNamesHidden}</p>
        </div>
        {DEMO_JOBS.filter((j) => j.status !== "cancelled").map((job) => (
          <button key={job.id} onClick={() => setSelectedJob(job.id)} className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition ${selectedJob === job.id ? "bg-amber-50 border-l-4 border-l-amber-600" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-gray-900">{ICON_MAP[job.type]} {t.anonymousCustomer} #{job.customerAlias}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[job.status]}`}>{statusLabels[job.status]}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{job.description}</p>
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col">
        {selectedJob ? (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{t.anonymousCustomer} #{DEMO_JOBS.find((j) => j.id === selectedJob)?.customerAlias}</h3>
                <p className="text-xs text-gray-500">{DEMO_JOBS.find((j) => j.id === selectedJob)?.serviceCategory} {"\u2014"} {DEMO_JOBS.find((j) => j.id === selectedJob)?.description}</p>
              </div>
              <span className="text-xs text-gray-400">{t.realNamesHidden}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(messages[selectedJob] || []).map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "provider" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${msg.sender === "provider" ? "bg-amber-600 text-white rounded-br-md" : "bg-gray-100 text-gray-800 rounded-bl-md"}`}>
                    <p>{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === "provider" ? "text-amber-200" : "text-gray-400"}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder={t.typePlaceholder} className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                <button onClick={sendMessage} disabled={!newMessage.trim()} className="px-6 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed">{t.sendMessage}</button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4">{"\u{1F4AC}"}</div>
              <p>{t.selectConversation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== NOTIFICATIONS TAB ===== */
function NotificationsTab({ t, locale, notifications }: { t: Translations; locale: string; notifications: Notification[]; }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{"\u{1F514}"} {t.allNotifications}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {notifications.map((n) => (
          <div key={n.id} className={`flex items-center gap-4 px-6 py-4 transition ${n.unread ? "bg-amber-50/50" : "hover:bg-gray-50"}`}>
            <span className={`w-3 h-3 rounded-full ${n.dot} flex-shrink-0`} />
            <p className="text-sm text-gray-800 flex-1">{locale === "th" ? n.msgTh : n.msg}</p>
            <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
            {n.unread && <span className="w-2 h-2 bg-amber-500 rounded-full" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== HISTORY TAB ===== */
function HistoryTab({ t, locale, pastJobs, statusLabels }: { t: Translations; locale: string; pastJobs: Job[]; statusLabels: Record<string, string>; }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{"\u{1F4DC}"} {t.pastJobs}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "ประเภท" : locale === "zh" ? "类型" : "Type"}</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">{t.service}</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">{t.anonymousCustomer}</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">{t.tier}</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "สถานะ" : locale === "zh" ? "状态" : "Status"}</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">{locale === "th" ? "วันที่" : locale === "zh" ? "日期" : "Date"}</th>
            </tr>
          </thead>
          <tbody>
            {pastJobs.map((job) => (
              <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                <td className="py-3 px-4"><span className="mr-2">{ICON_MAP[job.type]}</span><span className="text-gray-700 capitalize">{job.type}</span></td>
                <td className="py-3 px-4 font-medium text-gray-900">{job.serviceCategory}</td>
                <td className="py-3 px-4 text-gray-600">#{job.customerAlias}</td>
                <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TIER_STYLE[job.tier] || ""}`}>{job.tier}</span></td>
                <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[job.status] || ""}`}>{statusLabels[job.status]}</span></td>
                <td className="py-3 px-4 text-center text-gray-500">{new Date(job.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== PROFILE TAB ===== */
function ProfileTab({ t, locale, prefix, profile, renderStars }: {
  t: Translations; locale: string; prefix: string; profile: ProviderProfile;
  renderStars: (r: number) => React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">{profile.name?.charAt(0) || "P"}</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
            <p className="text-sm text-gray-500">{profile.profession}</p>
            <p className="text-sm text-gray-400">{profile.email} {"\u00B7"} {profile.phone}</p>
            {profile.company && <p className="text-xs text-gray-400 mt-0.5">{profile.company}</p>}
          </div>
          <div className="ml-auto text-right">
            <div>{renderStars(profile.rating)}</div>
            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${
              profile.tier === "expert" ? "bg-red-50 text-red-700" :
              profile.tier === "specialist" ? "bg-amber-50 text-amber-700" :
              profile.tier === "corporate" ? "bg-purple-50 text-purple-700" :
              profile.tier === "standard" ? "bg-blue-50 text-blue-700" :
              "bg-green-50 text-green-700"
            }`}>{t[profile.tier]}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t.totalJobs, value: profile.totalJobs, icon: "\u{1F4CB}" },
            { label: t.rating, value: `${profile.rating} \u2B50`, icon: "\u{1F3C6}" },
            { label: t.tier, value: t[profile.tier], icon: "\u{1F3C5}" },
            { label: t.deposit, value: `\u{0E3F}${tierDeposit[profile.tier]}`, icon: "\u{1F4B0}" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
              <span className="text-xl block mb-1">{s.icon}</span>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{t.priceList}</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 text-sm font-semibold text-gray-600">{t.service}</th>
              <th className="text-right py-3 text-sm font-semibold text-gray-600">{t.price}</th>
            </tr>
          </thead>
          <tbody>
            {profile.priceList.map((item, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-3 text-sm text-gray-800">{item.service}</td>
                <td className="py-3 text-sm text-gray-900 font-semibold text-right">{"\u0E3F"}{new Intl.NumberFormat("th-TH").format(item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">{"\u2699\uFE0F"} {locale === "th" ? "การตั้งค่า" : locale === "zh" ? "设置" : "Settings"}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: t.editProfile, icon: "\u270F\uFE0F", desc: locale === "th" ? "อัปเดตชื่อ อีเมล เบอร์โทร" : locale === "zh" ? "更新您的姓名、邮箱、电话" : "Update name, email, phone" },
            { label: t.changePassword, icon: "\u{1F512}", desc: locale === "th" ? "อัปเดตรหัสผ่าน" : locale === "zh" ? "更新密码" : "Update password" },
            { label: t.notifPrefs, icon: "\u{1F514}", desc: locale === "th" ? "จัดการอีเมลและ Push" : locale === "zh" ? "管理邮件和推送" : "Manage email & push" },
            { label: t.savedAddresses, icon: "\u{1F4CD}", desc: locale === "th" ? "จัดการที่อยู่ที่บันทึก" : locale === "zh" ? "管理已保存的地址" : "Manage saved locations" },
          ].map((item) => (
            <button key={item.label} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 transition text-left w-full">
              <span className="text-xl">{item.icon}</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
