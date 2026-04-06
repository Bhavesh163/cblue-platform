import Link from "next/link";
import {useTranslations, useLocale} from "next-intl";

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();
  const prefix = `/${locale}`;

  const services = [
    { icon: "🔧", titleKey: "plumbing" as const, descKey: "plumbingDesc" as const },
    { icon: "⚡", titleKey: "electrical" as const, descKey: "electricalDesc" as const },
    { icon: "❄️", titleKey: "ac" as const, descKey: "acDesc" as const },
    { icon: "🏠", titleKey: "interior" as const, descKey: "interiorDesc" as const },
    { icon: "🌿", titleKey: "landscaping" as const, descKey: "landscapingDesc" as const },
    { icon: "🏗️", titleKey: "cladding" as const, descKey: "claddingDesc" as const },
  ];

  const stats = [
    { value: "1,000+", labelKey: "fixers" as const },
    { value: "77", labelKey: "provinces" as const },
    { value: "4", labelKey: "tiers" as const },
    { value: "300 ฿", labelKey: "startPrice" as const },
  ];

  const tiers = [
    { name: "Economy", price: t("home.tiers.basePrice"), color: "bg-gray-100 text-gray-800" },
    { name: "Standard", price: "+20%", color: "bg-blue-100 text-blue-800" },
    { name: "Corporate", price: "+40%", color: "bg-purple-100 text-purple-800" },
    { name: "Expert", price: "+60%", color: "bg-amber-100 text-amber-800" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              {t("home.heroTitle")}
              <br />
              <span className="text-blue-300">{t("home.heroTitleAccent")}</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-blue-100 leading-relaxed max-w-2xl">
              {t("home.heroDesc")}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href={`${prefix}/booking/household`}
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-blue-800 bg-white hover:bg-blue-50 rounded-xl shadow-lg transition-all"
              >
                {t("home.bookHousehold")}
              </Link>
              <Link
                href={`${prefix}/booking/project`}
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all"
              >
                {t("home.bookProject")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.labelKey} className="text-center">
                <p className="text-3xl font-bold text-blue-700">{stat.value}</p>
                <p className="mt-1 text-sm text-gray-500">{t(`home.stats.${stat.labelKey}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">{t("home.ourServices")}</h2>
            <p className="mt-3 text-lg text-gray-500">
              {t("home.ourServicesDesc")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((svc) => (
              <div
                key={svc.titleKey}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md border border-gray-100 transition-shadow"
              >
                <div className="text-4xl mb-4">{svc.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900">{t(`services.${svc.titleKey}`)}</h3>
                <p className="mt-2 text-sm text-gray-500">{t(`services.${svc.descKey}`)}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href={`${prefix}/services`}
              className="text-blue-700 font-semibold hover:text-blue-800 text-sm"
            >
              {t("home.viewAll")}
            </Link>
          </div>
        </div>
      </section>

      {/* Real Estate Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">{t("realEstate.title")}</h2>
            <p className="mt-3 text-lg text-gray-500">{t("realEstate.desc")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Link
              href={`${prefix}/properties`}
              className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-4">🏘️</div>
              <h3 className="text-lg font-semibold text-blue-900">{t("realEstate.searchProperty")}</h3>
              <p className="mt-2 text-sm text-blue-700">{t("realEstate.browse")}</p>
            </Link>
            <Link
              href={`${prefix}/properties/register`}
              className="bg-green-50 border border-green-200 rounded-xl p-8 text-center hover:shadow-md transition-shadow"
            >
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-green-900">{t("realEstate.listProperty")}</h3>
              <p className="mt-2 text-sm text-green-700">{t("realEstate.registerDesc")}</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Tier Transparency */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">{t("home.tierTitle")}</h2>
            <p className="mt-3 text-lg text-gray-500">
              {t("home.tierDesc")}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="rounded-xl p-6 text-center border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${tier.color}`}>
                  {tier.name}
                </span>
                <p className="mt-4 text-xl font-bold text-gray-900">{tier.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-700 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">{t("home.ctaTitle")}</h2>
          <p className="mt-4 text-lg text-blue-100">
            {t("home.ctaDesc")}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`${prefix}/booking/household`}
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-blue-800 bg-white hover:bg-blue-50 rounded-xl shadow-lg transition-all"
            >
              {t("home.bookHousehold")}
            </Link>
            <Link
              href={`${prefix}/fixers/register`}
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all"
            >
              {t("nav.forFixers")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
