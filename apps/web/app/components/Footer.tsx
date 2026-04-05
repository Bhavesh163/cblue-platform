import Link from "next/link";

const footerLinks = {
  services: [
    { label: "งานประปา (Plumbing)", href: "/services#plumbing" },
    { label: "งานไฟฟ้า (Electrical)", href: "/services#electrical" },
    { label: "แอร์ (AC)", href: "/services#ac" },
    { label: "ตกแต่งภายใน (Interior)", href: "/services#interior" },
    { label: "จัดสวน (Landscaping)", href: "/services#landscaping" },
  ],
  company: [
    { label: "เกี่ยวกับเรา", href: "/about" },
    { label: "บริการ", href: "/services" },
    { label: "สมัครเป็นช่าง", href: "/fixers/register" },
    { label: "ติดต่อเรา", href: "/contact" },
  ],
  support: [
    { label: "ศูนย์ช่วยเหลือ", href: "/help" },
    { label: "เงื่อนไขการใช้งาน", href: "/terms" },
    { label: "นโยบายความเป็นส่วนตัว", href: "/privacy" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold">C</span>
              </div>
              <span className="text-lg font-bold text-white">CBLUE.co.th</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              แพลตฟอร์มเชื่อมต่อช่างมืออาชีพกับเจ้าของบ้าน
              ทั่วประเทศไทย ครบทุกบริการซ่อมบำรุง
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              บริการ
            </h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              บริษัท
            </h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              ช่วยเหลือ
            </h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} CBLUE Co., Ltd. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="https://cblue.co.th" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-white">
              cblue.co.th
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
