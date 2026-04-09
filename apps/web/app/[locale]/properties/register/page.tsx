"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { THAI_PROVINCES } from "../../lib/constants";
import { getDistrictsForProvince } from "../../lib/thai-address-data";
import GpsDetectButton from "../../components/GpsDetectButton";

const PROPERTY_TYPES = ["CONDO", "HOUSE", "TOWNHOUSE", "LAND", "COMMERCIAL", "APARTMENT"] as const;
const LISTING_TYPES = ["SALE", "RENT"] as const;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

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
  const [locationType, setLocationType] = useState<"dropdown" | "address">("dropdown");

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
    setForm({ ...form, [e.target.name]: e.target.value });
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

    if (form.password && form.password.length < 6) {
      setError(locale === "th" ? "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" : locale === "zh" ? "密码至少6个字符" : "Password must be at least 6 characters");
      return;
    }
    if (form.password && form.password !== form.confirmPassword) {
      setError(locale === "th" ? "รหัสผ่านไม่ตรงกัน" : locale === "zh" ? "密码不匹配" : "Passwords do not match");
      return;
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

      const res = await fetch(`${API_BASE}/properties`, {
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
        <Image src="/images/scenic-house.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/90 to-emerald-800/75" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-14 text-center">
          <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur text-green-200 rounded-full text-sm font-bold mb-4 border border-white/20">🏠 {locale === "th" ? "ลงประกาศอสังหาริมทรัพย์" : "List Property"}</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">{t("registerTitle")}</h1>
          <p className="mt-3 text-green-100">{t("registerDesc")}</p>
          <div className="w-20 h-1 bg-white/50 mx-auto rounded-full mt-5" />
        </div>
      </div>

      {/* Form */}
      <section className="py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-8">

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
                    {locale === "th" ? "ชื่อประกาศ" : "Title"} <span className="text-red-500">{tc("required")}</span>
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
                    {locale === "th" ? "จำนวนชั้น" : "Floors"}
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
                    {locale === "th" ? "ปีที่สร้าง" : "Year Built"}
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
                {/* GPS Auto-detect */}
                <GpsDetectButton onDetected={(coords) => setGpsCoords(coords)} />
                {gpsCoords && (
                  <p className="text-xs text-green-600">
                    📍 {locale === "th" ? "ตำแหน่ง" : "Location"}: {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
                  </p>
                )}

                {/* Location type toggle */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="locationType"
                      value="dropdown"
                      checked={locationType === "dropdown"}
                      onChange={() => setLocationType("dropdown")}
                      className="text-green-600 focus:ring-green-500"
                    />
                    {locale === "th" ? "เลือกจากรายการ" : locale === "zh" ? "从列表选择" : "Select from list"}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="locationType"
                      value="address"
                      checked={locationType === "address"}
                      onChange={() => setLocationType("address")}
                      className="text-green-600 focus:ring-green-500"
                    />
                    {locale === "th" ? "กรอกที่อยู่ / รหัสไปรษณีย์" : locale === "zh" ? "输入地址/邮政编码" : "Enter address / postal code"}
                  </label>
                </div>

                {locationType === "dropdown" ? (
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
                        <option value="">{locale === "th" ? "-- เลือกอำเภอ/เขต --" : "-- Select District --"}</option>
                        {getDistrictsForProvince(form.province).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subdistrict */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{tb("subdistrict")}</label>
                      <input
                        type="text"
                        name="subdistrict"
                        value={form.subdistrict}
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
                  {/* Detailed Thai Address Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">บ้านเลขที่</label>
                      <input type="text" name="houseNumber" value={form.houseNumber} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500" placeholder="123/45" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">อาคาร / ชั้น</label>
                      <div className="flex gap-2">
                        <input type="text" name="building" value={form.building} onChange={handleChange} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500" placeholder="อาคาร A" />
                        <input type="text" name="floor" value={form.floor} onChange={handleChange} className="w-20 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500" placeholder="ชั้น" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ถนน</label>
                      <input type="text" name="road" value={form.road} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500" placeholder="ถนนสุขุมวิท" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ซอย</label>
                      <input type="text" name="soi" value={form.soi} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500" placeholder="ซอย 21" />
                    </div>
                  </div>
                </>) : (
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

            {/* Create Subscriber Account */}
            <fieldset className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <legend className="text-lg font-semibold text-gray-900 px-2">
                {locale === "th" ? "สร้างบัญชีสมาชิก (ไม่บังคับ)" : locale === "zh" ? "创建订阅者账户（可选）" : "Create Subscriber Account (Optional)"}
              </legend>
              <p className="text-xs text-gray-500 mt-2 mb-4">
                {locale === "th" ? "สร้างบัญชีเพื่อจัดการประกาศและรับการแจ้งเตือน" : locale === "zh" ? "创建账户以管理房源和接收通知" : "Create an account to manage your listings and receive notifications"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === "th" ? "รหัสผ่าน" : locale === "zh" ? "密码" : "Password"}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    minLength={6}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                    placeholder="••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === "th" ? "ยืนยันรหัสผ่าน" : locale === "zh" ? "确认密码" : "Confirm Password"}
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    minLength={6}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                    placeholder="••••••"
                  />
                </div>
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
