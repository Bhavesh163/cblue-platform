"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface PdpaConsentProps {
  locale: string;
  prefix: string;
  /** Which user role is accepting */
  role: "customer" | "partner" | "fixer" | "professional" | "property_lister";
  /** Called with timestamp when user accepts */
  onAccept: (consentTimestamp: string) => void;
  /** If true, show as inline section instead of modal */
  inline?: boolean;
}

const T: Record<string, Record<string, string>> = {
  en: {
    title: "Personal Data Protection (PDPA)",
    subtitle: "Thailand Personal Data Protection Act B.E. 2562 (2019)",
    intro: "CBLUE collects, uses, and stores your personal data to provide our matching and booking services. By proceeding, you acknowledge and consent to the following:",
    bullet1: "We collect your name, email, phone number, address, and service preferences to connect you with the appropriate fixers, professionals, or property listers.",
    bullet2: "Your personal data will NOT be shared with matched partners until you authorize it by paying the processing fee. Even then, only your anonymous alias is shared — never your real name or phone number.",
    bullet3: "Your PDPA consent record will be stored for 3 years from the date of acceptance as required by Thai law.",
    bullet4: "Your profile and account will be automatically deleted if inactive for 12 consecutive months.",
    bullet5: "Service history and transaction records will be retained for 18 months for dispute resolution and audit purposes.",
    bullet6: "You may request access, correction, or deletion of your personal data at any time at  Profile.",
    bullet7: "CBLUE implements industry-standard security measures including encryption and access controls to protect your data.",
    disclaimer: "CBLUE acts as a matching platform only. The agreed price, scope of work, and payment between you and the partner (fixer/project team/professional/property lister) is a direct arrangement between both parties. CBLUE is not responsible for pricing disputes, work quality, or agreements made after the matching process. Both parties acknowledge this upon paying the processing fee. The processing fee is non-refundable as the matching service is completed once the customer initiates the process. This fee covers AI matching, partner verification, PO issuance, and communication facilitation.",
    disclaimerTitle: "Disclaimer",
    acceptBtn: "I Accept & Consent",
    declineBtn: "Decline",
    acceptedAt: "PDPA consent accepted on",
    role_customer: "Customer",
    role_partner: "Partner",
    partner_intro: "CBLUE collects, uses, and stores partner personal data to verify your identity, evaluate your tier, match you with suitable jobs, and support secure platform operations. By proceeding to the partner page, you acknowledge and consent to the following:",
    partner_bullet1: "We collect your name, email, phone number, service areas, service preferences, price list, KYC information, credentials, portfolio, and work history to verify and match your partner profile.",
    partner_bullet2: "Your direct contact details are not shown to customers during matching. You may chat with customers and agree work details directly when the workflow allows communication.",
    partner_bullet3: "Your PDPA consent record will be stored for 3 years from the date of acceptance as required by Thai law.",
    partner_bullet4: "Your profile and account may be deleted or deactivated if inactive for 12 consecutive months or if required by platform safety rules.",
    partner_bullet5: "Service history, tier evaluation records, and transaction records will be retained for 18 months for dispute resolution, audit, safety, and compliance purposes.",
    partner_bullet6: "You may request access, correction, or deletion of your personal data at any time at Profile or through CBLUE support, subject to lawful retention duties.",
    partner_bullet7: "CBLUE implements industry-standard security measures including encryption, access controls, and limited-access review workflows to protect partner and customer data.",
    partner_disclaimer: "CBLUE acts as a matching platform only. The agreed price, scope of work, schedule, work quality, and payment between the customer and partner are a direct arrangement between both parties. Partners are responsible for the accuracy of their profile, credentials, price list, licenses, tax obligations, and service performance. CBLUE may review, rank, suspend, or remove partner profiles to protect platform safety and service quality.",
    role_fixer: "Fixer / Technician",
    role_professional: "Professional",
    role_property_lister: "Property Owner / Dealer",
    dataRetention: "Data Retention Policy",
    learnMore: "Learn more about our",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
  },
  th: {
    title: "การคุ้มครองข้อมูลส่วนบุคคล (PDPA)",
    subtitle: "พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562",
    intro: "CBLUE เก็บรวบรวม ใช้ และจัดเก็บข้อมูลส่วนบุคคลของคุณเพื่อให้บริการจับคู่และจองบริการ โดยการดำเนินการต่อ คุณรับทราบและยินยอมดังต่อไปนี้:",
    bullet1: "เราเก็บรวบรวมชื่อ อีเมล เบอร์โทรศัพท์ ที่อยู่ และความต้องการบริการของคุณ เพื่อเชื่อมต่อกับช่าง มืออาชีพ หรือผู้ลงประกาศอสังหาริมทรัพย์ที่เหมาะสม",
    bullet2: "ข้อมูลส่วนบุคคลของคุณจะไม่ถูกแบ่งปันกับพาร์ทเนอร์ที่จับคู่จนกว่าคุณจะอนุญาตโดยการชำระค่าธรรมเนียมดำเนินการ แม้เมื่อชำระแล้ว เราแบ่งปันเฉพาะนามแฝง — ไม่เปิดเผยชื่อจริงหรือเบอร์โทรศัพท์",
    bullet3: "บันทึกความยินยอม PDPA ของคุณจะถูกจัดเก็บเป็นเวลา 3 ปี นับจากวันที่ยอมรับตามที่กฎหมายไทยกำหนด",
    bullet4: "โปรไฟล์และบัญชีของคุณจะถูกลบโดยอัตโนมัติหากไม่มีการใช้งานติดต่อกัน 12 เดือน",
    bullet5: "ประวัติการใช้บริการและบันทึกธุรกรรมจะถูกเก็บรักษาไว้ 18 เดือน เพื่อการระงับข้อพิพาทและการตรวจสอบ",
    bullet6: "คุณสามารถขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณได้ตลอดเวลา ที่  โปรไฟล์",
    bullet7: "CBLUE ใช้มาตรการรักษาความปลอดภัยมาตรฐานอุตสาหกรรม รวมถึงการเข้ารหัสและการควบคุมการเข้าถึงเพื่อปกป้องข้อมูลของคุณ",
    disclaimer: "CBLUE ทำหน้าที่เป็นแพลตฟอร์มจับคู่เท่านั้น ราคา ขอบเขตงาน และการชำระเงินระหว่างคุณกับพาร์ทเนอร์ (ช่าง/มืออาชีพ/ผู้ลงประกาศอสังหาฯ) เป็นข้อตกลงโดยตรงระหว่างทั้งสองฝ่าย CBLUE ไม่รับผิดชอบต่อข้อพิพาทเรื่องราคา คุณภาพงาน หรือข้อตกลงที่เกิดขึ้นหลังจากกระบวนการจับคู่ ทั้งสองฝ่ายรับทราบเรื่องนี้เมื่อชำระค่าธรรมเนียมดำเนินการ",
    disclaimerTitle: "ข้อสงวนสิทธิ์",
    acceptBtn: "ยอมรับและยินยอม",
    declineBtn: "ปฏิเสธ",
    acceptedAt: "ยินยอม PDPA เมื่อ",
    role_customer: "ลูกค้า",
    role_partner: "พาร์ทเนอร์",
    partner_intro: "CBLUE เก็บรวบรวม ใช้ และจัดเก็บข้อมูลส่วนบุคคลของพาร์ทเนอร์ เพื่อยืนยันตัวตน ประเมินระดับ จับคู่งานที่เหมาะสม และดูแลความปลอดภัยของแพลตฟอร์ม โดยการเข้าสู่หน้าพาร์ทเนอร์ คุณรับทราบและยินยอมดังต่อไปนี้:",
    partner_bullet1: "เราเก็บรวบรวมชื่อ อีเมล เบอร์โทรศัพท์ พื้นที่ให้บริการ ความต้องการรับงาน รายการราคา ข้อมูล KYC เอกสารรับรอง ผลงาน และประวัติการทำงาน เพื่อยืนยันและจับคู่โปรไฟล์พาร์ทเนอร์ของคุณ",
    partner_bullet2: "ข้อมูลติดต่อโดยตรงของคุณจะไม่แสดงต่อลูกค้าในขั้นตอนจับคู่ คุณสามารถแชทกับลูกค้าและตกลงรายละเอียดงานกันเองได้โดยตรงเมื่อขั้นตอนงานเปิดให้สื่อสาร",
    partner_bullet3: "บันทึกความยินยอม PDPA ของคุณจะถูกจัดเก็บเป็นเวลา 3 ปี นับจากวันที่ยอมรับตามที่กฎหมายไทยกำหนด",
    partner_bullet4: "โปรไฟล์และบัญชีของคุณอาจถูกลบหรือปิดใช้งานหากไม่มีการใช้งานติดต่อกัน 12 เดือน หรือเมื่อจำเป็นตามกฎความปลอดภัยของแพลตฟอร์ม",
    partner_bullet5: "ประวัติบริการ บันทึกการประเมินระดับ และบันทึกธุรกรรมจะถูกเก็บรักษาไว้ 18 เดือน เพื่อการระงับข้อพิพาท ตรวจสอบ ความปลอดภัย และการปฏิบัติตามกฎหมาย",
    partner_bullet6: "คุณสามารถขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณได้ตลอดเวลาที่โปรไฟล์หรือผ่านฝ่ายสนับสนุน CBLUE ภายใต้หน้าที่การเก็บรักษาตามกฎหมาย",
    partner_bullet7: "CBLUE ใช้มาตรการรักษาความปลอดภัยมาตรฐานอุตสาหกรรม รวมถึงการเข้ารหัส การควบคุมการเข้าถึง และขั้นตอนตรวจสอบที่จำกัดสิทธิ์ เพื่อปกป้องข้อมูลพาร์ทเนอร์และลูกค้า",
    partner_disclaimer: "CBLUE ทำหน้าที่เป็นแพลตฟอร์มจับคู่เท่านั้น ราคา ขอบเขตงาน ระยะเวลา คุณภาพงาน และการชำระเงินระหว่างลูกค้าและพาร์ทเนอร์เป็นข้อตกลงโดยตรงระหว่างทั้งสองฝ่าย พาร์ทเนอร์ต้องรับผิดชอบต่อความถูกต้องของโปรไฟล์ เอกสารรับรอง รายการราคา ใบอนุญาต ภาษี และคุณภาพการให้บริการของตน CBLUE อาจตรวจสอบ จัดอันดับ ระงับ หรือลบโปรไฟล์พาร์ทเนอร์เพื่อรักษาความปลอดภัยและคุณภาพของแพลตฟอร์ม",
    role_fixer: "ช่าง / ผู้ให้บริการ",
    role_professional: "มืออาชีพ",
    role_property_lister: "เจ้าของ / ตัวแทนอสังหาฯ",
    dataRetention: "นโยบายการเก็บรักษาข้อมูล",
    learnMore: "อ่านเพิ่มเติมเกี่ยวกับ",
    privacyPolicy: "นโยบายความเป็นส่วนตัว",
    termsOfService: "เงื่อนไขการใช้งาน",
  },
  zh: {
    title: "个人数据保护 (PDPA)",
    subtitle: "泰国个人数据保护法 B.E. 2562 (2019)",
    intro: "CBLUE 收集、使用和存储您的个人数据以提供匹配和预订服务。继续操作即表示您知悉并同意以下内容：",
    bullet1: "我们收集您的姓名、电子邮件、电话号码、地址和服务偏好，以便将您与合适的技工、专业人士或房产经纪人联系。",
    bullet2: "在您支付处理费授权之前，您的个人数据不会与匹配的合作伙伴共享。即使授权后，我们也仅共享您的匿名别名——从不透露真实姓名或电话号码。",
    bullet3: "您的 PDPA 同意记录将自接受之日起保存 3 年，符合泰国法律要求。",
    bullet4: "如果连续 12 个月不活跃，您的个人资料和帐户将被自动删除。",
    bullet5: "服务历史和交易记录将保留 18 个月，用于争议解决和审计。",
    bullet6: "您可以随时在  个人资料 请求访问、更正或删除您的个人数据。",
    bullet7: "CBLUE 采用行业标准安全措施，包括加密和访问控制来保护您的数据。",
    disclaimer: "CBLUE 仅作为匹配平台。您与合作伙伴（技工/项目团队/专业人士/房产经纪人）之间的价格、工作范围和付款是双方的直接安排。CBLUE 不对匹配过程后的定价纠纷、工作质量或协议承担责任。双方在支付处理费时确认此事。处理费不可退还，因为匹配服务在客户发起流程后已完成。此费用涵盖AI匹配、合作伙伴验证、PO签发和通信协调。",
    disclaimerTitle: "免责声明",
    acceptBtn: "我接受并同意",
    declineBtn: "拒绝",
    acceptedAt: "PDPA 同意时间",
    role_customer: "客户",
    role_partner: "合作伙伴",
    partner_intro: "CBLUE 会收集、使用并存储合作伙伴的个人数据，用于身份验证、等级评估、工作匹配以及平台安全运营。进入合作伙伴页面即表示您知悉并同意以下内容：",
    partner_bullet1: "我们会收集您的姓名、电子邮件、电话号码、服务区域、接单偏好、价格清单、KYC 信息、资质证明、作品集和工作经历，以验证并匹配您的合作伙伴资料。",
    partner_bullet2: "在匹配阶段，您的直接联系方式不会显示给客户。当流程允许沟通时，您可以与客户聊天并直接协商工作细节。",
    partner_bullet3: "您的 PDPA 同意记录将自接受之日起保存 3 年，符合泰国法律要求。",
    partner_bullet4: "如果连续 12 个月不活跃，或根据平台安全规则需要，您的资料和账户可能被删除或停用。",
    partner_bullet5: "服务历史、等级评估记录和交易记录将保留 18 个月，用于争议解决、审计、安全和合规。",
    partner_bullet6: "您可以随时在个人资料或通过 CBLUE 支持请求访问、更正或删除个人数据，但须遵守法定保留义务。",
    partner_bullet7: "CBLUE 采用行业标准安全措施，包括加密、访问控制和受限审核流程，以保护合作伙伴和客户数据。",
    partner_disclaimer: "CBLUE 仅作为匹配平台。客户与合作伙伴之间约定的价格、工作范围、时间安排、工作质量和付款均为双方直接安排。合作伙伴须对其资料、资质、价格清单、许可证、税务义务和服务表现的准确性负责。为保护平台安全和服务质量，CBLUE 可以审核、评级、暂停或移除合作伙伴资料。",
    role_fixer: "技工",
    role_professional: "专业人士",
    role_property_lister: "业主 / 经纪人",
    dataRetention: "数据保留政策",
    learnMore: "了解更多关于我们的",
    privacyPolicy: "隐私政策",
    termsOfService: "服务条款",
  },
};

export default function PdpaConsent({ locale, prefix, role, onAccept, inline }: PdpaConsentProps) {
  const isPartner = role === "partner";
  const t = useCallback((key: string) => {
    const roleKey = isPartner ? `partner_${key}` : key;
    return T[locale]?.[roleKey] ?? T[locale]?.[key] ?? T["en"]?.[roleKey] ?? T["en"]?.[key] ?? key;
  }, [isPartner, locale]);
  const theme = isPartner
    ? {
        icon: "bg-green-100",
        badge: "bg-green-50 border-green-200 text-green-700",
        retention: "bg-green-50 border-green-200",
        retentionTitle: "text-green-800",
        retentionCard: "border-green-100",
        retentionNumber: "text-green-700",
        disclaimer: "bg-green-50 border-green-200",
        disclaimerTitle: "text-green-800",
        disclaimerText: "text-green-700",
        link: "text-green-700 hover:underline",
        button: "bg-green-600 hover:bg-green-700",
      }
    : {
        icon: "bg-blue-100",
        badge: "bg-sky-50 border-sky-200 text-sky-700",
        retention: "bg-amber-50 border-amber-200",
        retentionTitle: "text-amber-800",
        retentionCard: "border-amber-100",
        retentionNumber: "text-amber-700",
        disclaimer: "bg-red-50 border-red-200",
        disclaimerTitle: "text-red-800",
        disclaimerText: "text-red-700",
        link: "text-blue-600 hover:underline",
        button: "bg-sky-600 hover:bg-sky-700",
      };
  const [accepted, setAccepted] = useState(false);
  const [existingConsent, setExistingConsent] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`pdpa_consent_${role}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if consent is still valid (3 years)
        const consentDate = new Date(parsed.timestamp);
        const threeYearsLater = new Date(consentDate);
        threeYearsLater.setFullYear(threeYearsLater.getFullYear() + 3);
        if (new Date() < threeYearsLater) {
          setExistingConsent(parsed.timestamp);
          setAccepted(true);
        } else {
          localStorage.removeItem(`pdpa_consent_${role}`);
        }
      }
    } catch { /* ignore */ }
  }, [role]);

  function handleAccept() {
    const timestamp = new Date().toISOString();
    try {
      localStorage.setItem(`pdpa_consent_${role}`, JSON.stringify({ timestamp, role }));
    } catch { /* ignore */ }
    setAccepted(true);
    setExistingConsent(timestamp);
    onAccept(timestamp);
  }

  if (accepted && existingConsent && !inline) {
    return null;
  }

  if (accepted && existingConsent && inline) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex items-center gap-3">
        <span className="text-lg"></span>
        <span>{t("acceptedAt")} {new Date(existingConsent).toLocaleDateString(locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
      </div>
    );
  }

  const content = (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl ${theme.icon} flex items-center justify-center text-2xl flex-shrink-0`}>🛡️</div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t("title")}</h2>
          <p className="text-xs text-gray-500">{t("subtitle")}</p>
        </div>
      </div>

      {/* Role badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-full text-xs font-semibold ${theme.badge}`}>
         {t(`role_${role}`)}
      </div>

      {/* Intro */}
      <p className="text-sm text-gray-600 leading-relaxed">{t("intro")}</p>

      {/* Key points */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <div key={n} className="flex items-start gap-2.5 text-sm">
            <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
            <span className="text-gray-600">{t(`bullet${n}`)}</span>
          </div>
        ))}
      </div>

      {/* Data Retention Summary */}
      <div className={`border rounded-xl p-4 ${theme.retention}`}>
        <h3 className={`text-sm font-bold mb-2 flex items-center gap-2 ${theme.retentionTitle}`}> {t("dataRetention")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className={`bg-white rounded-lg p-3 text-center border ${theme.retentionCard}`}>
            <p className={`text-2xl font-bold ${theme.retentionNumber}`}>3</p>
            <p className="text-gray-600">{locale === "th" ? "ปี — บันทึกความยินยอม" : locale === "zh" ? "年 — 同意记录" : "Years — Consent record"}</p>
          </div>
          <div className={`bg-white rounded-lg p-3 text-center border ${theme.retentionCard}`}>
            <p className={`text-2xl font-bold ${theme.retentionNumber}`}>18</p>
            <p className="text-gray-600">{locale === "th" ? "เดือน — ประวัติการใช้บริการ" : locale === "zh" ? "月 — 服务历史" : "Months — Service history"}</p>
          </div>
          <div className={`bg-white rounded-lg p-3 text-center border ${theme.retentionCard}`}>
            <p className={`text-2xl font-bold ${theme.retentionNumber}`}>12</p>
            <p className="text-gray-600">{locale === "th" ? "เดือน — ลบบัญชีถ้าไม่ใช้" : locale === "zh" ? "月 — 不活跃删除" : "Months — Inactive deletion"}</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className={`border rounded-xl p-4 ${theme.disclaimer}`}>
        <h3 className={`text-sm font-bold mb-2 flex items-center gap-2 ${theme.disclaimerTitle}`}> {t("disclaimerTitle")}</h3>
        <p className={`text-xs leading-relaxed ${theme.disclaimerText}`}>{t("disclaimer")}</p>
      </div>

      {/* Links */}
      <p className="text-xs text-gray-500">
        {t("learnMore")}{" "}
        <Link href={`${prefix}/privacy`} className={theme.link}>{t("privacyPolicy")}</Link>
        {" & "}
        <Link href={`${prefix}/terms`} className={theme.link}>{t("termsOfService")}</Link>
      </p>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleAccept}
          className={`flex-1 py-3 ${theme.button} text-white text-sm font-bold rounded-xl transition shadow-lg`}
        >
          🛡️ {t("acceptBtn")}
        </button>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        {content}
      </div>
    );
  }

  // Modal overlay
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        {content}
      </div>
    </div>
  );
}

/**
 * Hook to check PDPA consent status for a given role.
 * Returns { hasConsent, consentTimestamp, clearConsent }.
 */
export function usePdpaConsent(role: PdpaConsentProps["role"]) {
  const [hasConsent, setHasConsent] = useState(false);
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`pdpa_consent_${role}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const consentDate = new Date(parsed.timestamp);
        const threeYearsLater = new Date(consentDate);
        threeYearsLater.setFullYear(threeYearsLater.getFullYear() + 3);
        if (new Date() < threeYearsLater) {
          setHasConsent(true);
          setConsentTimestamp(parsed.timestamp);
        } else {
          localStorage.removeItem(`pdpa_consent_${role}`);
        }
      }
    } catch { /* ignore */ }
  }, [role]);

  const clearConsent = useCallback(() => {
    try { localStorage.removeItem(`pdpa_consent_${role}`); } catch { /* ignore */ }
    setHasConsent(false);
    setConsentTimestamp(null);
  }, [role]);

  return { hasConsent, consentTimestamp, clearConsent };
}
