"use client";

import { useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";



export default function ForgotPasswordPage() {
  const t = useTranslations("subscription");
  const locale = useLocale();
  const prefix = `/${locale}`;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(locale === "th" ? "รูปแบบอีเมลไม่ถูกต้อง" : locale === "zh" ? "邮箱格式不正确" : "Invalid email format");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/subscription/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "" }));
        if (res.status === 502 || res.status === 530 || res.status === 503) {
          throw new Error(locale === "th" 
            ? "ระบบกำลังปรับปรุง กรุณาลองใหม่ในอีกสักครู่" 
            : locale === "zh" 
            ? "系统正在维护中，请稍后再试" 
            : "Service temporarily unavailable. Please try again shortly.");
        }
        if (res.status === 429) {
          throw new Error(locale === "th" 
            ? "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่" 
            : locale === "zh" 
            ? "请求过多，请稍后再试" 
            : "Too many requests. Please wait a moment and try again.");
        }
        throw new Error(data.message || t("forgotError"));
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("forgotError"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t("resetSent")}</h2>
          <p className="text-sm text-gray-500 mb-3">{t("resetSentDesc")}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 mb-6 text-left">
            {locale === "th"
              ? "📬 ไม่พบอีเมล? กรุณาตรวจสอบโฟลเดอร์ Spam, Junk, Promotions, Bulk หรือ Updates ในกล่องจดหมายของคุณ"
              : locale === "zh"
              ? "📬 找不到邮件？请检查垃圾邮件、促销或批量邮件文件夹。"
              : "📬 Can't find it? Check your Spam, Junk, Promotions, Bulk, or Updates folder."}
          </div>
          <Link href={`${prefix}/subscription/login`} className="text-blue-600 hover:underline text-sm">
            {t("backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {t("forgotTitle")}
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          {t("forgotDesc")}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t("email")}
            </label>
            <input id="email" type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="email@example.com" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? t("sending") : t("sendReset")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href={`${prefix}/subscription/login`} className="text-blue-600 hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
