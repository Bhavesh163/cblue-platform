"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { THAI_PROVINCES } from "../lib/constants";
import PdpaConsent from "../components/PdpaConsent";
import generatePayload from "promptpay-qr";
import { QRCodeSVG } from "qrcode.react";
const PROPERTY_TYPES = ["CONDO", "HOUSE", "TOWNHOUSE", "LAND", "COMMERCIAL", "OFFICE", "APARTMENT", "WAREHOUSE", "FACTORY"] as const;



interface Property {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  price: number;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  province: string;
  district: string;
  images: { url: string }[];
}

export default function PropertiesPage() {
  const t = useTranslations("realEstate");
  const tc = useTranslations("common");
  const locale = useLocale();
  const prefix = `/${locale}`;

  const [properties, setProperties] = useState<Property[]>([]);
  const [latestProperties, setLatestProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [subscriber, setSubscriber] = useState<{ name: string; email: string } | null>(null);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [showContactFlow, setShowContactFlow] = useState<Property | null>(null);
  const [contactStep, setContactStep] = useState<"tier" | "payment" | "po" | "notify" | "chat" | "meeting" | "rate" | "done">("tier");
  const [selectedTier, setSelectedTier] = useState("");
  const [showPdpa, setShowPdpa] = useState(false);
  const [poNumber, setPoNumber] = useState("");
  const [listerConfirmed, setListerConfirmed] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: "you" | "lister"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [todayStr, setTodayStr] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [listerRating, setListerRating] = useState(4);
  const [listerComment, setListerComment] = useState("");
  const [listerRateReady, setListerRateReady] = useState(false);
  const [customerRated, setCustomerRated] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [authError, setAuthError] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [filters, setFilters] = useState({
    propertyType: "",
    listingType: "",
    province: "",
    minPrice: "",
    maxPrice: "",
    bedrooms: "",
    keyword: "",
  });

  
  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem("subscriber");
      if (stored) {
        setSubscriber(JSON.parse(stored));
      } else {
        setSubscriber(null);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    // Check login
    try {
      const stored = localStorage.getItem("subscriber");
      if (stored) {
        setSubscriber(JSON.parse(stored));
        const consent = localStorage.getItem("pdpa_consent_customer");
        if (!consent) setShowPdpa(true);
      }
    } catch { /* ignore */ }

    async function fetchLatest() {
      try {
        const res = await fetch("/api/v1/properties?limit=20");
        if (res.ok) {
          const data = await res.json();
          setLatestProperties(data.properties || []);
        }
      } catch {
        // API not available
      }
    }
    fetchLatest();

    // Hydration-safe: initialize random values
    setListerRating(3 + Math.floor(Math.random() * 3));
    setTodayStr(new Date().toISOString().split("T")[0] ?? "");
    const comments: Record<string, string[]> = {
      en: ["Polite and punctual customer", "Very interested buyer, asked good questions", "Easy to deal with, would recommend", "Serious buyer with clear requirements"],
      th: ["ลูกค้าสุภาพ ตรงเวลา", "ผู้ซื้อสนใจจริง ถามคำถามดี", "ทำงานด้วยง่าย แนะนำได้", "ผู้ซื้อจริงจัง มีความต้องการชัดเจน"],
      zh: ["礼貌准时的客户", "买家非常感兴趣，问了好问题", "容易打交道，愿意推荐", "认真的买家，需求明确"],
    };
    const pool = comments[locale] ?? comments["en"]!;
    setListerComment(pool[Math.floor(Math.random() * pool.length)]!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(overrides?: Partial<typeof filters>) {
    const f = overrides ? { ...filters, ...overrides } : filters;
    if (overrides) setFilters(f);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.propertyType) params.set("propertyType", f.propertyType);
      if (f.listingType) params.set("listingType", f.listingType);
      if (f.province) params.set("province", f.province);
      if (f.minPrice) params.set("minPrice", f.minPrice);
      if (f.maxPrice) params.set("maxPrice", f.maxPrice);
      if (f.bedrooms) params.set("bedrooms", f.bedrooms);
      if (f.keyword) params.set("keyword", f.keyword);

      const res = await fetch(`/api/v1/properties?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("th-TH").format(price);
  }

  function handleContactLister(prop: Property) {
    if (!subscriber) {
      setShowLoginGate(true);
      return;
    }
    setShowContactFlow(prop);
    setContactStep("tier");
    setSelectedTier("");
    setPoNumber("");
    setListerConfirmed(false);
    setChatMessages([]);
    setChatInput("");
    setMeetingDate("");
    setMeetingTime("");
    setRating(0);
    setRatingComment("");
    setCustomerRated(false);
  }

  function generatePO() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const seq = String(Math.floor(Math.random() * 9000) + 1000);
    return `PO-${yy}${mm}-${seq}`;
  }

  function sendChatMessage() {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { sender: "you", text: chatInput.trim() }]);
    setChatInput("");
    setTimeout(() => {
      const replies = locale === "th"
        ? ["ได้ครับ/ค่ะ ยินดีให้ข้อมูลเพิ่มเติม", "ทรัพย์สินนี้ยังว่างอยู่ครับ/ค่ะ", "สามารถนัดดูได้ครับ/ค่ะ"]
        : locale === "zh"
        ? ["当然，很乐意提供更多详情！", "该房产仍然可用。", "我们可以随时安排看房。"]
        : ["Sure, happy to provide more details!", "The property is still available.", "We can schedule a viewing anytime."];
      const reply = replies[Math.floor(Math.random() * replies.length)] ?? replies[0] ?? "";
      setChatMessages((prev) => [...prev, { sender: "lister", text: reply }]);
    }, 1500);
  }

  const PROPERTY_TIERS = [
    { name: "Economy", fee: 100, desc: locale === "th" ? "ห้องเช่า" : locale === "zh" ? "房间" : "Room" },
    { name: "Standard", fee: 400, desc: locale === "th" ? "คอนโด" : locale === "zh" ? "公寓" : "Condo" },
    { name: "Upper", fee: 600, desc: locale === "th" ? "บ้าน" : locale === "zh" ? "别墅" : "House" },
    { name: "Luxury", fee: 800, desc: locale === "th" ? "หรูหรา" : locale === "zh" ? "豪华" : "Luxury" },
    { name: "Grandeur", fee: 1000, desc: locale === "th" ? "พรีเมียม" : locale === "zh" ? "顶级" : "Premium" },
  ];

  const typeKeys: Record<string, string> = {
    "CONDO": "condo",
    "HOUSE": "house",
    "TOWNHOUSE": "townhouse",
    "LAND": "land",
    "COMMERCIAL": "commercial",
    "OFFICE": "office",
    "APARTMENT": "apartment",
    "WAREHOUSE": "warehouse",
    "FACTORY": "factory"
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-sky-50/30 min-h-screen">
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

      {/* Inline Login Gate */}
      {showLoginGate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4"></div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {locale === "th" ? "กรุณาเข้าสู่ระบบก่อน" : locale === "zh" ? "请先登录" : "Login Required"}
              </h2>
              <p className="text-sm text-gray-500">
                {locale === "th" ? "เข้าสู่ระบบหรือสมัครสมาชิกเพื่อติดต่อผู้ลงประกาศ" : locale === "zh" ? "登录或注册以联系发布者" : "Log in or register to contact the property lister"}
              </p>
            </div>
            {/* Toggle */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setAuthMode("login")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${authMode === "login" ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600"}`}>
                {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Login"}
              </button>
              <button onClick={() => setAuthMode("register")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${authMode === "register" ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600"}`}>
                {locale === "th" ? "สมัครสมาชิก" : locale === "zh" ? "注册" : "Register"}
              </button>
            </div>
            <div className="space-y-3">
              <input type="text" inputMode="email" placeholder={locale === "th" ? "อีเมล" : locale === "zh" ? "电子邮件" : "Email"} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                value={authEmail}
                onChange={(e) => { setAuthEmail(e.target.value); setAuthError(""); }}
              />
              <input type="password" placeholder={locale === "th" ? "รหัสผ่าน (อย่างน้อย 8 ตัว)" : locale === "zh" ? "密码（至少8个字符）" : "Password (min 8 chars)"} value={authPassword}
                onChange={(e) => { setAuthPassword(e.target.value); setAuthError(""); }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
              />
              {authMode === "register" && (
                <input type="password" placeholder={locale === "th" ? "ยืนยันรหัสผ่าน" : locale === "zh" ? "确认密码" : "Confirm Password"} value={authConfirmPassword}
                  onChange={(e) => { setAuthConfirmPassword(e.target.value); setAuthError(""); }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                />
              )}
              {authError && <p className="text-xs text-red-600">{authError}</p>}
              <button onClick={async () => {
                if (!authEmail) { setAuthError(locale === "th" ? "กรุณากรอกอีเมล" : locale === "zh" ? "请输入电子邮件" : "Please enter email"); return; }
                if (authPassword.length < 8) { setAuthError(locale === "th" ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : locale === "zh" ? "密码至少8个字符" : "Password must be at least 8 characters"); return; }
                if (authMode === "register" && authPassword !== authConfirmPassword) { setAuthError(locale === "th" ? "รหัสผ่านไม่ตรงกัน" : locale === "zh" ? "密码不匹配" : "Passwords do not match"); return; }
                try {
                  const endpoint = authMode === "login" ? "/api/v1/subscription/login" : "/api/v1/subscription/register";
                  const body = authMode === "login"
                    ? { email: authEmail.toLowerCase(), password: authPassword }
                    : { name: authEmail.split("@")[0] || authEmail, email: authEmail.toLowerCase(), password: authPassword };
                  const authRes = await fetch(`${endpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  });
                  if (!authRes.ok) {
                    const errData = await authRes.json().catch(() => ({ message: "" }));
                    setAuthError(errData.message || (locale === "th" ? "เข้าสู่ระบบ/สมัครสมาชิกล้มเหลว" : locale === "zh" ? "登录/注册失败" : "Login/Register failed"));
                    return;
                  }
                  const authData = await authRes.json();
                  localStorage.setItem("subscriber_token", authData.accessToken);
                  localStorage.setItem("subscriber", JSON.stringify(authData.subscriber));
                  setSubscriber(authData.subscriber);
                  window.dispatchEvent(new Event("storage"));
                  setShowLoginGate(false);
                } catch {
                  setAuthError(locale === "th" ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" : locale === "zh" ? "无法连接服务器" : "Cannot connect to server");
                }
              }} className="w-full py-3 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 transition">
                {authMode === "login" ? (locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Log In") : (locale === "th" ? "สมัครและเข้าสู่ระบบ" : locale === "zh" ? "注册并登录" : "Register & Log In")}
              </button>
              {authMode === "login" && (
                <Link href={`${prefix}/subscription/forgot-password`} className="block text-center text-xs text-green-700 hover:underline mt-2">
                  {locale === "th" ? "ลืมรหัสผ่าน?" : locale === "zh" ? "忘记密码？" : "Forgot password?"}
                </Link>
              )}
            </div>
            <button onClick={() => setShowLoginGate(false)} className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              {locale === "th" ? "ยกเลิก" : locale === "zh" ? "取消" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {/* Contact Lister Enterprise Flow Modal */}
      {showContactFlow && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-white font-bold">
                {contactStep === "tier" ? (locale === "th" ? "เลือกระดับบริการ" : locale === "zh" ? "选择服务等级" : "Select Service Tier") :
                 contactStep === "po" ? (locale === "th" ? "ใบสั่งซื้อ (PO)" : locale === "zh" ? "采购订单" : "Purchase Order") :
                 contactStep === "payment" ? (locale === "th" ? "ชำระค่าธรรมเนียม" : locale === "zh" ? "支付处理费" : "Pay Processing Fee") :
                 contactStep === "notify" ? (locale === "th" ? "แจ้งเตือนผู้ลงประกาศ" : locale === "zh" ? "通知房源方" : "Notifying Lister") :
                 contactStep === "chat" ? (locale === "th" ? "แชทนิรนาม" : locale === "zh" ? "匿名聊天" : "Anonymous Chat") :
                 contactStep === "meeting" ? (locale === "th" ? "นัดหมายดูทรัพย์สิน" : locale === "zh" ? "预约看房" : "Schedule Viewing") :
                 contactStep === "rate" ? (locale === "th" ? "ให้คะแนนและรีวิว" : locale === "zh" ? "评分与评论" : "Rate & Review") :
                 (locale === "th" ? "สำเร็จ!" : locale === "zh" ? "完成！" : "Complete!")}
              </h2>
              <button onClick={() => setShowContactFlow(null)} className="text-white/80 hover:text-white text-xl">&times;</button>
            </div>

            {/* Step Progress */}
            <div className="px-6 pt-4 flex-shrink-0">
              <div className="flex items-center gap-1 mb-4">
                {(["tier", "po", "payment", "notify", "chat", "meeting", "rate", "done"] as const).map((s, i) => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${
                    (["tier", "po", "payment", "notify", "chat", "meeting", "rate", "done"] as const).indexOf(contactStep) >= i
                      ? "bg-emerald-500" : "bg-gray-200"
                  }`} />
                ))}
              </div>
            </div>

            <div className="p-6 pt-2 overflow-y-auto flex-1">
              {/* Property info */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-5">
                <span className="text-3xl"></span>
                <div>
                  <p className="font-bold text-gray-900">{showContactFlow.title}</p>
                  <p className="text-sm text-green-700 font-semibold">฿{formatPrice(showContactFlow.price)}{showContactFlow.listingType === "RENT" ? "/mo" : ""}</p>
                </div>
              </div>

              {/* Step 1: Tier Selection */}
              {contactStep === "tier" && (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    {locale === "th" ? "เลือกระดับบริการเพื่อติดต่อผู้ลงประกาศ:" : locale === "zh" ? "选择服务等级以联系发布者：" : "Choose a service tier to contact the lister:"}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {PROPERTY_TIERS.map((tier) => (
                      <button
                        key={tier.name}
                        onClick={() => setSelectedTier(tier.name)}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition ${
                          selectedTier === tier.name ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-300"
                        }`}
                      >
                        <div className="text-left">
                          <p className="font-bold text-gray-900">{tier.name}</p>
                          <p className="text-xs text-gray-500">{tier.desc}</p>
                        </div>
                        <p className="font-extrabold text-green-700">฿{tier.fee}</p>
                      </button>
                    ))}
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mt-4">
                     {locale === "th"
                      ? "CBLUE เป็นแพลตฟอร์มจับคู่เท่านั้น ราคาทรัพย์สินตกลงโดยตรงระหว่างผู้ซื้อ/ผู้เช่าและผู้ลงประกาศ ค่าธรรมเนียมนี้เป็นค่าดำเนินการเท่านั้น"
                      : locale === "zh"
                      ? "CBLUE仅为匹配平台。房产价格由买家/租客和发布者直接协商。此费用仅用于处理。"
                      : "CBLUE is a matching platform only. Property price is agreed directly between buyer/renter and lister. This fee covers processing only."}
                  </div>
                  <button
                    onClick={() => {
                      setPoNumber(generatePO());
                      setContactStep("po");
                    }}
                    disabled={!selectedTier}
                    className="mt-4 w-full py-3 bg-green-700 text-white font-bold rounded-xl disabled:opacity-40 hover:bg-green-800 transition"
                  >
                    {locale === "th" ? "ดำเนินการต่อ" : locale === "zh" ? "继续" : "Continue"}
                  </button>
                </>
              )}

              {/* Step 2: PO Creation */}
              {contactStep === "po" && (() => {
                let custName = "";
                let custAddr = "";
                try {
                  const sub = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("subscriber") || "{}") : {};
                  custName = sub.name || sub.email || (locale === "th" ? "ลูกค้า" : locale === "zh" ? "客户" : "Customer");
                  custAddr = sub.address || sub.province || "";
                } catch { /* safe fallback */ }
                return (
                <div className="text-center">
                  <div className="text-5xl mb-4"></div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {locale === "th" ? "สร้างใบสั่งซื้อสำเร็จ" : locale === "zh" ? "采购订单已创建" : "Purchase Order Created"}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">{locale === "th" ? "CBLUE ออกให้เป็นฝ่ายที่สาม" : locale === "zh" ? "CBLUE 作为第三方签发" : "Issued by CBLUE as third party"}</p>
                  <div className="bg-gray-50 rounded-xl p-4 mb-4 inline-block">
                    <p className="text-xs text-gray-500 mb-1">{locale === "th" ? "เลขที่ PO" : locale === "zh" ? "PO 编号" : "PO Number"}</p>
                    <p className="text-2xl font-mono font-extrabold text-emerald-700">{poNumber}</p>
                  </div>

                  {/* Formal Parties */}
                  <div className="grid grid-cols-2 gap-3 mb-4 text-left">
                    <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-1">{locale === "th" ? "ผู้ว่าจ้าง" : locale === "zh" ? "客户方" : "Client / Viewer"}</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">{custName}</p>
                      {custAddr && <p className="text-[11px] text-gray-500 truncate">{custAddr}</p>}
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{locale === "th" ? "ผู้ลงประกาศ" : locale === "zh" ? "房源方" : "Property Lister"}</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">{showContactFlow.title}</p>
                      <p className="text-[11px] text-gray-500">{selectedTier}</p>
                    </div>
                  </div>

                  <div className="text-left bg-white border border-gray-200 rounded-xl p-4 mb-4 text-sm space-y-2">
                    <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ทรัพย์สิน" : locale === "zh" ? "房产" : "Property"}</span><span className="font-semibold">{showContactFlow.title}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ระดับ" : locale === "zh" ? "等级" : "Tier"}</span><span className="font-semibold">{selectedTier}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ค่าธรรมเนียม" : locale === "zh" ? "费用" : "Fee"}</span><span className="font-bold text-green-700">฿{PROPERTY_TIERS.find((ti) => ti.name === selectedTier)?.fee || 0}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "วันที่" : locale === "zh" ? "日期" : "Date"}</span><span className="font-semibold">{todayStr}</span></div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-3">
                     {locale === "th"
                      ? "เก็บเลขที่ PO ไว้เป็นหลักฐาน ราคาทรัพย์สินเป็นการเจรจาระหว่างคู่สัญญาโดยตรง"
                      : locale === "zh"
                      ? "请保留此PO编号作为凭据。房产价格由双方直接协商。"
                      : "Keep this PO number for your records. Property pricing is negotiated directly between parties."}
                  </div>
                  <button onClick={() => {
                    setContactStep("payment");
                  }} className="w-full py-3 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 transition">
                    {locale === "th" ? "ดำเนินการต่อ" : locale === "zh" ? "继续" : "Continue"}
                  </button>
                  <button onClick={() => setContactStep("tier")} className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700">
                    {locale === "th" ? "กลับไปแก้ไข" : locale === "zh" ? "返回修改" : "Back to edit"}
                  </button>
                </div>
                );
              })()}

              {/* Step 3: Payment */}
              {contactStep === "payment" && (
                <>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      {locale === "th" ? "สแกน QR Code เพื่อชำระค่าธรรมเนียมดำเนินการ" : locale === "zh" ? "扫描QR码支付处理费" : "Scan QR Code to pay the processing fee"}
                    </p>
                    <div className="inline-block bg-white border-2 border-gray-100 rounded-2xl p-4 mb-4 shadow-sm">
                      <div className="w-48 h-48 rounded-lg flex items-center justify-center text-gray-400">
                        <QRCodeSVG value={generatePayload("0999999999", { amount: PROPERTY_TIERS.find((ti) => ti.name === selectedTier)?.fee || 0 })} size={192} />
                      </div>
                      <p className="text-lg font-extrabold text-green-700 mt-3">
                        ฿{PROPERTY_TIERS.find((ti) => ti.name === selectedTier)?.fee || 0}
                      </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-4">
                       {locale === "th"
                        ? "ค่าธรรมเนียมดำเนินการเท่านั้น ราคาทรัพย์สินตกลงโดยตรงระหว่างผู้ซื้อและผู้ลงประกาศ"
                        : locale === "zh"
                        ? "仅为处理费。房产价格由买家和发布者直接协商。"
                        : "Processing fee only. Property price is agreed directly between buyer and lister."}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setContactStep("po")} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm">
                      ← {locale === "th" ? "กลับ" : locale === "zh" ? "返回" : "Back"}
                    </button>
                    <button onClick={() => {
                      setContactStep("notify");
                      setListerConfirmed(false);
                      setTimeout(() => setListerConfirmed(true), 4000);
                    }} className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition">
                      {locale === "th" ? "ชำระเงินแล้ว" : locale === "zh" ? "我已支付" : "I have paid"}
                    </button>
                  </div>
                </>
              )}

              {/* Step 4: Notification */}
              {contactStep === "notify" && (
                <div className="text-center">
                  {!listerConfirmed ? (
                    <>
                      <div className="text-5xl mb-4 animate-bounce">📡</div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {locale === "th" ? "กำลังส่งแจ้งเตือน..." : locale === "zh" ? "正在通知..." : "Notifying Lister..."}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {locale === "th" ? "กำลังแจ้งเตือนผู้ลงประกาศทรัพย์สินให้ยืนยัน" : locale === "zh" ? "正在发送通知给房源方确认" : "Sending notification to property lister for confirmation"}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.4s]" />
                      </div>
                      <p className="text-xs text-gray-400 mt-4">PO: {poNumber}</p>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl mb-4"></div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {locale === "th" ? "ผู้ลงประกาศยืนยันแล้ว!" : locale === "zh" ? "房源方已确认！" : "Lister Confirmed!"}
                      </h3>
                      <p className="text-sm text-gray-500 mb-6">
                        {locale === "th" ? "คุณสามารถเริ่มแชทนิรนามกับผู้ลงประกาศได้แล้ว" : locale === "zh" ? "您现在可以与发布者开始匿名聊天" : "You can now start an anonymous chat with the lister"}
                      </p>
                      <button onClick={() => setContactStep("chat")} className="w-full py-3 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 transition">
                        {locale === "th" ? "เริ่มแชท" : locale === "zh" ? "开始聊天" : "Start Chat"} 
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Step 5: Anonymous Chat */}
              {contactStep === "chat" && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 mb-4">
                     {locale === "th" ? "แชทนิรนาม — ชื่อจริงไม่ถูกเปิดเผยเพื่อความปลอดภัย" : locale === "zh" ? "匿名聊天 — 真实姓名已隐藏以保护隐私和安全" : "Anonymous chat — real names are hidden for privacy and safety"}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 h-60 overflow-y-auto mb-4 space-y-3">
                    {chatMessages.length === 0 && (
                      <p className="text-center text-gray-400 text-sm mt-8">
                        {locale === "th" ? "เริ่มสนทนาเกี่ยวกับทรัพย์สิน" : locale === "zh" ? "开始关于房产的对话" : "Start a conversation about the property"}
                      </p>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.sender === "you" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                          msg.sender === "you" ? "bg-emerald-600 text-white rounded-br-md" : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
                        }`}>
                          <p className="text-xs font-bold mb-0.5">{msg.sender === "you" ? (locale === "th" ? "คุณ" : locale === "zh" ? "您" : "You") : (locale === "th" ? "ผู้ลงประกาศ" : locale === "zh" ? "发布者" : "Lister")}</p>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mb-4">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                      placeholder={locale === "th" ? "พิมพ์ข้อความ..." : locale === "zh" ? "输入消息..." : "Type a message..."}
                      className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                    <button onClick={sendChatMessage} disabled={!chatInput.trim()} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-emerald-700 transition">
                      {locale === "th" ? "ส่ง" : locale === "zh" ? "发送" : "Send"}
                    </button>
                  </div>
                  <button onClick={() => setContactStep("meeting")} className="w-full py-3 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 transition">
                    {locale === "th" ? "นัดหมายดูทรัพย์สิน" : locale === "zh" ? "预约看房" : "Schedule Property Viewing"} 📅
                  </button>
                </>
              )}

              {/* Step 6: Meeting Scheduling */}
              {contactStep === "meeting" && (
                <div>
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">📅</div>
                    <p className="text-sm text-gray-600">
                      {locale === "th" ? "เลือกวันและเวลาที่สะดวกดูทรัพย์สิน" : locale === "zh" ? "选择方便的日期和时间看房" : "Choose a convenient date and time for property viewing"}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "วันที่" : locale === "zh" ? "日期" : "Date"}</label>
                      <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)}
                        min={todayStr}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "เวลา" : locale === "zh" ? "时间" : "Time"}</label>
                      <select value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 bg-white">
                        <option value="">--</option>
                        {["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mt-4">
                     {locale === "th"
                      ? "การนัดหมายเป็นไปตามความสะดวกของทั้งสองฝ่าย ผู้ลงประกาศจะยืนยันอีกครั้ง"
                      : locale === "zh" ? "看房安排取决于双方的方便程度，发布者将再次确认"
                      : "Viewing is subject to both parties' availability. Lister will confirm."}
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => setContactStep("chat")} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm">
                      ← {locale === "th" ? "กลับ" : locale === "zh" ? "返回" : "Back"}
                    </button>
                    <button onClick={() => setContactStep("rate")} disabled={!meetingDate || !meetingTime}
                      className="flex-1 py-2.5 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition disabled:opacity-40">
                      {locale === "th" ? "ยืนยันนัดหมาย" : locale === "zh" ? "确认看房" : "Confirm Viewing"}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 7: Both-Party Star Rating & Comment (+1 step) */}
              {contactStep === "rate" && (
                <div className="text-center">
                  <div className="text-5xl mb-4"></div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {locale === "th" ? "ให้คะแนนและรีวิว" : locale === "zh" ? "评分与评论" : "Rate & Review"}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {locale === "th" ? "ทั้งสองฝ่ายให้คะแนนก่อนปิดงาน" : locale === "zh" ? "双方评分后结束" : "Both parties rate before closing"}
                  </p>

                  {/* Customer rating form — before submission */}
                  {!customerRated ? (
                    <>
                      <div className="flex justify-center gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} onClick={() => setRating(star)} className={`text-3xl transition ${rating >= star ? "text-yellow-400" : "text-gray-300"} hover:scale-110`}>
                            ★
                          </button>
                        ))}
                      </div>
                      {rating > 0 && <p className="text-sm font-bold text-emerald-700 mb-4">{rating}/5</p>}
                      <textarea
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        placeholder={locale === "th" ? "ความคิดเห็นเพิ่มเติม" : locale === "zh" ? "其他评论" : "Additional comments"}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 h-20 resize-none mb-4"
                      />
                      <button onClick={() => { setCustomerRated(true); setListerRateReady(false); setTimeout(() => setListerRateReady(true), 3000); }} disabled={rating === 0}
                        className="w-full py-3 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 transition disabled:opacity-40">
                        {locale === "th" ? "ส่งรีวิว" : locale === "zh" ? "提交评价" : "Submit Review"}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Customer's submitted rating */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 text-center">
                        <p className="text-xs font-bold text-emerald-700 mb-1">{locale === "th" ? "คะแนนของคุณ" : locale === "zh" ? "您的评分" : "Your Rating"}</p>
                        <div className="flex justify-center gap-0.5">{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${rating >= s ? "text-yellow-400" : "text-gray-300"}`}>★</span>)}</div>
                        <p className="text-xs text-gray-500 mt-1">{rating}/5</p>
                        {ratingComment && <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{ratingComment}&rdquo;</p>}
                      </div>

                      {/* Lister rating — loading then reveal */}
                      {!listerRateReady ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
                          <div className="flex items-center justify-center gap-3">
                            <span className="inline-block w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-500">{locale === "th" ? "กำลังรอผู้ลงประกาศให้คะแนน..." : locale === "zh" ? "等待房东评分中..." : "Waiting for lister to submit rating..."}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                          <p className="text-xs font-bold text-blue-700 mb-1">{locale === "th" ? "คะแนนจากผู้ลงประกาศ" : locale === "zh" ? "房东评分" : "Lister's Rating of You"}</p>
                          <div className="flex justify-center gap-0.5">{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${listerRating >= s ? "text-yellow-400" : "text-gray-300"}`}>★</span>)}</div>
                          <p className="text-xs text-gray-500 mt-1">{listerRating}/5</p>
                          <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{listerComment}&rdquo;</p>
                        </div>
                      )}

                      <button onClick={() => setContactStep("done")} disabled={!listerRateReady}
                        className="w-full py-3 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 transition disabled:opacity-40">
                        {locale === "th" ? "ดูสรุป" : locale === "zh" ? "查看摘要" : "View Summary"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Step 8: Done */}
              {contactStep === "done" && (
                <div className="text-center">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {locale === "th" ? "เสร็จสมบูรณ์!" : locale === "zh" ? "全部完成！" : "All Done!"}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {locale === "th"
                      ? "ขอบคุณที่ใช้บริการ CBLUE สำหรับการค้นหาทรัพย์สิน"
                      : locale === "zh"
                      ? "感谢您使用 CBLUE 搜索房产。"
                      : "Thank you for using CBLUE for your property search."}
                  </p>
                  <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                    <p className="text-gray-500">{locale === "th" ? "เลขที่ PO" : locale === "zh" ? "PO 编号" : "PO Number"}: <span className="font-mono font-bold text-emerald-700">{poNumber}</span></p>
                    <p className="text-gray-500">{locale === "th" ? "นัดหมาย" : locale === "zh" ? "看房" : "Viewing"}: <span className="font-semibold">{meetingDate} {meetingTime}</span></p>
                  </div>
                  {/* Ratings Display */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                      <p className="text-xs font-bold text-emerald-700 mb-1">{locale === "th" ? "คะแนนของคุณ" : locale === "zh" ? "您的评分" : "Your Rating"}</p>
                      <div className="flex justify-center gap-0.5">{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${rating >= s ? "text-yellow-400" : "text-gray-300"}`}>★</span>)}</div>
                      <p className="text-xs text-gray-500 mt-1">{rating}/5</p>
                      {ratingComment && <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{ratingComment}&rdquo;</p>}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <p className="text-xs font-bold text-blue-700 mb-1">{locale === "th" ? "คะแนนจากผู้ลงประกาศ" : locale === "zh" ? "房东评分" : "Lister's Rating of You"}</p>
                      <div className="flex justify-center gap-0.5">{[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${listerRating >= s ? "text-yellow-400" : "text-gray-300"}`}>★</span>)}</div>
                      <p className="text-xs text-gray-500 mt-1">{listerRating}/5</p>
                      <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{listerComment}&rdquo;</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-4">
                     {locale === "th"
                      ? "ราคาทรัพย์สินและเงื่อนไขเป็นการเจรจาระหว่างคู่สัญญาโดยตรง CBLUE เป็นแพลตฟอร์มจับคู่เท่านั้น"
                      : locale === "zh"
                      ? "房产价格和条款由双方直接协商。CBLUE 仅为匹配平台。"
                      : "Property pricing and terms are negotiated directly between parties. CBLUE is a matching platform only."}
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Link href={`${prefix}/dashboard`} className="px-6 py-2.5 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-800 transition">
                      {locale === "th" ? "ไปที่แดชบอร์ด" : locale === "zh" ? "前往控制台" : "Go to Dashboard"}
                    </Link>
                    <button onClick={() => setShowContactFlow(null)} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm">
                      {locale === "th" ? "ค้นหาต่อ" : locale === "zh" ? "继续浏览" : "Continue Browsing"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Hero */}
      <section className="relative text-white min-h-[350px] flex items-center overflow-hidden">
        <Image src="/images/scenic-house.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 to-green-800/70" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center py-16">
          <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur text-emerald-200 rounded-full text-sm font-bold mb-4 border border-white/20">
             {locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房地产" : "Real Estate"}
          </span>
          <h1 className="text-4xl font-bold">{t("title")}</h1>
          <p className="mt-4 text-lg text-emerald-100 max-w-2xl mx-auto">{t("desc")}</p>
          <div className="w-20 h-1 bg-white/50 mx-auto rounded-full mt-6" />
        </div>
      </section>

      {/* Search Filters */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Keyword */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{tc("search")}</label>
                <input
                  type="text"
                  value={filters.keyword}
                  onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                  placeholder="..."
                />
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("propertyType")}</label>
                <select
                  value={filters.propertyType}
                  onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 outline-none bg-white"
                >
                  <option value="">--</option>
                  {PROPERTY_TYPES.map((pt) => (
                    <option key={pt} value={pt}>{t(`types.${typeKeys[pt]}`)}</option>
                  ))}
                </select>
              </div>

              {/* Listing Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("listingType")}</label>
                <select
                  value={filters.listingType}
                  onChange={(e) => setFilters({ ...filters, listingType: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 outline-none bg-white"
                >
                  <option value="">--</option>
                  <option value="SALE">{t("forSale")}</option>
                  <option value="RENT">{t("forRent")}</option>
                </select>
              </div>

              {/* Province */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "จังหวัด" : locale === "zh" ? "省份" : "Province"}
                </label>
                <select
                  value={filters.province}
                  onChange={(e) => setFilters({ ...filters, province: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 outline-none bg-white"
                >
                  <option value="">--</option>
                  {THAI_PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("priceRange")}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    className="w-1/2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    className="w-1/2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("bedrooms")}</label>
                <select
                  value={filters.bedrooms}
                  onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 outline-none bg-white"
                >
                  <option value="">--</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}+</option>
                  ))}
                </select>
              </div>

              {/* Search button */}
              <div className="flex items-end">
                <button
                  onClick={() => handleSearch()}
                  className="w-full py-2.5 px-6 text-sm font-semibold text-white bg-green-700 hover:bg-green-800 rounded-lg transition-colors"
                >
                  {tc("search")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-12 text-gray-500">{tc("loading")}</div>
          ) : searched && properties.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4"></div>
              <p className="text-gray-500 mb-2">
                {locale === "th" ? "ไม่พบประกาศในขณะนี้" : locale === "zh" ? "暂无相关房源" : "No properties found for this search"}
              </p>
              <p className="text-sm text-gray-400 mb-6">
                {locale === "th" ? "ลองเปลี่ยนตัวกรอง หรือลงประกาศของคุณ" : locale === "zh" ? "请尝试调整筛选条件，或发布您的房产" : "Try adjusting your filters, or list your own property"}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => { setSearched(false); setProperties([]); setFilters({ propertyType: "", listingType: "", province: "", minPrice: "", maxPrice: "", bedrooms: "", keyword: "" }); }}
                  className="px-6 py-2.5 text-green-700 border border-green-700 rounded-lg hover:bg-green-50 transition text-sm font-semibold"
                >
                  {locale === "th" ? "← กลับหน้าหลัก" : locale === "zh" ? "← 返回" : "← Back to browse"}
                </button>
                <Link
                  href={`${prefix}/properties/register`}
                  className="inline-block px-6 py-2.5 bg-green-700 text-white rounded-lg hover:bg-green-800 transition text-sm font-semibold"
                >
                  {t("listProperty")}
                </Link>
              </div>
            </div>
          ) : searched ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => { setSearched(false); setProperties([]); setFilters({ propertyType: "", listingType: "", province: "", minPrice: "", maxPrice: "", bedrooms: "", keyword: "" }); }}
                  className="text-sm text-green-700 hover:text-green-800 font-semibold flex items-center gap-1"
                >
                  ← {locale === "th" ? "กลับ" : locale === "zh" ? "返回" : "Back"}
                </button>
                <span className="text-sm text-gray-500">
                  {properties.length} {locale === "th" ? "ผลลัพธ์" : locale === "zh" ? "个结果" : "results"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((prop) => (
                <div
                  key={prop.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <Link href={`${prefix}/properties/${prop.id}`}>
                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                      {prop.images[0] ? (
                        <img src={prop.images[0].url} alt={prop.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl"></span>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        prop.listingType === "SALE" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                      }`}>
                        {prop.listingType === "SALE" ? t("forSale") : t("forRent")}
                      </span>
                      <span className="text-xs text-gray-500">
                        {t(`types.${typeKeys[prop.propertyType]}`)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{prop.title}</h3>
                    <p className="text-lg font-bold text-green-700 mt-1">
                      ฿{formatPrice(prop.price)}
                      {prop.listingType === "RENT" && "/mo"}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                      {prop.bedrooms && <span>{prop.bedrooms} bed</span>}
                      {prop.bathrooms && <span>{prop.bathrooms} bath</span>}
                      {prop.area && <span>{prop.area} sqm</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{prop.province}, {prop.district}</p>
                    <button
                      onClick={() => handleContactLister(prop)}
                      className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition"
                    >
                      📩 {locale === "th" ? "ติดต่อผู้ลงประกาศ" : locale === "zh" ? "联系发布者" : "Contact Lister"}
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </>
          ) : null}

          {/* CTA to register property */}
          {!searched && (
            <div className="text-center py-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {["CONDO", "HOUSE", "LAND"].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleSearch({ propertyType: type })}
                    className="bg-white rounded-xl p-6 border border-gray-200 text-center hover:border-green-500 hover:shadow-md transition cursor-pointer"
                  >
                    <div className="text-4xl mb-3">
                      {type === "CONDO" ? "" : type === "HOUSE" ? "" : "🌳"}
                    </div>
                    <h3 className="font-semibold text-gray-900">{t(`types.${typeKeys[type]}`)}</h3>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleSearch()}
                  className="px-8 py-3 text-sm font-semibold text-white bg-green-700 hover:bg-green-800 rounded-xl transition-colors"
                >
                  {t("searchProperty")}
                </button>
                <Link
                  href={`${prefix}/properties/register`}
                  className="px-8 py-3 text-sm font-semibold text-green-700 border border-green-700 hover:bg-green-50 rounded-xl transition-colors text-center"
                >
                  {t("listProperty")}
                </Link>
              </div>

              {/* Latest 20 Properties */}
              {latestProperties.length > 0 && (
                <div className="mt-16">
                  <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
                    {locale === "th" ? "ประกาศล่าสุด" : locale === "zh" ? "最新房源" : "Latest Listings"}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {latestProperties.map((prop) => (
                      <Link
                        key={prop.id}
                        href={`${prefix}/properties/${prop.id}`}
                        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                      >
                        <div className="h-40 bg-gray-200 flex items-center justify-center">
                          {prop.images[0] ? (
                            <img src={prop.images[0].url} alt={prop.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl"></span>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              prop.listingType === "SALE" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                            }`}>
                              {prop.listingType === "SALE" ? t("forSale") : t("forRent")}
                            </span>
                            <span className="text-xs text-gray-500">
                              {t(`types.${typeKeys[prop.propertyType]}`)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{prop.title}</h3>
                          <p className="text-base font-bold text-green-700 mt-1">
                            ฿{formatPrice(prop.price)}
                            {prop.listingType === "RENT" && "/mo"}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            {prop.bedrooms && <span>{prop.bedrooms} bed</span>}
                            {prop.bathrooms && <span>{prop.bathrooms} bath</span>}
                            {prop.area && <span>{prop.area} sqm</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{prop.province}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
