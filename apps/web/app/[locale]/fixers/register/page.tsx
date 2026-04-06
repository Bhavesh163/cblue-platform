"use client";

import { useState, useCallback, type FormEvent, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { FIXER_ALL_SERVICES, THAI_PROVINCES } from "../../lib/constants";
import ReCaptcha from "../../components/ReCaptcha";
import GpsDetectButton from "../../components/GpsDetectButton";

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  bio: string;
  yearsExperience: string;
  travelRadius: string;
  selectedSkills: string[];
  scheduledDate: string;
  locationType: "dropdown" | "address";
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
  addressText: string;
  description: string;
  consent: boolean;
}

const initialForm: FormData = {
  name: "",
  email: "",
  phone: "",
  company: "",
  bio: "",
  yearsExperience: "",
  travelRadius: "10",
  selectedSkills: [],
  scheduledDate: "",
  locationType: "dropdown",
  province: "",
  district: "",
  subdistrict: "",
  postalCode: "",
  addressText: "",
  description: "",
  consent: false,
};

export default function FixerRegisterPage() {
  const t = useTranslations("fixer");
  const [form, setForm] = useState<FormData>(initialForm);
  const [kycImages, setKycImages] = useState<File[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

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

  function handleSkillToggle(skillValue: string) {
    setForm((prev) => ({
      ...prev,
      selectedSkills: prev.selectedSkills.includes(skillValue)
        ? prev.selectedSkills.filter((s) => s !== skillValue)
        : [...prev.selectedSkills, skillValue],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.consent) {
      setError(t("consent"));
      return;
    }
    if (!recaptchaToken) {
      setError("reCAPTCHA");
      return;
    }
    if (form.selectedSkills.length === 0) {
      setError(t("skillError"));
      return;
    }
    if (kycImages.length === 0) {
      setError(t("kycError"));
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        bio: form.bio,
        yearsExperience: form.yearsExperience
          ? parseInt(form.yearsExperience)
          : undefined,
        travelRadius: parseInt(form.travelRadius),
        skills: form.selectedSkills,
        scheduledDate: form.scheduledDate,
        address: {
          province: form.province,
          district: form.district,
          subdistrict: form.subdistrict,
          postalCode: form.postalCode,
        },
        description: form.description,
        gpsCoords: gpsCoords || undefined,
        recaptchaToken,
        kycImageCount: kycImages.length,
        portfolioImageCount: portfolioImages.length,
      };
      console.log("Fixer registration submission:", payload);
      setSuccess(true);
    } catch {
      setError(t("consent"));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900">{t("successTitle")}</h1>
        <p className="mt-4 text-lg text-gray-600">
          {t("successDesc")}
        </p>
        <button
          onClick={() => {
            setSuccess(false);
            setForm(initialForm);
            setKycImages([]);
            setPortfolioImages([]);
          }}
          className="mt-8 px-6 py-2.5 text-sm font-semibold text-blue-700 border border-blue-700 rounded-lg hover:bg-blue-50"
        >
          {t("submitAgain")}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">{t("registerTitle")}</h1>
          <p className="mt-3 text-lg text-gray-500">
            {t("registerDesc")}
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
              ข้อมูลส่วนตัว
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
                  placeholder="บริษัท / ร้าน / ส่วนตัว"
                />
              </div>
            </div>
          </fieldset>

          {/* KYC */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              ยืนยันตัวตน (KYC)
            </legend>
            <div className="space-y-4">
              <div>
                <label htmlFor="kycImages" className="block text-sm font-medium text-gray-700 mb-1">
                  อัพโหลดรูปบัตรประชาชน <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  ถ่ายรูปบัตรประชาชนหน้า-หลัง และภาพถ่ายคู่กับบัตร (selfie)
                </p>
                <input
                  id="kycImages"
                  name="kycImages"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) setKycImages(Array.from(e.target.files).slice(0, 3));
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                />
                {kycImages.length > 0 && (
                  <p className="mt-2 text-xs text-green-600">
                    {kycImages.length} ไฟล์ที่เลือก
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* Portfolio */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              ผลงาน / Portfolio
            </legend>
            <div>
              <label htmlFor="portfolioImages" className="block text-sm font-medium text-gray-700 mb-1">
                อัพโหลดรูปภาพผลงาน <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                แสดงตัวอย่างผลงานที่ผ่านมา สูงสุด 10 รูป
              </p>
              <input
                id="portfolioImages"
                name="portfolioImages"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) setPortfolioImages(Array.from(e.target.files).slice(0, 10));
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {portfolioImages.length > 0 && (
                <p className="mt-2 text-xs text-green-600">
                  {portfolioImages.length} ไฟล์ที่เลือก
                </p>
              )}
            </div>
          </fieldset>

          {/* Skills Selection */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              บริการที่ให้บริการ <span className="text-red-500">*</span>
            </legend>
            <p className="text-xs text-gray-500 mb-3">
              เลือกบริการที่ท่านสามารถให้บริการได้ (เลือกได้หลายรายการ)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FIXER_ALL_SERVICES.map((svc) => (
                <label
                  key={svc.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.selectedSkills.includes(svc.value)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.selectedSkills.includes(svc.value)}
                    onChange={() => handleSkillToggle(svc.value)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{svc.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Experience */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              ประสบการณ์
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="yearsExperience" className="block text-sm font-medium text-gray-700 mb-1">
                  ประสบการณ์ (ปี)
                </label>
                <input
                  id="yearsExperience"
                  name="yearsExperience"
                  type="number"
                  min={0}
                  max={50}
                  value={form.yearsExperience}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="5"
                />
              </div>
              <div>
                <label htmlFor="travelRadius" className="block text-sm font-medium text-gray-700 mb-1">
                  รัศมีเดินทาง (กม.)
                </label>
                <input
                  id="travelRadius"
                  name="travelRadius"
                  type="number"
                  min={1}
                  max={100}
                  value={form.travelRadius}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="10"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  แนะนำตัว
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  value={form.bio}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  placeholder="บอกเล่าประสบการณ์และความเชี่ยวชาญของท่าน"
                />
              </div>
            </div>
          </fieldset>

          {/* Availability */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              วันที่พร้อมเริ่มงาน
            </legend>
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
          </fieldset>

          {/* Location */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              สถานที่ตั้ง / พื้นที่ให้บริการ
            </legend>
            <div className="space-y-4">
              {/* GPS Auto-detect */}
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

          {/* Description */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              รายละเอียดเพิ่มเติม
            </legend>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                รายละเอียดโปรเจกต์ / ความต้องการ
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={form.description}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                placeholder="ข้อมูลเพิ่มเติมที่ต้องการแจ้ง"
              />
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
                ข้าพเจ้ายืนยันว่าข้อมูลทั้งหมดเป็นความจริง และยอมรับ{" "}
                <a href="/terms" className="text-blue-600 hover:underline">
                  เงื่อนไขการใช้งาน
                </a>{" "}
                และ{" "}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  นโยบายความเป็นส่วนตัว
                </a>
              </label>
            </div>

            <ReCaptcha onVerify={handleRecaptcha} onExpire={handleRecaptchaExpire} />

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-6 text-base font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 rounded-xl transition-colors"
            >
              {submitting ? "กำลังส่ง..." : "สมัครเป็นช่าง CBLUE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
