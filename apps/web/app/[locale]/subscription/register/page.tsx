"use client";

import { useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";



export default function SubscriptionRegisterPage() {
  const t = useTranslations("subscription");
  const locale = useLocale();
  const router = useRouter();
  const prefix = `/${locale}`;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdpaConsent, setPdpaConsent] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pdpaConsent) {
      setError(t("pdpaRequired"));
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError(locale === "th" ? "กรุณากรอกข้อมูลที่จำเป็น" : locale === "zh" ? "请填写必填字段" : "Please fill in all required fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError(locale === "th" ? "รูปแบบอีเมลไม่ถูกต้อง" : locale === "zh" ? "邮箱格式不正确" : "Invalid email format");
      return;
    }
    if (!/^[0-9\s\-+()]{9,15}$/.test(form.phone)) {
      setError(t("invalidPhone"));
      return;
    }
    if (form.password.length < 8) {
      setError(t("passwordMin8"));
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/`~])/.test(form.password)) {
      setError(locale === "th" 
        ? "รหัสผ่านต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ" 
        : locale === "zh" 
        ? "密码必须包含小写字母、大写字母、数字和特殊字符" 
        : "Password must contain uppercase, lowercase, number, and special character");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/subscription/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          password: form.password,
          pdpaConsent: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "" }));
        const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message;
        if (res.status === 409) {
          throw new Error(locale === "th" ? "อีเมลนี้ถูกใช้งานแล้ว" : locale === "zh" ? "该邮箱已被注册" : "Email already registered");
        }
        if ([400, 422].includes(res.status)) {
          throw new Error(msg || (locale === "th" ? "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" : locale === "zh" ? "输入数据无效，请检查后重试" : "Invalid input. Please check your details and try again."));
        }
        if ([403, 502, 530, 503].includes(res.status)) {
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
        throw new Error(msg || t("registerError"));
      }

      const data = await res.json().catch(() => null);
      if (!data || !data.accessToken) throw new Error(t("registerError"));
      localStorage.setItem("subscriber_token", data.accessToken);
      localStorage.setItem("subscriber", JSON.stringify(data.subscriber));
      router.push(`${prefix}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("registerError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {t("registerTitle")}
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          {t("registerDesc")}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {t("name")}
            </label>
            <input id="name" name="name" type="text" value={form.name} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="สมชาย ใจดี" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t("email")}
            </label>
            <input id="email" name="email" type="text" inputMode="email" value={form.email} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="email@example.com" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              {t("phone")}
            </label>
            <input id="phone" name="phone" type="text" inputMode="tel" value={form.phone} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="0812345678" />
          </div>
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              {t("company")}
            </label>
            <input id="company" name="company" type="text" value={form.company} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="บริษัท ABC จำกัด" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t("password")}
            </label>
            <input id="password" name="password" type="password" value={form.password} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="••••••••" />
            <p className="mt-1 text-xs text-gray-400">
              {locale === "th" ? "อย่างน้อย 8 ตัว มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ" 
               : locale === "zh" ? "至少8位，含大写、小写、数字和特殊字符" 
               : "Min 8 chars with uppercase, lowercase, number & special character"}
            </p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              {t("confirmPassword")}
            </label>
            <input id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="••••••••" />
          </div>

          <div className="flex items-start gap-2">
            <input
              id="pdpa"
              type="checkbox"
              checked={pdpaConsent}
              onChange={(e) => setPdpaConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="pdpa" className="text-xs text-gray-600">
              {t("pdpaConsentLabel")}
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !pdpaConsent}
            className="w-full py-2.5 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? t("registering") : t("register")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t("hasAccount")}{" "}
          <Link href={`${prefix}/subscription/login`} className="text-blue-600 hover:underline">
            {t("loginHere")}
          </Link>
        </p>
      </div>
    </div>
  );
}
