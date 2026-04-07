"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

interface ChatMessage {
  id: string;
  sender: "customer" | "provider";
  text: string;
  timestamp: string;
}

interface Job {
  id: string;
  customerAlias: string;
  serviceCategory: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  description: string;
  createdAt: string;
}

interface ProviderProfile {
  profession: string;
  tier: "standard" | "corporate" | "expert";
  rating: number;
  totalJobs: number;
  priceList: { service: string; price: number }[];
}

type Tab = "jobs" | "chat" | "profile";

const TRANSLATION_KEYS = [
  "title", "subtitle", "jobs", "chat", "profile", "activeJobs", "pastJobs",
  "noJobs", "pending", "inProgress", "completed", "cancelled", "sendMessage",
  "typePlaceholder", "selectConversation", "anonymousCustomer", "yourProfile",
  "profession", "tier", "rating", "totalJobs", "priceList", "service", "price",
  "standard", "corporate", "expert", "deposit", "loginRequired", "goToSubscription",
] as const;

type TranslationKey = typeof TRANSLATION_KEYS[number];
type Translations = Record<TranslationKey, string>;

const T: Record<string, Translations> = {
  en: {
    title: "Pro Zone",
    subtitle: "Dashboard for professionals, fixers & sellers",
    jobs: "Jobs",
    chat: "Chat",
    profile: "Profile",
    activeJobs: "Active Jobs",
    pastJobs: "Past Jobs",
    noJobs: "No jobs yet",
    pending: "Pending",
    inProgress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    sendMessage: "Send",
    typePlaceholder: "Type a message...",
    selectConversation: "Select a job to start chatting",
    anonymousCustomer: "Customer",
    yourProfile: "Your Profile",
    profession: "Profession",
    tier: "Tier",
    rating: "Rating",
    totalJobs: "Total Jobs",
    priceList: "Price List",
    service: "Service",
    price: "Price (฿)",
    standard: "Standard",
    corporate: "Corporate",
    expert: "Expert",
    deposit: "Deposit",
    loginRequired: "Please subscribe first to access Pro Zone",
    goToSubscription: "Subscribe Now",
  },
  th: {
    title: "Pro Zone",
    subtitle: "แดชบอร์ดสำหรับช่าง ผู้เชี่ยวชาญ และผู้ขาย",
    jobs: "งาน",
    chat: "แชท",
    profile: "โปรไฟล์",
    activeJobs: "งานที่กำลังดำเนินการ",
    pastJobs: "งานที่ผ่านมา",
    noJobs: "ยังไม่มีงาน",
    pending: "รอดำเนินการ",
    inProgress: "กำลังดำเนินการ",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
    sendMessage: "ส่ง",
    typePlaceholder: "พิมพ์ข้อความ...",
    selectConversation: "เลือกงานเพื่อเริ่มแชท",
    anonymousCustomer: "ลูกค้า",
    yourProfile: "โปรไฟล์ของคุณ",
    profession: "อาชีพ",
    tier: "ระดับ",
    rating: "คะแนน",
    totalJobs: "งานทั้งหมด",
    priceList: "รายการราคา",
    service: "บริการ",
    price: "ราคา (฿)",
    standard: "มาตรฐาน",
    corporate: "องค์กร",
    expert: "ผู้เชี่ยวชาญ",
    deposit: "ค่ามัดจำ",
    loginRequired: "กรุณาสมัครสมาชิกก่อนเข้าใช้ Pro Zone",
    goToSubscription: "สมัครสมาชิก",
  },
  zh: {
    title: "专业区",
    subtitle: "专业人士、维修师和卖家的仪表板",
    jobs: "工作",
    chat: "聊天",
    profile: "个人资料",
    activeJobs: "进行中的工作",
    pastJobs: "过去的工作",
    noJobs: "暂无工作",
    pending: "待处理",
    inProgress: "进行中",
    completed: "已完成",
    cancelled: "已取消",
    sendMessage: "发送",
    typePlaceholder: "输入消息...",
    selectConversation: "选择一个工作开始聊天",
    anonymousCustomer: "客户",
    yourProfile: "您的个人资料",
    profession: "专业",
    tier: "等级",
    rating: "评分",
    totalJobs: "总工作量",
    priceList: "价格表",
    service: "服务",
    price: "价格 (฿)",
    standard: "标准",
    corporate: "企业",
    expert: "专家",
    deposit: "押金",
    loginRequired: "请先订阅才能访问专业区",
    goToSubscription: "立即订阅",
  },
};

const DEMO_JOBS: Job[] = [
  { id: "j1", customerAlias: "C-1824", serviceCategory: "Plumbing", status: "in_progress", description: "Fix kitchen sink leak", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "j2", customerAlias: "C-3901", serviceCategory: "Electrical", status: "pending", description: "Install new ceiling fan", createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: "j3", customerAlias: "C-7752", serviceCategory: "Plumbing", status: "completed", description: "Replace bathroom faucet", createdAt: new Date(Date.now() - 604800000).toISOString() },
  { id: "j4", customerAlias: "C-4409", serviceCategory: "Renovation", status: "completed", description: "Kitchen countertop replacement", createdAt: new Date(Date.now() - 1209600000).toISOString() },
];

const DEMO_PROFILE: ProviderProfile = {
  profession: "Plumber",
  tier: "corporate",
  rating: 4.7,
  totalJobs: 142,
  priceList: [
    { service: "Basic Repair", price: 500 },
    { service: "Pipe Installation", price: 1500 },
    { service: "Drain Cleaning", price: 800 },
    { service: "Water Heater Install", price: 3500 },
    { service: "Full Bathroom Plumbing", price: 12000 },
  ],
};

const DEMO_MESSAGES: Record<string, ChatMessage[]> = {
  j1: [
    { id: "m1", sender: "customer", text: "Hi, the kitchen sink has been leaking for 2 days", timestamp: new Date(Date.now() - 80000000).toISOString() },
    { id: "m2", sender: "provider", text: "I can come check it tomorrow morning. Can you send a photo?", timestamp: new Date(Date.now() - 79000000).toISOString() },
    { id: "m3", sender: "customer", text: "Sure, here is the photo. It's under the sink pipe connection.", timestamp: new Date(Date.now() - 78000000).toISOString() },
    { id: "m4", sender: "provider", text: "Looks like a worn gasket. I'll bring replacement parts. Should take about 1 hour.", timestamp: new Date(Date.now() - 77000000).toISOString() },
  ],
  j2: [
    { id: "m5", sender: "customer", text: "I need a ceiling fan installed in my living room", timestamp: new Date(Date.now() - 160000000).toISOString() },
    { id: "m6", sender: "provider", text: "What size fan? And do you already have a mounting bracket?", timestamp: new Date(Date.now() - 159000000).toISOString() },
  ],
};

export default function ProZonePage() {
  const locale = useLocale();
  const prefix = `/${locale}`;
  const t: Translations = (locale in T ? T[locale] : T.en)!;

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("jobs");
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(DEMO_MESSAGES);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const sub = localStorage.getItem("subscriber");
      setIsAuthenticated(!!sub);
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedJob]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t.loginRequired}</h2>
          <Link
            href={`${prefix}/subscription`}
            className="inline-block mt-4 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-semibold"
          >
            {t.goToSubscription}
          </Link>
        </div>
      </div>
    );
  }

  const activeJobs = DEMO_JOBS.filter((j) => j.status === "pending" || j.status === "in_progress");
  const pastJobs = DEMO_JOBS.filter((j) => j.status === "completed" || j.status === "cancelled");

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const statusLabels: Record<string, string> = {
    pending: t.pending,
    in_progress: t.inProgress,
    completed: t.completed,
    cancelled: t.cancelled,
  };

  function sendMessage() {
    if (!newMessage.trim() || !selectedJob) return;
    const msg: ChatMessage = {
      id: `m${Date.now()}`,
      sender: "provider",
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => ({
      ...prev,
      [selectedJob]: [...(prev[selectedJob] || []), msg],
    }));
    setNewMessage("");
  }

  const tierDeposit: Record<string, number> = { standard: 200, corporate: 400, expert: 600 };

  function renderStars(rating: number) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return (
      <span className="text-amber-400 text-lg">
        {"★".repeat(full)}
        {half && "☆"}
        {"☆".repeat(5 - full - (half ? 1 : 0))}
        <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>
      </span>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-amber-600 to-amber-800 text-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold">{t.title}</h1>
          <p className="mt-3 text-lg text-amber-100">{t.subtitle}</p>
        </div>
      </section>

      {/* Tabs */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 inline-flex overflow-hidden">
          {(["jobs", "chat", "profile"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-amber-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab === "jobs" ? "📋 " : tab === "chat" ? "💬 " : "👤 "}
              {t[tab]}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Jobs Tab */}
        {activeTab === "jobs" && (
          <div className="space-y-8">
            {/* Active Jobs */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t.activeJobs}</h2>
              {activeJobs.length === 0 ? (
                <p className="text-gray-500">{t.noJobs}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeJobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition cursor-pointer"
                      onClick={() => { setSelectedJob(job.id); setActiveTab("chat"); }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-900">{t.anonymousCustomer} #{job.customerAlias}</span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[job.status]}`}>
                          {statusLabels[job.status]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{job.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{job.serviceCategory}</span>
                        <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Jobs */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t.pastJobs}</h2>
              {pastJobs.length === 0 ? (
                <p className="text-gray-500">{t.noJobs}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pastJobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-white rounded-xl border border-gray-200 p-5 opacity-80"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-900">{t.anonymousCustomer} #{job.customerAlias}</span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[job.status]}`}>
                          {statusLabels[job.status]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{job.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{job.serviceCategory}</span>
                        <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === "chat" && (
          <div className="flex gap-6 h-[600px]">
            {/* Conversation List */}
            <div className="w-80 bg-white rounded-xl border border-gray-200 overflow-y-auto flex-shrink-0">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">{t.jobs}</h3>
              </div>
              {DEMO_JOBS.filter((j) => j.status !== "cancelled").map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJob(job.id)}
                  className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition ${
                    selectedJob === job.id ? "bg-amber-50 border-l-4 border-l-amber-600" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">{t.anonymousCustomer} #{job.customerAlias}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[job.status]}`}>
                      {statusLabels[job.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{job.description}</p>
                </button>
              ))}
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col">
              {selectedJob ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {t.anonymousCustomer} #{DEMO_JOBS.find((j) => j.id === selectedJob)?.customerAlias}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {DEMO_JOBS.find((j) => j.id === selectedJob)?.serviceCategory} — {DEMO_JOBS.find((j) => j.id === selectedJob)?.description}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {locale === "th" ? "ชื่อจริงถูกซ่อน" : locale === "zh" ? "真实姓名已隐藏" : "Real names hidden"}
                    </span>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {(messages[selectedJob] || []).map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === "provider" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                            msg.sender === "provider"
                              ? "bg-amber-600 text-white rounded-br-md"
                              : "bg-gray-100 text-gray-800 rounded-bl-md"
                          }`}
                        >
                          <p>{msg.text}</p>
                          <p className={`text-xs mt-1 ${msg.sender === "provider" ? "text-amber-200" : "text-gray-400"}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder={t.typePlaceholder}
                        className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="px-6 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t.sendMessage}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="text-5xl mb-4">💬</div>
                    <p>{t.selectConversation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔧</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{DEMO_PROFILE.profession}</h3>
                <div className="mt-2">{renderStars(DEMO_PROFILE.rating)}</div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t.tier}</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                      DEMO_PROFILE.tier === "expert" ? "bg-purple-100 text-purple-800" :
                      DEMO_PROFILE.tier === "corporate" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {t[DEMO_PROFILE.tier]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t.totalJobs}</span>
                    <span className="font-semibold text-gray-900">{DEMO_PROFILE.totalJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t.deposit}</span>
                    <span className="font-semibold text-gray-900">฿{tierDeposit[DEMO_PROFILE.tier]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price List */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t.priceList}</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-semibold text-gray-600">{t.service}</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-600">{t.price}</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_PROFILE.priceList.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-3 text-sm text-gray-800">{item.service}</td>
                      <td className="py-3 text-sm text-gray-900 font-semibold text-right">
                        ฿{new Intl.NumberFormat("th-TH").format(item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tier Info */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["standard", "corporate", "expert"] as const).map((tier) => (
                  <div
                    key={tier}
                    className={`rounded-xl border-2 p-5 text-center ${
                      DEMO_PROFILE.tier === tier
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {tier === "standard" ? "⭐" : tier === "corporate" ? "🏢" : "👑"}
                    </div>
                    <h4 className="font-bold text-gray-900 capitalize">{t[tier]}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {t.deposit}: ฿{tierDeposit[tier]}
                    </p>
                    {DEMO_PROFILE.tier === tier && (
                      <span className="inline-block mt-2 text-xs font-semibold text-amber-700 bg-amber-200 px-3 py-1 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
