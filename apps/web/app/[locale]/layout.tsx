import {NextIntlClientProvider, useMessages} from 'next-intl';
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
      // Project services EN
      "project team Thailand", "website development Thailand", "mobile app development",
      "AI integration Thailand", "AI chatbot development", "software development Thailand",
      "machine learning Thailand", "smart home Thailand", "smart building BMS",
      "solar panel installation Thailand", "EV charger installation", "green building design",
      "HVAC MEP retrofit", "building automation BAS", "smart farming Thailand",
      "environmental services", "security CCTV Thailand", "access control system",
      "green construction Thailand", "kitchen renovation Thailand",
      // Professional services EN
      "book professional Thailand", "lawyer Thailand", "architect Thailand",
      "interior designer Thailand", "CPA Thailand", "accountant Thailand",
      "civil engineer Thailand", "mechanical engineer Thailand", "electrical engineer Thailand",
      "software programmer Thailand", "digital marketing Thailand", "safety officer Thailand",
      // Real estate EN
      "real estate Thailand", "condo Bangkok", "house for sale Thailand", "land for sale Thailand",
      "apartment rental Bangkok", "commercial property Thailand", "warehouse factory Thailand",
      "property listing Thailand", "buy sell rent property",
      // AI & tech
      "AI matching platform", "AI-powered home services", "PromptPay QR payment",
      "5-tier pricing", "verified fixer", "KYC verification",
      // Green & sustainability (from cblue.co.th)
      "green building", "green architecture", "sustainable construction Thailand",
      "net zero building", "carbon neutral building", "eco-friendly construction",
      "vertical garden Thailand", "solar thermal heating", "energy efficiency",
      "renewable energy Thailand", "prefabricated modular construction",
      // Thai keywords
      "จองช่างซ่อมบ้าน", "ช่างประปา", "ช่างไฟฟ้า", "ช่างแอร์", "ซ่อมบ้าน",
      "ตกแต่งภายใน", "จัดสวน", "ทีมโครงการ", "จองมืออาชีพ",
      "ทนายความ", "สถาปนิก", "วิศวกร", "นักบัญชี", "ผู้สอบบัญชี",
      "อสังหาริมทรัพย์", "คอนโด", "บ้านขาย", "ที่ดินขาย", "เช่าคอนโด",
      "สมาร์ทโฮม", "โซลาร์เซลล์", "พลังงานแสงอาทิตย์", "อาคารเขียว",
      "วิศวกรไฟฟ้า", "วิศวกรเครื่องกล", "เจ้าหน้าที่ความปลอดภัย",
      "ระบบรักษาความปลอดภัย", "กล้องวงจรปิด", "ระบบอัตโนมัติ",
      "แพลตฟอร์มบริการ", "จองช่างออนไลน์", "AI จับคู่ช่าง",
      // Chinese keywords
      "泰国家居维修", "泰国房地产", "预约维修技工", "智能家居",
      "太阳能安装", "电动汽车充电站", "绿色建筑", "AI智能匹配",
      "曼谷公寓", "泰国买房", "律师", "建筑师", "工程师",
      "零碳建筑", "可持续建筑", "AI聊天机器人",
    ],
    openGraph: {
      locale: locale === "th" ? "th_TH" : locale === "zh" ? "zh_CN" : "en_US",
      siteName: "CBLUE",
      type: "website",
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
