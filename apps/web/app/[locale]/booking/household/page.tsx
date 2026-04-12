"use client";

import { useState, useCallback, useEffect, Suspense, type FormEvent, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import { HOUSEHOLD_SERVICES, THAI_PROVINCES } from "../../lib/constants";
import { getDistrictsForProvince } from "../../lib/thai-address-data";
import { getSubdistrictsForDistrict, lookupByPostalCode } from "../../lib/thai-subdistrict-data";
import ReCaptcha from "../../components/ReCaptcha";
import GpsDetectButton from "../../components/GpsDetectButton";
import FixerResults from "../../components/FixerResults";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

const BUDGET_RANGES = [
  { value: "UNDER_5000", th: "ต่ำกว่า 5,000 บาท", en: "Under ฿5,000", zh: "低于 ฿5,000" },
  { value: "5000_10000", th: "5,000 – 10,000 บาท", en: "฿5,000 – ฿10,000", zh: "฿5,000 – ฿10,000" },
  { value: "10000_30000", th: "10,000 – 30,000 บาท", en: "฿10,000 – ฿30,000", zh: "฿10,000 – ฿30,000" },
  { value: "30000_50000", th: "30,000 – 50,000 บาท", en: "฿30,000 – ฿50,000", zh: "฿30,000 – ฿50,000" },
  { value: "50000_100000", th: "50,000 – 100,000 บาท", en: "฿50,000 – ฿100,000", zh: "฿50,000 – ฿100,000" },
  { value: "OVER_100000", th: "มากกว่า 100,000 บาท", en: "Over ฿100,000", zh: "超过 ฿100,000" },
];

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  companyHouseNumber: string;
  companyBuilding: string;
  companyFloor: string;
  companyRoad: string;
  companySoi: string;
  companyProvince: string;
  companyDistrict: string;
  companySubdistrict: string;
  companyPostalCode: string;
  serviceCategory: string;
  scheduledDate: string;
  scheduledTime: string;
  locationType: "dropdown" | "address";
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
  houseNumber: string;
  building: string;
  floor: string;
  road: string;
  soi: string;
  addressText: string;
  description: string;
  budgetRange: string;
  isUrgent: boolean;
  tier: string;
  consent: boolean;
}

const initialForm: FormData = {
  name: "",
  email: "",
  phone: "",
  company: "",
  companyHouseNumber: "",
  companyBuilding: "",
  companyFloor: "",
  companyRoad: "",
  companySoi: "",
  companyProvince: "",
  companyDistrict: "",
  companySubdistrict: "",
  companyPostalCode: "",
  serviceCategory: "",
  scheduledDate: "",
  scheduledTime: "",
  locationType: "dropdown",
  province: "",
  district: "",
  subdistrict: "",
  postalCode: "",
  houseNumber: "",
  building: "",
  floor: "",
  road: "",
  soi: "",
  addressText: "",
  description: "",
  budgetRange: "",
  isUrgent: false,
  tier: "economy",
  consent: false,
};

export default function HouseholdBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>}>
      <HouseholdBookingContent />
    </Suspense>
  );
}

function HouseholdBookingContent() {
  const t = useTranslations("booking");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const prefilledService = searchParams.get("service") || "";

  const [form, setForm] = useState<FormData>({
    ...initialForm,
    serviceCategory: prefilledService,
  });
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [subscriber, setSubscriber] = useState<{ name: string; email?: string } | null>(null);
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const prefix = `/${locale}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem("subscriber");
      if (stored) setSubscriber(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (prefilledService) {
      setForm((prev) => ({ ...prev, serviceCategory: prefilledService }));
    }
  }, [prefilledService]);

  const handleRecaptcha = useCallback((token: string) => setRecaptchaToken(token), []);
  const handleRecaptchaExpire = useCallback(() => setRecaptchaToken(""), []);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const target = e.target;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;
    if (target.name === "province") {
      setForm((prev) => ({ ...prev, province: value as string, district: "", subdistrict: "" }));
    } else if (target.name === "district") {
      setForm((prev) => ({ ...prev, district: value as string, subdistrict: "" }));
    } else if (target.name === "companyProvince") {
      setForm((prev) => ({ ...prev, companyProvince: value as string, companyDistrict: "", companySubdistrict: "" }));
    } else if (target.name === "companyDistrict") {
      setForm((prev) => ({ ...prev, companyDistrict: value as string, companySubdistrict: "" }));
    } else if (target.name === "postalCode") {
      const pc = value as string;
      setForm((prev) => ({ ...prev, postalCode: pc }));
      if (pc.length === 5) {
        const lookup = lookupByPostalCode(pc);
        if (lookup) setForm((prev) => ({ ...prev, postalCode: pc, province: lookup.province, district: lookup.district, subdistrict: "" }));
      }
    } else if (target.name === "companyPostalCode") {
      const pc = value as string;
      setForm((prev) => ({ ...prev, companyPostalCode: pc }));
      if (pc.length === 5) {
        const lookup = lookupByPostalCode(pc);
        if (lookup) setForm((prev) => ({ ...prev, companyPostalCode: pc, companyProvince: lookup.province, companyDistrict: lookup.district, companySubdistrict: "" }));
      }
    } else {
      setForm((prev) => ({ ...prev, [target.name]: value }));
    }
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages((prev) => {
        const combined = [...prev, ...newFiles];
        return combined.slice(0, 5);
      });
      // Reset input so the same file can be re-selected
      e.target.value = "";
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Inline auth — if not logged in, validate & create/login account via backend
    if (!subscriber) {
      if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) {
        setError(locale === "th" ? "กรุณากรอกอีเมลที่ถูกต้อง" : locale === "zh" ? "请输入有效的电子邮件" : "Please enter a valid email address");
        return;
      }
      if (!authPassword || authPassword.length < 8) {
        setError(locale === "th" ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : locale === "zh" ? "密码至少8个字符" : "Password must be at least 8 characters");
        return;
      }
      if (authMode === "register" && authPassword !== authConfirmPassword) {
        setError(locale === "th" ? "รหัสผ่านไม่ตรงกัน" : locale === "zh" ? "密码不匹配" : "Passwords do not match");
        return;
      }
      try {
        const endpoint = authMode === "login" ? "/api/v1/subscription/login" : "/api/v1/subscription/register";
        const body = authMode === "login"
          ? { email: form.email.toLowerCase(), password: authPassword }
          : { name: form.name || form.email, email: form.email.toLowerCase(), phone: form.phone, company: form.company || undefined, password: authPassword };
        const authRes = await fetch(`${API_BASE}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!authRes.ok) {
          const errData = await authRes.json().catch(() => ({ message: "" }));
          const msg = errData.message || (locale === "th" ? "เข้าสู่ระบบ/สมัครสมาชิกล้มเหลว" : locale === "zh" ? "登录/注册失败" : "Login/Register failed");
          setError(msg);
          return;
        }
        const authData = await authRes.json();
        localStorage.setItem("subscriber_token", authData.accessToken);
        localStorage.setItem("subscriber", JSON.stringify(authData.subscriber));
        setSubscriber(authData.subscriber);
      } catch {
        setError(locale === "th" ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" : locale === "zh" ? "无法连接服务器" : "Cannot connect to server");
        return;
      }
    }
    if (!form.consent) {
      setError(t("consentError"));
      return;
    }
    if (!recaptchaToken) {
      setError(t("recaptchaError"));
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      // In production, this would call the API with auth tokens
      // For now, log the submission
      const payload = {
        orderType: "HOUSEHOLD",
        name: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        serviceCategory: form.serviceCategory,
        scheduledAt: form.scheduledDate
          ? `${form.scheduledDate}T${form.scheduledTime || "09:00"}:00`
          : undefined,
        isUrgent: form.isUrgent,
        budgetRange: form.budgetRange || undefined,
        tier: form.tier,
        description: form.description,
        address: {
          province: form.province,
          district: form.district,
          subdistrict: form.subdistrict,
          postalCode: form.postalCode,
          houseNumber: form.houseNumber || undefined,
          building: form.building || undefined,
          floor: form.floor || undefined,
          road: form.road || undefined,
          soi: form.soi || undefined,
        },
        gpsCoords: gpsCoords || undefined,
        recaptchaToken,
        imageCount: images.length,
      };
      console.log("Household booking submission:", payload);
      setSuccess(true);
    } catch {
      setError(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <FixerResults
        locale={locale}
        bookingType="household"
        service={form.serviceCategory}
        tier={form.tier}
        onNewBooking={() => {
          setSuccess(false);
          setForm(initialForm);
          setImages([]);
        }}
      />
    );
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("householdTitle")}
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            {t("householdDesc")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Account Authentication — Mandatory */}
          <fieldset className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl border border-sky-200 p-6">
            <legend className="text-lg font-semibold text-gray-900 px-2">
              {locale === "th" ? "🔐 เข้าสู่ระบบ / สร้างบัญชี (จำเป็น)" : locale === "zh" ? "🔐 登录/创建账户（必填）" : "🔐 Login / Create Account (Required)"}
            </legend>
            {subscriber ? (
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-lg font-bold">✓</div>
                <div>
                  <p className="font-semibold text-green-700">{locale === "th" ? "เข้าสู่ระบบแล้ว" : locale === "zh" ? "已登录" : "Logged In"}</p>
                  <p className="text-sm text-gray-500">{subscriber.name}</p>
                </div>
                <button type="button" onClick={() => { localStorage.removeItem("subscriber"); localStorage.removeItem("subscriber_token"); setSubscriber(null); }} className="ml-auto text-xs text-gray-400 hover:text-red-500">
                  {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出" : "Log Out"}
                </button>
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAuthMode("login")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${authMode === "login" ? "bg-sky-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                    {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Login"}
                  </button>
                  <button type="button" onClick={() => setAuthMode("register")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${authMode === "register" ? "bg-sky-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                    {locale === "th" ? "สมัครสมาชิกใหม่" : locale === "zh" ? "注册新账户" : "Register New Account"}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {locale === "th" ? "ใช้อีเมลจากข้อมูลติดต่อด้านล่าง รหัสผ่านอย่างน้อย 8 ตัวอักษร" : locale === "zh" ? "使用下方联系信息中的电子邮件，密码至少8个字符" : "Uses the email from Contact Info below. Password must be at least 8 characters."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === "th" ? "รหัสผ่าน" : locale === "zh" ? "密码" : "Password"} <span className="text-red-500">*</span>
                    </label>
                    <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required minLength={8} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" placeholder="••••••••" />
                  </div>
                  {authMode === "register" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {locale === "th" ? "ยืนยันรหัสผ่าน" : locale === "zh" ? "确认密码" : "Confirm Password"} <span className="text-red-500">*</span>
                      </label>
                      <input type="password" value={authConfirmPassword} onChange={(e) => setAuthConfirmPassword(e.target.value)} required minLength={8} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" placeholder="••••••••" />
                    </div>
                  )}
                </div>
                {authMode === "login" && (
                  <Link href={`${prefix}/subscription/forgot-password`} className="text-xs text-sky-600 hover:underline">
                    {locale === "th" ? "ลืมรหัสผ่าน?" : locale === "zh" ? "忘记密码？" : "Forgot password?"}
                  </Link>
                )}
              </div>
            )}
          </fieldset>

          {/* Personal Info */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {t("contactInfo")}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "ชื่อ-นามสกุล" : locale === "zh" ? "姓名" : "Full Name"} <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder={locale === "th" ? "สมชาย ใจดี" : locale === "zh" ? "张三" : "John Doe"}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "อีเมล" : locale === "zh" ? "电子邮件" : "Email"} <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "เบอร์โทรศัพท์" : locale === "zh" ? "电话号码" : "Phone Number"} <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="0812345678"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "บริษัท" : locale === "zh" ? "公司" : "Company"} <span className="text-red-500">*</span>
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  required
                  value={form.company}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder={locale === "th" ? "บริษัท ABC จำกัด" : locale === "zh" ? "ABC有限公司" : "ABC Co., Ltd."}
                />
              </div>
            </div>
          </fieldset>

          {/* Company / Personal Formal Address */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              🏢 {locale === "th" ? "ที่อยู่บริษัท / ที่อยู่ตามทะเบียนบ้าน" : locale === "zh" ? "公司地址 / 户籍地址" : "Company / Personal Formal Address"}
            </legend>
            <p className="text-xs text-gray-500 mb-4">
              {locale === "th" ? "ที่อยู่สำหรับออกใบสั่งซื้อ (PO) และเอกสารทางการ" : locale === "zh" ? "用于采购订单(PO)和正式文件的地址" : "Address for Purchase Order (PO) and official documents"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "บ้านเลขที่" : locale === "zh" ? "门牌号" : "House No."} <span className="text-red-500">*</span></label>
                <input name="companyHouseNumber" type="text" required value={form.companyHouseNumber} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="123/45" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "อาคาร / ชั้น" : locale === "zh" ? "建筑 / 楼层" : "Building / Floor"}</label>
                <div className="flex gap-2">
                  <input name="companyBuilding" type="text" value={form.companyBuilding} onChange={handleChange} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={locale === "th" ? "อาคาร A" : locale === "zh" ? "A栋" : "Building A"} />
                  <input name="companyFloor" type="text" value={form.companyFloor} onChange={handleChange} className="w-20 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={locale === "th" ? "ชั้น" : locale === "zh" ? "楼层" : "Fl."} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "ถนน" : locale === "zh" ? "路" : "Road"}</label>
                <input name="companyRoad" type="text" value={form.companyRoad} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={locale === "th" ? "ถนนสุขุมวิท" : locale === "zh" ? "素坤逸路" : "Sukhumvit Road"} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "ซอย" : locale === "zh" ? "巷" : "Soi"}</label>
                <input name="companySoi" type="text" value={form.companySoi} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={locale === "th" ? "ซอย 21" : locale === "zh" ? "21巷" : "Soi 21"} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "จังหวัด" : locale === "zh" ? "府" : "Province"} <span className="text-red-500">*</span></label>
                <select name="companyProvince" required value={form.companyProvince} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none bg-white">
                  <option value="">-- {locale === "th" ? "เลือกจังหวัด" : locale === "zh" ? "选择府" : "Select Province"} --</option>
                  {THAI_PROVINCES.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "อำเภอ/เขต" : locale === "zh" ? "县/区" : "District"} <span className="text-red-500">*</span></label>
                <select name="companyDistrict" required value={form.companyDistrict} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none bg-white">
                  <option value="">-- {locale === "th" ? "เลือกอำเภอ/เขต" : locale === "zh" ? "选择县/区" : "Select District"} --</option>
                  {getDistrictsForProvince(form.companyProvince).map((d) => (<option key={d} value={d}>{d}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "ตำบล/แขวง" : locale === "zh" ? "乡/镇" : "Sub-district"} <span className="text-red-500">*</span></label>
                <select name="companySubdistrict" required value={form.companySubdistrict} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none bg-white">
                  <option value="">-- {locale === "th" ? "เลือกตำบล/แขวง" : locale === "zh" ? "选择乡/镇" : "Select Sub-district"} --</option>
                  {getSubdistrictsForDistrict(form.companyProvince, form.companyDistrict).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "รหัสไปรษณีย์" : locale === "zh" ? "邮政编码" : "Postal Code"} <span className="text-red-500">*</span></label>
                <input name="companyPostalCode" type="text" required maxLength={5} value={form.companyPostalCode} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="10110" />
              </div>
            </div>
          </fieldset>

          {/* Service Selection */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {t("serviceDetails")}
            </legend>
            <div className="space-y-4">
              <div>
                <label htmlFor="serviceCategory" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "บริการที่สนใจ" : locale === "zh" ? "感兴趣的服务" : "Service of Interest"} <span className="text-red-500">*</span>
                </label>
                <select
                  id="serviceCategory"
                  name="serviceCategory"
                  required
                  value={form.serviceCategory}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">-- {locale === "th" ? "เลือกบริการ" : locale === "zh" ? "选择服务" : "Select Service"} --</option>
                  {HOUSEHOLD_SERVICES.map((svc) => (
                    <option key={svc.value} value={svc.value}>
                      {locale === "th" ? svc.labelTh : locale === "zh" ? svc.labelZh : svc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === "th" ? "วันที่ต้องการเริ่มงาน" : locale === "zh" ? "期望开工日期" : "Preferred Start Date"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="scheduledDate"
                    name="scheduledDate"
                    type="date"
                    required
                    value={form.scheduledDate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === "th" ? "เวลา" : locale === "zh" ? "时间" : "Time"}
                  </label>
                  <input
                    id="scheduledTime"
                    name="scheduledTime"
                    type="time"
                    value={form.scheduledTime}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Urgent toggle */}
              <div className="flex items-center gap-3">
                <input
                  id="isUrgent"
                  name="isUrgent"
                  type="checkbox"
                  checked={form.isUrgent}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isUrgent" className="text-sm font-medium text-gray-700">
                  🚨 {locale === "th" ? "ต้องการด่วน" : locale === "zh" ? "紧急需求" : "Need urgent?"}
                </label>
              </div>

              {/* Budget Range */}
              <div>
                <label htmlFor="budgetRange" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "งบประมาณโดยประมาณ" : locale === "zh" ? "预估预算" : "Estimated Budget"}
                </label>
                <select
                  id="budgetRange"
                  name="budgetRange"
                  value={form.budgetRange}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">-- {locale === "th" ? "ไม่ระบุ" : locale === "zh" ? "未指定" : "Not specified"} --</option>
                  {BUDGET_RANGES.map((b) => (
                    <option key={b.value} value={b.value}>{locale === "th" ? b.th : locale === "zh" ? b.zh : b.en}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Tier Selection - PROMINENT */}
          <fieldset className="bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-200 rounded-2xl p-6">
            <legend className="text-lg font-bold text-sky-900 mb-2 flex items-center gap-2">
              ⭐ {locale === "th" ? "เลือกระดับบริการ" : locale === "zh" ? "选择服务等级" : "Select Service Tier"} <span className="text-red-500">*</span>
            </legend>
            <p className="text-sm text-sky-700 mb-4">
              {locale === "th" ? "ค่าประสานงานที่จ่ายครั้งเดียวต่อการจับคู่ช่าง/มืออาชีพ" : locale === "zh" ? "每次匹配技工/专业人士支付的一次性服务费" : "One-time processing fee per fixer/professional matching"}
            </p>
            <div className="grid grid-cols-5 gap-3">
              {[
                { value: "economy", label: locale === "th" ? "ประหยัด" : locale === "zh" ? "经济型" : "Economy", deposit: "฿200", emoji: "🟢", stars: "⭐", desc: locale === "th" ? "ช่างทั่วไป" : locale === "zh" ? "普通技工" : "Basic" },
                { value: "standard", label: locale === "th" ? "มาตรฐาน" : locale === "zh" ? "标准型" : "Standard", deposit: "฿400", emoji: "⭐", stars: "⭐⭐", desc: locale === "th" ? "มีประสบการณ์" : locale === "zh" ? "有经验" : "Experienced" },
                { value: "corporate", label: locale === "th" ? "องค์กร" : locale === "zh" ? "企业型" : "Corporate", deposit: "฿600", emoji: "🏢", stars: "⭐⭐⭐", desc: locale === "th" ? "มืออาชีพ" : locale === "zh" ? "专业人士" : "Professional" },
                { value: "specialist", label: locale === "th" ? "ผู้ชำนาญ" : locale === "zh" ? "专家型" : "Specialist", deposit: "฿800", emoji: "🔶", stars: "⭐⭐⭐⭐", desc: locale === "th" ? "ผู้เชี่ยวชาญเฉพาะทาง" : locale === "zh" ? "认证专家" : "Certified specialist" },
                { value: "expert", label: locale === "th" ? "ผู้เชี่ยวชาญ" : locale === "zh" ? "大师型" : "Expert", deposit: "฿1,000", emoji: "👑", stars: "⭐⭐⭐⭐⭐", desc: locale === "th" ? "ผู้เชี่ยวชาญระดับสูง" : locale === "zh" ? "高级专家" : "Senior expert" },
              ].map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, tier: tier.value }))}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    form.tier === tier.value
                      ? "border-sky-500 bg-white shadow-lg ring-2 ring-sky-300 scale-105"
                      : "border-gray-200 bg-white hover:border-sky-300 hover:shadow"
                  }`}
                >
                  <span className="text-xl block">{tier.emoji}</span>
                  <span className="text-sm font-bold block mt-1">{tier.label}</span>
                  <span className="text-xs text-gray-500 block">{tier.stars}</span>
                  <span className="text-sm font-extrabold text-sky-700 block mt-1">{tier.deposit}</span>
                  <span className="text-[10px] text-gray-400 block">{tier.desc}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {/* Location */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {t("locationHome")}
            </legend>
            <div className="space-y-4">
              {/* GPS Auto-detect */}
              <GpsDetectButton onDetected={(coords) => setGpsCoords(coords)} />
              {gpsCoords && (
                <p className="text-xs text-green-600">
                  📍 {locale === "th" ? "ตำแหน่ง" : locale === "zh" ? "位置" : "Location"}: {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
                </p>
              )}

              {/* Location type toggle */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="locationType"
                    value="dropdown"
                    checked={form.locationType === "dropdown"}
                    onChange={handleChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  {locale === "th" ? "เลือกจากรายการ" : locale === "zh" ? "从列表选择" : "Select from list"}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="locationType"
                    value="address"
                    checked={form.locationType === "address"}
                    onChange={handleChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  {locale === "th" ? "กรอกที่อยู่ / รหัสไปรษณีย์" : locale === "zh" ? "输入地址 / 邮政编码" : "Enter address / postal code"}
                </label>
              </div>

              {form.locationType === "dropdown" ? (
                <><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === "th" ? "จังหวัด" : locale === "zh" ? "府" : "Province"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="province"
                      name="province"
                      required
                      value={form.province}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">-- {locale === "th" ? "เลือกจังหวัด" : locale === "zh" ? "选择府" : "Select Province"} --</option>
                      {THAI_PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === "th" ? "อำเภอ/เขต" : locale === "zh" ? "县/区" : "District"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="district"
                      name="district"
                      required
                      value={form.district}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">-- {locale === "th" ? "เลือกอำเภอ/เขต" : locale === "zh" ? "选择县/区" : "Select District"} --</option>
                      {getDistrictsForProvince(form.province).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="subdistrict" className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === "th" ? "ตำบล/แขวง" : locale === "zh" ? "乡/镇" : "Sub-district"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="subdistrict"
                      name="subdistrict"
                      required
                      value={form.subdistrict}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">-- {locale === "th" ? "เลือกตำบล/แขวง" : locale === "zh" ? "选择乡/镇" : "Select Sub-district"} --</option>
                      {getSubdistrictsForDistrict(form.province, form.district).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === "th" ? "รหัสไปรษณีย์" : locale === "zh" ? "邮政编码" : "Postal Code"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      required
                      maxLength={5}
                      value={form.postalCode}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="10260"
                    />
                  </div>
                </div>
                {/* Detailed Thai Address Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="houseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === "th" ? "บ้านเลขที่" : locale === "zh" ? "门牌号" : "House No."}
                    </label>
                    <input id="houseNumber" name="houseNumber" type="text" value={form.houseNumber} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="123/45" />
                  </div>
                  <div>
                    <label htmlFor="building" className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === "th" ? "อาคาร / ชั้น" : locale === "zh" ? "建筑 / 楼层" : "Building / Floor"}
                    </label>
                    <div className="flex gap-2">
                      <input id="building" name="building" type="text" value={form.building} onChange={handleChange} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={locale === "th" ? "อาคาร A" : locale === "zh" ? "A栋" : "Building A"} />
                      <input id="floor" name="floor" type="text" value={form.floor} onChange={handleChange} className="w-20 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={locale === "th" ? "ชั้น" : locale === "zh" ? "楼层" : "Fl."} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="road" className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === "th" ? "ถนน" : locale === "zh" ? "路" : "Road"}
                    </label>
                    <input id="road" name="road" type="text" value={form.road} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={locale === "th" ? "ถนนสุขุมวิท" : locale === "zh" ? "素坤逸路" : "Sukhumvit Road"} />
                  </div>
                  <div>
                    <label htmlFor="soi" className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === "th" ? "ซอย" : locale === "zh" ? "巷" : "Soi"}
                    </label>
                    <input id="soi" name="soi" type="text" value={form.soi} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={locale === "th" ? "ซอย 21" : locale === "zh" ? "21巷" : "Soi 21"} />
                  </div>
                </div>
              </>) : (
                <div>
                  <label htmlFor="addressText" className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === "th" ? "ที่อยู่ หรือ รหัสไปรษณีย์" : locale === "zh" ? "地址或邮政编码" : "Address or Postal Code"} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="addressText"
                    name="addressText"
                    required
                    rows={3}
                    value={form.addressText}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    placeholder={locale === "th" ? "กรอกที่อยู่เต็ม หรือ รหัสไปรษณีย์" : locale === "zh" ? "输入完整地址或邮政编码" : "Enter full address or postal code"}
                  />
                </div>
              )}
            </div>
          </fieldset>

          {/* Description & Images */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {t("issueDetails")}
            </legend>
            <div className="space-y-4">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "รายละเอียดบริการ" : locale === "zh" ? "服务详情" : "Service Description"} <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  placeholder={locale === "th" ? "อธิบายปัญหาหรือบริการที่ต้องการ เช่น ท่อน้ำรั่วในห้องน้ำชั้น 2" : locale === "zh" ? "请描述问题或所需服务" : "Describe the issue or service needed, e.g. leaking pipe in 2nd floor bathroom"}
                />
              </div>

              <div>
                <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "อัพโหลดรูปภาพปัญหา" : locale === "zh" ? "上传问题照片" : "Upload Photos of Issue"} <span className="text-red-500">*</span>
                </label>
                <input
                  id="images"
                  name="images"
                  type="file"
                  accept="image/*"
                  multiple
                  required={images.length === 0}
                  onChange={handleImageChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-1 text-xs text-gray-400">{locale === "th" ? "สูงสุด 5 รูป — เลือกทีละรูปหรือหลายรูปได้" : locale === "zh" ? "最多5张照片" : "Max 5 photos — select one or multiple"}</p>
                {images.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {images.map((file, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-gray-600 truncate">{file.name}</span>
                        <button type="button" onClick={() => removeImage(i)} className="text-red-500 hover:text-red-700 ml-2 font-bold">✕</button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500">{images.length}/5 {locale === "th" ? "ไฟล์" : locale === "zh" ? "文件" : "files"}</p>
                  </div>
                )}
              </div>
            </div>
          </fieldset>

          {/* Consent & Submit */}
          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <input
                id="consent"
                name="consent"
                type="checkbox"
                checked={form.consent}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="consent" className="text-sm text-gray-600">
                {locale === "th" ? (
                  <>ข้าพเจ้ายินยอมให้ CBLUE ติดต่อกลับเพื่อให้บริการ และยอมรับ{" "}<a href="/terms" className="text-blue-600 hover:underline">เงื่อนไขการใช้งาน</a>{" "}และ{" "}<a href="/privacy" className="text-blue-600 hover:underline">นโยบายความเป็นส่วนตัว</a></>
                ) : locale === "zh" ? (
                  <>我同意 CBLUE 联系我以提供服务，并接受{" "}<a href="/terms" className="text-blue-600 hover:underline">服务条款</a>{" "}和{" "}<a href="/privacy" className="text-blue-600 hover:underline">隐私政策</a></>
                ) : (
                  <>I consent to CBLUE contacting me to provide services and accept the{" "}<a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>{" "}and{" "}<a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a></>
                )}
              </label>
            </div>

            <ReCaptcha onVerify={handleRecaptcha} onExpire={handleRecaptchaExpire} />

            <button
              type="submit"
              disabled={submitting || !form.consent || !recaptchaToken}
              className={`w-full py-3 px-6 text-base font-semibold rounded-xl transition-colors ${
                form.consent && recaptchaToken
                  ? "text-white bg-blue-700 hover:bg-blue-800"
                  : "text-gray-400 bg-gray-200 cursor-not-allowed"
              }`}
            >
              {submitting ? t("submitting") : t("submitHousehold")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
