"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { THAI_PROVINCES } from "../../lib/constants";
import { getDistrictsForProvince } from "../../lib/thai-address-data";
import { getSubdistrictsForDistrict, lookupByPostalCode } from "../../lib/thai-subdistrict-data";
import GpsDetectButton from "../../components/GpsDetectButton";

const PROPERTY_TYPES = ["CONDO", "HOUSE", "TOWNHOUSE", "LAND", "COMMERCIAL", "APARTMENT"] as const;



export default function PropertyRegisterPage() {
  const t = useTranslations("realEstate");
  const tb = useTranslations("booking");
  const tc = useTranslations("common");
  const locale = useLocale();
  const prefix = `/${locale}`;

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationType, setLocationType] = useState<"gps" | "dropdown" | "address">("dropdown");
  const [subscriber, setSubscriber] = useState<{ name: string; email?: string; role?: string } | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("subscriber");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSubscriber(parsed);
        // Auto-fill contact info from existing session
        setForm((prev) => ({
          ...prev,
          contactName: parsed.name || prev.contactName,
          contactEmail: parsed.email || prev.contactEmail,
        }));
      }
    } catch { /* ignore */ }
  }, []);

  const [form, setForm] = useState({
    propertyType: "",
    listingType: "",
    title: "",
    description: "",
    price: "",
    area: "",
    bedrooms: "",
    bathrooms: "",
    floors: "",
    yearBuilt: "",
    province: "",
    district: "",
    subdistrict: "",
    postalCode: "",
    houseNumber: "",
    building: "",
    floor: "",
    road: "",
    soi: "",
    addressLine: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    password: "",
    confirmPassword: "",
  });

  const typeKeys: Record<string, string> = {
    CONDO: "condo",
    HOUSE: "house",
    TOWNHOUSE: "townhouse",
    LAND: "land",
    COMMERCIAL: "commercial",
    APARTMENT: "apartment",
  };

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    if (name === "district") {
      setForm((prev) => ({ ...prev, district: value, subdistrict: "" }));
    } else if (name === "postalCode") {
      setForm((prev) => {
        const next = { ...prev, postalCode: value };
        if (value.length === 5) {
          const found = lookupByPostalCode(value);
          if (found) { next.province = found.province; next.district = found.district; next.subdistrict = ""; }
        }
        return next;
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!consentChecked) {
      setError(tb("consentError"));
      return;
    }

    if (!form.propertyType || !form.listingType || !form.title || !form.price || !form.province) {
      setError(tc("error"));
      return;
    }

    // Inline auth — if not logged in, validate & create/login account via backend
    if (!subscriber) {
      if (!form.contactEmail || !/\S+@\S+\.\S+/.test(form.contactEmail)) {
        setError(locale === "th" ? "กรุณากรอกอีเมลที่ถูกต้อง" : locale === "zh" ? "请输入有效的电子邮件" : "Please enter a valid email address");
        return;
      }
      if (!form.password || form.password.length < 8) {
        setError(locale === "th" ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : locale === "zh" ? "密码至少8个字符" : "Password must be at least 8 characters");
        return;
      }
      if (authMode === "register" && form.password !== form.confirmPassword) {
        setError(locale === "th" ? "รหัสผ่านไม่ตรงกัน" : locale === "zh" ? "密码不匹配" : "Passwords do not match");
        return;
      }
      try {
        const endpoint = authMode === "login" ? "/api/v1/subscription/login" : "/api/v1/subscription/register";
        const body = authMode === "login"
          ? { email: form.contactEmail.toLowerCase(), password: form.password }
          : { name: form.contactName || form.contactEmail, email: form.contactEmail.toLowerCase(), phone: form.contactPhone, password: form.password };
        const authRes = await fetch(`${endpoint}`, {
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

    setSubmitting(true);
    try {
      const payload = {
        propertyType: form.propertyType,
        listingType: form.listingType,
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        area: form.area ? parseFloat(form.area) : undefined,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : undefined,
        floors: form.floors ? parseInt(form.floors) : undefined,
        yearBuilt: form.yearBuilt ? parseInt(form.yearBuilt) : undefined,
        province: form.province,
        district: form.district,
        subdistrict: form.subdistrict,
        postalCode: form.postalCode,
        houseNumber: form.houseNumber || undefined,
        building: form.building || undefined,
        floor: form.floor || undefined,
        road: form.road || undefined,
        soi: form.soi || undefined,
        addressLine: form.addressLine,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        ...(form.password ? { password: form.password } : {}),
      };

      const res = await fetch(`/api/v1/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(tb("submitError"));
      }
    } catch {
      setError(tb("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center bg-white rounded-2xl shadow p-10">
          <div className="text-5xl mb-4">🏠</div>
          <h1 className="text-2xl font-bold text-green-700">
            {tc("success")}!
          </h1>
          <p className="mt-3 text-gray-600">
            {t("registerDesc")}
          </p>
          <div className="flex gap-4 justify-center mt-6">
            <Link
              href={`${prefix}/properties`}
              className="px-6 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition"
            >
              {t("searchProperty")}
            </Link>
            <button
              onClick={() => {
                setSubmitted(false);
                setForm({
                  propertyType: "", listingType: "", title: "", description: "", price: "", area: "",
                  bedrooms: "", bathrooms: "", floors: "", yearBuilt: "", province: "", district: "",
                  subdistrict: "", postalCode: "", houseNumber: "", building: "", floor: "", road: "", soi: "",
                  addressLine: "", contactName: "", contactPhone: "", contactEmail: "",
                  password: "", confirmPassword: "",
                });
                setConsentChecked(false);
              }}
              className="px-6 py-2.5 rounded-xl border border-green-700 text-green-700 text-sm font-semibold hover:bg-green-50 transition"
            >
              {t("listProperty")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Scenic Hero */}
      <div className="relative overflow-hidden">
        <Image src="/images/scenic-house.jpg" alt="" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/90 to-emerald-800/75" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-14 text-center">
          <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur text-green-200 rounded-full text-sm font-bold mb-4 border border-white/20">🏠 {locale === "th" ? "ลงประกาศอสังหาริมทรัพย์" : locale === "zh" ? "发布房产" : "List Property"}</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">{t("registerTitle")}</h1>
          <p className="mt-3 text-green-100">{t("registerDesc")}</p>
          <div className="w-20 h-1 bg-white/50 mx-auto rounded-full mt-5" />
        </div>
      </div>

      {/* Form */}
      <section className="py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Account Authentication — Inline Login / Register */}
            <fieldset className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
              <legend className="text-lg font-semibold text-gray-900 px-2">
                {locale === "th" ? "🔐 เข้าสู่ระบบ / สร้างบัญชี (จำเป็น)" : locale === "zh" ? "🔐 登录/创建账户（必填）" : "🔐 Login / Create Account (Required)"}
              </legend>
              {subscriber ? (
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-lg font-bold">✓</div>
                  <div>
                    <p className="font-semibold text-green-700">{locale === "th" ? "เข้าสู่ระบบแล้ว" : locale === "zh" ? "已登录" : "Logged In"}</p>
                    <p className="text-sm text-gray-500">{subscriber.name}{subscriber.email ? ` (${subscriber.email})` : ""}</p>
                  </div>
                  <button type="button" onClick={() => { localStorage.removeItem("subscriber"); localStorage.removeItem("subscriber_token"); setSubscriber(null); }} className="ml-auto text-xs text-gray-400 hover:text-red-500">
                    {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出" : "Log Out"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 mt-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAuthMode("login")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${authMode === "login" ? "bg-green-700 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                      {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Login"}
                    </button>
                    <button type="button" onClick={() => setAuthMode("register")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${authMode === "register" ? "bg-green-700 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
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
                      <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="••••••••" />
                    </div>
                    {authMode === "register" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {locale === "th" ? "ยืนยันรหัสผ่าน" : locale === "zh" ? "确认密码" : "Confirm Password"} <span className="text-red-500">*</span>
                        </label>
                        <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required minLength={8} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="••••••••" />
                      </div>
                    )}
                  </div>
                  {authMode === "login" && (
                    <Link href={`${prefix}/subscription/forgot-password`} className="text-xs text-green-700 hover:underline">
                      {locale === "th" ? "ลืมรหัสผ่าน?" : locale === "zh" ? "忘记密码？" : "Forgot password?"}
                    </Link>
                  )}
                </div>
              )}
            </fieldset>

            {/* Property Details */}
            <fieldset className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <legend className="text-lg font-semibold text-gray-900 px-2">{t("details")}</legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {/* Property Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("propertyType")} <span className="text-red-500">{tc("required")}</span>
                  </label>
                  <select
                    name="propertyType"
                    value={form.propertyType}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white outline-none focus:border-green-500"
                  >
                    <option value="">--</option>
                    {PROPERTY_TYPES.map((pt) => (
                      <option key={pt} value={pt}>{t(`types.${typeKeys[pt]}`)}</option>
                    ))}
                  </select>
                </div>

                {/* Listing Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("listingType")} <span className="text-red-500">{tc("required")}</span>
                  </label>
                  <select
                    name="listingType"
                    value={form.listingType}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white outline-none focus:border-green-500"
                  >
                    <option value="">--</option>
                    <option value="SALE">{t("forSale")}</option>
                    <option value="RENT">{t("forRent")}</option>
                  </select>
                </div>

                {/* Title */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === "th" ? "ชื่อประกาศ" : locale === "zh" ? "标题" : "Title"} <span className="text-red-500">{tc("required")}</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {tb("description")}
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("price")} (฿) <span className="text-red-500">{tc("required")}</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    required
                    min="0"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>

                {/* Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("area")}</label>
                  <input
                    type="number"
                    name="area"
                    value={form.area}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("bedrooms")}</label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={form.bedrooms}
                    onChange={handleChange}
                    min="0"
                    max="50"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>

                {/* Bathrooms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("bathrooms")}</label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={form.bathrooms}
                    onChange={handleChange}
                    min="0"
                    max="50"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>

                {/* Floors */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === "th" ? "จำนวนชั้น" : locale === "zh" ? "楼层数" : "Floors"}
                  </label>
                  <input
                    type="number"
                    name="floors"
                    value={form.floors}
                    onChange={handleChange}
                    min="1"
                    max="100"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>

                {/* Year Built */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === "th" ? "ปีที่สร้าง" : locale === "zh" ? "建造年份" : "Year Built"}
                  </label>
                  <input
                    type="number"
                    name="yearBuilt"
                    value={form.yearBuilt}
                    onChange={handleChange}
                    min="1900"
                    max={new Date().getFullYear() + 5}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>
            </fieldset>

            {/* Location */}
            <fieldset className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <legend className="text-lg font-semibold text-gray-900 px-2">
                {tb("location")}
              </legend>

              <div className="space-y-4 mt-4">
                {/* Location method selector — 3 mutually exclusive options */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="locationType" value="gps" checked={locationType === "gps"} onChange={() => setLocationType("gps")} className="text-green-600 focus:ring-green-500" />
                    📍 {locale === "th" ? "ตรวจจับตำแหน่งอัตโนมัติ (GPS)" : locale === "zh" ? "自动检测位置 (GPS)" : "Auto-detect Location (GPS)"}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="locationType" value="dropdown" checked={locationType === "dropdown"} onChange={() => setLocationType("dropdown")} className="text-green-600 focus:ring-green-500" />
                    {locale === "th" ? "เลือกจากรายการ" : locale === "zh" ? "从列表选择" : "Select from list"}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="locationType" value="address" checked={locationType === "address"} onChange={() => setLocationType("address")} className="text-green-600 focus:ring-green-500" />
                    {locale === "th" ? "กรอกที่อยู่ / รหัสไปรษณีย์" : locale === "zh" ? "输入地址/邮政编码" : "Enter address / postal code"}
                  </label>
                </div>

                {/* GPS mode */}
                {locationType === "gps" && (
                  <div className="space-y-2">
                    <GpsDetectButton onDetected={(coords) => setGpsCoords(coords)} />
                    {gpsCoords ? (
                      <p className="text-sm text-green-600 font-medium">
                        ✅ 📍 {locale === "th" ? "ตำแหน่ง" : locale === "zh" ? "位置" : "Location"}: {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        {locale === "th" ? "กดปุ่มด้านบนเพื่อตรวจจับตำแหน่งอัตโนมัติ" : locale === "zh" ? "点击上方按钮自动检测位置" : "Click the button above to auto-detect your location"}
                      </p>
                    )}
                  </div>
                )}

                {/* Dropdown mode */}
                {locationType === "dropdown" && (
                  <><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Province */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {tb("province")} <span className="text-red-500">{tc("required")}</span>
                      </label>
                      <select
                        name="province"
                        value={form.province}
                        onChange={(e) => {
                          setForm({ ...form, province: e.target.value, district: "", subdistrict: "" });
                        }}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white outline-none focus:border-green-500"
                      >
                        <option value="">{tb("selectProvince")}</option>
                        {THAI_PROVINCES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    {/* District - cascading */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{tb("district")}</label>
                      <select
                        name="district"
                        value={form.district}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white outline-none focus:border-green-500"
                      >
                        <option value="">{locale === "th" ? "-- เลือกอำเภอ/เขต --" : locale === "zh" ? "-- 选择县/区 --" : "-- Select District --"}</option>
                        {getDistrictsForProvince(form.province).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subdistrict */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{tb("subdistrict")}</label>
                      <select
                        name="subdistrict"
                        value={form.subdistrict}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white outline-none focus:border-green-500"
                      >
                        <option value="">{locale === "th" ? "-- เลือกตำบล/แขวง --" : locale === "zh" ? "-- 选择乡/镇 --" : "-- Select Sub-district --"}</option>
                        {getSubdistrictsForDistrict(form.province, form.district).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Postal Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{tb("postalCode")}</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={form.postalCode}
                        onChange={handleChange}
                        maxLength={5}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                  {/* Detailed Thai Address Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "บ้านเลขที่" : locale === "zh" ? "门牌号" : "House No."}</label>
                      <input type="text" name="houseNumber" value={form.houseNumber} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500" placeholder="123/45" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "อาคาร / ชั้น" : locale === "zh" ? "建筑 / 楼层" : "Building / Floor"}</label>
                      <div className="flex gap-2">
                        <input type="text" name="building" value={form.building} onChange={handleChange} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500" placeholder={locale === "th" ? "อาคาร A" : locale === "zh" ? "A栋" : "Building A"} />
                        <input type="text" name="floor" value={form.floor} onChange={handleChange} className="w-20 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500" placeholder={locale === "th" ? "ชั้น" : locale === "zh" ? "楼层" : "Fl."} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "ถนน" : locale === "zh" ? "路" : "Road"}</label>
                      <input type="text" name="road" value={form.road} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500" placeholder={locale === "th" ? "ถนนสุขุมวิท" : locale === "zh" ? "素坤逸路" : "Sukhumvit Road"} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "ซอย" : locale === "zh" ? "巷" : "Soi"}</label>
                      <input type="text" name="soi" value={form.soi} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500" placeholder={locale === "th" ? "ซอย 21" : locale === "zh" ? "21巷" : "Soi 21"} />
                    </div>
                  </div>
                </>)}

                {/* Address text mode */}
                {locationType === "address" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Address Line */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {tb("addressText")}
                      </label>
                      <input
                        type="text"
                        name="addressLine"
                        value={form.addressLine}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                      />
                    </div>

                    {/* Postal Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{tb("postalCode")}</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={form.postalCode}
                        onChange={handleChange}
                        maxLength={5}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </fieldset>

            {/* Contact */}
            <fieldset className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <legend className="text-lg font-semibold text-gray-900 px-2">
                {tb("contactInfo")}
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("contactName")}</label>
                  <input
                    type="text"
                    name="contactName"
                    value={form.contactName}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tb("phone")}</label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={form.contactPhone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tb("email")}</label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={form.contactEmail}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>
            </fieldset>

            {/* Images */}
            <fieldset className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <legend className="text-lg font-semibold text-gray-900 px-2">{t("images")}</legend>
              <div className="mt-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
              </div>
            </fieldset>

            {/* Consent & Submit */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-600">
                  {tb("consent")}{" "}
                  <a href="#" className="text-blue-600 underline">{tb("terms")}</a>{" "}
                  {tc("and")}{" "}
                  <a href="#" className="text-blue-600 underline">{tb("privacy")}</a>
                </span>
              </label>

              {error && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full py-3 px-6 text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:bg-gray-400 rounded-xl transition-colors"
              >
                {submitting ? tb("submitting") : t("submitListing")}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
