"use client";

import { useState, useCallback, useEffect, Suspense, type FormEvent, type ChangeEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { PROFESSIONAL_SERVICES, THAI_PROVINCES } from "../../lib/constants";
import ReCaptcha from "../../components/ReCaptcha";
import GpsDetectButton from "../../components/GpsDetectButton";

const BUDGET_RANGES = [
  { value: "UNDER_10000", label: "ต่ำกว่า 10,000 บาท" },
  { value: "10000_30000", label: "10,000 – 30,000 บาท" },
  { value: "30000_50000", label: "30,000 – 50,000 บาท" },
  { value: "50000_100000", label: "50,000 – 100,000 บาท" },
  { value: "100000_500000", label: "100,000 – 500,000 บาท" },
  { value: "OVER_500000", label: "มากกว่า 500,000 บาท" },
];

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  serviceCategory: string;
  scheduledDate: string;
  scheduledTime: string;
  locationType: "dropdown" | "address";
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
  addressText: string;
  description: string;
  budgetRange: string;
  consent: boolean;
  subscriptionConsent: boolean;
  password: string;
  confirmPassword: string;
  tier: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

const initialForm: FormData = {
  name: "",
  email: "",
  phone: "",
  company: "",
  serviceCategory: "",
  scheduledDate: "",
  scheduledTime: "",
  locationType: "dropdown",
  province: "",
  district: "",
  subdistrict: "",
  postalCode: "",
  addressText: "",
  description: "",
  budgetRange: "",
  consent: false,
  subscriptionConsent: false,
  password: "",
  confirmPassword: "",
  tier: "standard",
};

export default function ProfessionalBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" /></div>}>
      <ProfessionalBookingContent />
    </Suspense>
  );
}

function ProfessionalBookingContent() {
  const t = useTranslations("booking");
  const locale = useLocale();
  const prefix = `/${locale}`;
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
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

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
    setForm((prev) => ({ ...prev, [target.name]: value }));
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages((prev) => {
        const combined = [...prev, ...newFiles];
        return combined.slice(0, 5);
      });
      e.target.value = "";
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
      // If subscription consent is checked, validate password
      if (form.subscriptionConsent) {
        if (!form.password || form.password.length < 8) {
          setError(locale === "th" ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : "Password must be at least 8 characters");
          setSubmitting(false);
          return;
        }
        if (form.password !== form.confirmPassword) {
          setError(locale === "th" ? "รหัสผ่านไม่ตรงกัน" : "Passwords do not match");
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        orderType: "PROFESSIONAL",
        name: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        serviceCategory: form.serviceCategory,
        scheduledAt: form.scheduledDate
          ? `${form.scheduledDate}T${form.scheduledTime || "09:00"}:00`
          : undefined,
        budgetRange: form.budgetRange || undefined,
        description: form.description,
        tier: form.tier,
        address: {
          province: form.province,
          district: form.district,
          subdistrict: form.subdistrict,
          postalCode: form.postalCode,
        },
        gpsCoords: gpsCoords || undefined,
        recaptchaToken,
        imageCount: images.length,
        subscriptionConsent: form.subscriptionConsent,
      };
      console.log("Professional booking submission:", payload);

      // Auto-register subscriber if subscription consent is checked
      if (form.subscriptionConsent) {
        try {
          const regRes = await fetch(`${API_BASE}/subscription/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.name,
              email: form.email,
              phone: form.phone,
              company: form.company || undefined,
              password: form.password,
              serviceCategory: form.serviceCategory,
              description: form.description,
            }),
          });
          if (regRes.ok) {
            const data = await regRes.json();
            localStorage.setItem("subscriber_token", data.accessToken);
            localStorage.setItem("subscriber", JSON.stringify(data.subscriber));
          }
        } catch {
          // Subscription registration failed silently — booking still succeeds
        }
      }

      setSuccess(true);
    } catch {
      setError(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-3xl font-bold text-gray-900">{t("successProfessional")}</h1>
        <p className="mt-4 text-lg text-gray-600">
          {t("successProfessionalDesc")}
        </p>
        <button
          onClick={() => {
            setSuccess(false);
            setForm(initialForm);
            setImages([]);
          }}
          className="mt-8 px-6 py-2.5 text-sm font-semibold text-blue-700 border border-blue-700 rounded-lg hover:bg-blue-50"
        >
          {t("newBooking")}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("professionalTitle")}
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            {t("professionalDesc")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Personal Info */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {t("contactInfo")}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อ-นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="สมชาย ใจดี"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  อีเมล <span className="text-red-500">*</span>
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
                  เบอร์โทรศัพท์ <span className="text-red-500">*</span>
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
                  บริษัท <span className="text-red-500">*</span>
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  required
                  value={form.company}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="บริษัท ABC จำกัด"
                />
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
                  บริการที่สนใจ <span className="text-red-500">*</span>
                </label>
                <select
                  id="serviceCategory"
                  name="serviceCategory"
                  required
                  value={form.serviceCategory}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">-- เลือกบริการ --</option>
                  {PROFESSIONAL_SERVICES.map((svc) => (
                    <option key={svc.value} value={svc.value}>
                      {svc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
                    วันที่ต้องการเริ่มงาน <span className="text-red-500">*</span>
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
                    เวลา
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

              {/* Budget Range */}
              <div>
                <label htmlFor="budgetRange" className="block text-sm font-medium text-gray-700 mb-1">
                  งบประมาณโดยประมาณ
                </label>
                <select
                  id="budgetRange"
                  name="budgetRange"
                  value={form.budgetRange}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">-- ไม่ระบุ --</option>
                  {BUDGET_RANGES.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Location */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {t("locationHome")}
            </legend>
            <div className="space-y-4">
              <GpsDetectButton onDetected={(coords) => setGpsCoords(coords)} />
              {gpsCoords && (
                <p className="text-xs text-green-600">
                  📍 ตำแหน่ง: {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
                </p>
              )}

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
                  เลือกจากรายการ
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
                  กรอกที่อยู่ / รหัสไปรษณีย์
                </label>
              </div>

              {form.locationType === "dropdown" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                      จังหวัด <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="province"
                      name="province"
                      required
                      value={form.province}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">-- เลือกจังหวัด --</option>
                      {THAI_PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                      อำเภอ/เขต <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="district"
                      name="district"
                      type="text"
                      required
                      value={form.district}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="เขตบางนา"
                    />
                  </div>
                  <div>
                    <label htmlFor="subdistrict" className="block text-sm font-medium text-gray-700 mb-1">
                      ตำบล/แขวง <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="subdistrict"
                      name="subdistrict"
                      type="text"
                      required
                      value={form.subdistrict}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="แขวงบางนาใต้"
                    />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                      รหัสไปรษณีย์ <span className="text-red-500">*</span>
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
              ) : (
                <div>
                  <label htmlFor="addressText" className="block text-sm font-medium text-gray-700 mb-1">
                    ที่อยู่ หรือ รหัสไปรษณีย์ <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="addressText"
                    name="addressText"
                    required
                    rows={3}
                    value={form.addressText}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    placeholder="กรอกที่อยู่เต็ม หรือ รหัสไปรษณีย์"
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
                  รายละเอียดบริการ <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  placeholder="อธิบายรายละเอียดบริการที่ต้องการ เช่น ต้องการที่ปรึกษาด้านกฎหมายอสังหาริมทรัพย์"
                />
              </div>

              <div>
                <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-1">
                  อัพโหลดรูปภาพประกอบ <span className="text-red-500">*</span>
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
                <p className="mt-1 text-xs text-gray-400">สูงสุด 5 รูป — เลือกทีละรูปหรือหลายรูปได้</p>
                {images.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {images.map((file, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-gray-600 truncate">{file.name}</span>
                        <button type="button" onClick={() => removeImage(i)} className="text-red-500 hover:text-red-700 ml-2 font-bold">✕</button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500">{images.length}/5 ไฟล์</p>
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
                ข้าพเจ้ายินยอมให้ CBLUE ติดต่อกลับเพื่อให้บริการ
                และยอมรับ{" "}
                <button type="button" onClick={() => setShowTerms(true)} className="text-blue-600 hover:underline">
                  เงื่อนไขการใช้งาน
                </button>{" "}
                และ{" "}
                <button type="button" onClick={() => setShowPrivacy(true)} className="text-blue-600 hover:underline">
                  นโยบายความเป็นส่วนตัว
                </button>
              </label>
            </div>

            {/* Subscription consent */}
            <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-lg p-4">
              <input
                id="subscriptionConsent"
                name="subscriptionConsent"
                type="checkbox"
                checked={form.subscriptionConsent}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="subscriptionConsent" className="text-sm text-gray-700">
                {t("subscriptionConsent")}
              </label>
            </div>

            {/* Tier + Password fields (shown when subscription consent is checked) */}
            {form.subscriptionConsent && (
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale === "th" ? "เลือกระดับบริการ" : locale === "zh" ? "选择服务等级" : "Select Service Tier"} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "standard", label: "Standard", deposit: "฿200", emoji: "⭐" },
                      { value: "corporate", label: "Corporate", deposit: "฿400", emoji: "🏢" },
                      { value: "expert", label: "Expert", deposit: "฿600", emoji: "👑" },
                    ].map((tier) => (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, tier: tier.value }))}
                        className={`p-3 rounded-xl border-2 text-center transition ${
                          form.tier === tier.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span className="text-xl block">{tier.emoji}</span>
                        <span className="text-sm font-semibold block mt-1">{tier.label}</span>
                        <span className="text-xs text-gray-500 block">{locale === "th" ? "มัดจำ" : "Deposit"} {tier.deposit}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === "th" ? "ตั้งรหัสผ่านสมาชิก" : locale === "zh" ? "设置会员密码" : "Set Member Password"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === "th" ? "ยืนยันรหัสผ่าน" : locale === "zh" ? "确认密码" : "Confirm Password"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

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
              {submitting ? t("submitting") : t("submitProfessional")}
            </button>
          </div>
        </form>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowTerms(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">เงื่อนไขการใช้งาน</h2>
              <button onClick={() => setShowTerms(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
              <h3>1. การยอมรับเงื่อนไข</h3>
              <p>การใช้บริการแพลตฟอร์ม CBLUE ถือว่าท่านยอมรับเงื่อนไขการใช้งานทั้งหมด หากท่านไม่ยอมรับเงื่อนไขเหล่านี้ กรุณาหยุดใช้บริการ</p>
              <h3>2. ขอบเขตบริการ</h3>
              <p>CBLUE เป็นแพลตฟอร์มเชื่อมต่อผู้ใช้กับช่างมืออาชีพและผู้เชี่ยวชาญ เราไม่ได้เป็นผู้ให้บริการซ่อมบำรุงโดยตรง แต่เป็นตัวกลางในการจับคู่ผู้ใช้กับผู้ให้บริการที่เหมาะสม</p>
              <h3>3. การลงทะเบียนและบัญชีผู้ใช้</h3>
              <p>ผู้ใช้ต้องให้ข้อมูลที่ถูกต้องและเป็นปัจจุบันในการลงทะเบียน ผู้ใช้มีหน้าที่รักษาความปลอดภัยของบัญชีและรหัสผ่าน</p>
              <h3>4. การชำระเงิน</h3>
              <p>การชำระเงินผ่าน PromptPay QR จำนวน 300 บาทเป็นค่ามัดจำเพื่อยืนยันการจอง ซึ่งจะหักจากยอดชำระทั้งหมด ค่าบริการสุดท้ายขึ้นอยู่กับประเภทบริการ ระดับช่าง และขอบเขตงาน</p>
              <h3>5. การยกเลิก</h3>
              <p>ผู้ใช้สามารถยกเลิกคำขอได้ก่อนช่างยืนยันการรับงาน หลังจากยืนยันแล้ว ค่ามัดจำจะไม่สามารถขอคืนได้ ยกเว้นกรณีที่ช่างไม่สามารถมาให้บริการได้</p>
              <h3>6. ความรับผิดชอบ</h3>
              <p>CBLUE มีมาตรการตรวจสอบช่างผ่านระบบ KYC แต่ไม่รับผิดชอบต่อความเสียหายที่เกิดจากการให้บริการของช่าง ผู้ใช้ควรตรวจสอบงานก่อนชำระเงินค่าบริการสุดท้าย</p>
              <h3>7. ทรัพย์สินทางปัญญา</h3>
              <p>เนื้อหาทั้งหมดบนแพลตฟอร์มเป็นทรัพย์สินของ CBLUE Co., Ltd. ห้ามคัดลอก ดัดแปลง หรือเผยแพร่โดยไม่ได้รับอนุญาต</p>
              <h3>8. การเปลี่ยนแปลงเงื่อนไข</h3>
              <p>CBLUE ขอสงวนสิทธิ์ในการเปลี่ยนแปลงเงื่อนไขการใช้งานได้ทุกเมื่อ โดยจะแจ้งให้ผู้ใช้ทราบผ่านแพลตฟอร์ม</p>
            </div>
            <button onClick={() => setShowTerms(false)} className="mt-6 w-full py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition">
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPrivacy(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">นโยบายความเป็นส่วนตัว</h2>
              <button onClick={() => setShowPrivacy(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
              <h3>1. ข้อมูลที่เราเก็บรวบรวม</h3>
              <p>เราเก็บรวบรวมข้อมูลส่วนบุคคลที่ท่านให้ผ่านแบบฟอร์ม ได้แก่ ชื่อ-นามสกุล อีเมล เบอร์โทรศัพท์ ที่อยู่ รูปภาพประกอบ รวมถึงข้อมูลการใช้งานแพลตฟอร์ม</p>
              <h3>2. วัตถุประสงค์ในการใช้ข้อมูล</h3>
              <p>เราใช้ข้อมูลเพื่อ: จับคู่ผู้ใช้กับช่างที่เหมาะสม, ดำเนินการชำระเงิน, ส่งการแจ้งเตือนสถานะงาน, ปรับปรุงคุณภาพบริการ, และติดต่อกลับตามที่ท่านร้องขอ</p>
              <h3>3. การแบ่งปันข้อมูล</h3>
              <p>เราอาจแบ่งปันข้อมูลกับ: ช่างที่ได้รับการจับคู่ (ชื่อ เบอร์โทร ที่อยู่), ผู้ให้บริการชำระเงิน (PromptPay), และหน่วยงานราชการตามที่กฎหมายกำหนด</p>
              <h3>4. การรักษาความปลอดภัย</h3>
              <p>เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสม รวมถึงการเข้ารหัสข้อมูล การจำกัดการเข้าถึง และการเฝ้าระวังระบบ เพื่อป้องกันการเข้าถึงข้อมูลโดยไม่ได้รับอนุญาต</p>
              <h3>5. สิทธิ์ของเจ้าของข้อมูล</h3>
              <p>ท่านมีสิทธิ์: เข้าถึงข้อมูลส่วนบุคคลของท่าน, ขอแก้ไขข้อมูลที่ไม่ถูกต้อง, ขอให้ลบข้อมูล, เพิกถอนความยินยอม, และร้องเรียนต่อหน่วยงานที่เกี่ยวข้อง</p>
              <h3>6. คุกกี้และเทคโนโลยีติดตาม</h3>
              <p>เราใช้คุกกี้เพื่อปรับปรุงประสบการณ์การใช้งาน จดจำการตั้งค่าภาษา และวิเคราะห์ข้อมูลการใช้งานเว็บไซต์</p>
              <h3>7. การเก็บรักษาข้อมูล</h3>
              <p>เราเก็บรักษาข้อมูลส่วนบุคคลตามระยะเวลาที่จำเป็นสำหรับวัตถุประสงค์ที่ระบุไว้ หรือตามที่กฎหมายกำหนด</p>
              <h3>8. ติดต่อเรา</h3>
              <p>หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว กรุณาติดต่อ: cblue.thailand@gmail.com หรือ +66 (0)81 854 4291</p>
            </div>
            <button onClick={() => setShowPrivacy(false)} className="mt-6 w-full py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition">
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
