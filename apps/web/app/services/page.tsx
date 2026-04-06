import Link from "next/link";

const householdServices = [
  {
    id: "plumbing",
    icon: "🔧",
    title: "ประปา (Plumbing)",
    desc: "ซ่อมท่อน้ำ ก๊อกน้ำรั่ว สุขภัณฑ์ ท่อตัน ระบบน้ำ",
    examples: ["ท่อน้ำรั่ว", "ก๊อกน้ำเสีย", "ชักโครกตัน", "ติดตั้งเครื่องทำน้ำอุ่น"],
  },
  {
    id: "electrical",
    icon: "⚡",
    title: "ไฟฟ้า (Electrical)",
    desc: "ระบบไฟฟ้า สายไฟ ปลั๊ก สวิตช์ ตู้ไฟ ไฟช็อต",
    examples: ["ไฟไม่ติด", "ปลั๊กเสีย", "เดินสายไฟใหม่", "ติดตั้งหลอดไฟ"],
  },
  {
    id: "ac",
    icon: "❄️",
    title: "แอร์ (AC)",
    desc: "ล้างแอร์ ซ่อมแอร์ ติดตั้งแอร์ เติมน้ำยา",
    examples: ["ล้างแอร์ประจำปี", "แอร์ไม่เย็น", "เติมน้ำยาแอร์", "ติดตั้งแอร์ใหม่"],
  },
  {
    id: "interior",
    icon: "🏠",
    title: "ตกแต่งภายใน (Interior)",
    desc: "ทาสี ปูกระเบื้อง งานไม้ ปรับปรุงห้อง รีโนเวท",
    examples: ["ทาสีห้อง", "ปูกระเบื้อง", "ทำตู้เสื้อผ้า", "รีโนเวทห้องน้ำ"],
  },
  {
    id: "landscaping",
    icon: "🌿",
    title: "จัดสวน (Landscaping)",
    desc: "ออกแบบสวน ตัดหญ้า ตัดแต่งต้นไม้ ระบบรดน้ำ",
    examples: ["ออกแบบสวน", "ตัดหญ้า", "ตัดแต่งต้นไม้", "ติดตั้งระบบรดน้ำ"],
  },
  {
    id: "gardening",
    icon: "🌺",
    title: "ทำสวน (Gardening)",
    desc: "ดูแลสวน ปลูกต้นไม้ จัดสวนหย่อม ดูแลสนามหญ้า",
    examples: ["ดูแลสวนรายเดือน", "ปลูกต้นไม้", "จัดสวนหย่อม", "ใส่ปุ๋ย"],
  },
  {
    id: "cladding",
    icon: "🏗️",
    title: "หลังคา/ผนัง (Cladding/Roofing)",
    desc: "ซ่อมหลังคา หลังคารั่วซึม ผนัง กันสาด รางน้ำฝน",
    examples: ["ซ่อมหลังคารั่ว", "เปลี่ยนกระเบื้องหลังคา", "ติดกันสาด", "ซ่อมรางน้ำฝน"],
  },
  {
    id: "accountant",
    icon: "📊",
    title: "บัญชี (Accountant)",
    desc: "บริการบัญชี ภาษี วางระบบบัญชี ปิดงบการเงิน",
    examples: ["ยื่นภาษี", "ปิดงบการเงิน", "วางระบบบัญชี", "ตรวจสอบบัญชี"],
  },
  {
    id: "lawyer",
    icon: "⚖️",
    title: "ทนายความ (Lawyer)",
    desc: "ที่ปรึกษากฎหมาย สัญญา คดีทรัพย์สิน งานนิติกรรม",
    examples: ["ร่างสัญญา", "ที่ปรึกษากฎหมาย", "คดีอสังหาริมทรัพย์", "จดทะเบียน"],
  },
];

const projectServices = [
  {
    id: "tech",
    icon: "💻",
    title: "Technology & Software",
    items: [
      "Website Development",
      "Mobile App Development",
      "AI Integration",
      "AI Chatbot",
      "Software Development",
      "ML & AI",
    ],
  },
  {
    id: "energy",
    icon: "🔋",
    title: "Energy & Green",
    items: [
      "Solar Panels",
      "EV Charging",
      "Eco Friendly Building Design",
      "Eco Friendly Construction",
    ],
  },
  {
    id: "smart",
    icon: "🏢",
    title: "Smart Systems",
    items: [
      "Smart Building Automation",
      "Smart Home",
      "Smart Farming",
      "Security & CCTV",
      "Door & Access Control",
    ],
  },
  {
    id: "mep",
    icon: "🔥",
    title: "MEP & Safety",
    items: [
      "AC (ระบบปรับอากาศ)",
      "Plumbing (ระบบสุขาภิบาล)",
      "Fire Life Safety",
    ],
  },
  {
    id: "consulting",
    icon: "📋",
    title: "Consulting & Environment",
    items: ["Consulting", "Environmental Services"],
  },
];

export default function ServicesPage() {
  return (
    <div className="bg-gray-50">
      {/* Hero */}
      <section className="bg-white border-b border-gray-200 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">บริการทั้งหมด</h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            CBLUE ให้บริการครบทุกงานซ่อมบำรุงบ้านและโปรเจกต์พิเศษ
            ด้วยช่างมืออาชีพที่ผ่านการรับรอง
          </p>
        </div>
      </section>

      {/* Household Services */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900">
              🏠 บริการซ่อมบำรุงบ้าน
            </h2>
            <p className="mt-2 text-gray-500">
              จองช่างพร้อมให้บริการ เริ่มต้นเพียง 300 บาท
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {householdServices.map((svc) => (
              <div
                key={svc.id}
                id={svc.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4">{svc.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900">{svc.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{svc.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {svc.examples.map((ex) => (
                    <span
                      key={ex}
                      className="inline-block px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
                <Link
                  href="/booking/household"
                  className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  จองบริการ →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Project Services */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900">
              🏢 บริการโปรเจกต์
            </h2>
            <p className="mt-2 text-gray-500">
              โซลูชันครบวงจรสำหรับโปรเจกต์ขนาดใหญ่
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projectServices.map((group) => (
              <div
                key={group.id}
                className="rounded-xl p-6 border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="text-3xl mb-3">{group.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {group.title}
                </h3>
                <ul className="space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-blue-500">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/booking/project"
                  className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  ขอใบเสนอราคา →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            ไม่แน่ใจว่าต้องการบริการไหน?
          </h2>
          <p className="mt-3 text-gray-500">
            ติดต่อเราเพื่อให้คำปรึกษาฟรี เราช่วยหาช่างที่ตรงกับความต้องการของคุณ
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/booking/household"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors"
            >
              จองช่างซ่อมบ้าน
            </Link>
            <Link
              href="/booking/project"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-blue-700 border border-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
            >
              จองทีมโปรเจกต์
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
