import Link from "next/link";
import Image from "next/image";
import {useTranslations, useLocale} from "next-intl";
import { ScrollReveal } from "./components/ScrollReveal";

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
    { value: "5", labelKey: "tiers" as const },
    { value: "200 ฿", labelKey: "startPrice" as const },
  ];

  const tiers = [
    { name: "Economy", price: t("home.tiers.basePrice"), color: "bg-green-100 text-green-800" },
    { name: "Standard", price: "+20%", color: "bg-blue-100 text-blue-800" },
    { name: "Corporate", price: "+40%", color: "bg-purple-100 text-purple-800" },
    { name: "Specialist", price: "+60%", color: "bg-rose-100 text-rose-800" },
    { name: "Expert", price: "+80%", color: "bg-amber-100 text-amber-800" },
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
              {locale === "th" ? "ค้นหาช่างและมืออาชีพ" : locale === "zh" ? "查找技工与专业人士" : "Find Fixers & Professionals"}
            </span>
            <br />
            <span className="text-blue-200">{locale === "th" ? "ทั่วประเทศไทย" : locale === "zh" ? "覆盖全泰国" : "Across Thailand"}</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-200 leading-relaxed max-w-3xl mx-auto">
            {locale === "th"
              ? "CBLUE เชื่อมต่อคุณกับช่างซ่อมบ้าน ทีมโครงการ มืออาชีพ และอสังหาริมทรัพย์ จองง่าย จ่ายผ่าน PromptPay เริ่มต้นเพียง ฿200"
              : locale === "zh"
              ? "CBLUE 连接您与家庭维修技工、项目团队、专业人士和房地产服务。轻松预约，PromptPay 支付，起价仅 ฿200"
              : "CBLUE connects you with household fixers, project teams, professionals, and real estate services. Easy booking, pay via PromptPay, starting from just ฿200."}
          </p>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <Link
              href={`${prefix}/booking/household`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-sky-50 rounded-xl shadow-lg transition-all gap-2"
            >
              <span>🏠</span> {locale === "th" ? "จองช่าง" : locale === "zh" ? "预约技工" : "Book Fixer"}
            </Link>
            <Link
              href={`${prefix}/booking/project`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2"
            >
              <span>💼</span> {locale === "th" ? "จองทีมโครงการ" : locale === "zh" ? "预约项目团队" : "Book Project"}
            </Link>
            <Link
              href={`${prefix}/booking/professional`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2"
            >
              <span>👔</span> {locale === "th" ? "จองมืออาชีพ" : locale === "zh" ? "预约专业人士" : "Book Pro"}
            </Link>
            <Link
              href={`${prefix}/properties`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2"
            >
              <span>🏢</span> {locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房地产" : "Property"}
            </Link>
          </div>
        </div>
        {/* Bouncing scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <svg className="w-8 h-8 text-white/70" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <ScrollReveal>
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
        </ScrollReveal>
      </section>

      {/* 4 Core Services Showcase */}
      <section className="py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-sky-100 text-sky-700 rounded-full text-sm font-bold mb-4">
              {locale === "th" ? "บริการของเรา" : locale === "zh" ? "我们的服务" : "Our Services"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              {locale === "th" ? "4 บริการหลักของ CBLUE" : locale === "zh" ? "CBLUE 四大核心服务" : "4 Core Services"}
            </h2>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
              {locale === "th"
                ? "ครบทุกบริการ ตั้งแต่ซ่อมบ้าน ทีมโครงการ มืออาชีพ ไปจนถึงอสังหาริมทรัพย์"
                : locale === "zh"
                ? "从家庭维修到项目团队、专业人士和房地产，一站式服务"
                : "From household repairs to project teams, professionals, and real estate — all in one platform"}
            </p>
            <div className="mt-4 w-24 h-1 bg-sky-500 mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                href: `${prefix}/booking/household`, icon: "🏠", image: "/images/hvac.png",
                title: locale === "th" ? "จองช่างซ่อมบ้าน" : "Book Household Fixer",
                desc: locale === "th" ? "ประปา ไฟฟ้า แอร์ ตกแต่งภายใน จัดสวน และอื่นๆ" : "Plumbing, electrical, AC, interior, landscaping, and more",
                color: "from-sky-500 to-blue-600", items: locale === "th" ? ["ช่างประปา", "ช่างไฟฟ้า", "ช่างแอร์", "ตกแต่งภายใน", "จัดสวน", "Cladding"] : ["Plumbing", "Electrical", "AC & HVAC", "Interior", "Landscaping", "Cladding"],
              },
              {
                href: `${prefix}/booking/project`, icon: "💼", image: "/images/smart-home.jpg",
                title: locale === "th" ? "จองทีมโครงการ" : "Book Project Team",
                desc: locale === "th" ? "เว็บไซต์ AI สมาร์ทโฮม พลังงานแสงอาทิตย์ และ 20+ บริการ" : "Website, AI, smart home, solar, and 20+ project services",
                color: "from-indigo-500 to-purple-600", items: locale === "th" ? ["เว็บไซต์", "AI/ML", "สมาร์ทโฮม", "โซลาร์", "EV Charger", "20+ บริการ"] : ["Website", "AI/ML", "Smart Home", "Solar", "EV Charger", "20+ Services"],
              },
              {
                href: `${prefix}/booking/professional`, icon: "👔", image: "/images/scenic-building.jpg",
                title: locale === "th" ? "จองมืออาชีพ" : "Book Professional",
                desc: locale === "th" ? "ทนายความ สถาปนิก วิศวกร นักบัญชี โปรแกรมเมอร์" : "Lawyer, architect, engineer, accountant, programmer",
                color: "from-emerald-500 to-teal-600", items: locale === "th" ? ["ทนายความ", "สถาปนิก", "วิศวกร", "นักบัญชี", "IT/Dev", "การตลาด"] : ["Lawyer", "Architect", "Engineer", "CPA", "IT/Dev", "Marketing"],
              },
              {
                href: `${prefix}/properties`, icon: "🏢", image: "/images/scenic-house.jpg",
                title: locale === "th" ? "อสังหาริมทรัพย์" : "Book Property",
                desc: locale === "th" ? "ซื้อ ขาย เช่า คอนโด บ้าน ทาวน์เฮาส์ ที่ดิน" : "Buy, sell, rent — condos, houses, townhouses, land",
                color: "from-amber-500 to-orange-600", items: locale === "th" ? ["คอนโด", "บ้านเดี่ยว", "ทาวน์เฮาส์", "ที่ดิน", "ออฟฟิศ", "พาณิชย์"] : ["Condo", "House", "Townhouse", "Land", "Office", "Commercial"],
              },
            ].map((svc) => (
              <Link key={svc.href} href={svc.href} className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
                <div className="flex flex-col sm:flex-row">
                  <div className="relative sm:w-2/5 h-48 sm:h-auto overflow-hidden">
                    <Image src={svc.image} alt="" fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${svc.color} opacity-40`} />
                    <div className="absolute bottom-4 left-4 text-5xl drop-shadow-lg">{svc.icon}</div>
                  </div>
                  <div className="sm:w-3/5 p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{svc.title}</h3>
                    <p className="text-sm text-gray-500 mb-3">{svc.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {svc.items.map((item) => (
                        <span key={item} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">{item}</span>
                      ))}
                    </div>
                    <span className={`inline-flex items-center gap-1 text-sm font-bold bg-gradient-to-r ${svc.color} bg-clip-text text-transparent`}>
                      {locale === "th" ? "จองเลย →" : "Book Now →"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Household Services Grid */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
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
          </ScrollReveal>
        </div>
      </section>

      {/* Professional Search */}
      <section className="bg-white/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
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
              { key: "Engineer", emoji: "🏗️" },
              { key: "Software Programmer", emoji: "💻" },
              { key: "Digital Marketing", emoji: "📣" },
              { key: "Safety Officer", emoji: "🛡️" },
              { key: "Accountant", emoji: "🧮" },
              { key: "Others", emoji: "➕" },
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
              {t("booking.professionalTitle")}
            </Link>
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Real Estate Section */}
      <section className="bg-white/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
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
          </ScrollReveal>
        </div>
      </section>

      {/* Tier Transparency */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">{t("home.tierTitle")}</h2>
            <p className="mt-3 text-lg text-gray-500">
              {t("home.tierDesc")}
            </p>
            <div className="mt-4 w-24 h-1 bg-sky-500 mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
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
          </ScrollReveal>
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
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <Link
              href={`${prefix}/booking/household`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-sky-50 rounded-xl shadow-lg transition-all gap-2"
            >
              🏠 {locale === "th" ? "จองช่าง" : locale === "zh" ? "预约技工" : "Book Fixer"}
            </Link>
            <Link
              href={`${prefix}/booking/project`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2"
            >
              💼 {locale === "th" ? "จองทีม" : locale === "zh" ? "项目团队" : "Book Project"}
            </Link>
            <Link
              href={`${prefix}/booking/professional`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2"
            >
              👔 {locale === "th" ? "จองมืออาชีพ" : locale === "zh" ? "预约专业人士" : "Book Pro"}
            </Link>
            <Link
              href={`${prefix}/properties`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2"
            >
              🏢 {locale === "th" ? "อสังหาฯ" : locale === "zh" ? "房产" : "Property"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
