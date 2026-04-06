import {NextIntlClientProvider, useMessages} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {routing} from '../../i18n/routing';
import {Header} from './components/Header';
import {Footer} from './components/Footer';
import {ChatbotWidget} from './components/ChatbotWidget';

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
