import Link from "next/link";

const services = [
  {
    icon: "🔧",
    title: "ประปา (Plumbing)",
    desc: "ซ่อมท่อน้ำ ก๊อกน้ำ สุขภัณฑ์ ท่อตัน",
  },
  {
    icon: "⚡",
    title: "ไฟฟ้า (Electrical)",
    desc: "ระบบไฟ สายไฟ ปลั๊ก สวิตช์ ตู้ไฟ",
  },
  {
    icon: "❄️",
    title: "แอร์ (AC)",
    desc: "ล้างแอร์ ซ่อมแอร์ ติดตั้งแอร์ใหม่",
  },
  {
    icon: "🏠",
    title: "ตกแต่งภายใน (Interior)",
    desc: "ทาสี ปูกระเบื้อง งานไม้ ปรับปรุงห้อง",
  },
  {
    icon: "🌿",
    title: "จัดสวน (Landscaping)",
    desc: "ออกแบบสวน ตัดหญ้า ดูแลต้นไม้",
  },
  {
    icon: "🏗️",
    title: "หลังคา/ผนัง (Cladding)",
    desc: "ซ่อมหลังคา รั่วซึม ผนัง กันสาด",
  },
];

const stats = [
  { value: "1,000+", label: "ช่างมืออาชีพ" },
  { value: "77", label: "จังหวัดทั่วไทย" },
  { value: "4 ระดับ", label: "ช่างให้เลือก" },
  { value: "300 ฿", label: "เริ่มต้นจองงาน" },
];

const tiers = [
  { name: "Economy", price: "ราคาพื้นฐาน", color: "bg-gray-100 text-gray-800" },
  { name: "Standard", price: "+20%", color: "bg-blue-100 text-blue-800" },
  { name: "Corporate", price: "+40%", color: "bg-purple-100 text-purple-800" },
  { name: "Expert", price: "+60%", color: "bg-amber-100 text-amber-800" },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              หาช่างมืออาชีพ
              <br />
              <span className="text-blue-300">ทั่วประเทศไทย</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-blue-100 leading-relaxed max-w-2xl">
              CBLUE เชื่อมต่อคุณกับช่างที่ผ่านการรับรอง ครบทุกบริการซ่อมบ้าน
              จองง่าย จ่ายผ่าน PromptPay เริ่มต้นเพียง 300 บาท
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/booking/household"
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-blue-800 bg-white hover:bg-blue-50 rounded-xl shadow-lg transition-all"
              >
                จองช่างซ่อมบ้าน
              </Link>
              <Link
                href="/booking/project"
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white border-2 border-white/30 hover:bg-white/10 rounded-xl transition-all"
              >
                จองทีมโปรเจกต์
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-blue-700">{stat.value}</p>
                <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">บริการของเรา</h2>
            <p className="mt-3 text-lg text-gray-500">
              ครอบคลุมทุกงานซ่อมบำรุงที่คุณต้องการ
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((svc) => (
              <div
                key={svc.title}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md border border-gray-100 transition-shadow"
              >
                <div className="text-4xl mb-4">{svc.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900">{svc.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{svc.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/services"
              className="text-blue-700 font-semibold hover:text-blue-800 text-sm"
            >
              ดูบริการทั้งหมด →
            </Link>
          </div>
        </div>
      </section>

      {/* Tier Transparency */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">ระดับช่างที่คุณเลือกได้</h2>
            <p className="mt-3 text-lg text-gray-500">
              เลือกระดับช่างตามงบประมาณ ราคาโปร่งใส
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className="rounded-xl p-6 text-center border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${tier.color}`}>
                  {tier.name}
                </span>
                <p className="mt-4 text-xl font-bold text-gray-900">{tier.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">ขั้นตอนการใช้งาน</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "กรอกรายละเอียด", desc: "บอกปัญหาและที่อยู่ของคุณ" },
              { step: "2", title: "จับคู่ช่าง", desc: "ระบบจับคู่ช่างที่เหมาะสมที่สุด" },
              { step: "3", title: "ชำระมัดจำ", desc: "จ่ายง่ายผ่าน PromptPay 300 บาท" },
              { step: "4", title: "งานเสร็จ", desc: "ช่างเข้าทำงาน รีวิวให้คะแนน" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-700 text-white flex items-center justify-center text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Fixer Registration */}
      <section className="bg-blue-700 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">คุณเป็นช่างมืออาชีพ?</h2>
          <p className="mt-4 text-lg text-blue-100">
            สมัครเป็นช่างกับ CBLUE วันนี้ รับงานทั่วประเทศ
          </p>
          <Link
            href="/fixers/register"
            className="mt-8 inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-blue-800 bg-white hover:bg-blue-50 rounded-xl shadow-lg transition-all"
          >
            สมัครเป็นช่าง
          </Link>
        </div>
      </section>
    </>
  );
}
