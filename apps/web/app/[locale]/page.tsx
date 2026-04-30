import Link from "next/link";
import Image from "next/image";
import {useTranslations, useLocale} from "next-intl";
import type { Metadata } from "next";
import { ScrollReveal } from "./components/ScrollReveal";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    th: "CBLUE - แพลตฟอร์มช่างซ่อมบำรุง ทีมโครงการ มืออาชีพ และอสังหาริมทรัพย์อันดับ 1 ของไทย",
    en: "CBLUE - Thailand's #1 AI Home Services & Real Estate Platform",
    zh: "CBLUE - 泰国第一AI家居服务与房地产平台",
  };
  const descriptions: Record<string, string> = {
    th: "จองช่างซ่อมบ้าน ทีมโครงการ มืออาชีพ และค้นหาอสังหาริมทรัพย์ทั่วไทย ด้วยระบบ AI จับคู่อัตโนมัติ",
    en: "Book verified fixers, project teams, professionals & browse property listings across Thailand with AI-powered matching.",
    zh: "通过AI智能匹配，预约泰国各地的维修技工、项目团队、专业人士，并浏览房产列表。",
  };
  return {
    title: titles[locale] ?? titles.en!,
    description: descriptions[locale] ?? descriptions.en!,
    alternates: {
      canonical: `/${locale}`,
      languages: { th: "/th", en: "/en", zh: "/zh" },
    },
  };
}

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();
  const prefix = `/${locale}`;

  const stats = [
    { value: "1,000+", labelKey: "fixers" as const },
    { value: "77", labelKey: "provinces" as const },
    { value: "5", labelKey: "tiers" as const },
    { value: "100 ฿", labelKey: "startPrice" as const },
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
      {/* FAQPage JSON-LD for Google/Bing rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: locale === "th" ? "CBLUE คืออะไร?" : locale === "zh" ? "CBLUE是什么？" : "What is CBLUE?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: locale === "th"
                    ? "CBLUE คือแพลตฟอร์มอันดับ 1 ของไทยสำหรับจองช่างซ่อมบ้าน ทีมโครงการ มืออาชีพ และอสังหาริมทรัพย์ ด้วยระบบ AI จับคู่อัตโนมัติ ครอบคลุม 77 จังหวัดทั่วไทย"
                    : locale === "zh"
                    ? "CBLUE是泰国第一的AI智能家居服务平台，提供维修技工、项目团队、专业人士预约及房地产服务，覆盖泰国77个府。"
                    : "CBLUE is Thailand's #1 AI-powered platform for booking verified home fixers, project teams, professionals, and browsing real estate listings across all 77 provinces.",
                },
              },
              {
                "@type": "Question",
                name: locale === "th" ? "จองช่างซ่อมบ้านผ่าน CBLUE เริ่มต้นเท่าไหร่?" : locale === "zh" ? "通过CBLUE预约维修技工费用多少？" : "How much does it cost to book a fixer on CBLUE?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: locale === "th"
                    ? "ค่าดำเนินการเริ่มต้นที่ 100 บาทสำหรับระดับ Economy, 400 บาท Standard, 600 บาท Corporate, 800 บาท Specialist, และ 1,000 บาทสำหรับ Expert ชำระผ่าน PromptPay QR"
                    : locale === "zh"
                    ? "处理费从100泰铢起：Economy 100฿, Standard 400฿, Corporate 600฿, Specialist 800฿, Expert 1,000฿，通过PromptPay二维码支付。"
                    : "Processing fees start at 100 THB for Economy tier, 400 for Standard, 600 for Corporate, 800 for Specialist, and 1,000 THB for Expert tier. Payment via PromptPay QR.",
                },
              },
              {
                "@type": "Question",
                name: locale === "th" ? "CBLUE มีบริการอะไรบ้าง?" : locale === "zh" ? "CBLUE提供哪些服务？" : "What services does CBLUE offer?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: locale === "th"
                    ? "CBLUE ให้บริการ 4 หมวด: (1) ช่างซ่อมบ้าน — ประปา ไฟฟ้า แอร์ ตกแต่งภายใน จัดสวน หลังคา (2) ทีมโครงการ — เว็บไซต์ AI สมาร์ทโฮม โซลาร์เซลล์ 20+ บริการ (3) มืออาชีพ — ทนาย สถาปนิก วิศวกร นักบัญชี (4) อสังหาริมทรัพย์ — ซื้อ ขาย เช่า คอนโด บ้าน ที่ดิน"
                    : locale === "zh"
                    ? "CBLUE提供4大服务：(1)家庭维修——水管、电气、空调、室内设计、园艺、屋顶 (2)项目团队——网站、AI、智能家居、太阳能20+服务 (3)专业人士——律师、建筑师、工程师、会计 (4)房地产——买卖租公寓、别墅、土地"
                    : "CBLUE offers 4 service categories: (1) Household Fixers — plumbing, electrical, AC, interior design, landscaping, roofing (2) Project Teams — website, AI, smart home, solar, 20+ services (3) Professionals — lawyer, architect, engineer, accountant (4) Real Estate — buy, sell, rent condos, houses, land",
                },
              },
              {
                "@type": "Question",
                name: locale === "th" ? "หาช่างซ่อมบ้านใกล้ฉันได้อย่างไร?" : locale === "zh" ? "如何找到附近的家修技工？" : "How do I find a home repair technician near me?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: locale === "th"
                    ? "เลือกบริการที่ต้องการ กรอกรายละเอียดและที่อยู่ ระบบ AI จะจับคู่ช่างซ่อมบ้านที่ดีที่สุด 8 คนในพื้นที่ของคุณ พร้อมแสดงราคา ระดับ และดาวประเมิน"
                    : locale === "zh"
                    ? "选择所需服务，填写详情和地址，AI系统将匹配您所在区域最佳的8位维修技工，显示价格、等级和评价星级。"
                    : "Select your service, fill in details and location. Our AI matches the top 8 verified fixers in your area, showing prices, tier levels, and satisfaction ratings.",
                },
              },
            ],
          }),
        }}
      />
      {/* BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "CBLUE", item: `https://www.cblue.co.th/${locale}` },
            ],
          }),
        }}
      />
      {/* Hero */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image src="/images/swimming-pool.jpg" alt="" fill sizes="100vw" className="object-cover" priority />
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
              ? "CBLUE เชื่อมต่อคุณกับช่างซ่อมบ้าน ทีมโครงการ มืออาชีพ และอสังหาริมทรัพย์ จองง่าย จ่ายผ่าน PromptPay เริ่มต้นเพียง ฿100"
              : locale === "zh"
              ? "CBLUE 连接您与家庭维修技工、项目团队、专业人士和房地产服务。轻松预约，PromptPay 支付，起价仅 ฿100"
              : "CBLUE connects you with household fixers, project teams, professionals, and real estate services. Easy booking, pay via PromptPay, starting from just ฿100."}
          </p>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <Link
              href={`${prefix}/booking/household`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-sky-50 rounded-xl shadow-lg transition-all gap-2"
            >
              <span></span> {locale === "th" ? "จองช่าง" : locale === "zh" ? "预约技工" : "Book Fixer"}
            </Link>
            <Link
              href={`${prefix}/booking/project`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2"
            >
              <span></span> {locale === "th" ? "จองทีมโครงการ" : locale === "zh" ? "预约项目团队" : "Book Project"}
            </Link>
            <Link
              href={`${prefix}/booking/professional`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2"
            >
              <span></span> {locale === "th" ? "จองมืออาชีพ" : locale === "zh" ? "预约专业人士" : "Book Pro"}
            </Link>
            <Link
              href={`${prefix}/properties`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2"
            >
              <span></span> {locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房地产" : "Property"}
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
                href: `${prefix}/booking/household`, icon: "", image: "/images/hvac.png",
                title: locale === "th" ? "จองช่างซ่อมบ้าน" : locale === "zh" ? "预约家庭维修" : "Book Household Fixer",
                desc: locale === "th" ? "ประปา ไฟฟ้า แอร์ ตกแต่งภายใน จัดสวน และอื่นๆ" : locale === "zh" ? "水电、空调、室内装修、園艺等" : "Plumbing, electrical, AC, interior, landscaping, and more",
                color: "from-sky-500 to-blue-600", items: locale === "th" ? ["ช่างประปา", "ช่างไฟฟ้า", "ช่างแอร์", "ตกแต่งภายใน", "จัดสวน", "Cladding"] : locale === "zh" ? ["水管", "电气", "空调", "室内", "園艺", "幕墙"] : ["Plumbing", "Electrical", "AC & HVAC", "Interior", "Landscaping", "Cladding"],
              },
              {
                href: `${prefix}/booking/project`, icon: "", image: "/images/smart-home.jpg",
                title: locale === "th" ? "จองทีมโครงการ" : locale === "zh" ? "预约项目团队" : "Book Project Team",
                desc: locale === "th" ? "เว็บไซต์ AI สมาร์ทโฮม พลังงานแสงอาทิตย์ และ 20+ บริการ" : locale === "zh" ? "网站、AI、智能家居、太阳能等20+服务" : "Website, AI, smart home, solar, and 20+ project services",
                color: "from-indigo-500 to-purple-600", items: locale === "th" ? ["เว็บไซต์", "AI/ML", "สมาร์ทโฮม", "โซลาร์", "EV Charger", "20+ บริการ"] : locale === "zh" ? ["网站", "AI/ML", "智能家居", "太阳能", "EV充电", "20+服务"] : ["Website", "AI/ML", "Smart Home", "Solar", "EV Charger", "20+ Services"],
              },
              {
                href: `${prefix}/booking/professional`, icon: "", image: "/images/scenic-building.jpg",
                title: locale === "th" ? "จองมืออาชีพ" : locale === "zh" ? "预约专业人士" : "Book Professional",
                desc: locale === "th" ? "ทนายความ สถาปนิก วิศวกร นักบัญชี โปรแกรมเมอร์" : locale === "zh" ? "律师、建筑师、工程师、会计、程序员" : "Lawyer, architect, engineer, accountant, programmer",
                color: "from-emerald-500 to-teal-600", items: locale === "th" ? ["ทนายความ", "สถาปนิก", "วิศวกร", "นักบัญชี", "IT/Dev", "การตลาด"] : locale === "zh" ? ["律师", "建筑师", "工程师", "会计", "IT/Dev", "营销"] : ["Lawyer", "Architect", "Engineer", "CPA", "IT/Dev", "Marketing"],
              },
              {
                href: `${prefix}/properties`, icon: "", image: "/images/scenic-house.jpg",
                title: locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房地产" : "Book Property",
                desc: locale === "th" ? "ซื้อ ขาย เช่า คอนโด บ้าน ทาวน์เฮาส์ ที่ดิน" : locale === "zh" ? "买卖租 — 公寓、别墅、联排别墅、土地" : "Buy, sell, rent — condos, houses, townhouses, land",
                color: "from-amber-500 to-orange-600", items: locale === "th" ? ["คอนโด", "บ้านเดี่ยว", "ทาวน์เฮาส์", "ที่ดิน", "ออฟฟิศ", "พาณิชย์"] : locale === "zh" ? ["公寓", "别墅", "联排", "土地", "办公", "商业"] : ["Condo", "House", "Townhouse", "Land", "Office", "Commercial"],
              },
            ].map((svc) => (
              <Link key={svc.href} href={svc.href} className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
                <div className="flex flex-col sm:flex-row">
                  <div className="relative sm:w-2/5 h-48 sm:h-auto overflow-hidden">
                    <Image src={svc.image} alt="" fill sizes="(max-width: 640px) 100vw, 40vw" className="object-cover group-hover:scale-110 transition-transform duration-500" />
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
                      {locale === "th" ? "จองเลย →" : locale === "zh" ? "立即预约 →" : "Book Now →"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* About Us & Contact Us — Quick Links */}
      <section className="py-16 bg-white/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
          <div className="flex flex-col gap-4 w-full">
            <Link
              href={`${prefix}/about`}
              className="group bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl px-8 py-5 flex items-center gap-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-sky-100"
            >
              <span className="text-3xl flex-shrink-0"></span>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-sky-600 transition-colors">
                  {locale === "th" ? "เกี่ยวกับเรา" : locale === "zh" ? "关于我们" : "About Us"}
                </h3>
                <p className="mt-1 text-sm text-gray-500 truncate sm:whitespace-normal">
                  {locale === "th"
                    ? "เรียนรู้เกี่ยวกับ CBLUE แพลตฟอร์มบริการครบวงจร AI อันดับ 1 ของไทย"
                    : locale === "zh"
                    ? "了解 CBLUE — 泰国第一AI全方位服务平台"
                    : "Learn about CBLUE — Thailand's #1 AI-powered all-in-one service platform"}
                </p>
              </div>
              <span className="flex-shrink-0 text-sm font-bold text-sky-600 group-hover:text-sky-700 whitespace-nowrap">
                {locale === "th" ? "อ่านเพิ่มเติม →" : locale === "zh" ? "了解更多 →" : "Learn More →"}
              </span>
            </Link>
            <Link
              href={`${prefix}/get-support`}
              className="group bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl px-8 py-5 flex items-center gap-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-emerald-100"
            >
              <span className="text-3xl flex-shrink-0"></span>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                  {locale === "th" ? "ติดต่อเรา" : locale === "zh" ? "联系我们" : "Contact Us"}
                </h3>
                <p className="mt-1 text-sm text-gray-500 truncate sm:whitespace-normal">
                  {locale === "th"
                    ? "มีคำถาม? ต้องการความช่วยเหลือ? ทีมงานพร้อมให้บริการคุณ"
                    : locale === "zh"
                    ? "有问题？需要帮助？我们的团队随时为您服务"
                    : "Have questions? Need help? Our team is ready to assist you"}
                </p>
              </div>
              <span className="flex-shrink-0 text-sm font-bold text-emerald-600 group-hover:text-emerald-700 whitespace-nowrap">
                {locale === "th" ? "ติดต่อเลย →" : locale === "zh" ? "立即联系 →" : "Get In Touch →"}
              </span>
            </Link>
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Zone — Why Choose CBLUE */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold mb-4">
              {locale === "th" ? "โซน CBLUE" : locale === "zh" ? "CBLUE 专区" : "CBLUE Zone"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              {locale === "th" ? "ทำไมต้องเลือก CBLUE?" : locale === "zh" ? "为什么选择 CBLUE？" : "Why Choose CBLUE?"}
            </h2>
            <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
              {locale === "th"
                ? "แพลตฟอร์มบริการครบวงจรที่ขับเคลื่อนด้วย AI เชื่อมต่อลูกค้ากับพาร์ทเนอร์คุณภาพทั่วไทย 77 จังหวัด"
                : locale === "zh"
                ? "AI驱动的一站式服务平台，连接客户与泰国77府优质合作伙伴"
                : "AI-powered all-in-one service platform connecting customers with quality partners across all 77 provinces of Thailand"}
            </p>
            <div className="mt-4 w-24 h-1 bg-indigo-500 mx-auto rounded-full" />
          </div>

          {/* Customer Zone */}
          <div className="mb-16">
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl overflow-hidden shadow-xl border border-sky-100">
              <div className="bg-gradient-to-r from-sky-600 to-blue-600 px-8 py-5">
                <h3 className="text-xl font-bold text-white text-center">
                  {locale === "th" ? " สำหรับลูกค้า — จองง่าย จ่ายสะดวก ช่างมืออาชีพถึงบ้าน" : locale === "zh" ? " 客户专区 — 轻松预约，专业上门服务" : " For Customers — Easy Booking, Verified Pros at Your Door"}
                </h3>
              </div>
              <div className="p-8">
                <p className="text-center text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed">
                  {locale === "th"
                    ? "CBLUE ใช้ AI จับคู่อัจฉริยะเพื่อเสนอช่างซ่อมบ้าน ทีมโครงการ มืออาชีพ และอสังหาริมทรัพย์ที่ดีที่สุดในพื้นที่ของคุณ ราคาโปร่งใส 5 ระดับ จ่ายผ่าน PromptPay QR เริ่มต้นเพียง ฿100 พร้อมรับประกันคุณภาพและระบบรีวิวจริง"
                    : locale === "zh"
                    ? "CBLUE 使用 AI 智能匹配，为您推荐最优质的维修技工、项目团队、专业人士和房产。5级透明定价，PromptPay扫码支付，起价仅฿100，品质保障与真实评价"
                    : "CBLUE uses AI smart matching to recommend the best household fixers, project teams, professionals, and properties in your area. Transparent 5-tier pricing, PromptPay QR payment starting from just ฿100, quality guarantee, and verified reviews."}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <Link href={`${prefix}/booking/household`} className="bg-white rounded-xl p-5 text-center shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-sky-100 group">
                    <span className="text-3xl block mb-2"></span>
                    <span className="text-sm font-bold text-gray-800 group-hover:text-sky-600">{locale === "th" ? "ช่างซ่อมบ้าน" : locale === "zh" ? "家庭维修" : "Household Fixer"}</span>
                    <p className="text-xs text-gray-400 mt-1">{locale === "th" ? "ประปา ไฟฟ้า แอร์" : locale === "zh" ? "水电、空调" : "Plumbing, Electrical, AC"}</p>
                  </Link>
                  <Link href={`${prefix}/booking/project`} className="bg-white rounded-xl p-5 text-center shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-sky-100 group">
                    <span className="text-3xl block mb-2"></span>
                    <span className="text-sm font-bold text-gray-800 group-hover:text-sky-600">{locale === "th" ? "ทีมโครงการ" : locale === "zh" ? "项目团队" : "Project Team"}</span>
                    <p className="text-xs text-gray-400 mt-1">{locale === "th" ? "IT สมาร์ทโฮม โซลาร์" : locale === "zh" ? "IT、智能家居、太阳能" : "IT, Smart Home, Solar"}</p>
                  </Link>
                  <Link href={`${prefix}/booking/professional`} className="bg-white rounded-xl p-5 text-center shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-sky-100 group">
                    <span className="text-3xl block mb-2"></span>
                    <span className="text-sm font-bold text-gray-800 group-hover:text-sky-600">{locale === "th" ? "มืออาชีพ" : locale === "zh" ? "专业人士" : "Professional"}</span>
                    <p className="text-xs text-gray-400 mt-1">{locale === "th" ? "ทนาย สถาปนิก วิศวกร" : locale === "zh" ? "律师、建筑师、工程师" : "Lawyer, Architect, Engineer"}</p>
                  </Link>
                  <Link href={`${prefix}/properties`} className="bg-white rounded-xl p-5 text-center shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-sky-100 group">
                    <span className="text-3xl block mb-2"></span>
                    <span className="text-sm font-bold text-gray-800 group-hover:text-sky-600">{locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房地产" : "Real Estate"}</span>
                    <p className="text-xs text-gray-400 mt-1">{locale === "th" ? "คอนโด บ้าน ที่ดิน" : locale === "zh" ? "公寓、别墅、土地" : "Condo, House, Land"}</p>
                  </Link>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="https://apps.apple.com/app/cblue-customer/id6504100001" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition shadow-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    {locale === "th" ? "Customer App — App Store" : locale === "zh" ? "客户端 — App Store" : "Customer App — App Store"}
                  </a>
                  <a href="https://play.google.com/store/apps/details?id=com.cblue.customer" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition shadow-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35m13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27m3.35-4.31c.34.27.56.69.56 1.19s-.22.92-.56 1.19l-2.29 1.32-2.5-2.5 2.5-2.5 2.29 1.3M6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z"/></svg>
                    {locale === "th" ? "Customer App — Google Play" : locale === "zh" ? "客户端 — Google Play" : "Customer App — Google Play"}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Partner Zone */}
          <div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl overflow-hidden shadow-xl border border-emerald-100">
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-8 py-5">
                <h3 className="text-xl font-bold text-white text-center">
                  {locale === "th" ? "สำหรับพาร์ทเนอร์ — รับงาน เพิ่มรายได้ เติบโตไปด้วยกัน" : locale === "zh" ? "合作伙伴 — 接单赚钱，共同成长" : "For Partners"}
                </h3>
              </div>
              <div className="p-8">
                <p className="text-center text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed">
                  {locale === "th"
                    ? "สมัครเป็นพาร์ทเนอร์ CBLUE วันนี้! ระบบ AI จะประเมินโปรไฟล์และจัดอันดับคุณใน 5 ระดับ (Economy – Expert) เพื่อให้คุณได้งานที่ตรงกับทักษะ รับการแจ้งเตือนงานใหม่ทันที แชทกับลูกค้า และรับเงินผ่าน PromptPay อย่างปลอดภัย"
                    : locale === "zh"
                    ? "立即成为 CBLUE 合作伙伴！AI 系统评估您的资料并分配5个等级（Economy-Expert），匹配适合您技能的工作。即时通知、客户聊天、PromptPay安全收款"
                    : "Join CBLUE as a partner today! Our AI system evaluates your profile and ranks you across 5 tiers (Economy – Expert) to match you with jobs that fit your skills. Instant job alerts, customer chat, and secure PromptPay payments."}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <Link href={`${prefix}/fixers`} className="bg-white rounded-xl p-5 text-center shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-emerald-100 group">
                    <span className="text-3xl block mb-2"></span>
                    <span className="text-sm font-bold text-gray-800 group-hover:text-emerald-600">{locale === "th" ? "ช่างซ่อมบ้าน" : locale === "zh" ? "维修师" : "Fixer"}</span>
                    <p className="text-xs text-gray-400 mt-1">{locale === "th" ? "รับงานซ่อมบำรุงทั่วไทย" : locale === "zh" ? "全国家庭维修" : "Home repair jobs nationwide"}</p>
                  </Link>
                  <Link href={`${prefix}/fixers`} className="bg-white rounded-xl p-5 text-center shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-emerald-100 group">
                    <span className="text-3xl block mb-2"></span>
                    <span className="text-sm font-bold text-gray-800 group-hover:text-emerald-600">{locale === "th" ? "ทีมโครงการ" : locale === "zh" ? "项目团队" : "Project Team"}</span>
                    <p className="text-xs text-gray-400 mt-1">{locale === "th" ? "รับโปรเจกต์ IT โซลาร์" : locale === "zh" ? "IT、太阳能、智能项目" : "IT, solar, smart projects"}</p>
                  </Link>
                  <Link href={`${prefix}/fixers`} className="bg-white rounded-xl p-5 text-center shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-emerald-100 group">
                    <span className="text-3xl block mb-2"></span>
                    <span className="text-sm font-bold text-gray-800 group-hover:text-emerald-600">{locale === "th" ? "มืออาชีพ" : locale === "zh" ? "专业人士" : "Professional"}</span>
                    <p className="text-xs text-gray-400 mt-1">{locale === "th" ? "ทนาย สถาปนิก วิศวกร" : locale === "zh" ? "律师、建筑师、工程师" : "Lawyers, architects, engineers"}</p>
                  </Link>
                  <Link href={`${prefix}/fixers`} className="bg-white rounded-xl p-5 text-center shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-emerald-100 group">
                    <span className="text-3xl block mb-2"></span>
                    <span className="text-sm font-bold text-gray-800 group-hover:text-emerald-600">{locale === "th" ? "ตัวแทนอสังหาฯ" : locale === "zh" ? "房产发布者" : "Property Lister"}</span>
                    <p className="text-xs text-gray-400 mt-1">{locale === "th" ? "ลงประกาศขาย/เช่า" : locale === "zh" ? "发布出售/出租房产" : "List properties for sale/rent"}</p>
                  </Link>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="https://apps.apple.com/app/cblue-partner/id6504100002" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    {locale === "th" ? "Partner App — App Store" : locale === "zh" ? "合作伙伴端 — App Store" : "Partner App — App Store"}
                  </a>
                  <a href="https://play.google.com/store/apps/details?id=com.cblue.partner" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35m13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27m3.35-4.31c.34.27.56.69.56 1.19s-.22.92-.56 1.19l-2.29 1.32-2.5-2.5 2.5-2.5 2.29 1.3M6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z"/></svg>
                    {locale === "th" ? "Partner App — Google Play" : locale === "zh" ? "合作伙伴端 — Google Play" : "Partner App — Google Play"}
                  </a>
                </div>
              </div>
            </div>
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
          <Image src="/images/green-theme.jpg" alt="" fill sizes="100vw" className="object-cover" />
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
               {locale === "th" ? "จองช่าง" : locale === "zh" ? "预约技工" : "Book Fixer"}
            </Link>
            <Link
              href={`${prefix}/booking/project`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2"
            >
               {locale === "th" ? "จองทีม" : locale === "zh" ? "项目团队" : "Book Project"}
            </Link>
            <Link
              href={`${prefix}/booking/professional`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2"
            >
               {locale === "th" ? "จองมืออาชีพ" : locale === "zh" ? "预约专业人士" : "Book Pro"}
            </Link>
            <Link
              href={`${prefix}/properties`}
              className="inline-flex items-center justify-center px-4 py-3 text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all gap-2"
            >
               {locale === "th" ? "อสังหาฯ" : locale === "zh" ? "房产" : "Property"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
