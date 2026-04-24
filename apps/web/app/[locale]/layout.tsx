import {NextIntlClientProvider} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {routing} from '../../i18n/routing';
import {Header} from './components/Header';
import {Footer} from './components/Footer';
import {ChatbotWidget} from './components/ChatbotWidget';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    th: "CBLUE - แพลตฟอร์มช่างซ่อมบำรุง ทีมโครงการ มืออาชีพ และอสังหาริมทรัพย์อันดับ 1 ของไทย",
    en: "CBLUE - Thailand's #1 AI Home Services & Real Estate Platform",
    zh: "CBLUE - 泰国第一AI家居服务与房地产平台",
  };
  const descriptions: Record<string, string> = {
    th: "จองช่างซ่อมบ้าน ทีมโครงการ มืออาชีพ และค้นหาอสังหาริมทรัพย์ทั่วไทย ด้วยระบบ AI จับคู่อัตโนมัติ รองรับ PromptPay",
    en: "Book verified fixers, project teams, professionals & browse property listings across Thailand. AI-powered matching with PromptPay support.",
    zh: "通过AI智能匹配预约泰国各地维修技工、项目团队、专业人士，浏览房产列表。支持PromptPay支付。",
  };
  return {
    title: { default: titles[locale] ?? titles.en!, template: `%s | CBLUE` },
    description: descriptions[locale] ?? descriptions.en!,
    keywords: [
      // Brand
      "CBLUE", "cblue.th", "cblue.co.th", "CBLUE Thailand", "CBLUE platform",
      // Home services EN
      "book fixer Thailand", "household maintenance Thailand", "plumber Bangkok", "electrician Thailand",
      "AC repair Thailand", "air conditioning service", "interior design Thailand", "landscaping service",
      "cladding roofing Thailand", "home repair service", "handyman Thailand",
      "gardening service Thailand", "home renovation Bangkok",
      // Project services EN
      "project team Thailand", "website development Thailand", "mobile app development",
      "AI integration Thailand", "AI chatbot development", "software development Thailand",
      "machine learning Thailand", "smart home Thailand", "smart building BMS",
      "solar panel installation Thailand", "EV charger installation", "green building design",
      "HVAC MEP retrofit", "building automation BAS", "smart farming Thailand",
      "environmental services", "security CCTV Thailand", "access control system",
      "green construction Thailand", "kitchen renovation Thailand",
      "reinstatement Thailand", "fit-out contractor Thailand", "automation Thailand",
      // Professional services EN
      "book professional Thailand", "lawyer Thailand", "architect Thailand",
      "interior designer Thailand", "CPA Thailand", "accountant Thailand",
      "civil engineer Thailand", "mechanical engineer Thailand", "electrical engineer Thailand",
      "software programmer Thailand", "digital marketing Thailand", "safety officer Thailand",
      "home repair technician", "find home repair technician", "find professional Thailand",
      "annual inspection Thailand", "construction engineer Thailand", "find construction engineer",
      "auditor Thailand", "find auditor Thailand", "designer Thailand", "find designer",
      "design civil engineer", "construction civil engineer", "design mechanical engineer",
      "construction mechanical engineer", "design electrical engineer", "construction electrical engineer",
      "safety manager Thailand", "HSE manager Thailand", "fire life safety FLS",
      // Professional search variants EN
      "lawyer search", "accountant search", "CPA search", "architect search",
      "interior designer search", "design civil engineer search", "construction civil engineer search",
      "design mechanical engineer search", "construction mechanical engineer search",
      "design electrical engineer search", "construction electrical engineer search",
      "software programmer search", "digital marketing search", "safety manager search",
      "HSE manager search", "fire life safety search", "FLS search",
      // Real estate EN
      "real estate Thailand", "condo Bangkok", "house for sale Thailand", "land for sale Thailand",
      "apartment rental Bangkok", "commercial property Thailand", "warehouse factory Thailand",
      "property listing Thailand", "buy sell rent property", "villa Thailand", "townhouse Bangkok",
      "sell house Thailand", "sell condo Thailand", "sell warehouse", "sell land Thailand",
      "sell factory Thailand", "sell building Thailand", "rent house Thailand", "rent condo Thailand",
      "rent warehouse Thailand", "rent land Thailand", "rent factory Thailand", "rent building Thailand",
      "rent office Thailand", "house", "condo", "warehouse", "land", "factory", "building", "office",
      // AI & tech
      "AI matching platform", "AI-powered home services", "PromptPay QR payment",
      "5-tier pricing", "verified fixer", "KYC verification",
      "IoT building management", "AI service marketplace",
      // Green & sustainability (from cblue.co.th / cblue-ai)
      "green building", "green architecture", "sustainable construction Thailand",
      "net zero building", "carbon neutral building", "eco-friendly construction",
      "vertical garden Thailand", "solar thermal heating", "energy efficiency",
      "renewable energy Thailand", "prefabricated modular construction",
      "climate resilient building", "urban green infrastructure", "geothermal energy",
      "smart window", "zero emission building", "modular housing",
      // From cblue.co.th content — green building & future housing
      "green roof Thailand", "urban forest", "community garden",
      "rainwater harvesting system", "natural ventilation system",
      "bamboo construction", "recycled steel construction",
      "thermal insulation Thailand", "sustainable living Thailand",
      "eco home Thailand", "smart city Thailand", "future housing Thailand",
      "climate change resilience", "decarbonization building",
      "mushroom composite material", "water filtration system",
      "urban farming", "air purifying plants", "scalable housing",
      // Thai keywords
      "จองช่างซ่อมบ้าน", "ช่างประปา", "ช่างไฟฟ้า", "ช่างแอร์", "ซ่อมบ้าน",
      "ตกแต่งภายใน", "จัดสวน", "ทีมโครงการ", "จองมืออาชีพ",
      "ทนายความ", "สถาปนิก", "วิศวกร", "นักบัญชี", "ผู้สอบบัญชี",
      "อสังหาริมทรัพย์", "คอนโด", "บ้านขาย", "ที่ดินขาย", "เช่าคอนโด",
      // New Thai keywords — real estate
      "ขายบ้าน", "ขายคอนโด", "ขายโกดัง", "ขายที่ดิน", "ขายโรงงาน", "ขายอาคาร",
      "บ้าน", "โกดัง", "ที่ดิน", "โรงงาน", "อาคาร", "ออฟฟิศ",
      "เช่าบ้าน", "เช่าโกดัง", "เช่าที่ดิน", "เช่าโรงงาน", "เช่าอาคาร", "เช่าออฟฟิศ",
      // Thai — professional search variants
      "หาทนายความ", "หานักบัญชี", "หาผู้สอบบัญชี", "หาสถาปนิก", "หามัณฑนากร",
      "หาวิศวกรโยธาออกแบบ", "หาวิศวกรโยธาควบคุมงาน",
      "หาวิศวกรเครื่องกลออกแบบ", "หาวิศวกรเครื่องกลควบคุมงาน",
      "หาวิศวกรไฟฟ้าออกแบบ", "หาวิศวกรไฟฟ้าควบคุมงาน",
      "หาโปรแกรมเมอร์", "หาการตลาดดิจิทัล", "ผู้จัดการความปลอดภัย",
      "สมาร์ทโฮม", "โซลาร์เซลล์", "พลังงานแสงอาทิตย์", "อาคารเขียว",
      "วิศวกรไฟฟ้า", "วิศวกรเครื่องกล", "เจ้าหน้าที่ความปลอดภัย",
      "ระบบรักษาความปลอดภัย", "กล้องวงจรปิด", "ระบบอัตโนมัติ",
      "แพลตฟอร์มบริการ", "จองช่างออนไลน์", "AI จับคู่ช่าง",
      "บริการซ่อมบำรุง", "ช่างมืออาชีพ", "แพลตฟอร์ม AI", "จองออนไลน์",
      "อาคารประหยัดพลังงาน", "สถาปัตยกรรมสีเขียว", "บ้านอัจฉริยะ",
      // New Thai keywords — professional services
      "ช่างซ่อมบ้าน", "หาช่างซ่อมบ้าน", "มืออาชีพ", "หามืออาชีพ",
      "หาเจ้าหน้าที่ความปลอดภัย", "ตรวจประจำปี", "วิศวกรควบคุมงาน",
      "หาวิศวกรควบคุมงาน", "ผู้ตรวจสอบบัญชี", "หาผู้ตรวจสอบบัญชี",
      "ผู้ออกแบบ", "หาผู้ออกแบบ", "มัณฑนากร",
      "วิศวกรโยธาออกแบบ", "วิศวกรโยธาควบคุมงาน",
      "วิศวกรเครื่องกลออกแบบ", "วิศวกรเครื่องกลควบคุมงาน",
      "วิศวกรไฟฟ้าออกแบบ", "วิศวกรไฟฟ้าควบคุมงาน",
      "โปรแกรมเมอร์", "การตลาดดิจิทัล", "ผู้จัดการด้านความปลอดภัย",
      "ผู้จัดการ HSE", "ระบบดับเพลิงและช่วยชีวิต",
      // Thai keywords from cblue.co.th
      "หลังคาสีเขียว", "ป่าในเมือง", "สวนชุมชน", "ระบบเก็บน้ำฝน",
      "ฉนวนกันความร้อน", "พลังงานทดแทน", "การลดคาร์บอน",
      "บ้านสำเร็จรูป", "สวนแนวตั้ง", "ระบบอัตโนมัติในอาคาร",
      "บ้านประหยัดพลังงาน", "เมืองอัจฉริยะ", "การก่อสร้างที่ยั่งยืน",
      // Chinese keywords
      "泰国家居维修", "泰国房地产", "预约维修技工", "智能家居",
      "太阳能安装", "电动汽车充电站", "绿色建筑", "AI智能匹配",
      "曼谷公寓", "泰国买房", "律师", "建筑师", "工程师",
      "零碳建筑", "可持续建筑", "AI聊天机器人",
      "泰国物业", "预约专业人士", "智能建筑管理", "节能建筑",
      // New Chinese keywords — professional services
      "家修技工", "找家修技工", "找专业人士", "安全官员", "找安全官员",
      "年度检查", "施工工程师", "找施工工程师", "审计师", "找审计师",
      "设计师", "找设计师", "会计师", "注册会计师", "室内设计师",
      "土木设计工程师", "土木施工工程师", "机械设计工程师", "机械施工工程师",
      "电气设计工程师", "电气施工工程师", "软件程序员", "数字营销",
      "安全经理", "HSE经理", "消防生命安全",
      // Chinese — real estate
      "卖房子", "卖公寓", "卖仓库", "卖土地", "卖工厂", "卖大楼",
      "房子", "公寓", "仓库", "土地", "工厂", "大楼", "办公室",
      "租房子", "租公寓", "租仓库", "租土地", "租工厂", "租大楼", "租办公室",
      // Chinese — professional search variants
      "找律师", "找会计师", "找注册会计师", "找建筑师", "找室内设计师",
      "找土木设计工程师", "找土木施工工程师", "找机械设计工程师", "找机械施工工程师",
      "找电气设计工程师", "找电气施工工程师", "找软件程序员", "找数字营销",
      "找安全经理", "找HSE经理", "找消防生命安全",
      // Additional — property partner services
      "partner registration", "property partner Thailand", "list property Thailand",
      "property management Thailand", "rental management Bangkok",
      "both-party rating", "enterprise booking platform", "service marketplace Thailand",
      "anonymous chat real estate", "secure property viewing",
      "ลงประกาศอสังหาริมทรัพย์", "จัดการทรัพย์สิน", "แพลตฟอร์มอสังหา",
      "发布房产", "房产管理", "安全看房",
      // EN — for-rent & second-hand & townhouse variants
      "house for rent", "condo for rent", "warehouse for rent", "land for rent", "factory for rent", "building for rent",
      "second-hand house", "second-hand condo", "second-hand warehouse", "second-hand land", "second-hand factory", "second-hand building",
      "find townhouse", "townhouse for rent", "second-hand townhouse", "buy townhouse", "sell townhouse",
      // Thai — ให้เช่า (for rent) variants
      "บ้านให้เช่า", "คอนโดให้เช่า", "โกดังให้เช่า", "ที่ดินให้เช่า", "โรงงานให้เช่า", "อาคารให้เช่า",
      // Thai — มือสอง (second-hand) variants
      "บ้านมือสอง", "คอนโดมือสอง", "โกดังมือสอง", "ที่ดินมือสอง", "โรงงานมือสอง", "อาคารมือสอง",
      // Thai — ทาวน์เฮ้าส์ (townhouse) variants
      "หาทาวน์เฮ้าส์", "ทาวน์เฮ้าส์ให้เช่า", "ทาวน์เฮ้าส์มือสอง", "ซื้อทาวน์เฮ้าส์", "ขายทาวน์เฮ้าส์",
      // Chinese — 出租 (for rent) variants
      "房屋出租", "公寓出租", "仓库出租", "土地出租", "工厂出租", "建筑出租",
      // Chinese — 二手 (second-hand) variants
      "二手房", "二手公寓", "二手仓库", "二手土地", "二手工厂", "二手建筑",
      // Chinese — 联排别墅 (townhouse) variants
      "找联排别墅", "联排别墅出租", "二手联排别墅", "买联排别墅", "卖联排别墅",
    ],
    openGraph: {
      locale: locale === "th" ? "th_TH" : locale === "zh" ? "zh_CN" : "en_US",
      siteName: "CBLUE",
      type: "website",
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon.svg', type: 'image/svg+xml' }
      ],
      apple: [
        { url: '/apple-touch-icon.png' }
      ]
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../../messages/th.json`)).default;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <ChatbotWidget />
    </NextIntlClientProvider>
  );
}
