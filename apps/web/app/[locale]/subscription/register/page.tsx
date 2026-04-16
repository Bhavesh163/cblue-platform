"use client";

import { useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";



export default function SubscriptionRegisterPage() {
  const t = useTranslations("subscription");
  const locale = useLocale();
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      setError(t("passwordMin8"));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/subscription/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          password: form.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Registration failed");
      }

      const data = await res.json();
      localStorage.setItem("subscriber_token", data.accessToken);
      localStorage.setItem("subscriber", JSON.stringify(data.subscriber));
      window.location.href = `${prefix}/dashboard`;
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {t("name")}
            </label>
            <input id="name" name="name" type="text" required value={form.name} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="สมชาย ใจดี" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t("email")}
            </label>
            <input id="email" name="email" type="email" required value={form.email} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="email@example.com" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              {t("phone")}
            </label>
            <input id="phone" name="phone" type="tel" required value={form.phone} onChange={handleChange}
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
            <input id="password" name="password" type="password" required minLength={8} value={form.password} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="••••••••" />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              {t("confirmPassword")}
            </label>
            <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} value={form.confirmPassword} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="••••••••" />
          </div>

          <button
            type="submit"
            disabled={loading}
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
