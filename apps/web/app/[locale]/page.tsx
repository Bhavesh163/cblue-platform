import Link from "next/link";
import Image from "next/image";
import {useTranslations, useLocale} from "next-intl";

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();
  const prefix = `/${locale}`;

  const services = [
    { titleKey: "plumbing" as const, descKey: "plumbingDesc" as const, image: "/images/hvac.png" },
    { titleKey: "electrical" as const, descKey: "electricalDesc" as const, image: "/images/ev-charger.jpg" },
    { titleKey: "ac" as const, descKey: "acDesc" as const, image: "/images/smart-home.jpg" },
    { titleKey: "interior" as const, descKey: "interiorDesc" as const, image: "/images/green-construction.jpg" },
    { titleKey: "landscaping" as const, descKey: "landscapingDesc" as const, image: "/images/smart-farming.jpg" },
    { titleKey: "cladding" as const, descKey: "claddingDesc" as const, image: "/images/solar-panel.jpg" },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Hero */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image src="/images/swimming-pool.jpg" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-blue-900/40" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center text-white">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-white">
              {t("home.heroTitle")}
            </span>
            <br />
            <span className="text-blue-200">{t("home.heroTitleAccent")}</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-200 leading-relaxed max-w-3xl mx-auto">
            {t("home.heroDesc")}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`${prefix}/booking/household`}
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-slate-900 bg-white hover:bg-sky-50 rounded-xl shadow-lg transition-all"
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
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">{t("home.ourServices")}</h2>
            <p className="mt-3 text-lg text-gray-500">
              {t("home.ourServicesDesc")}
            </p>
            <div className="mt-4 w-24 h-1 bg-sky-500 mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((svc) => (
              <div
                key={svc.titleKey}
                className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <Image src={svc.image} alt={svc.titleKey} fill className="object-cover transform group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900">{t(`services.${svc.titleKey}`)}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{t(`services.${svc.descKey}`)}</p>
                </div>
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

      {/* Professional Search */}
      <section className="bg-white/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">{t("booking.professionalTitle")}</h2>
            <p className="mt-3 text-lg text-gray-500">{t("booking.professionalDesc")}</p>
            <div className="mt-4 w-24 h-1 bg-indigo-500 mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { key: "Lawyer", emoji: "⚖️" },
              { key: "Architect", emoji: "📐" },
              { key: "Interior Designer", emoji: "🎨" },
              { key: "CPA", emoji: "📊" },
              { key: "Civil Engineer", emoji: "🏗️" },
              { key: "Mechanical Engineer", emoji: "⚙️" },
              { key: "Electrical Engineer", emoji: "⚡" },
              { key: "Accountant", emoji: "🧮" },
            ].map((pro) => (
              <Link
                key={pro.key}
                href={`${prefix}/booking/professional`}
                className="bg-white rounded-xl p-4 text-center shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
              >
                <span className="text-3xl block mb-2">{pro.emoji}</span>
                <span className="text-sm font-semibold text-gray-800">{pro.key}</span>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href={`${prefix}/booking/professional`}
              className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-all"
            >
              {t("home.bookProject")}
            </Link>
          </div>
        </div>
      </section>

      {/* Real Estate Section */}
      <section className="bg-white/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">{t("realEstate.title")}</h2>
            <p className="mt-3 text-lg text-gray-500">{t("realEstate.desc")}</p>
            <div className="mt-4 w-24 h-1 bg-emerald-500 mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Link
              href={`${prefix}/properties`}
              className="group relative bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden">
                <Image src="/images/green-construction.jpg" alt="" fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/70 to-transparent" />
              </div>
              <div className="p-6 text-center">
                <h3 className="text-lg font-bold text-gray-900">{t("realEstate.searchProperty")}</h3>
                <p className="mt-2 text-sm text-gray-600">{t("realEstate.browse")}</p>
              </div>
            </Link>
            <Link
              href={`${prefix}/properties/register`}
              className="group relative bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden">
                <Image src="/images/swimming-pool.jpg" alt="" fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/70 to-transparent" />
              </div>
              <div className="p-6 text-center">
                <h3 className="text-lg font-bold text-gray-900">{t("realEstate.listProperty")}</h3>
                <p className="mt-2 text-sm text-gray-600">{t("realEstate.registerDesc")}</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Tier Transparency */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">{t("home.tierTitle")}</h2>
            <p className="mt-3 text-lg text-gray-500">
              {t("home.tierDesc")}
            </p>
            <div className="mt-4 w-24 h-1 bg-sky-500 mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="bg-white rounded-xl p-6 text-center shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <span className={`inline-block px-4 py-1.5 text-xs font-bold rounded-full ${tier.color}`}>
                  {tier.name}
                </span>
                <p className="mt-4 text-2xl font-bold text-gray-900">{tier.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image src="/images/green-theme.jpg" alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-blue-900/60" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">{t("home.ctaTitle")}</h2>
          <p className="mt-4 text-lg text-gray-200">
            {t("home.ctaDesc")}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`${prefix}/booking/household`}
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-slate-900 bg-white hover:bg-sky-50 rounded-xl shadow-lg transition-all"
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
    </div>
  );
}
