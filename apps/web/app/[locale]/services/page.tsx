import Link from "next/link";
import {useTranslations, useLocale} from "next-intl";

const householdServices = [
  { id: "plumbing", icon: "🔧" },
  { id: "electrical", icon: "⚡" },
  { id: "ac", icon: "❄️" },
  { id: "interior", icon: "🏠" },
  { id: "landscaping", icon: "🌿" },
  { id: "gardening", icon: "🌺" },
  { id: "cladding", icon: "🏗️" },
  { id: "accountant", icon: "📊" },
  { id: "lawyer", icon: "⚖️" },
];

const projectServices = [
  {
    id: "tech",
    icon: "💻",
    title: "Technology & Software",
    items: [
      "Website Development",
      "Mobile App Development",
      "AI Integration",
      "AI Chatbot",
      "Software Development",
      "ML & AI",
    ],
  },
  {
    id: "energy",
    icon: "🔋",
    title: "Energy & Green",
    items: [
      "Solar Panels",
      "EV Charging",
      "Eco Friendly Building Design",
      "Eco Friendly Construction",
    ],
  },
  {
    id: "smart",
    icon: "🏢",
    title: "Smart Systems",
    items: [
      "Smart Building Automation",
      "Smart Home",
      "Smart Farming",
      "Security & CCTV",
      "Door & Access Control",
    ],
  },
  {
    id: "mep",
    icon: "🔥",
    title: "MEP & Safety",
    items: [
      "AC",
      "Plumbing",
      "Fire Life Safety",
    ],
  },
  {
    id: "consulting",
    icon: "📋",
    title: "Consulting & Environment",
    items: ["Consulting", "Environmental Services"],
  },
];

// Service-specific translated titles/descriptions (Thai labels for household)
const householdI18nMap: Record<string, {titleKey: string; descKey: string; examples: string[]}> = {
  plumbing: { titleKey: "plumbing", descKey: "plumbingDesc", examples: [] },
  electrical: { titleKey: "electrical", descKey: "electricalDesc", examples: [] },
  ac: { titleKey: "ac", descKey: "acDesc", examples: [] },
  interior: { titleKey: "interior", descKey: "interiorDesc", examples: [] },
  landscaping: { titleKey: "landscaping", descKey: "landscapingDesc", examples: [] },
  gardening: { titleKey: "landscaping", descKey: "landscapingDesc", examples: [] },
  cladding: { titleKey: "cladding", descKey: "claddingDesc", examples: [] },
  accountant: { titleKey: "plumbing", descKey: "plumbingDesc", examples: [] },
  lawyer: { titleKey: "plumbing", descKey: "plumbingDesc", examples: [] },
};

export default function ServicesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const prefix = `/${locale}`;

  return (
    <div className="bg-gray-50">
      {/* Hero */}
      <section className="bg-white border-b border-gray-200 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">{t("services.pageTitle")}</h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            {t("services.pageDesc")}
          </p>
        </div>
      </section>

      {/* Household Services */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("services.householdTitle")}
            </h2>
            <p className="mt-2 text-gray-500">
              {t("services.householdDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {householdServices.map((svc) => {
              const mapping = householdI18nMap[svc.id];
              return (
                <div
                  key={svc.id}
                  id={svc.id}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="text-4xl mb-4">{svc.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {mapping ? t(`services.${mapping.titleKey}`) : svc.id}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {mapping ? t(`services.${mapping.descKey}`) : ""}
                  </p>
                  <Link
                    href={`${prefix}/booking/household`}
                    className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:text-blue-800"
                  >
                    {t("services.bookService")}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Project Services */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("services.projectTitle")}
            </h2>
            <p className="mt-2 text-gray-500">
              {t("services.projectDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projectServices.map((group) => (
              <div
                key={group.id}
                className="rounded-xl p-6 border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="text-3xl mb-3">{group.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {group.title}
                </h3>
                <ul className="space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-blue-500">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`${prefix}/booking/project`}
                  className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  {t("services.getQuote")}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {t("services.notSure")}
          </h2>
          <p className="mt-3 text-gray-500">
            {t("services.notSureDesc")}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`${prefix}/booking/household`}
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors"
            >
              {t("home.bookHousehold")}
            </Link>
            <Link
              href={`${prefix}/booking/project`}
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-blue-700 border border-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
            >
              {t("home.bookProject")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
