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
    { label: locale === "th" ? "พัฒนาเว็บไซต์" : locale === "zh" ? "网站开发" : "Website Development", href: `${prefix}/booking/project?service=WEBSITE_DEVELOPMENT` },
    { label: locale === "th" ? "พัฒนาแอปมือถือ" : locale === "zh" ? "移动应用开发" : "Mobile App Development", href: `${prefix}/booking/project?service=MOBILE_APP_DEVELOPMENT` },
    { label: locale === "th" ? "AI Integration" : locale === "zh" ? "人工智能集成" : "AI Integration", href: `${prefix}/booking/project?service=AI_INTEGRATION` },
    { label: locale === "th" ? "พัฒนาซอฟต์แวร์" : locale === "zh" ? "软件开发" : "Software Development", href: `${prefix}/booking/project?service=SOFTWARE_DEV` },
    { label: locale === "th" ? "แมชชีนเลิร์นนิง" : locale === "zh" ? "机器学习" : "Machine Learning", href: `${prefix}/booking/project?service=ML_AI` },
    { label: locale === "th" ? "ที่ปรึกษา" : locale === "zh" ? "咨询" : "Consulting", href: `${prefix}/booking/project?service=CONSULTING` },
    { label: locale === "th" ? "แผงโซลาร์" : locale === "zh" ? "太阳能板" : "Solar Panels", href: `${prefix}/booking/project?service=SOLAR_PANELS` },
    { label: locale === "th" ? "สถานีชาร์จ EV" : locale === "zh" ? "电动车充电" : "EV Charging", href: `${prefix}/booking/project?service=EV_CHARGING` },
    { label: locale === "th" ? "ออกแบบอาคารสีเขียว" : locale === "zh" ? "绿色建筑设计" : "Green Building Design", href: `${prefix}/booking/project?service=GREEN_BUILDING_DESIGN` },
    { label: locale === "th" ? "HVAC MEP" : locale === "zh" ? "暖通机电翻新" : "HVAC MEP & Retrofit", href: `${prefix}/booking/project?service=MEP_RETROFIT` },
    { label: locale === "th" ? "ครัว" : locale === "zh" ? "厨房" : "Kitchen", href: `${prefix}/booking/project?service=KITCHEN` },
    { label: locale === "th" ? "คืนสภาพและตกแต่ง" : locale === "zh" ? "恢复和装修" : "Reinstatement & Fit-out", href: `${prefix}/booking/project?service=REINSTATEMENT` },
    { label: locale === "th" ? "ระบบอัตโนมัติ" : locale === "zh" ? "自动化" : "Automation", href: `${prefix}/booking/project?service=SMART_BUILDING_AUTOMATION` },
    { label: locale === "th" ? "บริการสิ่งแวดล้อม" : locale === "zh" ? "环保服务" : "Environmental Services", href: `${prefix}/booking/project?service=ENVIRONMENTAL_SERVICES` },
    { label: locale === "th" ? "ระบบ CCTV" : locale === "zh" ? "安防监控" : "Security & CCTV", href: `${prefix}/booking/project?service=SECURITY_CCTV` },
    { label: locale === "th" ? "ระบบควบคุมประตู" : locale === "zh" ? "门禁系统" : "Door & Access Control", href: `${prefix}/booking/project?service=DOOR_ACCESS_CONTROL` },
    { label: locale === "th" ? "ก่อสร้างสีเขียว" : locale === "zh" ? "绿色建筑" : "Green Construction", href: `${prefix}/booking/project?service=GREEN_CONSTRUCTION` },
    { label: locale === "th" ? "สมาร์ทโฮม & BMS" : locale === "zh" ? "智能家居/楼宇管理" : "Smart Home/Building & BMS", href: `${prefix}/booking/project?service=SMART_HOME` },
    { label: locale === "th" ? "สมาร์ทฟาร์มมิ่ง" : locale === "zh" ? "智能农业" : "Smart Farming", href: `${prefix}/booking/project?service=SMART_FARMING` },
  ];

  const professionalLinks = [
    { label: locale === "th" ? "ทนายความ" : locale === "zh" ? "律师" : "Lawyer", href: `${prefix}/booking/professional?service=LAWYER` },
    { label: locale === "th" ? "บัญชี" : locale === "zh" ? "会计" : "Accountant", href: `${prefix}/booking/professional?service=ACCOUNTANT` },
    { label: locale === "th" ? "ผู้สอบบัญชี" : locale === "zh" ? "注册会计师" : "CPA", href: `${prefix}/booking/professional?service=CPA` },
    { label: locale === "th" ? "สถาปนิก" : locale === "zh" ? "建筑师" : "Architect", href: `${prefix}/booking/professional?service=ARCHITECT` },
    { label: locale === "th" ? "มัณฑนากร" : locale === "zh" ? "室内设计师" : "Interior Designer", href: `${prefix}/booking/professional?service=INTERIOR_DESIGNER` },
    { label: locale === "th" ? "วิศวกร" : locale === "zh" ? "工程师" : "Engineer", href: `${prefix}/booking/professional?service=DESIGN_CIVIL_ENGINEER` },
    { label: locale === "th" ? "โปรแกรมเมอร์" : locale === "zh" ? "程序员" : "Software Programmer", href: `${prefix}/booking/professional?service=SOFTWARE_PROGRAMMER` },
    { label: locale === "th" ? "การตลาดดิจิทัล" : locale === "zh" ? "数字营销" : "Digital Marketing", href: `${prefix}/booking/professional?service=DIGITAL_MARKETING` },
    { label: locale === "th" ? "เจ้าหน้าที่ความปลอดภัย" : locale === "zh" ? "安全员" : "Safety Officer", href: `${prefix}/booking/professional?service=SAFETY_OFFICER` },
    { label: locale === "th" ? "อื่น ๆ" : locale === "zh" ? "其他" : "Others", href: `${prefix}/booking/professional?service=OTHERS` },
  ];

  const companyLinks = [
    { label: t("footer.about"), href: `${prefix}/about` },
    { label: t("nav.services"), href: `${prefix}/services` },
    { label: locale === "th" ? "หน้าลูกค้า" : locale === "zh" ? "客户页面" : "Customer Page", href: `${prefix}/dashboard` },
    { label: t("nav.forFixers"), href: `${prefix}/fixers` },
    { label: t("footer.contact"), href: `${prefix}/get-support` },
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
                  {locale === "th" ? "ดูทั้งหมด →" : locale === "zh" ? "查看全部 →" : "View all →"}
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
              {locale === "th" ? "เงื่อนไขการใช้บริการ" : locale === "zh" ? "服务条款" : "Term of Service"}
            </Link>
            <Link href={`${prefix}/privacy`} className="hover:text-white transition-colors">
              {locale === "th" ? "นโยบายความเป็นส่วนตัว" : locale === "zh" ? "隐私政策" : "Privacy Policy"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
