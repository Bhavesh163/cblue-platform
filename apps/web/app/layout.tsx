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
    // Brand
    "CBLUE", "cblue.co.th", "cblue.th", "Cblue Thailand", "CBLUE platform",
    // Home services
    "Thailand home services", "find fixer Thailand", "book plumber Bangkok",
    "hire electrician Thailand", "air conditioning repair Thailand", "home maintenance Thailand",
    "smart home installation", "handyman Bangkok", "home repair service Thailand",
    // Project teams
    "project team Thailand", "hire architect Thailand", "construction management Thailand",
    "interior designer Bangkok", "civil engineer Thailand", "mechanical engineer Thailand",
    "electrical engineer Thailand",
    // Professionals
    "lawyer Thailand", "accountant Bangkok", "CPA Thailand", "safety officer Thailand",
    "digital marketing Thailand", "software programmer Thailand",
    // Real estate
    "property listing Thailand", "real estate Thailand", "condo for sale Bangkok",
    "house for rent Thailand", "land for sale Thailand", "property management Thailand",
    "warehouse for rent Thailand", "commercial space Bangkok", "apartment for rent Bangkok",
    "townhouse for sale Bangkok", "villa for rent Phuket",
    // AI & tech
    "AI matching platform", "PromptPay payment", "enterprise service marketplace",
    "AI chatbot development", "machine learning Thailand", "AI integration services",
    "software development Thailand", "mobile app development Thailand",
    // Green building & sustainability (from cblue-ai)
    "green building Thailand", "green building design", "sustainable building", "LEED certification Thailand",
    "green architecture", "eco-friendly building", "net zero building Thailand",
    "carbon neutral construction", "green infrastructure", "sustainable cities Thailand",
    "green roof Thailand", "vertical garden Bangkok",
    // Solar & EV (from cblue-ai)
    "solar panel installation Thailand", "solar solutions Thailand", "EV charging station Thailand",
    "EV charger installation", "renewable energy Thailand", "solar energy Thailand",
    // Smart tech (from cblue-ai)
    "smart home automation Thailand", "building automation system", "BAS Thailand", "BMS Thailand",
    "smart building controls", "IoT building Thailand", "smart thermostat Thailand",
    "smart farming Thailand", "IoT agriculture Thailand",
    // HVAC & construction (from cblue-ai)
    "HVAC MEP retrofit", "kitchen renovation Thailand", "fit-out contractor Bangkok",
    "reinstatement contractor", "general construction management", "modular housing Thailand",
    // Security (from cblue-ai)
    "security CCTV installation", "door access control", "biometric access control Thailand",
    "environmental services Thailand", "green construction Thailand",
    // Thai keywords
    "ช่างซ่อมบ้าน", "จองช่าง", "ซ่อมประปา", "ซ่อมไฟฟ้า", "ซ่อมแอร์", "ช่างแอร์",
    "หาช่าง", "บริการซ่อมบ้าน", "ช่างประปา", "ช่างไฟฟ้า", "หาช่างซ่อม",
    "ทีมโครงการ", "สถาปนิก", "ทนายความ", "วิศวกร", "ออกแบบภายใน", "มัณฑนากร",
    "นักบัญชี", "ผู้สอบบัญชี", "โปรแกรมเมอร์", "การตลาดดิจิทัล",
    "วิศวกรไฟฟ้า", "วิศวกรเครื่องกล", "วิศวกรโยธา", "เจ้าหน้าที่ความปลอดภัย",
    "อสังหาริมทรัพย์", "คอนโดขาย", "บ้านเช่า", "ที่ดินขาย", "บ้านมือสอง",
    "คอนโดให้เช่า กรุงเทพ", "บ้านขาย กรุงเทพ", "อาคารพาณิชย์", "โกดังให้เช่า",
    "สมาร์ทโฮม", "พลังงานแสงอาทิตย์", "EV charging", "โซลาร์เซลล์",
    "อาคารเขียว", "ก่อสร้างเขียว", "ระบบอาคารอัจฉริยะ", "เกษตรอัจฉริยะ",
    "แพลตฟอร์ม AI", "จับคู่ช่าง", "บริการซ่อมบำรุง", "จองช่างออนไลน์",
    "พลังงานหมุนเวียน", "อาคารประหยัดพลังงาน", "ระบบรักษาความปลอดภัย",
    "ระบบ CCTV", "ระบบควบคุมอาคาร", "สวนแนวตั้ง", "บ้านอัจฉริยะ",
    // Chinese keywords
    "泰国家政服务", "找维修师傅", "曼谷维修", "泰国房地产", "AI匹配平台",
    "泰国绿色建筑", "泰国智能家居", "曼谷公寓出售", "泰国别墅出租",
    "太阳能安装泰国", "电动汽车充电站", "楼宇自动化系统", "智慧农业泰国",
    "泰国律师", "泰国会计师", "泰国建筑师", "软件开发泰国", "AI聊天机器人",
    "可持续建筑", "零碳建筑", "绿色建筑设计", "智能家居自动化",
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
              serviceType: [
                "Home Maintenance", "Plumbing", "Electrical", "Air Conditioning",
                "Interior Design", "Landscaping", "Cladding & Roofing",
                "Project Management", "Green Building Design", "HVAC MEP & Retrofit",
                "Smart Building Automation", "Solar Panel Installation", "EV Charging",
                "Kitchen Renovation", "Fit-out", "Reinstatement",
                "Professional Services", "Architecture", "Legal Services", "Engineering",
                "Accounting", "Digital Marketing", "Software Development",
                "Real Estate", "Property Listing", "Property Management",
                "Smart Home", "Smart Farming", "Environmental Services", "Security & CCTV",
              ],
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
