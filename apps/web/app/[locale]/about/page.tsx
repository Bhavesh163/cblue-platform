"use client";

import { useLocale } from "next-intl";
import Image from "next/image";

const T: Record<string, Record<string, string>> = {
  en: {
    title: "About CBLUE",
    subtitle: "Building a sustainable future for Thailand",
    introTitle: "Who We Are",
    introText: "CBLUE Co., Ltd. is Thailand's leading platform connecting households and businesses with certified fixers, professionals, and real estate services. We leverage modern technology to create seamless experiences for booking home maintenance, professional services, and property transactions nationwide.",
    missionTitle: "Our Mission",
    missionText: "To make quality home maintenance, professional services, and real estate accessible to everyone across Thailand through technology, transparency, and trust.",
    visionTitle: "Our Vision",
    visionText: "To become Southeast Asia's most trusted platform for household services, connecting millions of skilled professionals with the communities they serve.",
    envTitle: "The Future of Environment & Housing",
    envText: "The environment remains at the heart of global concern. As climate change impacts intensify — rising sea levels, more frequent natural disasters, and unpredictable weather — we must rethink how we use natural resources and redesign our cities. Green infrastructure is becoming a key strategy in urban planning, especially in flood-prone coastal areas. Solutions such as wetlands, mangroves, and drought-resistant landscaping enhance climate resilience.",
    envText2: "In urban areas, we'll see a shift toward sustainable cities that integrate natural environments with built structures. Urban forests, green roofs, and community gardens will become common features, bringing nature closer to everyday city life. Buildings will become ecosystems — incorporating air-purifying plants, water filtration systems, and urban farming spaces.",
    designTitle: "Future of Building Design & Housing",
    designText: "The next era of building design will be driven by green architecture, flexibility, and resilience. Future buildings will reduce environmental impact through sustainable materials like bamboo, recycled steel, and mycelium composites.",
    designFeatures: "Key features of sustainable future homes include:\n• Solar panels and rainwater harvesting systems\n• High-efficiency insulation and natural ventilation\n• Solar thermal heating to reduce energy consumption\n• Prefabricated and modular construction for urban areas",
    smartTitle: "Smart Building & Home Automation",
    smartText: "Building Automation Systems (BAS) play a crucial role in revolutionizing smart homes. As IoT becomes widespread, buildings will become increasingly autonomous — controlling energy use, comfort, and safety.",
    smartFeatures: "Smart homes will feature:\n• Intelligent lighting that adjusts to usage patterns\n• Smart thermostats analyzing weather for energy savings\n• Real-time monitoring for safety — gas leaks, electrical shorts",
    carbonTitle: "Decarbonization: The Path to Net Zero",
    carbonText: "A key goal in future building design and urban planning is reducing CO2 emissions. Achieving net-zero emissions will be globally important. Future buildings will integrate renewable energy — solar, wind, and geothermal — into their design. Smart windows that adjust to sunlight intensity will further reduce energy consumption.",
    servicesTitle: "Our Services",
    service1: "Household Maintenance — Plumbing, Electrical, AC, Interior, Landscaping, Roofing",
    service2: "Project Services — Website Dev, AI, Solar, Smart Home, Green Construction",
    service3: "Professional Services — Lawyers, Architects, Engineers, Accountants",
    service4: "Real Estate — Buy, Sell, Rent condos, houses, land nationwide",
  },
  th: {
    title: "เกี่ยวกับ CBLUE",
    subtitle: "สร้างอนาคตที่ยั่งยืนสำหรับประเทศไทย",
    introTitle: "เราคือใคร",
    introText: "บริษัท ซีบลู จำกัด เป็นแพลตฟอร์มชั้นนำของประเทศไทยที่เชื่อมต่อครัวเรือนและธุรกิจกับช่างที่ได้รับการรับรอง มืออาชีพ และบริการอสังหาริมทรัพย์ เราใช้เทคโนโลยีสมัยใหม่เพื่อสร้างประสบการณ์ที่ราบรื่นสำหรับการจองบริการบำรุงรักษาบ้าน บริการมืออาชีพ และธุรกรรมอสังหาริมทรัพย์ทั่วประเทศ",
    missionTitle: "พันธกิจของเรา",
    missionText: "ทำให้บริการบำรุงรักษาบ้าน บริการมืออาชีพ และอสังหาริมทรัพย์คุณภาพเข้าถึงได้ทุกคนทั่วประเทศไทย ผ่านเทคโนโลยี ความโปร่งใส และความไว้วางใจ",
    visionTitle: "วิสัยทัศน์",
    visionText: "เป็นแพลตฟอร์มที่น่าเชื่อถือที่สุดในเอเชียตะวันออกเฉียงใต้สำหรับบริการครัวเรือน เชื่อมต่อมืออาชีพที่มีทักษะหลายล้านคนกับชุมชนที่พวกเขาให้บริการ",
    envTitle: "อนาคตของสิ่งแวดล้อมโลกและที่อยู่อาศัย",
    envText: "สิ่งแวดล้อมจะยังคงเป็นศูนย์กลางของความกังวลทั่วโลก เมื่อผลกระทบของการเปลี่ยนแปลงสภาพภูมิอากาศรุนแรงขึ้น ระดับน้ำทะเลที่เพิ่มสูงขึ้น ภัยพิบัติทางธรรมชาติที่บ่อยขึ้น การใช้โครงสร้างพื้นฐานสีเขียวจะกลายเป็นกลยุทธ์สำคัญในการวางผังเมือง โดยเฉพาะในพื้นที่ชายฝั่งที่เสี่ยงต่ออุทกภัย",
    envText2: "ในเขตเมืองเราจะเห็นการเปลี่ยนแปลงไปสู่เมืองที่ยั่งยืน ป่าในเมือง หลังคาสีเขียว และสวนชุมชนจะเป็นฟีเจอร์ที่พบได้ทั่วไป อาคารต่างๆจะเป็นเหมือนระบบนิเวศที่มากกว่าการเป็นที่พักอาศัย",
    designTitle: "อนาคตของการออกแบบอาคารและที่อยู่อาศัย",
    designText: "ยุคถัดไปของการออกแบบอาคารจะขับเคลื่อนโดยสถาปัตยกรรมสีเขียว ความยืดหยุ่น และความแข็งแรงต่อการเปลี่ยนแปลงทางธรรมชาติ อาคารในอนาคตจะมุ่งลดผลกระทบต่อสิ่งแวดล้อมผ่านการใช้วัสดุที่ยั่งยืน เช่น ไม้ไผ่ เหล็กรีไซเคิล และคอมโพสิตจากเห็ดรา",
    designFeatures: "คุณสมบัติสำคัญของบ้านที่ยั่งยืนในอนาคต:\n• แผงโซลาร์เซลล์และระบบเก็บน้ำฝน\n• ฉนวนกันความร้อนที่มีประสิทธิภาพและการระบายอากาศตามธรรมชาติ\n• ระบบทำความร้อนจากพลังงานแสงอาทิตย์\n• บ้านสำเร็จรูปและแบบแยกส่วน",
    smartTitle: "ระบบอัตโนมัติสำหรับอาคารและบ้านอัจฉริยะ",
    smartText: "ระบบอัตโนมัติในอาคาร (BAS) มีบทบาทสำคัญในการปฏิวัติบ้านอัจฉริยะ เมื่อ IoT แพร่หลาย อาคารและบ้านจะกลายเป็นระบบที่สามารถทำงานอัตโนมัติได้มากขึ้น",
    smartFeatures: "บ้านอัจฉริยะจะใช้เทคโนโลยี:\n• ระบบไฟฟ้าอัจฉริยะที่ปรับแสงตามการใช้งาน\n• เทอร์โมสตัทอัจฉริยะที่วิเคราะห์รูปแบบสภาพอากาศ\n• ระบบตรวจสอบเรียลไทม์เพื่อความปลอดภัย",
    carbonTitle: "การลดคาร์บอน: เส้นทางสู่การปล่อยก๊าซเป็นศูนย์",
    carbonText: "เป้าหมายสำคัญในอนาคตของการออกแบบอาคนารและการวางผังเมือง คือการลดการปล่อยก๊าซคาร์บอนไดออกไซด์ อาคารในอนาคตจะผสานพลังงานทดแทน เช่น โซลาร์เซลล์ พลังงานลม และพลังงานความร้อนใต้พิภพ",
    servicesTitle: "บริการของเรา",
    service1: "บำรุงรักษาบ้าน — ประปา ไฟฟ้า แอร์ ตกแต่งภายใน จัดสวน หลังคา",
    service2: "บริการโครงการ — เว็บไซต์ AI โซลาร์ สมาร์ทโฮม ก่อสร้างสีเขียว",
    service3: "บริการมืออาชีพ — ทนายความ สถาปนิก วิศวกร นักบัญชี",
    service4: "อสังหาริมทรัพย์ — ซื้อ ขาย เช่า คอนโด บ้าน ที่ดิน ทั่วประเทศ",
  },
  zh: {
    title: "关于 CBLUE",
    subtitle: "为泰国建设可持续的未来",
    introTitle: "我们是谁",
    introText: "CBLUE 有限公司是泰国领先的平台，将家庭和企业与认证技工、专业人士和房地产服务连接起来。我们利用现代技术为全国范围内的家庭维护预约、专业服务和房产交易创造无缝体验。",
    missionTitle: "我们的使命",
    missionText: "通过技术、透明度和信任，让泰国每个人都能获得优质的家庭维护、专业服务和房地产服务。",
    visionTitle: "我们的愿景",
    visionText: "成为东南亚最受信任的家庭服务平台，将数百万技术专业人员与他们服务的社区连接起来。",
    envTitle: "全球环境与住房的未来",
    envText: "环境仍然是全球关注的核心。随着气候变化影响加剧——海平面上升、自然灾害更频繁——绿色基础设施将成为城市规划的关键策略。",
    envText2: "在城市地区，我们将看到向可持续城市的转变。城市森林、绿色屋顶和社区花园将成为常见特征。建筑将成为生态系统——融入空气净化植物、水过滤系统和城市农业空间。",
    designTitle: "建筑设计与住房的未来",
    designText: "建筑设计的下一个时代将由绿色建筑、灵活性和韧性驱动。未来的建筑将通过竹子、回收钢材等可持续材料减少环境影响。",
    designFeatures: "可持续未来住宅的关键特征：\n• 太阳能板和雨水收集系统\n• 高效隔热和自然通风\n• 太阳能热水加热\n• 预制和模块化建筑",
    smartTitle: "智能建筑与家居自动化",
    smartText: "建筑自动化系统 (BAS) 在革新智能家居方面发挥着关键作用。随着物联网的普及，建筑将变得更加自主。",
    smartFeatures: "智能家居将采用：\n• 根据使用模式调整的智能照明\n• 分析天气以节能的智能恒温器\n• 实时安全监控系统",
    carbonTitle: "脱碳：迈向净零排放",
    carbonText: "未来建筑设计和城市规划的关键目标是减少二氧化碳排放。未来的建筑将整合太阳能、风能和地热等可再生能源。",
    servicesTitle: "我们的服务",
    service1: "家庭维护 — 水管、电气、空调、室内设计、园艺、屋顶",
    service2: "项目服务 — 网站、AI、太阳能、智能家居、绿色建筑",
    service3: "专业服务 — 律师、建筑师、工程师、会计师",
    service4: "房地产 — 全国公寓、别墅、土地买卖租赁",
  },
};

export default function AboutPage() {
  const locale = useLocale();
  const t = (key: string) => T[locale]?.[key] || T["en"]![key] || key;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30">
      {/* Hero with scenic background */}
      <div className="relative text-white min-h-[420px] flex items-center overflow-hidden">
        <Image
          src="/images/beach.png"
          alt="Sustainable building"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/90 to-blue-800/70" />
        <div className="relative max-w-5xl mx-auto px-4 text-center py-24">
          <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur text-sky-200 rounded-full text-sm font-bold mb-4 border border-white/20">CBLUE Co., Ltd.</span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">{t("title")}</h1>
          <p className="text-xl text-sky-100 drop-shadow max-w-2xl mx-auto">{t("subtitle")}</p>
          <div className="w-20 h-1 bg-white/50 mx-auto rounded-full mt-6" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        {/* Who We Are */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3 relative min-h-[200px]">
              <Image src="/images/smart-home.jpg" alt="Smart home" fill className="object-cover" />
            </div>
            <div className="md:w-2/3 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("introTitle")}</h2>
              <p className="text-gray-600 leading-relaxed">{t("introText")}</p>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{t("missionTitle")}</h2>
            <p className="text-gray-600 leading-relaxed">{t("missionText")}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">🔭</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{t("visionTitle")}</h2>
            <p className="text-gray-600 leading-relaxed">{t("visionText")}</p>
          </div>
        </div>

        {/* Environment */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="relative h-48 w-full">
            <Image src="/images/green-theme.jpg" alt="Green environment" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
          </div>
          <div className="p-8 -mt-8 relative">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("envTitle")}</h2>
            <p className="text-gray-600 leading-relaxed mb-4">{t("envText")}</p>
            <p className="text-gray-600 leading-relaxed">{t("envText2")}</p>
          </div>
        </section>

        {/* Building Design */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="md:flex">
            <div className="md:w-2/3 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("designTitle")}</h2>
              <p className="text-gray-600 leading-relaxed mb-4">{t("designText")}</p>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{t("designFeatures")}</p>
            </div>
            <div className="md:w-1/3 relative min-h-[250px]">
              <Image src="/images/solar-panel.jpg" alt="Solar panel" fill className="object-cover" />
            </div>
          </div>
        </section>

        {/* Smart Building */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3 relative min-h-[250px]">
              <Image src="/images/smart-home.jpg" alt="Smart building" fill className="object-cover" />
            </div>
            <div className="md:w-2/3 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("smartTitle")}</h2>
              <p className="text-gray-600 leading-relaxed mb-4">{t("smartText")}</p>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{t("smartFeatures")}</p>
            </div>
          </div>
        </section>

        {/* Carbon */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="relative h-40 w-full">
            <Image src="/images/wind-turbine.png" alt="Wind turbine" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
          </div>
          <div className="p-8 -mt-6 relative">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("carbonTitle")}</h2>
            <p className="text-gray-600 leading-relaxed">{t("carbonText")}</p>
          </div>
        </section>

        {/* Services Summary */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("servicesTitle")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "service1", icon: "🏠", color: "bg-sky-50 border-sky-100" },
              { key: "service2", icon: "💼", color: "bg-indigo-50 border-indigo-100" },
              { key: "service3", icon: "👔", color: "bg-emerald-50 border-emerald-100" },
              { key: "service4", icon: "🏢", color: "bg-amber-50 border-amber-100" },
            ].map((item) => (
              <div key={item.key} className={`flex items-start gap-3 p-4 rounded-xl border ${item.color}`}>
                <span className="text-2xl">{item.icon}</span>
                <p className="text-gray-700 text-sm">{t(item.key)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative rounded-2xl overflow-hidden">
          <Image src="/images/scenic-house.jpg" alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-sky-900/90 to-blue-800/70" />
          <div className="relative p-10 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">{locale === "th" ? "พร้อมเริ่มต้นแล้วหรือยัง?" : locale === "zh" ? "准备好开始了吗？" : "Ready to Get Started?"}</h2>
            <p className="text-sky-100 mb-6">{locale === "th" ? "ค้นหาช่าง มืออาชีพ และอสังหาริมทรัพย์ทั่วประเทศไทย" : locale === "zh" ? "在全泰国找到技工、专业人士和房地产" : "Find fixers, professionals, and properties across Thailand"}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href={`/${locale}/booking/household`} className="px-6 py-2.5 bg-white text-sky-700 rounded-xl font-bold text-sm hover:bg-sky-50 transition shadow-lg">🏠 {locale === "th" ? "จองช่าง" : "Book Fixer"}</a>
              <a href={`/${locale}/booking/project`} className="px-6 py-2.5 border-2 border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition">💼 {locale === "th" ? "จองทีม" : "Book Project"}</a>
              <a href={`/${locale}/booking/professional`} className="px-6 py-2.5 border-2 border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition">👔 {locale === "th" ? "จองมืออาชีพ" : "Book Pro"}</a>
              <a href={`/${locale}/properties`} className="px-6 py-2.5 border-2 border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition">🏢 {locale === "th" ? "อสังหาฯ" : "Property"}</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
