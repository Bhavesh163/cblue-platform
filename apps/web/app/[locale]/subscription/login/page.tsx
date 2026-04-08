"use client";

import { useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function SubscriptionLoginPage() {
  const t = useTranslations("subscription");
  const locale = useLocale();
  const prefix = `/${locale}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/v1/subscription/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }

      const data = await res.json();
      localStorage.setItem("subscriber_token", data.accessToken);
      localStorage.setItem("subscriber", JSON.stringify(data.subscriber));
      window.location.href = `${prefix}/dashboard`;
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t("email")}
            </label>
            <input
              id="email"
              type="email"
              required
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
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
            />
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
