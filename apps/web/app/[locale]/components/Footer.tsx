"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

export function Footer() {
  const t = useTranslations();
  const locale = useLocale();
  const prefix = `/${locale}`;

  const householdLinks = [
    { label: t("services.plumbing"), href: `${prefix}/services#plumbing` },
    { label: t("services.electrical"), href: `${prefix}/services#electrical` },
    { label: t("services.ac"), href: `${prefix}/services#ac` },
    { label: t("services.interior"), href: `${prefix}/services#interior` },
    { label: t("services.landscaping"), href: `${prefix}/services#landscaping` },
    { label: t("services.cladding"), href: `${prefix}/services#cladding` },
  ];

  const projectLinks = [
    { label: "Website Development", href: `${prefix}/booking/project?service=WEBSITE_DEVELOPMENT` },
    { label: "Mobile App Development", href: `${prefix}/booking/project?service=MOBILE_APP_DEVELOPMENT` },
    { label: "AI Integration", href: `${prefix}/booking/project?service=AI_INTEGRATION` },
    { label: "Software Development", href: `${prefix}/booking/project?service=SOFTWARE_DEV` },
    { label: "ML & AI", href: `${prefix}/booking/project?service=ML_AI` },
    { label: "Consulting", href: `${prefix}/booking/project?service=CONSULTING` },
    { label: "Solar Panels", href: `${prefix}/booking/project?service=SOLAR_PANELS` },
    { label: "EV Charging", href: `${prefix}/booking/project?service=EV_CHARGING` },
    { label: "Green Building Design", href: `${prefix}/booking/project?service=GREEN_BUILDING_DESIGN` },
    { label: "HVAC MEP & Retrofit", href: `${prefix}/booking/project?service=MEP_RETROFIT` },
    { label: "Kitchen", href: `${prefix}/booking/project?service=KITCHEN` },
    { label: "Reinstatement", href: `${prefix}/booking/project?service=REINSTATEMENT` },
    { label: "Fit-out", href: `${prefix}/booking/project?service=FITOUT` },
    { label: "Smart Building Automation", href: `${prefix}/booking/project?service=SMART_BUILDING_AUTOMATION` },
    { label: "Environmental Services", href: `${prefix}/booking/project?service=ENVIRONMENTAL_SERVICES` },
    { label: "Security & CCTV", href: `${prefix}/booking/project?service=SECURITY_CCTV` },
    { label: "Door & Access Control", href: `${prefix}/booking/project?service=DOOR_ACCESS_CONTROL` },
    { label: "Green Construction", href: `${prefix}/booking/project?service=GREEN_CONSTRUCTION` },
    { label: "Smart Home", href: `${prefix}/booking/project?service=SMART_HOME` },
    { label: "Smart Farming", href: `${prefix}/booking/project?service=SMART_FARMING` },
  ];

  const professionalLinks = [
    { label: locale === "th" ? "ทนายความ" : "Lawyer", href: `${prefix}/booking/professional?service=LAWYER` },
    { label: locale === "th" ? "บัญชี" : "Accountant", href: `${prefix}/booking/professional?service=ACCOUNTANT` },
    { label: locale === "th" ? "ผู้สอบบัญชี" : "CPA", href: `${prefix}/booking/professional?service=CPA` },
    { label: locale === "th" ? "สถาปนิก" : "Architect", href: `${prefix}/booking/professional?service=ARCHITECT` },
    { label: locale === "th" ? "มัณฑนากร" : "Interior Designer", href: `${prefix}/booking/professional?service=INTERIOR_DESIGNER` },
    { label: locale === "th" ? "วิศวกร" : "Engineer", href: `${prefix}/booking/professional?service=DESIGN_CIVIL_ENGINEER` },
    { label: locale === "th" ? "โปรแกรมเมอร์" : "Software Programmer", href: `${prefix}/booking/professional?service=SOFTWARE_PROGRAMMER` },
    { label: locale === "th" ? "การตลาดดิจิทัล" : "Digital Marketing", href: `${prefix}/booking/professional?service=DIGITAL_MARKETING` },
    { label: locale === "th" ? "เจ้าหน้าที่ความปลอดภัย" : "Safety Officer", href: `${prefix}/booking/professional?service=SAFETY_OFFICER` },
    { label: locale === "th" ? "อื่น ๆ" : "Others", href: `${prefix}/booking/professional?service=OTHERS` },
  ];

  const companyLinks = [
    { label: t("footer.about"), href: `${prefix}/about` },
    { label: t("nav.services"), href: `${prefix}/services` },
    { label: locale === "th" ? "ลูกค้า" : locale === "zh" ? "客户" : "Customer", href: `${prefix}/dashboard` },
    { label: t("nav.forFixers"), href: `${prefix}/fixers` },
    { label: t("footer.contact"), href: `${prefix}/contact` },
    { label: t("footer.getSupport"), href: `${prefix}/get-support` },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Top row: Brand + 5 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <h3 className="text-base font-bold text-white mb-2">CBLUE</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              {locale === "th"
                ? "CBLUE เชื่อมต่อคุณกับช่างที่ได้รับการรับรองสำหรับทุกงานซ่อมบ้าน จองง่าย จ่ายผ่าน PromptPay เริ่มต้นเพียง ฿200"
                : locale === "zh"
                ? "CBLUE 连接您与认证技工，满足所有家庭维修需求。轻松预约，PromptPay 支付，起价仅 ฿200"
                : "CBLUE connects you with certified fixers for all home repairs. Easy booking, pay via PromptPay, starting from just ฿200."}
            </p>
          </div>

          {/* Household Services */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
              {locale === "th" ? "บริการซ่อมบ้าน" : locale === "zh" ? "家庭维修" : "Household"}
            </h3>
            <ul className="space-y-1">
              {householdLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
              {t("footer.company")}
            </h3>
            <ul className="space-y-1">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Real Estate */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
              {t("nav.realEstate")}
            </h3>
            <ul className="space-y-1">
              <li>
                <Link href={`${prefix}/properties`} className="text-xs hover:text-white transition-colors">
                  {t("realEstate.searchProperty")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/properties/register`} className="text-xs hover:text-white transition-colors">
                  {t("realEstate.listProperty")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Project Services */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
              {locale === "th" ? "โครงการ" : locale === "zh" ? "项目" : "Projects"}
            </h3>
            <ul className="space-y-1">
              {projectLinks.slice(0, 10).map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={`${prefix}/services#project`} className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
                  {locale === "th" ? "ดูทั้งหมด →" : "View all →"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Professionals */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
              {locale === "th" ? "มืออาชีพ" : locale === "zh" ? "专业人士" : "Professionals"}
            </h3>
            <ul className="space-y-1">
              {professionalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-5 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            &copy; 2026 CBLUE Co., Ltd. All rights reserved
          </p>
          <div className="flex gap-4 text-xs text-gray-500">
            <Link href={`${prefix}/terms`} className="hover:text-white transition-colors">
              {locale === "th" ? "เงื่อนไขการใช้บริการ" : "Term of Service"}
            </Link>
            <Link href={`${prefix}/privacy`} className="hover:text-white transition-colors">
              {locale === "th" ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
