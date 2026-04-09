import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "CBLUE - Thailand's #1 AI Home Services & Real Estate Platform | แพลตฟอร์มช่างซ่อมบำรุงและอสังหาริมทรัพย์อันดับ 1",
    template: "%s | CBLUE",
  },
  description:
    "CBLUE connects you with verified fixers, project teams, professionals & property listings across Thailand. AI-powered matching for plumbing, electrical, AC, smart home, architecture, legal services, and real estate. จองช่างซ่อมบ้าน ทีมโครงการ มืออาชีพ และอสังหาริมทรัพย์ทั่วไทย",
  keywords: [
    "CBLUE", "cblue.co.th", "Thailand home services", "find fixer Thailand", "book plumber Bangkok",
    "hire electrician Thailand", "air conditioning repair Thailand", "home maintenance Thailand",
    "smart home installation", "project team Thailand", "hire architect Thailand", "lawyer Thailand",
    "interior designer Bangkok", "civil engineer Thailand", "property listing Thailand",
    "real estate Thailand", "condo for sale Bangkok", "house for rent Thailand",
    "AI matching platform", "PromptPay payment", "enterprise service marketplace",
    "ช่างซ่อมบ้าน", "จองช่าง", "ซ่อมประปา", "ซ่อมไฟฟ้า", "ซ่อมแอร์", "ช่างแอร์",
    "ทีมโครงการ", "สถาปนิก", "ทนายความ", "วิศวกร", "ออกแบบภายใน",
    "อสังหาริมทรัพย์", "คอนโดขาย", "บ้านเช่า", "ที่ดินขาย",
    "สมาร์ทโฮม", "พลังงานแสงอาทิตย์", "EV charging",
    "แพลตฟอร์ม AI", "จับคู่ช่าง", "บริการซ่อมบำรุง",
    "泰国家政服务", "找维修师傅", "曼谷维修", "泰国房地产", "AI匹配平台",
  ],
  metadataBase: new URL("https://www.cblue.co.th"),
  alternates: {
    canonical: "/",
    languages: { "th": "/th", "en": "/en", "zh": "/zh" },
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    alternateLocale: ["en_US", "zh_CN"],
    siteName: "CBLUE",
    title: "CBLUE - Thailand's #1 AI Home Services & Real Estate Platform",
    description: "AI-powered matching for fixers, project teams, professionals & properties across Thailand. Book trusted services with PromptPay payment.",
    url: "https://www.cblue.co.th",
    images: [{ url: "/images/scenic-building.jpg", width: 1200, height: 630, alt: "CBLUE Platform" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CBLUE - Thailand's #1 AI Home Services Platform",
    description: "Find verified fixers, architects, lawyers & properties. AI matching + PromptPay.",
    images: ["/images/scenic-building.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: {
    icon: "/images/favicon-c.png",
    apple: "/images/favicon-c.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "CBLUE",
              url: "https://www.cblue.co.th",
              logo: "https://www.cblue.co.th/images/logo.jpg",
              description: "Thailand's #1 AI-powered platform for home services, project teams, professionals, and real estate.",
              address: { "@type": "PostalAddress", addressCountry: "TH" },
              sameAs: [],
              areaServed: { "@type": "Country", name: "Thailand" },
              serviceType: ["Home Maintenance", "Project Management", "Professional Services", "Real Estate"],
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
