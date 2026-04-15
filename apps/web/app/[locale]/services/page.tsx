import Link from "next/link";
import Image from "next/image";
import {useTranslations, useLocale} from "next-intl";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    th: "บริการทั้งหมด - ช่างซ่อมบ้าน ทีมโครงการ มืออาชีพ",
    en: "All Services - Home Maintenance, Projects & Professionals",
    zh: "所有服务 - 家居维修、项目团队与专业人士",
  };
  const descriptions: Record<string, string> = {
    th: "ค้นหาและจองบริการซ่อมบำรุง ประปา ไฟฟ้า แอร์ สมาร์ทโฮม สถาปนิก ทนาย วิศวกร และอสังหาริมทรัพย์ทั่วไทย",
    en: "Find and book plumbing, electrical, AC, smart home, architecture, legal, engineering services and real estate across Thailand.",
    zh: "查找并预约泰国各地的水管、电气、空调、智能家居、建筑、法律、工程服务和房地产。",
  };
  return {
    title: titles[locale] ?? titles.en!,
    description: descriptions[locale] ?? descriptions.en!,
    alternates: {
      canonical: `/${locale}/services`,
      languages: { th: "/th/services", en: "/en/services", zh: "/zh/services" },
    },
  };
}

const householdServices = [
  { id: "plumbing", serviceValue: "PLUMBING", image: "/images/plumbing.png", titleKey: "plumbing", descKey: "plumbingDesc" },
  { id: "electrical", serviceValue: "ELECTRICAL", image: "/images/electrical.png", titleKey: "electrical", descKey: "electricalDesc" },
  { id: "ac", serviceValue: "AC", image: "/images/air-conditioning.png", titleKey: "ac", descKey: "acDesc" },
  { id: "interior", serviceValue: "INTERIOR", image: "/images/interior-design.png", titleKey: "interior", descKey: "interiorDesc" },
  { id: "landscaping", serviceValue: "LANDSCAPING", image: "/images/landscaping.png", titleKey: "landscaping", descKey: "landscapingDesc" },
  { id: "cladding", serviceValue: "CLADDING_ROOFING", image: "/images/cladding-roofing.png", titleKey: "cladding", descKey: "claddingDesc" },
];

const projectServices = [
  { id: "website", value: "WEBSITE_DEVELOPMENT", image: "/images/website-development.jpg", name: "Website Development", nameTh: "พัฒนาเว็บไซต์", nameZh: "网站开发" },
  { id: "mobile-app", value: "MOBILE_APP_DEVELOPMENT", image: "/images/mobile-app-dev.png", name: "Mobile App Development", nameTh: "พัฒนาแอปมือถือ", nameZh: "移动应用开发" },
  { id: "ai-integration", value: "AI_INTEGRATION", image: "/images/ai-integration.png", name: "AI Integration", nameTh: "AI Integration", nameZh: "人工智能集成" },
  { id: "ai-chatbot", value: "AI_CHATBOT", image: "/images/ai-chatbot.jpg", name: "AI Chatbot", nameTh: "แชทบอท AI", nameZh: "AI聊天机器人" },
  { id: "software-dev", value: "SOFTWARE_DEV", image: "/images/software.jpg", name: "Software Development", nameTh: "พัฒนาซอฟต์แวร์", nameZh: "软件开发" },
  { id: "ml-ai", value: "ML_AI", image: "/images/machine-learning.png", name: "Machine Learning", nameTh: "แมชชีนเลิร์นนิง", nameZh: "机器学习" },
  { id: "consulting", value: "CONSULTING", image: "/images/consulting.png", name: "Consulting", nameTh: "ที่ปรึกษา", nameZh: "咨询" },
  { id: "solar-panels", value: "SOLAR_PANELS", image: "/images/solar-panel.jpg", name: "Solar Panels", nameTh: "แผงโซลาร์", nameZh: "太阳能板" },
  { id: "ev-charging", value: "EV_CHARGING", image: "/images/ev-charger.jpg", name: "EV Charging", nameTh: "สถานีชาร์จ EV", nameZh: "电动车充电" },
  { id: "green-building", value: "GREEN_BUILDING_DESIGN", image: "/images/green-construction.jpg", name: "Green Building Design", nameTh: "ออกแบบอาคารสีเขียว", nameZh: "绿色建筑设计" },
  { id: "kitchen", value: "KITCHEN", image: "/images/kitchen.png", name: "Kitchen", nameTh: "ครัว", nameZh: "厨房" },
  { id: "hvac-mep", value: "MEP_RETROFIT", image: "/images/hvac.png", name: "HVAC MEP & Retrofit", nameTh: "HVAC MEP", nameZh: "暖通机电翻新" },
  { id: "reinstatement", value: "REINSTATEMENT", image: "/images/reinstatement-fitout.png", name: "Reinstatement & Fit-out", nameTh: "คืนสภาพและตกแต่ง", nameZh: "恢复和装修" },
  { id: "automation", value: "SMART_BUILDING_AUTOMATION", image: "/images/smart-home-bms.png", name: "Automation", nameTh: "ระบบอัตโนมัติ", nameZh: "自动化" },
  { id: "environmental", value: "ENVIRONMENTAL_SERVICES", image: "/images/green-theme.jpg", name: "Environmental Services", nameTh: "บริการสิ่งแวดล้อม", nameZh: "环保服务" },
  { id: "security-cctv", value: "SECURITY_CCTV", image: "/images/security-system.jpg", name: "Security & CCTV", nameTh: "ระบบ CCTV", nameZh: "安防监控" },
  { id: "door-access", value: "DOOR_ACCESS_CONTROL", image: "/images/door-access-control.png", name: "Door & Access Control", nameTh: "ระบบควบคุมประตู", nameZh: "门禁系统" },
  { id: "green-construction", value: "GREEN_CONSTRUCTION", image: "/images/green-construction.jpg", name: "Green Construction", nameTh: "ก่อสร้างสีเขียว", nameZh: "绿色建筑" },
  { id: "smart-home", value: "SMART_HOME", image: "/images/smart-home-bms.png", name: "Smart Home/Building & BMS", nameTh: "สมาร์ทโฮม & BMS", nameZh: "智能家居/楼宇管理" },
  { id: "smart-farming", value: "SMART_FARMING", image: "/images/smart-farming.jpg", name: "Smart Farming", nameTh: "สมาร์ทฟาร์มมิ่ง", nameZh: "智能农业" },
];

const professionalServices = [
  { id: "lawyer", value: "LAWYER", emoji: "⚖️", name: "Lawyer", nameTh: "ทนายความ", nameZh: "律师" },
  { id: "architect", value: "ARCHITECT", emoji: "📐", name: "Architect", nameTh: "สถาปนิก", nameZh: "建筑师" },
  { id: "interior-designer", value: "INTERIOR_DESIGNER", emoji: "🎨", name: "Interior Designer", nameTh: "มัณฑนากร", nameZh: "室内设计师" },
  { id: "cpa", value: "CPA", emoji: "📊", name: "CPA", nameTh: "ผู้สอบบัญชี", nameZh: "注册会计师" },
  { id: "engineer", value: "ENGINEER", emoji: "🏗️", name: "Engineer", nameTh: "วิศวกร", nameZh: "工程师" },
  { id: "software-programmer", value: "SOFTWARE_PROGRAMMER", emoji: "💻", name: "Software Programmer", nameTh: "โปรแกรมเมอร์", nameZh: "程序员" },
  { id: "digital-marketing", value: "DIGITAL_MARKETING", emoji: "📣", name: "Digital Marketing", nameTh: "การตลาดดิจิทัล", nameZh: "数字营销" },
  { id: "safety-officer", value: "SAFETY_OFFICER", emoji: "🛡️", name: "Safety Officer", nameTh: "เจ้าหน้าที่ความปลอดภัย", nameZh: "安全员" },
  { id: "accountant", value: "ACCOUNTANT", emoji: "🧮", name: "Accountant", nameTh: "นักบัญชี", nameZh: "会计" },
  { id: "others", value: "OTHERS", emoji: "➕", name: "Others", nameTh: "อื่น ๆ", nameZh: "其他" },
];

const realEstateServices = [
  { id: "condo", value: "CONDO", image: "/images/scenic-building.jpg", name: "Condominium", nameTh: "คอนโดมิเนียม", nameZh: "公寓", desc: "Buy, sell, or rent condos", descTh: "ซื้อ ขาย หรือเช่าคอนโด", descZh: "买卖或租赁公寓" },
  { id: "house", value: "HOUSE", image: "/images/scenic-house.jpg", name: "House & Villa", nameTh: "บ้านและวิลล่า", nameZh: "别墅", desc: "Single houses, townhouses & villas", descTh: "บ้านเดี่ยว ทาวน์เฮาส์ และวิลล่า", descZh: "独栋别墅、联排别墅" },
  { id: "apartment", value: "APARTMENT", image: "/images/loft-interior.jpg", name: "Apartment", nameTh: "อพาร์ทเมนท์", nameZh: "公寓楼", desc: "Apartment units for rent or sale", descTh: "อพาร์ทเมนท์เช่าหรือขาย", descZh: "出租或出售的公寓" },
  { id: "land", value: "LAND", image: "/images/smart-farming.jpg", name: "Land", nameTh: "ที่ดิน", nameZh: "土地", desc: "Land plots for development or investment", descTh: "ที่ดินเพื่อพัฒนาหรือลงทุน", descZh: "开发或投资用地" },
  { id: "commercial", value: "COMMERCIAL", image: "/images/green-construction.jpg", name: "Commercial", nameTh: "อาคารพาณิชย์", nameZh: "商业地产", desc: "Office, retail & commercial spaces", descTh: "ออฟฟิศ ร้านค้า พื้นที่พาณิชย์", descZh: "办公室、零售和商业空间" },
  { id: "warehouse", value: "WAREHOUSE", image: "/images/hvac.png", name: "Warehouse & Factory", nameTh: "โกดังและโรงงาน", nameZh: "仓库工厂", desc: "Warehouses, factories & industrial space", descTh: "โกดัง โรงงาน พื้นที่อุตสาหกรรม", descZh: "仓库、工厂和工业空间" },
];

export default function ServicesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const prefix = `/${locale}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Hero with scenic background */}
      <section className="relative overflow-hidden min-h-[400px] flex items-center">
        <Image src="/images/scenic-building.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-blue-900/60" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center py-20">
          <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur text-sky-200 rounded-full text-sm font-bold mb-4 border border-white/20">
            {locale === "th" ? "บริการทั้งหมด" : locale === "zh" ? "所有服务" : "All Services"}
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">{t("services.pageTitle")}</h1>
          <p className="mt-4 text-lg text-gray-200 max-w-2xl mx-auto">
            {t("services.pageDesc")}
          </p>
          <div className="mt-6 w-24 h-1 bg-sky-400 mx-auto rounded-full" />
          {/* 4-service quick nav */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { href: "#household", icon: "🏠", label: locale === "th" ? "ช่างซ่อมบ้าน" : locale === "zh" ? "家庭维修" : "Household Fixer", color: "hover:bg-sky-50" },
              { href: "#project", icon: "💼", label: locale === "th" ? "ทีมโครงการ" : locale === "zh" ? "项目团队" : "Project Team", color: "hover:bg-indigo-50" },
              { href: "#professional", icon: "👔", label: locale === "th" ? "มืออาชีพ" : locale === "zh" ? "专业人士" : "Professionals", color: "hover:bg-emerald-50" },
              { href: `${prefix}/properties`, icon: "🏢", label: locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房地产" : "Property", color: "hover:bg-amber-50" },
            ].map((nav) => (
              <a key={nav.href} href={nav.href} className={`inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-slate-900 bg-white ${nav.color} rounded-xl shadow-lg transition-all gap-2`}>
                <span>{nav.icon}</span> {nav.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Household Services */}
      <section id="household" className="py-20 scroll-mt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="inline-block px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold mb-3">🏠 {locale === "th" ? "6 บริการ" : locale === "zh" ? "6项服务" : "6 Services"}</span>
            <h2 className="text-3xl font-bold text-gray-900 border-l-4 border-sky-500 pl-4">
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
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
      <section id="project" className="py-20 bg-white/60 scroll-mt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold mb-3">💼 {locale === "th" ? "20 บริการ" : locale === "zh" ? "20项服务" : "20 Services"}</span>
            <h2 className="text-3xl font-bold text-gray-900 border-l-4 border-indigo-500 pl-4">
              {t("services.projectTitle")}
            </h2>
            <p className="mt-3 text-gray-500 pl-5">
              {t("services.projectDesc")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {projectServices.map((svc) => (
              <Link
                key={svc.id}
                href={`${prefix}/booking/project?service=${svc.value}`}
                className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="h-32 overflow-hidden relative">
                  <Image
                    src={svc.image}
                    alt={svc.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 text-center">
                  <h3 className="text-sm font-bold text-gray-900">{locale === "th" ? svc.nameTh : locale === "zh" ? svc.nameZh : svc.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{locale === "th" ? svc.name : svc.nameTh}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Professional Services */}
      <section id="professional" className="py-20 scroll-mt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold mb-3">👔 {locale === "th" ? "10 บริการ" : locale === "zh" ? "10项服务" : "10 Services"}</span>
            <h2 className="text-3xl font-bold text-gray-900 border-l-4 border-purple-500 pl-4">
              {t("services.professionalTitle")}
            </h2>
            <p className="mt-3 text-gray-500 pl-5">
              {t("services.professionalDesc")}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {professionalServices.map((svc) => (
              <Link
                key={svc.id}
                href={`${prefix}/booking/professional?service=${svc.value}`}
                className="group bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
              >
                <span className="text-4xl block mb-3">{svc.emoji}</span>
                <h3 className="text-sm font-bold text-gray-900">{locale === "th" ? svc.nameTh : locale === "zh" ? svc.nameZh : svc.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{locale === "th" ? svc.name : svc.nameTh}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Real Estate Services */}
      <section id="real-estate" className="py-20 bg-white/60 scroll-mt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold mb-3">🏢 {locale === "th" ? "6 ประเภท" : locale === "zh" ? "6 类型" : "6 Types"}</span>
            <h2 className="text-3xl font-bold text-gray-900 border-l-4 border-amber-500 pl-4">
              {locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房地产服务" : "Real Estate Services"}
            </h2>
            <p className="mt-3 text-gray-500 pl-5">
              {locale === "th"
                ? "ค้นหาและลงประกาศอสังหาริมทรัพย์ทุกประเภท — คอนโด บ้าน ที่ดิน อาคารพาณิชย์ โกดัง พร้อมระบบ AI จับคู่และตัวแทนมืออาชีพ"
                : locale === "zh"
                  ? "搜索和发布各类房产 — 公寓、别墅、土地、商业地产、仓库，配备AI匹配和专业代理"
                  : "Search and list all property types — condos, houses, land, commercial space and warehouses with AI matching and professional agents"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {realEstateServices.map((svc) => (
              <Link
                key={svc.id}
                href={`${prefix}/properties?type=${svc.value}`}
                className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="h-48 overflow-hidden relative">
                  <Image
                    src={svc.image}
                    alt={svc.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <span className="absolute bottom-3 left-3 px-3 py-1 bg-white/90 text-amber-700 rounded-full text-xs font-bold">
                    {locale === "th" ? svc.nameTh : locale === "zh" ? svc.nameZh : svc.name}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900">
                    {locale === "th" ? svc.nameTh : locale === "zh" ? svc.nameZh : svc.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {locale === "th" ? svc.descTh : locale === "zh" ? svc.descZh : svc.desc}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors">
                    {locale === "th" ? "ค้นหา" : locale === "zh" ? "搜索" : "Search"}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Property CTA */}
          <div className="mt-12 text-center">
            <div className="inline-flex flex-col sm:flex-row gap-4">
              <Link
                href={`${prefix}/properties`}
                className="px-8 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition shadow-lg"
              >
                {locale === "th" ? "🔍 ค้นหาอสังหาริมทรัพย์ทั้งหมด" : locale === "zh" ? "🔍 搜索所有房产" : "🔍 Browse All Properties"}
              </Link>
              <Link
                href={`${prefix}/dashboard?tab=property`}
                className="px-8 py-3 bg-white text-amber-700 border-2 border-amber-200 rounded-xl font-semibold hover:bg-amber-50 transition shadow-lg"
              >
                {locale === "th" ? "📝 ลงประกาศขาย/เช่า" : locale === "zh" ? "📝 发布出售/出租" : "📝 List Your Property"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Book Now */}
      <section className="relative py-20 overflow-hidden">
        <Image src="/images/beach.png" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-blue-900/60" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            {t("services.notSure")}
          </h2>
          <p className="mt-3 text-gray-200">
            {t("services.notSureDesc")}
          </p>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <Link href={`${prefix}/booking/household`} className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-sky-50 rounded-xl shadow-lg transition-all gap-2">
              🏠 {locale === "th" ? "จองช่าง" : locale === "zh" ? "预约维修" : "Book Fixer"}
            </Link>
            <Link href={`${prefix}/booking/project`} className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2">
              💼 {locale === "th" ? "จองทีม" : locale === "zh" ? "预约团队" : "Book Project"}
            </Link>
            <Link href={`${prefix}/booking/professional`} className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2">
              👔 {locale === "th" ? "จองมืออาชีพ" : locale === "zh" ? "预约专业" : "Book Pro"}
            </Link>
            <Link href={`${prefix}/properties`} className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2">
              🏢 {locale === "th" ? "อสังหาฯ" : locale === "zh" ? "房产" : "Property"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
