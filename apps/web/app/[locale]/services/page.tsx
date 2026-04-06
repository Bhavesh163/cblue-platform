import Link from "next/link";
import Image from "next/image";
import {useTranslations, useLocale} from "next-intl";

const householdServices = [
  { id: "plumbing", serviceValue: "PLUMBING", image: "/images/hvac.png", titleKey: "plumbing", descKey: "plumbingDesc" },
  { id: "electrical", serviceValue: "ELECTRICAL", image: "/images/ev-charger.jpg", titleKey: "electrical", descKey: "electricalDesc" },
  { id: "ac", serviceValue: "AC", image: "/images/smart-home.jpg", titleKey: "ac", descKey: "acDesc" },
  { id: "interior", serviceValue: "INTERIOR", image: "/images/green-construction.jpg", titleKey: "interior", descKey: "interiorDesc" },
  { id: "landscaping", serviceValue: "LANDSCAPING", image: "/images/smart-farming.jpg", titleKey: "landscaping", descKey: "landscapingDesc" },
  { id: "gardening", serviceValue: "GARDENING", image: "/images/swimming-pool.jpg", titleKey: "landscaping", descKey: "landscapingDesc" },
  { id: "cladding", serviceValue: "CLADDING_ROOFING", image: "/images/solar-panel.jpg", titleKey: "cladding", descKey: "claddingDesc" },
  { id: "accountant", serviceValue: "ACCOUNTANT", image: "/images/software.jpg", titleKey: "plumbing", descKey: "plumbingDesc" },
  { id: "lawyer", serviceValue: "LAWYER", image: "/images/website-development.jpg", titleKey: "plumbing", descKey: "plumbingDesc" },
];

const projectServices = [
  {
    id: "tech",
    image: "/images/ai-chatbot.jpg",
    title: "Technology & Software",
    items: [
      { name: "Website Development", value: "WEBSITE_DEVELOPMENT" },
      { name: "Mobile App Development", value: "MOBILE_APP_DEVELOPMENT" },
      { name: "AI Integration", value: "AI_INTEGRATION" },
      { name: "AI Chatbot", value: "AI_CHATBOT" },
      { name: "Software Development", value: "SOFTWARE_DEV" },
      { name: "ML & AI", value: "ML_AI" },
    ],
  },
  {
    id: "energy",
    image: "/images/solar-panel.jpg",
    title: "Energy & Green",
    items: [
      { name: "Solar Panels", value: "SOLAR_PANELS" },
      { name: "EV Charging", value: "EV_CHARGING" },
      { name: "Eco Friendly Building Design", value: "ECO_FRIENDLY_BUILDING_DESIGN" },
      { name: "Eco Friendly Construction", value: "ECO_FRIENDLY_CONSTRUCTION" },
    ],
  },
  {
    id: "smart",
    image: "/images/security-system.jpg",
    title: "Smart Systems",
    items: [
      { name: "Smart Building Automation", value: "SMART_BUILDING_AUTOMATION" },
      { name: "Smart Home", value: "SMART_HOME" },
      { name: "Smart Farming", value: "SMART_FARMING" },
      { name: "Security & CCTV", value: "SECURITY_CCTV" },
      { name: "Door & Access Control", value: "DOOR_ACCESS_CONTROL" },
    ],
  },
  {
    id: "mep",
    image: "/images/hvac.png",
    title: "MEP & Safety",
    items: [
      { name: "AC", value: "AC" },
      { name: "Plumbing", value: "PLUMBING" },
      { name: "Fire Life Safety", value: "FIRE_LIFE_SAFETY" },
    ],
  },
  {
    id: "consulting",
    image: "/images/green-theme.jpg",
    title: "Consulting & Environment",
    items: [
      { name: "Consulting", value: "CONSULTING" },
      { name: "Environmental Services", value: "ENVIRONMENTAL_SERVICES" },
    ],
  },
];

export default function ServicesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const prefix = `/${locale}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Hero */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-blue-900/40">
          <Image src="/images/swimming-pool.jpg" alt="" fill className="object-cover -z-10" priority />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">{t("services.pageTitle")}</h1>
          <p className="mt-4 text-lg text-gray-200 max-w-2xl mx-auto">
            {t("services.pageDesc")}
          </p>
          <div className="mt-6 w-24 h-1 bg-sky-400 mx-auto rounded-full" />
        </div>
      </section>

      {/* Household Services */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 border-l-4 border-emerald-500 pl-4">
              {t("services.householdTitle")}
            </h2>
            <p className="mt-3 text-gray-500 pl-5">
              {t("services.householdDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {householdServices.map((svc) => (
              <div
                key={svc.id}
                id={svc.id}
                className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="h-48 overflow-hidden relative">
                  <Image
                    src={svc.image}
                    alt={svc.id}
                    fill
                    className="object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900">
                    {t(`services.${svc.titleKey}`)}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {t(`services.${svc.descKey}`)}
                  </p>
                  <Link
                    href={`${prefix}/booking/household?service=${svc.serviceValue}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors"
                  >
                    {t("services.bookService")}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Project Services */}
      <section className="py-20 bg-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 border-l-4 border-sky-500 pl-4">
              {t("services.projectTitle")}
            </h2>
            <p className="mt-3 text-gray-500 pl-5">
              {t("services.projectDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projectServices.map((group) => (
              <div
                key={group.id}
                className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="h-48 overflow-hidden relative">
                  <Image
                    src={group.image}
                    alt={group.title}
                    fill
                    className="object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    {group.title}
                  </h3>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li key={item.value}>
                        <Link
                          href={`${prefix}/booking/project?service=${item.value}`}
                          className="text-sm text-gray-600 hover:text-sky-600 flex items-center gap-2 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`${prefix}/booking/project`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors"
                  >
                    {t("services.getQuote")}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-blue-900/60">
          <Image src="/images/green-theme.jpg" alt="" fill className="object-cover -z-10" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            {t("services.notSure")}
          </h2>
          <p className="mt-3 text-gray-200">
            {t("services.notSureDesc")}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`${prefix}/booking/household`}
              className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold text-slate-900 bg-white hover:bg-sky-50 rounded-xl shadow-lg transition-all"
            >
              {t("home.bookHousehold")}
            </Link>
            <Link
              href={`${prefix}/booking/project`}
              className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all"
            >
              {t("home.bookProject")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
