"use client";

import Link from "next/link";
import { useLocale } from "next-intl";

type Locale = "en" | "th" | "zh";
type PolicyKind = "refund" | "retention";

type PolicyCopy = {
  title: string;
  subtitle: string;
  sections: Array<{ title: string; body: string }>;
};

const POLICY_COPY: Record<PolicyKind, Record<Locale, PolicyCopy>> = {
  refund: {
    en: {
      title: "Refund Policy",
      subtitle: "CBLUE public policy reference",
      sections: [
        {
          title: "1. Purpose and scope",
          body: "This policy explains how CBLUE processing fees and payment-related refunds are handled for marketplace bookings and property contact workflows. The service provider's price and any property transaction price are separate from CBLUE's processing fee.",
        },
        {
          title: "2. Processing fees and payment",
          body: "The applicable processing fee is shown before payment and is based on the selected service tier or property listing tier. Payment is recorded against the relevant request or reference. CBLUE does not store bank account numbers; payment processing and settlement are handled through the configured payment channel.",
        },
        {
          title: "3. Cancellation and refund eligibility",
          body: "A customer may cancel before the service provider confirms the booking. After confirmation and payment, the processing fee is non-refundable except where required by applicable law, an applicable payment rule, or a CBLUE error. Property contact and service requests remain subject to the status and action rules shown in the current Terms of Use.",
        },
        {
          title: "4. Review and eligibility decision",
          body: "CBLUE reviews the persisted request, payment reference, workflow status, cancellation history, and reason provided. A request is not eligible merely because a customer changes their mind after a confirmed, paid workflow. CBLUE may ask for information needed to prevent duplicate or fraudulent claims.",
        },
        {
          title: "5. Timing",
          body: "CBLUE acknowledges a refund request after it is received and reviews it using the authoritative transaction record. When a refund is approved, it is sent through the original payment route after verification and payment-provider settlement requirements are complete. The time for funds to appear can depend on the payment provider.",
        },
        {
          title: "6. How to request a refund",
          body: "Use the Contact Us page or email cblue.thailand@gmail.com. Include the account email, request or PO reference, payment reference, date, and a clear reason. Do not send identity-card images, passwords, one-time codes, or full payment credentials by email.",
        },
        {
          title: "7. Applicable rules and contact",
          body: "This policy operates with the CBLUE Terms of Use and applicable Thai law. Where a statutory right or payment-provider rule applies, that rule prevails. Questions or unresolved requests may be sent to cblue.thailand@gmail.com.",
        },
      ],
    },
    th: {
      title: "นโยบายการคืนเงิน",
      subtitle: "ข้อมูลนโยบายสาธารณะของ CBLUE",
      sections: [
        {
          title: "1. วัตถุประสงค์และขอบเขต",
          body: "นโยบายนี้อธิบายการจัดการค่าธรรมเนียมดำเนินการและการคืนเงินที่เกี่ยวข้องกับการจองบริการและการติดต่อประกาศอสังหาริมทรัพย์ ค่าบริการของผู้ให้บริการและราคาซื้อขายหรือเช่าอสังหาริมทรัพย์แยกจากค่าธรรมเนียมดำเนินการของ CBLUE",
        },
        {
          title: "2. ค่าธรรมเนียมและการชำระเงิน",
          body: "ค่าธรรมเนียมดำเนินการจะแสดงก่อนชำระเงินและขึ้นอยู่กับระดับบริการหรือระดับประกาศอสังหาริมทรัพย์ที่เลือก การชำระเงินจะผูกกับคำขอหรือเลขอ้างอิงที่เกี่ยวข้อง CBLUE ไม่เก็บเลขที่บัญชีธนาคาร การประมวลผลและการโอนเงินเป็นไปตามช่องทางชำระเงินที่กำหนด",
        },
        {
          title: "3. การยกเลิกและสิทธิขอคืนเงิน",
          body: "ลูกค้าสามารถยกเลิกก่อนผู้ให้บริการยืนยันการจอง หลังยืนยันและชำระเงินแล้ว ค่าธรรมเนียมดำเนินการไม่สามารถคืนได้ เว้นแต่กฎหมายที่ใช้บังคับ กฎของผู้ให้บริการชำระเงิน หรือความผิดพลาดของ CBLUE กำหนดเป็นอย่างอื่น คำขอติดต่ออสังหาริมทรัพย์และบริการต้องเป็นไปตามสถานะและการดำเนินการในข้อกำหนดการใช้บริการปัจจุบัน",
        },
        {
          title: "4. การตรวจสอบสิทธิ",
          body: "CBLUE ตรวจสอบคำขอ รายการชำระเงิน สถานะเวิร์กโฟลว์ ประวัติการยกเลิก และเหตุผลที่แจ้งไว้จากข้อมูลที่บันทึกโดยระบบ การเปลี่ยนใจหลังเวิร์กโฟลว์ได้รับการยืนยันและชำระเงินแล้วไม่ทำให้มีสิทธิคืนเงินโดยอัตโนมัติ CBLUE อาจขอข้อมูลเพื่อป้องกันคำขอซ้ำหรือการฉ้อโกง",
        },
        {
          title: "5. ระยะเวลา",
          body: "CBLUE จะแจ้งรับคำขอเมื่อได้รับและตรวจสอบจากข้อมูลธุรกรรมที่เป็นแหล่งอ้างอิง เมื่ออนุมัติแล้วจะส่งคืนผ่านช่องทางชำระเงินเดิมหลังตรวจสอบและปฏิบัติตามขั้นตอนของผู้ให้บริการชำระเงิน ระยะเวลาที่เงินเข้าบัญชีอาจขึ้นอยู่กับผู้ให้บริการชำระเงิน",
        },
        {
          title: "6. วิธีขอคืนเงิน",
          body: "ติดต่อผ่านหน้า ติดต่อเรา หรืออีเมล cblue.thailand@gmail.com ระบุอีเมลบัญชี เลขคำขอหรือ PO เลขอ้างอิงการชำระเงิน วันที่ และเหตุผลให้ชัดเจน ห้ามส่งรูปบัตรประชาชน รหัสผ่าน รหัสใช้ครั้งเดียว หรือข้อมูลการชำระเงินทั้งหมดทางอีเมล",
        },
        {
          title: "7. กฎหมายและการติดต่อ",
          body: "นโยบายนี้ใช้ร่วมกับข้อกำหนดการใช้บริการของ CBLUE และกฎหมายไทย หากมีกฎหมายหรือกฎของผู้ให้บริการชำระเงินกำหนดสิทธิไว้ ให้ใช้กฎนั้น ติดต่อข้อสงสัยหรือคำขอที่ยังไม่ยุติได้ที่ cblue.thailand@gmail.com",
        },
      ],
    },
    zh: {
      title: "退款政策",
      subtitle: "CBLUE 公开政策参考",
      sections: [
        {
          title: "1. 目的和范围",
          body: "本政策说明市场预约和房产联系流程中的 CBLUE 处理费及相关付款退款。服务提供商的价格以及房产交易价格与 CBLUE 处理费分开计算。",
        },
        {
          title: "2. 处理费和付款",
          body: "适用的处理费会在付款前显示，并根据所选服务等级或房产列表等级确定。付款会记录在相关请求或参考编号下。CBLUE 不存储银行账号，付款处理和结算按照配置的付款渠道执行。",
        },
        {
          title: "3. 取消和退款资格",
          body: "客户可以在服务提供商确认预约前取消。确认并付款后，处理费不可退款，除非适用法律、付款规则或 CBLUE 错误另有要求。房产联系和服务请求仍受当前服务条款中的状态和操作规则约束。",
        },
        {
          title: "4. 审核和资格决定",
          body: "CBLUE 根据保存的请求、付款参考、工作流状态、取消记录和提交的理由进行审核。已确认并付款的工作流，客户改变主意本身不自动产生退款资格。为防止重复或欺诈请求，CBLUE 可能要求补充资料。",
        },
        {
          title: "5. 时间安排",
          body: "CBLUE 收到退款请求后会确认收件，并根据权威交易记录审核。退款获批后，在完成验证和付款服务商结算要求后，通过原付款渠道发出。资金到账时间可能取决于付款服务商。",
        },
        {
          title: "6. 如何申请退款",
          body: "请使用联系我们页面或发送邮件至 cblue.thailand@gmail.com。请提供账户邮箱、请求或 PO 参考号、付款参考号、日期和明确理由。请勿通过邮件发送身份证照片、密码、一次性验证码或完整付款凭证。",
        },
        {
          title: "7. 适用规则和联系方式",
          body: "本政策与 CBLUE 服务条款及适用的泰国法律共同适用。如法律或付款服务商规则规定了权利，以该规则为准。问题或未解决的请求可发送至 cblue.thailand@gmail.com。",
        },
      ],
    },
  },
  retention: {
    en: {
      title: "Data Retention Policy",
      subtitle: "CBLUE public policy reference",
      sections: [
        {
          title: "1. Data categories",
          body: "CBLUE may retain account and identity data, service and property workflow records, payment references, communications, technical and security records, KYC and qualification evidence, and audit or legal records. Access is limited by role and purpose.",
        },
        {
          title: "2. Published retention and deletion schedule",
          body: "The currently published CBLUE schedule is purpose-limited: consent records are retained for 3 years; service history for 18 months; and inactive-account personal data and private KYC evidence are deleted after 12 months of inactivity. These periods do not override a statutory duty, contract, dispute, fraud investigation, or legal hold.",
        },
        {
          title: "3. KYC and qualification evidence",
          body: "Private KYC, identity, company, and qualification evidence is stored separately with restricted access and audit logging. Private KYC evidence is not automatically retained for three years merely because a consent record exists. Deletion is suspended when a lawful retention requirement or legal hold applies.",
        },
        {
          title: "4. Legal holds and required records",
          body: "A legal hold or applicable law pauses deletion for the records within its scope. Payment, accounting, security, fraud, and audit records may be retained when required to establish, exercise, or defend legal claims or to comply with a lawful request.",
        },
        {
          title: "5. Backups and recovery copies",
          body: "Backups and recovery copies are protected and access-controlled. They may continue to contain a record temporarily as part of the backup and restoration lifecycle; this policy does not invent an additional fixed backup period. When a backup is restored, applicable deletion and legal-hold controls are re-applied as reasonably practicable.",
        },
        {
          title: "6. Data-subject requests",
          body: "Under the Thailand PDPA, you may request access, rectification, erasure, restriction, portability, objection, or withdrawal of consent, subject to applicable exceptions. Contact cblue.thailand@gmail.com with enough information to verify the request. CBLUE will respond through the applicable legal process.",
        },
        {
          title: "7. Contact and policy changes",
          body: "For retention, deletion, or privacy questions, contact cblue.thailand@gmail.com. Material changes are announced through the platform or email. This page must be read with the CBLUE Privacy Policy and applicable law.",
        },
      ],
    },
    th: {
      title: "นโยบายการเก็บรักษาข้อมูล",
      subtitle: "ข้อมูลนโยบายสาธารณะของ CBLUE",
      sections: [
        {
          title: "1. ประเภทข้อมูล",
          body: "CBLUE อาจเก็บข้อมูลบัญชีและตัวตน ข้อมูลเวิร์กโฟลว์บริการและอสังหาริมทรัพย์ เลขอ้างอิงการชำระเงิน การสื่อสาร ข้อมูลเทคนิคและความปลอดภัย หลักฐาน KYC และคุณสมบัติ และบันทึกตรวจสอบหรือกฎหมาย การเข้าถึงจำกัดตามบทบาทและวัตถุประสงค์",
        },
        {
          title: "2. กำหนดการเก็บและลบข้อมูลที่เผยแพร่",
          body: "กำหนดการ CBLUE ที่เผยแพร่ในปัจจุบันจำกัดตามวัตถุประสงค์: บันทึกความยินยอมเก็บ 3 ปี ประวัติบริการเก็บ 18 เดือน และข้อมูลส่วนบุคคลกับหลักฐาน KYC ส่วนตัวของบัญชีที่ไม่ใช้งานลบหลังไม่ใช้งาน 12 เดือน ระยะเวลาเหล่านี้ไม่แทนที่หน้าที่ตามกฎหมาย สัญญา ข้อพิพาท การตรวจสอบทุจริต หรือ legal hold",
        },
        {
          title: "3. หลักฐาน KYC และคุณสมบัติ",
          body: "หลักฐาน KYC ตัวตน บริษัท และคุณสมบัติเป็นข้อมูลส่วนตัว จัดเก็บแยก จำกัดการเข้าถึง และมีบันทึกตรวจสอบ หลักฐาน KYC ส่วนตัวไม่ได้ถูกเก็บสามปีโดยอัตโนมัติเพียงเพราะมีบันทึกความยินยอม การลบจะหยุดเมื่อมีกฎหมายหรือ legal hold ที่ชอบด้วยกฎหมาย",
        },
        {
          title: "4. Legal hold และข้อมูลที่ต้องเก็บ",
          body: "Legal hold หรือกฎหมายที่ใช้บังคับจะหยุดการลบข้อมูลในขอบเขตที่เกี่ยวข้อง ข้อมูลการชำระเงิน บัญชี ความปลอดภัย การตรวจสอบทุจริต และ audit อาจเก็บไว้เมื่อจำเป็นต่อสิทธิเรียกร้องหรือการปฏิบัติตามคำขอที่ชอบด้วยกฎหมาย",
        },
        {
          title: "5. ข้อมูลสำรองและการกู้คืน",
          body: "ข้อมูลสำรองและสำเนาสำหรับกู้คืนได้รับการป้องกันและจำกัดการเข้าถึง สำเนาอาจยังมีข้อมูลชั่วคราวตามวงจรการสำรองและกู้คืน นโยบายนี้ไม่กำหนดระยะเวลาใหม่ที่ตายตัวสำหรับข้อมูลสำรอง เมื่อกู้คืนข้อมูล จะนำการควบคุมการลบและ legal hold ที่ใช้บังคับกลับมาใช้เท่าที่ทำได้อย่างสมเหตุสมผล",
        },
        {
          title: "6. คำขอของเจ้าของข้อมูล",
          body: "ตาม PDPA คุณอาจขอเข้าถึง แก้ไข ลบ จำกัดการประมวลผล ขอรับข้อมูล คัดค้าน หรือถอนความยินยอมได้ โดยมีข้อยกเว้นตามกฎหมาย ติดต่อ cblue.thailand@gmail.com พร้อมข้อมูลที่จำเป็นต่อการตรวจสอบคำขอ CBLUE จะตอบตามกระบวนการทางกฎหมายที่ใช้บังคับ",
        },
        {
          title: "7. ติดต่อและการเปลี่ยนนโยบาย",
          body: "สอบถามเรื่องการเก็บ ลบ หรือความเป็นส่วนตัวได้ที่ cblue.thailand@gmail.com การเปลี่ยนแปลงสำคัญจะแจ้งผ่านแพลตฟอร์มหรืออีเมล หน้านี้ต้องอ่านร่วมกับนโยบายความเป็นส่วนตัวของ CBLUE และกฎหมายที่ใช้บังคับ",
        },
      ],
    },
    zh: {
      title: "数据保留政策",
      subtitle: "CBLUE 公开政策参考",
      sections: [
        {
          title: "1. 数据类别",
          body: "CBLUE 可能保留账户和身份数据、服务及房产工作流记录、付款参考、通信、技术和安全记录、KYC 与资格证据，以及审计或法律记录。访问按角色和目的限制。",
        },
        {
          title: "2. 已公布的保留和删除安排",
          body: "CBLUE 当前公布的安排按目的限制：同意记录保留 3 年，服务历史保留 18 个月，不活跃账户的个人数据和私密 KYC 证据在不活跃 12 个月后删除。这些期限不取代法定义务、合同、争议、欺诈调查或法律保留。",
        },
        {
          title: "3. KYC 和资格证据",
          body: "私密 KYC、身份、公司和资格证据分开存储，访问受限并记录审计。私密 KYC 证据不会仅因存在同意记录而自动保留三年。当适用法律或法律保留要求时，删除会暂停。",
        },
        {
          title: "4. 法律保留和必须保存的记录",
          body: "法律保留或适用法律会暂停其范围内记录的删除。付款、会计、安全、欺诈和审计记录在建立、行使或抗辩法律请求，或遵守合法要求所必需时可能继续保留。",
        },
        {
          title: "5. 备份和恢复副本",
          body: "备份和恢复副本受到保护并限制访问。作为备份和恢复生命周期的一部分，副本可能暂时仍包含相关记录；本政策不新增固定的备份期限。备份恢复后，会在合理可行范围内重新应用适用的删除和法律保留控制。",
        },
        {
          title: "6. 数据主体请求",
          body: "根据泰国 PDPA，您可以在适用例外范围内请求访问、更正、删除、限制处理、数据可携带、反对或撤回同意。请发送邮件至 cblue.thailand@gmail.com，并提供足以验证请求的信息。CBLUE 将按照适用的法律流程答复。",
        },
        {
          title: "7. 联系和政策变更",
          body: "有关保留、删除或隐私的问题，请联系 cblue.thailand@gmail.com。重大变更将通过平台或邮件通知。本页面应与 CBLUE 隐私政策及适用法律一并阅读。",
        },
      ],
    },
  },
};

export function LegalPolicyPage({ kind }: { kind: PolicyKind }) {
  const locale = useLocale() as Locale;
  const copy = POLICY_COPY[kind][locale] || POLICY_COPY[kind].en;
  const prefix = `/${locale}`;

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-sky-700 to-sky-900 py-12 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">{copy.title}</h1>
          <p className="mt-3 text-sm text-sky-200">{copy.subtitle}</p>
        </div>
      </section>
      <section className="py-10">
        <div className="mx-auto max-w-3xl space-y-8 px-4">
          {copy.sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">{section.title}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{section.body}</p>
            </section>
          ))}
          <nav className="flex flex-wrap justify-center gap-4 pt-4 text-sm">
            <Link href={`${prefix}/terms`} className="text-sky-700 hover:underline">
              {locale === "th" ? "ข้อกำหนดการใช้บริการ" : locale === "zh" ? "服务条款" : "Terms of Use"}
            </Link>
            <Link href={`${prefix}/privacy`} className="text-sky-700 hover:underline">
              {locale === "th" ? "นโยบายความเป็นส่วนตัว" : locale === "zh" ? "隐私政策" : "Privacy Policy"}
            </Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
