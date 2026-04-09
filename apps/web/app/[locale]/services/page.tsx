import Link from "next/link";
import Image from "next/image";
import {useTranslations, useLocale} from "next-intl";

const householdServices = [
  { id: "plumbing", serviceValue: "PLUMBING", image: "/images/hvac.png", titleKey: "plumbing", descKey: "plumbingDesc" },
  { id: "electrical", serviceValue: "ELECTRICAL", image: "/images/ev-charger.jpg", titleKey: "electrical", descKey: "electricalDesc" },
  { id: "ac", serviceValue: "AC", image: "/images/smart-home.jpg", titleKey: "ac", descKey: "acDesc" },
  { id: "interior", serviceValue: "INTERIOR", image: "/images/green-construction.jpg", titleKey: "interior", descKey: "interiorDesc" },
  { id: "landscaping", serviceValue: "LANDSCAPING", image: "/images/smart-farming.jpg", titleKey: "landscaping", descKey: "landscapingDesc" },
  { id: "cladding", serviceValue: "CLADDING_ROOFING", image: "/images/solar-panel.jpg", titleKey: "cladding", descKey: "claddingDesc" },
];

const projectServices = [
  { id: "website", value: "WEBSITE_DEVELOPMENT", image: "/images/website-development.jpg", name: "Website Development", nameTh: "พัฒนาเว็บไซต์" },
  { id: "mobile-app", value: "MOBILE_APP_DEVELOPMENT", image: "/images/software.jpg", name: "Mobile App Development", nameTh: "พัฒนาแอปมือถือ" },
  { id: "ai-integration", value: "AI_INTEGRATION", image: "/images/ai-chatbot.jpg", name: "AI Integration", nameTh: "AI Integration" },
  { id: "ai-chatbot", value: "AI_CHATBOT", image: "/images/ai-chatbot.jpg", name: "AI Chatbot", nameTh: "แชทบอท AI" },
  { id: "software-dev", value: "SOFTWARE_DEV", image: "/images/software.jpg", name: "Software Development", nameTh: "พัฒนาซอฟต์แวร์" },
  { id: "ml-ai", value: "ML_AI", image: "/images/ai-chatbot.jpg", name: "ML & AI", nameTh: "ML & AI" },
  { id: "consulting", value: "CONSULTING", image: "/images/website-development.jpg", name: "Consulting", nameTh: "ที่ปรึกษา" },
  { id: "solar-panels", value: "SOLAR_PANELS", image: "/images/solar-panel.jpg", name: "Solar Panels", nameTh: "แผงโซลาร์" },
  { id: "ev-charging", value: "EV_CHARGING", image: "/images/ev-charger.jpg", name: "EV Charging", nameTh: "สถานีชาร์จ EV" },
  { id: "green-building", value: "GREEN_BUILDING_DESIGN", image: "/images/green-construction.jpg", name: "Green Building Design", nameTh: "ออกแบบอาคารสีเขียว" },
  { id: "kitchen", value: "KITCHEN", image: "/images/green-construction.jpg", name: "Kitchen", nameTh: "ครัว" },
  { id: "hvac-mep", value: "MEP_RETROFIT", image: "/images/hvac.png", name: "HVAC MEP & Retrofit", nameTh: "HVAC MEP" },
  { id: "reinstatement", value: "REINSTATEMENT", image: "/images/green-construction.jpg", name: "Reinstatement & Fit-out", nameTh: "คืนสภาพและตกแต่ง" },
  { id: "automation", value: "SMART_BUILDING_AUTOMATION", image: "/images/smart-home.jpg", name: "Smart Building Automation", nameTh: "ระบบอัตโนมัติ" },
  { id: "environmental", value: "ENVIRONMENTAL_SERVICES", image: "/images/green-theme.jpg", name: "Environmental Services", nameTh: "บริการสิ่งแวดล้อม" },
  { id: "security-cctv", value: "SECURITY_CCTV", image: "/images/security-system.jpg", name: "Security & CCTV", nameTh: "ระบบ CCTV" },
  { id: "door-access", value: "DOOR_ACCESS_CONTROL", image: "/images/security-system.jpg", name: "Door & Access Control", nameTh: "ระบบควบคุมประตู" },
  { id: "green-construction", value: "GREEN_CONSTRUCTION", image: "/images/green-construction.jpg", name: "Green Construction", nameTh: "ก่อสร้างสีเขียว" },
  { id: "smart-home", value: "SMART_HOME", image: "/images/smart-home.jpg", name: "Smart Home/Building", nameTh: "สมาร์ทโฮม" },
  { id: "smart-farming", value: "SMART_FARMING", image: "/images/smart-farming.jpg", name: "Smart Farming", nameTh: "สมาร์ทฟาร์มมิ่ง" },
];

const professionalServices = [
  { id: "lawyer", value: "LAWYER", image: "/images/website-development.jpg", name: "Lawyer", nameTh: "ทนายความ" },
  { id: "accountant", value: "ACCOUNTANT", image: "/images/software.jpg", name: "Accountant", nameTh: "บัญชี" },
  { id: "cpa", value: "CPA", image: "/images/software.jpg", name: "CPA", nameTh: "ผู้สอบบัญชี" },
  { id: "architect", value: "ARCHITECT", image: "/images/green-construction.jpg", name: "Architect", nameTh: "สถาปนิก" },
  { id: "interior-designer", value: "INTERIOR_DESIGNER", image: "/images/loft-interior.jpg", name: "Interior Designer", nameTh: "มัณฑนากร" },
  { id: "design-civil-engineer", value: "DESIGN_CIVIL_ENGINEER", image: "/images/green-construction.jpg", name: "Design Civil Engineer", nameTh: "วิศวกรโยธาออกแบบ" },
  { id: "construction-civil-engineer", value: "CONSTRUCTION_CIVIL_ENGINEER", image: "/images/hvac.png", name: "Construction Civil Engineer", nameTh: "วิศวกรโยธาก่อสร้าง" },
  { id: "design-mechanical-engineer", value: "DESIGN_MECHANICAL_ENGINEER", image: "/images/hvac.png", name: "Design Mechanical Engineer", nameTh: "วิศวกรเครื่องกลออกแบบ" },
  { id: "construction-mechanical-engineer", value: "CONSTRUCTION_MECHANICAL_ENGINEER", image: "/images/ev-charger.jpg", name: "Construction Mechanical Engineer", nameTh: "วิศวกรเครื่องกลก่อสร้าง" },
  { id: "design-electrical-engineer", value: "DESIGN_ELECTRICAL_ENGINEER", image: "/images/solar-panel.jpg", name: "Design Electrical Engineer", nameTh: "วิศวกรไฟฟ้าออกแบบ" },
  { id: "construction-electrical-engineer", value: "CONSTRUCTION_ELECTRICAL_ENGINEER", image: "/images/solar-panel.jpg", name: "Construction Electrical Engineer", nameTh: "วิศวกรไฟฟ้าก่อสร้าง" },
  { id: "software-programmer", value: "SOFTWARE_PROGRAMMER", image: "/images/ai-chatbot.jpg", name: "Software Programmer", nameTh: "โปรแกรมเมอร์" },
  { id: "digital-marketing", value: "DIGITAL_MARKETING", image: "/images/website-development.jpg", name: "Digital Marketing", nameTh: "การตลาดดิจิทัล" },
  { id: "safety-officer", value: "SAFETY_OFFICER", image: "/images/security-system.jpg", name: "Safety Officer", nameTh: "เจ้าหน้าที่ความปลอดภัย" },
  { id: "others", value: "OTHERS", image: "/images/green-theme.jpg", name: "Others", nameTh: "อื่น ๆ" },
];

const realEstateServices = [
  { id: "condo", value: "CONDO", image: "/images/scenic-building.jpg", name: "Condominium", nameTh: "คอนโดมิเนียม", nameZh: "公寓", desc: "Buy, sell, or rent condos", descTh: "ซื้อ ขาย หรือเช่าคอนโด" },
  { id: "house", value: "HOUSE", image: "/images/scenic-house.jpg", name: "House & Villa", nameTh: "บ้านและวิลล่า", nameZh: "别墅", desc: "Single houses, townhouses & villas", descTh: "บ้านเดี่ยว ทาวน์เฮาส์ และวิลล่า" },
  { id: "apartment", value: "APARTMENT", image: "/images/loft-interior.jpg", name: "Apartment", nameTh: "อพาร์ทเมนท์", nameZh: "公寓楼", desc: "Apartment units for rent or sale", descTh: "อพาร์ทเมนท์เช่าหรือขาย" },
  { id: "land", value: "LAND", image: "/images/smart-farming.jpg", name: "Land", nameTh: "ที่ดิน", nameZh: "土地", desc: "Land plots for development or investment", descTh: "ที่ดินเพื่อพัฒนาหรือลงทุน" },
  { id: "commercial", value: "COMMERCIAL", image: "/images/green-construction.jpg", name: "Commercial", nameTh: "อาคารพาณิชย์", nameZh: "商业地产", desc: "Office, retail & commercial spaces", descTh: "ออฟฟิศ ร้านค้า พื้นที่พาณิชย์" },
  { id: "warehouse", value: "WAREHOUSE", image: "/images/hvac.png", name: "Warehouse & Factory", nameTh: "โกดังและโรงงาน", nameZh: "仓库工厂", desc: "Warehouses, factories & industrial space", descTh: "โกดัง โรงงาน พื้นที่อุตสาหกรรม" },
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
            {locale === "th" ? "บริการทั้งหมด" : "All Services"}
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">{t("services.pageTitle")}</h1>
          <p className="mt-4 text-lg text-gray-200 max-w-2xl mx-auto">
            {t("services.pageDesc")}
          </p>
          <div className="mt-6 w-24 h-1 bg-sky-400 mx-auto rounded-full" />
          {/* 4-service quick nav */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { href: "#household", icon: "🏠", label: locale === "th" ? "ช่างซ่อมบ้าน" : "Household Fixer", color: "hover:bg-sky-50" },
              { href: "#project", icon: "💼", label: locale === "th" ? "ทีมโครงการ" : "Project Team", color: "hover:bg-indigo-50" },
              { href: "#professional", icon: "👔", label: locale === "th" ? "มืออาชีพ" : "Professionals", color: "hover:bg-emerald-50" },
              { href: `${prefix}/properties`, icon: "🏢", label: locale === "th" ? "อสังหาริมทรัพย์" : "Property", color: "hover:bg-amber-50" },
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
            <span className="inline-block px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold mb-3">🏠 {locale === "th" ? "6 บริการ" : "6 Services"}</span>
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
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold mb-3">💼 {locale === "th" ? "20 บริการ" : "20 Services"}</span>
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
                    className="object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 text-center">
                  <h3 className="text-sm font-bold text-gray-900">{svc.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{svc.nameTh}</p>
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
            <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold mb-3">👔 {locale === "th" ? "15 บริการ" : "15 Services"}</span>
            <h2 className="text-3xl font-bold text-gray-900 border-l-4 border-purple-500 pl-4">
              {t("services.professionalTitle")}
            </h2>
            <p className="mt-3 text-gray-500 pl-5">
              {t("services.professionalDesc")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {professionalServices.map((svc) => (
              <Link
                key={svc.id}
                href={`${prefix}/booking/professional?service=${svc.value}`}
                className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="h-32 overflow-hidden relative">
                  <Image
                    src={svc.image}
                    alt={svc.name}
                    fill
                    className="object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 text-center">
                  <h3 className="text-sm font-bold text-gray-900">{svc.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{svc.nameTh}</p>
                </div>
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
                    {locale === "th" ? svc.descTh : svc.desc}
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
              🏠 {locale === "th" ? "จองช่าง" : "Book Fixer"}
            </Link>
            <Link href={`${prefix}/booking/project`} className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2">
              💼 {locale === "th" ? "จองทีม" : "Book Project"}
            </Link>
            <Link href={`${prefix}/booking/professional`} className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2">
              👔 {locale === "th" ? "จองมืออาชีพ" : "Book Pro"}
            </Link>
            <Link href={`${prefix}/properties`} className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2">
              🏢 {locale === "th" ? "อสังหาฯ" : "Property"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
