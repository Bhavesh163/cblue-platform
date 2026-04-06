"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { THAI_PROVINCES } from "../../lib/constants";

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
    addressLine: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
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
        addressLine: form.addressLine,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
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
                  subdistrict: "", postalCode: "", addressLine: "", contactName: "", contactPhone: "", contactEmail: "",
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
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-700 to-green-900 text-white py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold">{t("registerTitle")}</h1>
          <p className="mt-3 text-green-100">{t("registerDesc")}</p>
        </div>
      </section>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {/* Province */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {tb("province")} <span className="text-red-500">{tc("required")}</span>
                  </label>
                  <select
                    name="province"
                    value={form.province}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white outline-none focus:border-green-500"
                  >
                    <option value="">{tb("selectProvince")}</option>
                    {THAI_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tb("district")}</label>
                  <input
                    type="text"
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-green-500"
                  />
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
