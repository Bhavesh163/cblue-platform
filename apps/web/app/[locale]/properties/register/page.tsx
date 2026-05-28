"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { THAI_PROVINCES } from "../../lib/constants";
import { getDistrictsForProvince } from "../../lib/thai-address-data";
import { getSubdistrictsForDistrict, lookupByPostalCode } from "../../lib/thai-subdistrict-data";
import GpsDetectButton from "../../components/GpsDetectButton";
import { clearSubscriberSession, refreshSubscriberSession } from "../../../../lib/subscriberSession";
const PROPERTY_TYPES = ["CONDO", "HOUSE", "TOWNHOUSE", "LAND", "COMMERCIAL", "APARTMENT", "OFFICE", "WAREHOUSE", "SHOPHOUSE"] as const;



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
  const [propImages, setPropImages] = useState<File[]>([]);
  const sessionExpiredMessage = locale === "th"
    ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้งแล้วส่งรายการใหม่"
    : locale === "zh"
    ? "登录已过期。请重新登录后再提交房源。"
    : "Your session expired. Please log in again before submitting the property.";

  // Compress an image File to ≤0.3 MB base64 data URL
  async function compressPropertyImage(file: File): Promise<string> {
    const maybeConvertHeicToJpeg = async (input: File): Promise<File> => {
      const mime = String(input.type || "").toLowerCase();
      const isHeic = mime.includes("heic") || mime.includes("heif") || /\.(heic|heif)$/i.test(input.name || "");
      if (!isHeic) return input;

      try {
        const mod = await import("heic2any");
        const heic2any = (mod.default || mod) as (opts: { blob: Blob; toType: string; quality?: number }) => Promise<Blob | Blob[]>;
        const converted = await heic2any({
          blob: input,
          toType: "image/jpeg",
          quality: 0.9,
        });
        const outputBlob = Array.isArray(converted) ? converted[0] : converted;
        if (!outputBlob) return input;
        const basename = (input.name || "image").replace(/\.(heic|heif)$/i, "") || "image";
        return new File([outputBlob], `${basename}.jpg`, { type: "image/jpeg" });
      } catch {
        return input;
      }
    };

    const sourceFile = await maybeConvertHeicToJpeg(file);

    if (!sourceFile.type.startsWith("image/")) {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(sourceFile);
      });
    }
    const TARGET = 300000; // keep payload modest while remaining under 0.3 MB target
    const passes = [
      { maxDim: 1200, quality: 0.70 },
      { maxDim: 900, quality: 0.60 },
      { maxDim: 700, quality: 0.50 },
      { maxDim: 560, quality: 0.42 },
    ];
    return new Promise<string>((resolve) => {
      const img = document.createElement("img");
      const url = URL.createObjectURL(sourceFile);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let result = "";
        const tryPass = (idx: number) => {
          if (idx >= passes.length) { resolve(result || ""); return; }
          const pass = passes[idx]!;
          const scale = Math.min(1, pass.maxDim / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          const data = canvas.toDataURL("image/jpeg", pass.quality);
          result = data;
          if (data.length <= TARGET || idx === passes.length - 1) { resolve(data); return; }
          tryPass(idx + 1);
        };
        tryPass(0);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || "");
        reader.onerror = () => resolve("");
        reader.readAsDataURL(sourceFile);
      };
      img.src = url;
    });
  }

  function normalizeImageDataUrl(raw: string): string {
    const value = (raw || "").trim();
    if (!value) return "";
    if (!value.startsWith("data:")) return value;

    // Repair a common truncated prefix typo (e.g. data:image/jpeg;bas...)
    const fixedPrefix = value.includes(";base64,")
      ? value
      : value.replace(/;bas(?!e64,)/i, ";base64,");

    const isValidDataUrl = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+$/.test(fixedPrefix);
    return isValidDataUrl ? fixedPrefix : "";
  }

  function handlePropImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setPropImages((prev) => {
      const combined = [...prev, ...newFiles].slice(0, 5);
      return combined;
    });
    e.target.value = "";
  }

  useEffect(() => {
    let active = true;
    async function syncStoredSession() {
      try {
        const stored = localStorage.getItem("subscriber");
        const token = localStorage.getItem("subscriber_token");
        if (!stored || !token) {
          if (stored || token) clearSubscriberSession();
          if (active) setSubscriber(null);
          return;
        }

        const parsed = JSON.parse(stored);
        if (!active) return;
        setSubscriber(parsed);
        setForm((prev) => ({
          ...prev,
          contactName: parsed.name || prev.contactName,
          contactEmail: parsed.email || prev.contactEmail,
        }));

        const refreshedToken = await refreshSubscriberSession(token);
        if (!refreshedToken && active) {
          setSubscriber(null);
        }
      } catch {
        clearSubscriberSession();
        if (active) setSubscriber(null);
      }
    }

    void syncStoredSession();
    return () => {
      active = false;
    };
  }, []);

  const [form, setForm] = useState({
    propertyType: "",
    listingType: "",
    tier: "STANDARD",
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
    CONDO: "🏢 condo",
    HOUSE: "🏠 house",
    TOWNHOUSE: "🏡 townhouse",
    LAND: "🌳 land",
    COMMERCIAL: "🏬 commercial",
    OFFICE: "💼 office",
    APARTMENT: "🏢 apartment",
    WAREHOUSE: "🏭 warehouse",
    SHOPHOUSE: "🏬 shophouse",
    FACTORY: "🏭 factory"
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

    if (!form.propertyType || !form.listingType || !form.title || !form.price ||
        (locationType !== "gps" && !form.province) ||
        (locationType === "gps" && !gpsCoords)) {
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
          const msg = Array.isArray(errData.message) ? errData.message.join(", ") : errData.message || (locale === "th" ? "เข้าสู่ระบบ/สมัครสมาชิกล้มเหลว" : locale === "zh" ? "登录/注册失败" : "Login/Register failed");
          setError(msg);
          return;
        }
        const authData = await authRes.json();
        localStorage.setItem("subscriber_token", authData.accessToken);
        localStorage.setItem("subscriber", JSON.stringify(authData.subscriber));
        setSubscriber(authData.subscriber);
        window.dispatchEvent(new Event("storage"));
      } catch {
        setError(locale === "th" ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" : locale === "zh" ? "无法连接服务器" : "Cannot connect to server");
        return;
      }
    }

    setSubmitting(true);
    try {
      // Compose address fields not in DTO into addressLine
      const addressParts = [
        form.houseNumber,
        form.building ? `Bldg ${form.building}` : "",
        form.floor ? `Fl.${form.floor}` : "",
        form.soi ? `Soi ${form.soi}` : "",
        form.road,
        form.addressLine,
      ].filter(Boolean).join(" ");

      const payload = {
        propertyType: form.propertyType,
        listingType: form.listingType,
        tier: form.tier || 'STANDARD',
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        area: form.area ? parseFloat(form.area) : undefined,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : undefined,
        floors: form.floors ? parseInt(form.floors) : undefined,
        yearBuilt: form.yearBuilt ? parseInt(form.yearBuilt) : undefined,
        province: form.province || undefined,
        district: form.district || undefined,
        subdistrict: (form.subdistrict && !form.subdistrict.startsWith('--')) ? form.subdistrict : undefined,
        postalCode: form.postalCode || undefined,
        addressLine: addressParts || undefined,
        latitude: gpsCoords?.lat,
        longitude: gpsCoords?.lng,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
      };

      // Compress and attach property images
      let compressedImages: { url: string; key: string }[] = [];
      if (propImages.length > 0) {
        try {
          compressedImages = (await Promise.all(
            propImages.map(async (f, idx) => {
              const url = normalizeImageDataUrl(await compressPropertyImage(f));
              return url ? { url, key: `property/upload/image-${idx + 1}` } : null;
            })
          )).filter(Boolean) as { url: string; key: string }[];
        } catch { /* non-blocking */ }
      }

      const storedToken = typeof window !== "undefined" ? localStorage.getItem("subscriber_token") : null;
      const refreshedToken = storedToken ? await refreshSubscriberSession(storedToken) : null;
      if (storedToken && !refreshedToken) {
        setSubscriber(null);
        setError(sessionExpiredMessage);
        return;
      }
      let token = refreshedToken || storedToken;
      if (!token) {
        setSubscriber(null);
        setError(sessionExpiredMessage);
        return;
      }
      const requestBodyWithImages = JSON.stringify({ ...payload, ...(compressedImages.length > 0 ? { images: compressedImages } : {}) });
      const submitListing = (authToken: string | null, body: string) => fetch("/api/v1/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body,
      });

      let res = await submitListing(token, requestBodyWithImages);
      if (!res.ok && [401, 403].includes(res.status)) {
        const retriedToken = await refreshSubscriberSession(token);
        if (!retriedToken) {
          setSubscriber(null);
          setError(sessionExpiredMessage);
          return;
        }
        token = retriedToken;
        res = await submitListing(token, requestBodyWithImages);
      }

      if (res.ok) {
        setSubmitted(true);
      } else {
        const contentType = res.headers.get("content-type") || "";
        const rawText = await res.text().catch(() => "");
        let msg = "";
        if (contentType.includes("application/json")) {
          try {
            const errData = JSON.parse(rawText || "{}");
            msg = Array.isArray(errData?.message)
              ? errData.message.join(", ")
              : errData?.message || "";
          } catch {
            msg = "";
          }
        }
        if (!msg && rawText) {
          msg = rawText.replace(/<[^>]+>/g, "").trim();
        }
        setError(msg || tb("submitError"));
      }
    } catch {
      setError(tb("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-lg text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{locale === "th" ? "ลงประกาศสำเร็จ" : "Listing Published"}</h2>
          <p className="text-gray-600 mb-8">{locale === "th" ? "อสังหาริมทรัพย์ของคุณได้รับการเผยแพร่ในระบบแล้ว ผู้เช่าหรือผู้ซื้อสามารถติดต่อคุณได้ทันที" : "Your property is now live and visible to potential tenants or buyers."}</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => { setSubmitted(false); setForm({
      propertyType: "", listingType: "", tier: "STANDARD", title: "", description: "", price: "", area: "",
      bedrooms: "", bathrooms: "", floors: "", yearBuilt: "", houseNumber: "", floor: "", building: "", road: "", soi: "",
      province: "", district: "", subdistrict: "", postalCode: "", addressLine: "",
      contactName: "", contactEmail: "", contactPhone: "",
      password: "", confirmPassword: ""
    }); window.scrollTo(0,0); }} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition shadow-sm">
              {locale === "th" ? "ลงประกาศเพิ่ม" : "List Another"}
            </button>
            <Link href={`${prefix}/fixers`} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition">
              {locale === "th" ? "ไปที่หน้าแดชบอร์ด" : "Go to Dashboard"}
            </Link>
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
          <form onSubmit={handleSubmit}  className="space-y-8">

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
                      <input type="password" name="password" value={form.password} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="••••••••" />
                    </div>
                    {authMode === "register" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {locale === "th" ? "ยืนยันรหัสผ่าน" : locale === "zh" ? "确认密码" : "Confirm Password"} <span className="text-red-500">*</span>
                        </label>
                        <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" placeholder="••••••••" />
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

                {/* Service Tier — Lister sets this; fee charged to interested buyer/renter */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === "th" ? "ระดับบริการ (กำหนดโดยผู้ลงประกาศ)" : locale === "zh" ? "服务等级（由发布者设定）" : "Service Tier (Set by Lister)"} <span className="text-red-500">{tc("required")}</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { value: 'ECONOMY',  fee: 100,  label: 'Economy' },
                      { value: 'STANDARD', fee: 400,  label: 'Standard' },
                      { value: 'UPPER',    fee: 600,  label: 'Upper' },
                      { value: 'LUXURY',   fee: 800,  label: 'Luxury' },
                      { value: 'GRANDEUR', fee: 1000, label: 'Grandeur' },
                    ].map((tier) => (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, tier: tier.value }))}
                        className={`flex flex-col items-center p-3 rounded-xl border-2 text-center transition ${form.tier === tier.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
                      >
                        <span className="font-bold text-gray-900 text-sm">{tier.label}</span>
                        <span className="font-extrabold text-green-700 text-sm mt-1">฿{tier.fee}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                    {locale === 'th' ? '฿ = ค่าดำเนินการที่ผู้สนใจจ่ายให้ CBLUE เพื่อติดต่อคุณ ราคาทรัพย์สินตกลงโดยตรงระหว่างคู่สัญญา' : locale === 'zh' ? '฿ = 感兴趣的买家/租客支付给CBLUE的处理费，以便联系您。房产价格由双方直接协商。' : '฿ = processing fee paid by interested buyer/renter to CBLUE to contact you. Property price is agreed directly between parties.'}
                  </p>
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
                    name="area" required
                    value={form.area}
                    onChange={handleChange}
                    min="0"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("bedrooms")} <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="bedrooms" required
                    value={form.bedrooms}
                    onChange={handleChange}
                    min="0"
                    max="50"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>

                {/* Bathrooms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("bathrooms")} <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="bathrooms" required
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
                    name="floors" required
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "บ้านเลขที่" : locale === "zh" ? "门牌号" : "House No."} <span className="text-red-500">*</span></label>
                      <input type="text" name="houseNumber" required value={form.houseNumber} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500" placeholder="123/45" />
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
                      <input type="text" name="road" required value={form.road} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500" placeholder={locale === "th" ? "ถนนสุขุมวิท" : locale === "zh" ? "素坤逸路" : "Sukhumvit Road"} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "ซอย" : locale === "zh" ? "巷" : "Soi"}</label>
                      <input type="text" name="soi" required value={form.soi} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500" placeholder={locale === "th" ? "ซอย 21" : locale === "zh" ? "21巷" : "Soi 21"} />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("contactName")} <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="contactName" required
                    value={form.contactName}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tb("phone")} <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    inputMode="tel"
                    name="contactPhone" required
                    value={form.contactPhone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tb("email")} <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    inputMode="email"
                    name="contactEmail" required
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
                  onChange={handlePropImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                <p className="mt-1 text-xs text-gray-400">
                  {locale === "th" ? "สูงสุด 5 รูป · บีบอัดอัตโนมัติเป็น ≤0.3 MB ต่อไฟล์" : locale === "zh" ? "最多 5 张 · 自动压缩至每张 ≤0.3 MB" : "Up to 5 photos · auto-compressed to ≤0.3 MB each"}
                </p>
                {propImages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {propImages.map((f, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPropImages((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none flex items-center justify-center"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
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
                  <a href={`${prefix}/terms`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{tb("terms")}</a>{" "}
                  {tc("and")}{" "}
                  <a href={`${prefix}/privacy`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{tb("privacy")}</a>
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
