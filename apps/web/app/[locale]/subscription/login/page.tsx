"use client";

import { useState, type FormEvent, Suspense } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";



function SubscriptionLoginPageContent() {
  const t = useTranslations("subscription");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefix = `/${locale}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();
    if (!normalizedEmail) {
      setError(locale === "th" ? "กรุณากรอกอีเมล" : locale === "zh" ? "请输入邮箱" : "Please enter your email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(locale === "th" ? "รูปแบบอีเมลไม่ถูกต้อง" : locale === "zh" ? "邮箱格式不正确" : "Invalid email format");
      return;
    }
    if (normalizedPassword.length < 8) {
      setError(t("passwordMin8"));
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/subscription/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "" }));
        const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message;
        if (res.status === 401) {
          throw new Error(locale === "th" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : locale === "zh" ? "邮箱或密码不正确" : "Invalid email or password");
        }
        if ([403, 500, 502, 530, 503].includes(res.status)) {
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
        throw new Error(msg || t("loginError"));
      }

      const data = await res.json().catch(() => null);
      if (!data || !data.accessToken) throw new Error(t("loginError"));

      // Clear all session-scoped demo/booking data when a different account logs in.
      // This prevents one user's localStorage state from leaking into another's session.
      try {
        const prevSubscriber = JSON.parse(localStorage.getItem("subscriber") || "{}");
        const prevEmail = String(prevSubscriber?.email || "").toLowerCase();
        const newEmail = String(data.subscriber?.email || "").toLowerCase();
        if (prevEmail && newEmail && prevEmail !== newEmail) {
          const keysToRemove = Object.keys(localStorage).filter(k =>
            k.startsWith("ghis_mock_") ||
            k.startsWith("cblue_po_") ||
            k.startsWith("cblue_order_") ||
            k.startsWith("cblue_workflow") ||
            k.startsWith("po_to_order_") ||
            k.startsWith("chat_messages_") ||
            k.startsWith("chat_title_") ||
            k.startsWith("partner_mock_") ||
            k === "pdpa_consent_customer"
          );
          keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch {} });
          // Clear window raw file cache too
          try { delete (window as any).__cblue_files_by_po; } catch {}
        }
      } catch {}

      localStorage.setItem("subscriber_token", data.accessToken);
      localStorage.setItem("subscriber", JSON.stringify(data.subscriber));
      const redir = searchParams.get("redirect") || "/dashboard";
      // dispatch a storage event manually to update other tabs immediately
      window.dispatchEvent(new Event("storage"));
      router.push(redir.startsWith("/") ? `${prefix}${redir}` : `${prefix}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loginError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {t("loginTitle")}
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          {t("loginDesc")}
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
            <input
              id="email"
              type="text"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t("password")}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-12 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-sky-700 focus:outline-none focus:text-sky-700"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.7 5.1A10.9 10.9 0 0 1 12 5c5.5 0 9 5 9 7a8.6 8.6 0 0 1-2 3.4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.6 6.6C4.4 8.1 3 10.4 3 12c0 2 3.5 7 9 7 1.6 0 3-.4 4.2-1" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? t("loggingIn") : t("login")}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link
            href={`${prefix}/subscription/forgot-password`}
            className="text-sm text-blue-600 hover:underline block"
          >
            {t("forgotPassword")}
          </Link>
          <p className="text-sm text-gray-500">
            {t("noAccount")}{" "}
            <Link
              href={`${prefix}/subscription/register`}
              className="text-blue-600 hover:underline"
            >
              {t("registerHere")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <SubscriptionLoginPageContent />
    </Suspense>
  );
}
