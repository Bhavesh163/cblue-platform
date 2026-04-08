"use client";

import { useState, FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";

type InquiryType = "service" | "support" | "household";

const SERVICE_OPTIONS = [
  "Website Development", "Mobile App Development", "AI Integration", "Consulting",
  "AI Chatbot", "Software Development", "ML & AI", "Solar Panels", "EV Charging",
  "Green Building Design", "Smart Building Automation", "Environmental Services",
  "Security & CCTV", "Door & Access Control", "Green Construction", "Smart Home",
  "Smart Farming", "Retrofit", "MEP & Retrofit", "Reinstatement & Fit-out", "Other",
];

const HOUSEHOLD_OPTIONS = [
  "Plumbing", "Electrical", "AC Repair", "Interior", "Landscaping", "Gardening",
  "Cladding / Roofing", "Other",
];

const ISSUE_TYPES = [
  "Technical Issue", "Billing", "Account Access", "Feature Request", "Other",
];

const BUDGET_RANGES = [
  "< ฿10,000", "฿10,000 – ฿50,000", "฿50,000 – ฿100,000",
  "฿100,000 – ฿500,000", "฿500,000+", "Not specified",
];

export default function SupportUsPage() {
  const t = useTranslations("supportUs");
  const locale = useLocale();

  const [inquiryType, setInquiryType] = useState<InquiryType>("service");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "",
    service: "", budget: "", startDate: "", location: "",
    orderId: "", issueType: "",
    householdService: "", householdLocation: "",
    message: "", consent: false,
  });

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.message || !form.consent) {
      setErrorMsg(t("errorRequired"));
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    const payload: Record<string, string> = {
      _subject: `New ${inquiryType.toUpperCase()} Inquiry from ${form.name}`,
      _template: "table",
      _captcha: "false",
      Name: form.name,
      Email: form.email,
      Phone: form.phone,
      Company: form.company,
      Message: form.message,
    };

    if (inquiryType === "service") {
      payload["Service"] = form.service;
      payload["Budget"] = form.budget;
      payload["Start Date"] = form.startDate;
      payload["Location"] = form.location;
    } else if (inquiryType === "support") {
      payload["Issue Type"] = form.issueType;
      payload["Order ID"] = form.orderId;
    } else {
      payload["Household Service"] = form.householdService;
      payload["Household Location"] = form.householdLocation;
    }

    try {
      const res = await fetch(
        "https://formsubmit.co/ajax/d95d5f9d747a3a0986f2e325dfe592a7",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok) {
        setStatus("success");
        setForm({
          name: "", email: "", phone: "", company: "",
          service: "", budget: "", startDate: "", location: "",
          orderId: "", issueType: "",
          householdService: "", householdLocation: "",
          message: "", consent: false,
        });
      } else {
        setErrorMsg(t("errorGeneral"));
        setStatus("error");
      }
    } catch {
      setErrorMsg(t("errorGeneral"));
      setStatus("error");
    }
  };

  const inputCls =
    "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition text-sm";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50/30 px-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-xl p-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t("successTitle")}</h2>
          <p className="text-gray-500">{t("successDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{t("title")}</h1>
          <div className="w-20 h-1 bg-sky-500 mx-auto rounded-full" />
        </div>

        {/* Hero Image */}
        <div className="relative h-56 md:h-72 rounded-2xl overflow-hidden shadow-xl mb-10">
          <Image src="/images/swimming-pool.jpg" alt="Support" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-sky-900/70 to-transparent flex items-end p-8">
            <p className="text-white font-medium text-lg md:text-xl italic">
              &ldquo;{t("heroQuote")}&rdquo;
            </p>
          </div>
        </div>

        {/* Contact Info Bar */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Phone</p>
            <p className="font-semibold text-gray-800">{t("contactPhone")}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Email</p>
            <p className="font-semibold text-gray-800">{t("contactEmail")}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Website</p>
            <p className="font-semibold text-gray-800">{t("contactWebsite")}</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">{t("formTitle")}</h2>
            <p className="text-gray-500 text-sm">{t("formSubtitle")}</p>
          </div>

          {/* Inquiry Type Tabs */}
          <div className="flex gap-2 mb-8 justify-center">
            {(["service", "support", "household"] as InquiryType[]).map((type) => (
              <button
                key={type}
                onClick={() => setInquiryType(type)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                  inquiryType === type
                    ? "bg-sky-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t(type === "service" ? "inquiryService" : type === "support" ? "inquirySupport" : "inquiryHousehold")}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Common Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("fullName")} *</label>
                <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>{t("email")} *</label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>{t("phone")} *</label>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>{t("company")}</label>
                <input type="text" value={form.company} onChange={(e) => set("company", e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Service-specific Fields */}
            {inquiryType === "service" && (
              <div className="space-y-4 p-4 bg-sky-50/50 rounded-xl border border-sky-100">
                <div>
                  <label className={labelCls}>{t("serviceInterested")}</label>
                  <select value={form.service} onChange={(e) => set("service", e.target.value)} className={inputCls}>
                    <option value="">{t("selectService")}</option>
                    {SERVICE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{t("budgetRange")}</label>
                    <select value={form.budget} onChange={(e) => set("budget", e.target.value)} className={inputCls}>
                      <option value="">{t("selectBudget")}</option>
                      {BUDGET_RANGES.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t("startDate")}</label>
                    <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{t("location")}</label>
                  <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)} className={inputCls} placeholder="Bangkok, Thailand" />
                </div>
              </div>
            )}

            {/* Support-specific Fields */}
            {inquiryType === "support" && (
              <div className="space-y-4 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                <div>
                  <label className={labelCls}>{t("issueType")}</label>
                  <select value={form.issueType} onChange={(e) => set("issueType", e.target.value)} className={inputCls}>
                    <option value="">{t("selectIssue")}</option>
                    {ISSUE_TYPES.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t("orderId")}</label>
                  <input type="text" value={form.orderId} onChange={(e) => set("orderId", e.target.value)} className={inputCls} />
                </div>
              </div>
            )}

            {/* Household-specific Fields */}
            {inquiryType === "household" && (
              <div className="space-y-4 p-4 bg-green-50/50 rounded-xl border border-green-100">
                <div>
                  <label className={labelCls}>{t("householdService")}</label>
                  <select value={form.householdService} onChange={(e) => set("householdService", e.target.value)} className={inputCls}>
                    <option value="">{t("selectHousehold")}</option>
                    {HOUSEHOLD_OPTIONS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t("householdLocation")}</label>
                  <input type="text" value={form.householdLocation} onChange={(e) => set("householdLocation", e.target.value)} className={inputCls} placeholder="Bangkok, Thailand" />
                </div>
              </div>
            )}

            {/* Message */}
            <div>
              <label className={labelCls}>{t("message")} *</label>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                className={inputCls}
                placeholder={t("messagePlaceholder")}
                required
              />
            </div>

            {/* Consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => set("consent", e.target.checked)}
                className="mt-1 h-4 w-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
              />
              <span className="text-sm text-gray-600">{t("consent")}</span>
            </label>

            {/* Error */}
            {status === "error" && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg transition disabled:opacity-50"
            >
              {status === "submitting" ? t("submitting") : t("submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
