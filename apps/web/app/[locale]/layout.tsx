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
    openGraph: {
      locale: locale === "th" ? "th_TH" : locale === "zh" ? "zh_CN" : "en_US",
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
