"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { THAI_PROVINCES } from "../lib/constants";
import PdpaConsent from "../components/PdpaConsent";
import { clearSubscriberSession, refreshSubscriberSession } from "../../../lib/subscriberSession";
const PROPERTY_TYPES = ["CONDO", "HOUSE", "TOWNHOUSE", "LAND", "COMMERCIAL", "APARTMENT"] as const;



interface Property {
  id: string;
  userId?: string;
  title: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
  propertyType: string;
  listingType: string;
  tier?: string;
  price: number;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  province: string;
  district: string;
  contactName?: string;
  contactEmail?: string;
  images: { url: string }[];
}

const PLACEHOLDER_PROPERTY_IMAGE = "/images/scenic-house.jpg";
const DEBUG_LISTING_PATTERN = /\b(test|probe|debug|dummy|sample|qa)\b/i;
const PLACEHOLDER_LOCATION_PATTERN = /^--\s*select/i;

function parsePropertyTimestamp(value?: string) {
  const ts = value ? Date.parse(value) : 0;
  return Number.isFinite(ts) ? ts : 0;
}

function normalizeDistrict(value: unknown) {
  const text = String(value || "").trim();
  if (!text || PLACEHOLDER_LOCATION_PATTERN.test(text)) return "";
  return text;
}

function normalizeImageUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("data:image/")) {
    const compact = raw.replace(/\s+/g, "");
    const normalized = compact.includes(";base64,")
      ? compact
      : compact.replace(/;bas(?!e64,)/i, ";base64,");
    const valid = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(normalized);
    return valid ? normalized : "";
  }

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("/") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  return "";
}

function sanitizeProperty(raw: any): Property {
  const imagesRaw = Array.isArray(raw?.images) ? raw.images : [];
  const images = imagesRaw
    .map((img: any) => normalizeImageUrl(typeof img === "string" ? img : img?.url))
    .filter(Boolean)
    .map((url: string) => ({ url }));

  return {
    ...raw,
    title: String(raw?.title || "").trim(),
    description: String(raw?.description || "").trim(),
    province: String(raw?.province || "").trim(),
    district: normalizeDistrict(raw?.district),
    contactEmail: String(raw?.contactEmail || "").trim().toLowerCase(),
    images,
  };
}

function isFakeListing(property: Property) {
  const haystack = `${property.title} ${property.description}`.toLowerCase();
  if (DEBUG_LISTING_PATTERN.test(haystack)) return true;
  if ((property.contactEmail || "").endsWith("@example.com")) return true;
  return false;
}

function dedupeProperties(items: Property[]) {
  const bestByKey = new Map<string, Property>();
  for (const item of items) {
    const key = [
      item.userId || "",
      String(item.title || "").trim().toLowerCase(),
      String(item.propertyType || "").toUpperCase(),
      String(item.listingType || "").toUpperCase(),
      Number(item.price || 0),
      String(item.province || "").trim().toLowerCase(),
      String(item.district || "").trim().toLowerCase(),
      Number(item.bedrooms || 0),
      Number(item.bathrooms || 0),
      Number(item.area || 0),
    ].join("|");

    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, item);
      continue;
    }

    const existingHasImage = (existing.images?.length || 0) > 0;
    const nextHasImage = (item.images?.length || 0) > 0;
    const existingTs = parsePropertyTimestamp(existing.updatedAt || existing.createdAt);
    const nextTs = parsePropertyTimestamp(item.updatedAt || item.createdAt);

    if ((nextHasImage && !existingHasImage) || (nextHasImage === existingHasImage && nextTs >= existingTs)) {
      bestByKey.set(key, item);
    }
  }

  return Array.from(bestByKey.values()).sort(
    (a, b) => parsePropertyTimestamp(b.createdAt) - parsePropertyTimestamp(a.createdAt),
  );
}

export default function PropertiesPage() {
  const t = useTranslations("realEstate");
  const tc = useTranslations("common");
  const locale = useLocale();
  const prefix = `/${locale}`;
  const loginRequiredMessage = locale === "th"
    ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้งก่อนส่งคำขอ"
    : locale === "zh"
    ? "登录已过期。请重新登录后再发送询盘。"
    : "Your session expired. Please log in again before sending the inquiry.";

  const [properties, setProperties] = useState<Property[]>([]);
  const [latestProperties, setLatestProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [subscriber, setSubscriber] = useState<{ name: string; email: string } | null>(null);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [pendingContactProp, setPendingContactProp] = useState<Property | null>(null);
  const [showContactFlow, setShowContactFlow] = useState<Property | null>(null);
  const [contactStep, setContactStep] = useState<"po" | "notify" | "done">("po");
  const [showPdpa, setShowPdpa] = useState(false);
  const [poNumber, setPoNumber] = useState("");
  const [todayStr, setTodayStr] = useState("");
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
          const normalized = dedupeProperties(
            (Array.isArray(data?.properties) ? data.properties : [])
              .map(sanitizeProperty)
              .filter((property: Property) => !isFakeListing(property)),
          );
          setLatestProperties(normalized.slice(0, 20));
        }
      } catch {
        // API not available
      }
    }
    fetchLatest();

    // Hydration-safe date init
    setTodayStr(new Date().toISOString().split("T")[0] ?? "");
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
        const normalized = dedupeProperties(
          (Array.isArray(data?.properties) ? data.properties : [])
            .map(sanitizeProperty)
            .filter((property: Property) => !isFakeListing(property)),
        );
        setProperties(normalized);
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
      setPendingContactProp(prop);
      setShowLoginGate(true);
      return;
    }
    const po = generatePO();
    setPoNumber(po);
    setShowContactFlow(prop);
    setContactStep("po");
  }

  function generatePO() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const seq = String(Math.floor(Math.random() * 9000) + 1000);
    return `PRE-${yy}${mm}-${seq}`;
  }

  const TIER_FEES: Record<string, number> = { ECONOMY: 100, STANDARD: 400, UPPER: 600, LUXURY: 800, GRANDEUR: 1000 };
  const TIER_LABELS: Record<string, string> = { ECONOMY: "Economy", STANDARD: "Standard", UPPER: "Upper", LUXURY: "Luxury", GRANDEUR: "Grandeur" };



  const typeKeys: Record<string, string> = {
    "CONDO": "🏢 condo",
    "HOUSE": "🏠 house",
    "TOWNHOUSE": "🏡 townhouse",
    "LAND": "🌳 land",
    "COMMERCIAL": "🏬 commercial",
    "OFFICE": "💼 office",
    "APARTMENT": "🏢 apartment",
    "WAREHOUSE": "🏭 warehouse",
    "FACTORY": "🏭 factory"
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
              <input type="password" placeholder={locale === "th" ? "รหัสผ่าน (ตัวใหญ่+เล็ก+ตัวเลข+อักขระพิเศษ)" : locale === "zh" ? "密码（大小写+数字+特殊字符）" : "Password (A-z + 0-9 + !@#)"} value={authPassword}
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
                  // Auto-proceed to contact flow for the property that triggered the login
                  if (pendingContactProp) {
                    const po = generatePO();
                    setPoNumber(po);
                    setShowContactFlow(pendingContactProp);
                    setContactStep("po");
                    setPendingContactProp(null);
                  }
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

      {/* Property Inquiry Flow Modal — 3-step: po → notify → done */}
      {showContactFlow && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-white font-bold">
                {contactStep === "po"
                  ? (locale === "th" ? "ยืนยันการสอบถาม" : locale === "zh" ? "确认询盘" : "Confirm Inquiry")
                  : contactStep === "notify"
                  ? (locale === "th" ? "กำลังส่งแจ้งเตือน..." : locale === "zh" ? "正在通知..." : "Sending Notification...")
                  : (locale === "th" ? "ส่งสำเร็จ!" : locale === "zh" ? "已发送！" : "Inquiry Sent!")}
              </h2>
              <button onClick={() => setShowContactFlow(null)} className="text-white/80 hover:text-white text-xl">&times;</button>
            </div>

            {/* Step Progress (3 steps: po → notify → done) */}
            <div className="px-6 pt-4 flex-shrink-0">
              <div className="flex items-center gap-1 mb-1">
                {(["po", "notify", "done"] as const).map((s, i) => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${
                    (["po", "notify", "done"] as const).indexOf(contactStep) >= i ? "bg-emerald-500" : "bg-gray-200"
                  }`} />
                ))}
              </div>
              <p className="text-xs text-gray-400 text-right mb-2">
                {locale === "th" ? `ขั้นตอน ${["po","notify","done"].indexOf(contactStep)+1} จาก 3` :
                 locale === "zh" ? `步骤 ${["po","notify","done"].indexOf(contactStep)+1} / 3` :
                 `Step ${["po","notify","done"].indexOf(contactStep)+1} of 3`}
              </p>
            </div>

            <div className="p-6 pt-2 overflow-y-auto flex-1">
              {/* Property info */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-5">
                <span className="text-3xl">🏠</span>
                <div>
                  <p className="font-bold text-gray-900">{showContactFlow.title}</p>
                  <p className="text-sm text-green-700 font-semibold">฿{formatPrice(showContactFlow.price)}{showContactFlow.listingType === "RENT" ? "/mo" : ""}</p>
                </div>
              </div>

              {/* Step 1 of 3: Confirm Inquiry + PO */}
              {contactStep === "po" && (() => {
                const propTier = showContactFlow.tier || "STANDARD";
                const fee = TIER_FEES[propTier] ?? 400;
                const tierLabel = TIER_LABELS[propTier] ?? "Standard";
                return (
                  <div>
                    <div className="text-center mb-4">
                      <div className="text-5xl mb-2">📋</div>
                      <p className="text-xs text-gray-400">{locale === "th" ? "CBLUE ออกให้เป็นฝ่ายที่สาม" : locale === "zh" ? "CBLUE作为第三方签发" : "Issued by CBLUE as third party"}</p>
                      <div className="bg-gray-50 rounded-xl p-3 my-3 inline-block">
                        <p className="text-xs text-gray-500 mb-1">{locale === "th" ? "เลขที่ PO" : locale === "zh" ? "PO编号" : "PO Number"}</p>
                        <p className="text-xl font-mono font-extrabold text-emerald-700">{poNumber}</p>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 text-sm space-y-2">
                      <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ทรัพย์สิน" : locale === "zh" ? "房产" : "Property"}</span><span className="font-semibold text-right max-w-[60%] line-clamp-1">{showContactFlow.title}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ราคา" : locale === "zh" ? "价格" : "Price"}</span><span className="font-semibold">฿{formatPrice(showContactFlow.price)}{showContactFlow.listingType === "RENT" ? "/mo" : ""}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "จังหวัด" : locale === "zh" ? "省份" : "Province"}</span><span className="font-semibold">{showContactFlow.province}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "ระดับบริการ (กำหนดโดยผู้ลงประกาศ)" : locale === "zh" ? "服务等级（由房源方设定）" : "Service Tier (set by lister)"}</span><span className="font-semibold">{tierLabel}</span></div>
                      <div className="flex justify-between border-t border-gray-100 pt-2">
                        <span className="text-gray-600 font-semibold">{locale === "th" ? "ค่าดำเนินการ (ชำระในแดชบอร์ด)" : locale === "zh" ? "处理费（在控制台支付）" : "Processing Fee (pay in Dashboard)"}</span>
                        <span className="font-extrabold text-green-700">฿{fee}</span>
                      </div>
                      <div className="flex justify-between"><span className="text-gray-500">{locale === "th" ? "วันที่" : locale === "zh" ? "日期" : "Date"}</span><span className="font-semibold">{todayStr}</span></div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 mb-4">
                      {locale === "th"
                        ? "⚠️ ข้อมูลติดต่อผู้ลงประกาศจะเปิดเผยหลังชำระค่าดำเนินการในแดชบอร์ด CBLUE เป็นแพลตฟอร์มจับคู่เท่านั้น ราคาทรัพย์สินตกลงโดยตรงระหว่างคู่สัญญา"
                        : locale === "zh"
                        ? "⚠️ 联系信息将在控制台付款后显示。CBLUE仅为匹配平台，房产价格由双方直接协商。"
                        : "⚠️ Contact info is revealed after paying the processing fee in your Dashboard. CBLUE is a matching platform only. Property price is agreed directly between parties."}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const storedToken = localStorage.getItem("subscriber_token") || "";
                          const refreshedToken = storedToken ? await refreshSubscriberSession(storedToken) : null;
                          if (storedToken && !refreshedToken) {
                            clearSubscriberSession();
                            setShowContactFlow(null);
                            setPendingContactProp(showContactFlow);
                            setShowLoginGate(true);
                            alert(loginRequiredMessage);
                            return;
                          }

                          const token = refreshedToken || storedToken;
                          if (!token) {
                            setShowContactFlow(null);
                            setPendingContactProp(showContactFlow);
                            setShowLoginGate(true);
                            return;
                          }

                          const submitInquiry = (authToken: string) => fetch("/api/v1/property-inquiries", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
                            body: JSON.stringify({
                              poNumber,
                              propertyId: showContactFlow.id,
                              listerUserId: showContactFlow.userId || "",
                              customerName: subscriber?.name || "",
                              customerEmail: subscriber?.email || "",
                              listerName: showContactFlow.contactName || showContactFlow.title,
                            }),
                          });

                          let res = await submitInquiry(token);
                          if (!res.ok && [401, 403].includes(res.status)) {
                            const retriedToken = await refreshSubscriberSession(token);
                            if (!retriedToken) {
                              clearSubscriberSession();
                              setShowContactFlow(null);
                              setPendingContactProp(showContactFlow);
                              setShowLoginGate(true);
                              alert(loginRequiredMessage);
                              return;
                            }
                            res = await submitInquiry(retriedToken);
                          }

                          if (!res.ok) {
                            const errData = await res.json().catch(() => null);
                            const msg = Array.isArray(errData?.message)
                              ? errData.message.join(", ")
                              : errData?.message || (locale === "th" ? "ไม่สามารถส่งคำขอได้ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง" : locale === "zh" ? "无法发送询盘。请重新登录后再试。" : "Could not send the inquiry. Please log in again and retry.");
                            alert(msg);
                            return;
                          }
                        } catch {
                          alert(locale === "th" ? "ไม่สามารถส่งคำขอได้ในขณะนี้" : locale === "zh" ? "目前无法发送询盘" : "Could not send the inquiry right now.");
                          return;
                        }
                        setContactStep("notify");
                        setTimeout(() => setContactStep("done"), 3000);
                      }}
                      className="w-full py-3 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 transition"
                    >
                      {locale === "th" ? "📡 แจ้งผู้ลงประกาศ" : locale === "zh" ? "📡 通知房源方" : "📡 Notify Lister"}
                    </button>
                  </div>
                );
              })()}

              {/* Step 2 of 3: Sending animation */}
              {contactStep === "notify" && (
                <div className="text-center py-6">
                  <div className="text-5xl mb-4 animate-bounce">📡</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {locale === "th" ? "กำลังส่งแจ้งเตือน..." : locale === "zh" ? "正在通知房源方..." : "Notifying lister..."}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {locale === "th" ? "กำลังส่งการสอบถามของคุณไปยังผู้ลงประกาศ" : locale === "zh" ? "正在发送您的询盘给房源方" : "Sending your inquiry to the property lister"}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.4s]" />
                  </div>
                  <p className="text-xs text-gray-400 mt-4">PO: {poNumber}</p>
                </div>
              )}

              {/* Step 3 of 3: Done */}
              {contactStep === "done" && (
                <div className="text-center py-4">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {locale === "th" ? "ส่งการสอบถามสำเร็จ!" : locale === "zh" ? "询盘已发送！" : "Inquiry Sent!"}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {locale === "th"
                      ? "ผู้ลงประกาศจะได้รับการแจ้งเตือน ติดตามสถานะในแดชบอร์ด"
                      : locale === "zh"
                      ? "房源方将收到通知。请在控制台跟踪状态。"
                      : "The lister has been notified. Track the status in your Dashboard."}
                  </p>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 text-sm text-left">
                    <p className="font-semibold text-emerald-800 mb-2">
                      {locale === "th" ? "ขั้นตอนถัดไป:" : locale === "zh" ? "后续步骤：" : "Next steps:"}
                    </p>
                    <ol className="space-y-1 text-emerald-700 text-xs list-decimal list-inside">
                      <li>{locale === "th" ? "รอผู้ลงประกาศยืนยัน (ขั้นตอนที่ 4)" : locale === "zh" ? "等待房源方确认（步骤4）" : "Lister accepts your inquiry (Step 4 of 8)"}</li>
                      <li>{locale === "th" ? "ชำระค่าดำเนินการในแดชบอร์ด (ขั้นตอนที่ 5)" : locale === "zh" ? "在控制台支付处理费（步骤5）" : "Pay processing fee in Dashboard (Step 5 of 8)"}</li>
                      <li>{locale === "th" ? "รับข้อมูลติดต่อและนัดหมาย (ขั้นตอนที่ 7)" : locale === "zh" ? "获取联系方式并预约（步骤7）" : "Get contact info & schedule viewing (Step 7 of 8)"}</li>
                      <li>{locale === "th" ? "ให้คะแนนหลังเสร็จสิ้น (ขั้นตอนที่ 8)" : locale === "zh" ? "完成后评分（步骤8）" : "Rate after completion (Step 8 of 8)"}</li>
                    </ol>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-500">
                    PO: <span className="font-mono font-bold text-emerald-700">{poNumber}</span>
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
                      <img
                        src={prop.images[0]?.url || PLACEHOLDER_PROPERTY_IMAGE}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />
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
                    <p className="text-xs text-gray-400 mt-2">
                      {prop.province}{prop.district ? `, ${prop.district}` : ""}
                    </p>
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto px-4">
                {PROPERTY_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleSearch({ propertyType: type })}
                    className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-green-500 hover:shadow-md transition cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{t(`types.${typeKeys[type]}`)}</h3>
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
                          <img
                            src={prop.images[0]?.url || PLACEHOLDER_PROPERTY_IMAGE}
                            alt={prop.title}
                            className="w-full h-full object-cover"
                          />
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
