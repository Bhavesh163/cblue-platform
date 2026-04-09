"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

const TABS = [
  { key: "household", icon: "🏠", en: "Household Maintenance", th: "ซ่อมบำรุงบ้าน", zh: "家庭维护" },
  { key: "project", icon: "🏗️", en: "Project Team", th: "ทีมโครงการ", zh: "项目团队" },
  { key: "professional", icon: "👔", en: "Book Professionals", th: "จองมืออาชีพ", zh: "预约专业人士" },
] as const;

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = useLocale();
  const prefix = `/${locale}`;

  const activeTab = TABS.find((t) => pathname.includes(`/booking/${t.key}`))?.key ?? "household";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30">
      {/* Hero Banner */}
      <section className="relative text-white min-h-[220px] flex items-center overflow-hidden">
        <Image src="/images/scenic-building.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/90 to-indigo-800/70" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center py-10 w-full">
          <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur text-sky-200 rounded-full text-sm font-bold mb-3 border border-white/20">
            ⚡ {locale === "th" ? "จองช่าง & มืออาชีพ" : locale === "zh" ? "预约技工和专业人士" : "Book Fixers & Pros"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold">
            {locale === "th" ? "เลือกบริการที่คุณต้องการ" : locale === "zh" ? "选择您需要的服务" : "Choose the Service You Need"}
          </h1>
          <p className="mt-2 text-sky-200 text-sm max-w-2xl mx-auto">
            {locale === "th"
              ? "แพลตฟอร์มจับคู่ AI ระดับองค์กร — ช่างซ่อมบ้าน ทีมโครงการ และมืออาชีพ"
              : locale === "zh"
              ? "企业级AI匹配平台 — 家庭技工、项目团队和专业人士"
              : "Enterprise AI matching platform — household fixers, project teams & professionals"}
          </p>
        </div>
      </section>

      {/* Tab Pills */}
      <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const label = locale === "th" ? tab.th : locale === "zh" ? tab.zh : tab.en;
              return (
                <Link
                  key={tab.key}
                  href={`${prefix}/booking/${tab.key}`}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-sky-600 text-white shadow-md shadow-sky-200"
                      : "text-gray-600 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  {label}
                  {isActive && <span className="ml-1 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
