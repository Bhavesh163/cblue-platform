"use client";

import { useLocale } from "next-intl";
import Link from "next/link";

const T: Record<string, Record<string, string>> = {
  en: {
    title: "Privacy Policy",
    subtitle: "CBLUE Platform — Last Updated: January 1, 2026",
    s1t: "1. Introduction",
    s1: "cblue (\"CBLUE\", \"we\", \"us\") is committed to protecting the privacy and personal data of all users. This Privacy Policy explains how we collect, use, store, and protect your personal data in accordance with Thailand's Personal Data Protection Act (PDPA) B.E. 2562 (2019).",
    s2t: "2. Data We Collect",
    s2: "We collect the following types of personal data:\n• Identity data: Full name, email address, phone number, company name\n• Account data: Password (stored securely using bcrypt hashing), account preferences\n• Service data: Booking requests, service categories, locations, descriptions, uploaded images\n• Payment data: PromptPay transaction references (we do not store bank account numbers)\n• Communication data: Chat messages exchanged through our anonymous messaging system\n• Technical data: IP address, browser type, device information, usage analytics\n• KYC data (fixers/professionals): ID card images, portfolio images, work experience",
    s3t: "3. How We Use Your Data",
    s3: "We use your personal data for the following purposes:\n• To create and manage your account\n• To match you with suitable fixers, professionals, or properties\n• To process bookings and payments via PromptPay\n• To facilitate anonymous communication between customers and service providers\n• To assign and manage tier levels based on experience and performance\n• To send notifications about bookings, confirmations, and updates\n• To improve our services through analytics and feedback\n• To detect and prevent fraud, including KYC verification\n• To comply with legal obligations under Thai law",
    s4t: "4. Legal Basis for Processing",
    s4: "We process your data based on:\n• Contract performance: To fulfill our service agreement with you\n• Consent: Where you have given explicit consent (e.g., marketing communications)\n• Legitimate interest: To improve services, prevent fraud, and ensure platform safety\n• Legal obligation: To comply with Thai laws and regulations",
    s5t: "5. Data Sharing",
    s5: "We may share your data with:\n• Fixers/Professionals: Limited service-related information (not personal contact details until both parties consent via our platform)\n• Payment processors: PromptPay for transaction processing\n• Email service providers: Mailjet for transactional emails (password resets, notifications)\n• Cloud hosting providers: For secure data storage\n\nWe do NOT sell your personal data to third parties.",
    s6t: "6. Data Security",
    s6: "We implement industry-standard security measures:\n• Passwords are hashed using bcrypt before storage\n• All data transmission is encrypted via HTTPS/TLS\n• Database access is restricted and monitored\n• JWT tokens are used for authentication with automatic expiration\n• Regular security audits and vulnerability assessments\n• KYC documents are stored securely with restricted access",
    s7t: "7. Anonymous Communication",
    s7: "Our chat system is designed to protect your privacy. When communicating with fixers or professionals through CBLUE:\n• Your real name is not shared — an anonymous alias is used\n• Your phone number and email are not visible to the other party\n• Chat messages are stored securely and only accessible to the participants\n• You may choose to share personal contact information at your own discretion",
    s8t: "8. Data Retention",
    s8: "We retain your personal data for as long as your account is active or as needed to provide services. Specifically:\n• Account data: Until account deletion or 3 years of inactivity\n• Booking records: 5 years for legal and accounting purposes\n• Chat messages: 1 year after service completion\n• KYC documents: Duration of account plus 2 years\n• Payment records: 7 years as required by Thai tax law\n\nThe Company may retain data longer than the specified periods if required by law, or if necessary for establishing, exercising, or defending legal rights. Upon expiration of the retention period, data will be deleted or anonymized.",
    s9t: "9. Your Rights (Under PDPA)",
    s9: "You have the following rights regarding your personal data:\n• Right to access: Request copies of your personal data\n• Right to rectification: Correct inaccurate or incomplete data\n• Right to erasure: Request deletion of your data (subject to legal retention requirements)\n• Right to restrict processing: Limit how we use your data\n• Right to data portability: Receive your data in a structured format\n• Right to object: Object to processing based on legitimate interest\n• Right to withdraw consent: Withdraw previously given consent at any time\n\nTo exercise these rights, contact us via our Contact Us page or email cblue.thailand@gmail.com.",
    s10t: "10. Cookies & Tracking",
    s10: "We use essential cookies for:\n• Authentication and session management\n• Language preference (Thai, English, Chinese)\n• Local storage for subscriber session data\n\nWe do not use third-party advertising cookies.",
    s11t: "11. Children's Privacy",
    s11: "Our services are not intended for individuals under 20 years of age (as defined by Thai law for contractual capacity). We do not knowingly collect personal data from minors.",
    s12t: "12. International Data Transfers",
    s12: "Your data may be processed on servers located outside Thailand for cloud hosting purposes. We ensure appropriate safeguards are in place for any international data transfers in compliance with the PDPA.",
    s13t: "13. Changes to This Policy",
    s13: "We may update this Privacy Policy periodically. Material changes will be communicated via email or platform notification. The \"Last Updated\" date at the top indicates the most recent revision.",
    s14t: "14. Contact Us",
    s14: "For privacy-related inquiries or to exercise your data rights:\n• About Us page: Available through the website navigation\n• Email: cblue.thailand@gmail.com\n• Data Protection Officer: cblue, Thailand",
  },
  th: {
    title: "นโยบายความเป็นส่วนตัว",
    subtitle: "แพลตฟอร์ม CBLUE — อัปเดตล่าสุด: 1 มกราคม 2569",
    s1t: "1. บทนำ",
    s1: "cblue (\"CBLUE\" \"เรา\") มุ่งมั่นในการปกป้องความเป็นส่วนตัวและข้อมูลส่วนบุคคลของผู้ใช้ทุกคน นโยบายนี้อธิบายวิธีการเก็บรวบรวม ใช้ จัดเก็บ และปกป้องข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562",
    s2t: "2. ข้อมูลที่เราเก็บรวบรวม",
    s2: "เราเก็บรวบรวมข้อมูลส่วนบุคคลประเภทต่อไปนี้:\n• ข้อมูลตัวตน: ชื่อ-นามสกุล อีเมล เบอร์โทรศัพท์ ชื่อบริษัท\n• ข้อมูลบัญชี: รหัสผ่าน (จัดเก็บอย่างปลอดภัยด้วย bcrypt) การตั้งค่าบัญชี\n• ข้อมูลบริการ: คำขอจอง ประเภทบริการ สถานที่ คำอธิบาย รูปภาพ\n• ข้อมูลการชำระเงิน: อ้างอิง PromptPay (เราไม่เก็บหมายเลขบัญชีธนาคาร)\n• ข้อมูลการสนทนา: ข้อความแชท\n• ข้อมูลทางเทคนิค: IP, เบราว์เซอร์, อุปกรณ์\n• ข้อมูล KYC: รูปถ่ายบัตรประชาชน พอร์ตโฟลิโอ",
    s3t: "3. วิธีที่เราใช้ข้อมูล",
    s3: "เราใช้ข้อมูลเพื่อ:\n• สร้างและจัดการบัญชี\n• จับคู่กับช่าง มืออาชีพ หรือทรัพย์สิน\n• ดำเนินการจองและชำระเงินผ่าน PromptPay\n• อำนวยความสะดวกการสื่อสารแบบไม่ระบุตัวตน\n• กำหนดและจัดการระดับ\n• ส่งการแจ้งเตือน\n• ปรับปรุงบริการ\n• ตรวจจับการฉ้อโกง\n• ปฏิบัติตามกฎหมาย",
    s4t: "4. ฐานทางกฎหมาย",
    s4: "เราประมวลผลข้อมูลตาม:\n• การปฏิบัติตามสัญญา\n• ความยินยอม\n• ประโยชน์โดยชอบด้วยกฎหมาย\n• ข้อผูกพันทางกฎหมาย",
    s5t: "5. การแบ่งปันข้อมูล",
    s5: "เราอาจแบ่งปันข้อมูลกับ:\n• ช่าง/มืออาชีพ: ข้อมูลบริการเท่านั้น (ไม่แชร์ข้อมูลติดต่อส่วนตัว)\n• ผู้ประมวลผลการชำระเงิน: PromptPay\n• ผู้ให้บริการอีเมล: Mailjet\n• ผู้ให้บริการคลาวด์\n\nเราไม่ขายข้อมูลส่วนบุคคล",
    s6t: "6. ความปลอดภัยของข้อมูล",
    s6: "เรามีมาตรการรักษาความปลอดภัย:\n• รหัสผ่านเข้ารหัสด้วย bcrypt\n• การส่งข้อมูลเข้ารหัส HTTPS/TLS\n• จำกัดการเข้าถึงฐานข้อมูล\n• ใช้ JWT token ที่มีวันหมดอายุ\n• ตรวจสอบความปลอดภัยเป็นประจำ",
    s7t: "7. การสื่อสารแบบไม่ระบุตัวตน",
    s7: "ระบบแชทออกแบบมาเพื่อปกป้องความเป็นส่วนตัว ชื่อจริงและเบอร์โทรศัพท์จะไม่ถูกแชร์ ใช้นามแฝงเท่านั้น",
    s8t: "8. ระยะเวลาเก็บรักษาข้อมูล",
    s8: "เราเก็บข้อมูลตามที่จำเป็น:\n• ข้อมูลบัญชี: จนกว่าจะลบหรือไม่ใช้งาน 3 ปี\n• บันทึกการจอง: 5 ปี\n• ข้อความแชท: 1 ปีหลังเสร็จสิ้นบริการ\n• เอกสาร KYC: ตลอดอายุบัญชี + 2 ปี\n• บันทึกการชำระเงิน: 7 ปีตามกฎหมายภาษี\n\nทั้งนี้ บริษัทอาจเก็บข้อมูลไว้นานกว่าระยะเวลาที่กำหนด หากมีกฎหมายกำหนด หรือมีความจำเป็นเพื่อการก่อตั้งสิทธิ เรียกร้อง หรือป้องกันสิทธิทางกฎหมาย และเมื่อพ้นระยะเวลาจะดำเนินการลบหรือทำให้ไม่สามารถระบุตัวบุคคลได้",
    s9t: "9. สิทธิของคุณ (ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล)",
    s9: "คุณมีสิทธิ:\n• เข้าถึงข้อมูล\n• แก้ไขข้อมูล\n• ลบข้อมูล\n• จำกัดการประมวลผล\n• ส่งออกข้อมูล\n• คัดค้าน\n• ถอนความยินยอม\n\nติดต่อผ่านหน้า ติดต่อเรา หรือ cblue.thailand@gmail.com",
    s10t: "10. คุกกี้และการติดตาม",
    s10: "เราใช้คุกกี้จำเป็นสำหรับ:\n• การยืนยันตัวตนและจัดการเซสชัน\n• ภาษาที่ต้องการ\n• ข้อมูลเซสชันสมาชิก\n\nเราไม่ใช้คุกกี้โฆษณา",
    s11t: "11. ความเป็นส่วนตัวของเด็ก",
    s11: "บริการของเราไม่ได้มุ่งเป้าไปที่ผู้ที่อายุต่ำกว่า 20 ปี ตามกฎหมายไทย เราไม่เก็บข้อมูลของผู้เยาว์โดยเจตนา",
    s12t: "12. การถ่ายโอนข้อมูลระหว่างประเทศ",
    s12: "ข้อมูลอาจถูกประมวลผลบนเซิร์ฟเวอร์นอกประเทศไทย เรามีมาตรการป้องกันที่เหมาะสมตาม พ.ร.บ.",
    s13t: "13. การเปลี่ยนแปลงนโยบาย",
    s13: "เราอาจอัปเดตนโยบายนี้เป็นระยะ จะแจ้งผ่านอีเมลหรือแพลตฟอร์ม",
    s14t: "14. ติดต่อเรา",
    s14: "สำหรับเรื่องความเป็นส่วนตัว:\n• หน้า เกี่ยวกับเรา (About Us)\n• อีเมล: cblue.thailand@gmail.com\n• เจ้าหน้าที่คุ้มครองข้อมูล: cblue ประเทศไทย",
  },
  zh: {
    title: "隐私政策",
    subtitle: "CBLUE 平台 — 最后更新：2026年1月1日",
    s1t: "1. 简介",
    s1: "cblue 致力于保护所有用户的隐私和个人数据。本隐私政策说明了我们如何根据泰国个人数据保护法 (PDPA) 收集、使用、存储和保护您的个人数据。",
    s2t: "2. 我们收集的数据",
    s2: "我们收集以下类型的个人数据：\n• 身份数据：姓名、邮箱、电话、公司名称\n• 账户数据：密码（使用 bcrypt 安全存储）、账户偏好\n• 服务数据：预约请求、服务类别、地点、描述、上传图片\n• 支付数据：PromptPay 交易参考（不存储银行账号）\n• 通信数据：聊天消息\n• 技术数据：IP、浏览器、设备信息\n• KYC 数据：身份证照片、作品集",
    s3t: "3. 我们如何使用数据",
    s3: "我们使用个人数据用于：\n• 创建和管理账户\n• 匹配技工、专业人员或房产\n• 处理预约和 PromptPay 支付\n• 促进匿名沟通\n• 分配和管理等级\n• 发送通知\n• 改进服务\n• 检测欺诈\n• 遵守法律义务",
    s4t: "4. 处理的法律依据",
    s4: "我们基于以下法律依据处理数据：\n• 合同履行\n• 同意\n• 合法利益\n• 法律义务",
    s5t: "5. 数据共享",
    s5: "我们可能与以下方共享数据：\n• 技工/专业人员：仅限服务相关信息\n• 支付处理商：PromptPay\n• 邮件服务商：Mailjet\n• 云服务商\n\n我们不出售个人数据。",
    s6t: "6. 数据安全",
    s6: "我们实施行业标准安全措施：\n• 密码使用 bcrypt 哈希\n• HTTPS/TLS 加密传输\n• 限制数据库访问\n• JWT 令牌认证\n• 定期安全审计",
    s7t: "7. 匿名通信",
    s7: "聊天系统保护您的隐私。真实姓名和电话不会共享，仅使用匿名别名。",
    s8t: "8. 数据保留",
    s8: "保留期限：\n• 账户数据：直到删除或3年不活动\n• 预约记录：5年\n• 聊天消息：服务完成后1年\n• KYC 文件：账户期间+2年\n• 支付记录：7年\n\n如法律要求或为了确立、行使或捷卫法律权利，公司可能会将数据保留超过规定期限。保留期限届满后，数据将被删除或匿名化。",
    s9t: "9. 您的权利（根据 PDPA）",
    s9: "您有权：\n• 访问数据\n• 更正数据\n• 删除数据\n• 限制处理\n• 数据可携带\n• 反对处理\n• 撤回同意\n\n联系：联系我们 页面或 cblue.thailand@gmail.com",
    s10t: "10. Cookie 和跟踪",
    s10: "我们使用必要 Cookie：\n• 认证和会话管理\n• 语言偏好\n• 订阅者会话数据\n\n不使用第三方广告 Cookie。",
    s11t: "11. 儿童隐私",
    s11: "我们的服务不面向20岁以下人士（泰国法律规定）。",
    s12t: "12. 国际数据传输",
    s12: "数据可能在泰国以外的服务器上处理，我们确保适当的保护措施。",
    s13t: "13. 政策变更",
    s13: "我们可能定期更新本政策。重大变更将通过邮件或平台通知。",
    s14t: "14. 联系我们",
    s14: "隐私相关问题：\n• 关于我们 (About Us) 页面\n• 邮箱：cblue.thailand@gmail.com\n• 数据保护官：cblue 泰国",
  },
};

export default function PrivacyPage() {
  const locale = useLocale();
  const t = (key: string) => T[locale]?.[key] || T["en"]![key] || key;
  const prefix = `/${locale}`;

  const sections = Array.from({ length: 14 }, (_, i) => i + 1);

  return (
    <div className="bg-gray-50 min-h-screen">
      <section className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold">{t("title")}</h1>
          <p className="mt-3 text-emerald-200 text-sm">{t("subtitle")}</p>
        </div>
      </section>
      <section className="py-10">
        <div className="mx-auto max-w-3xl px-4 space-y-8">
          {sections.map((n) => (
            <div key={n} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t(`s${n}t`)}</h2>
              <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{t(`s${n}`)}</div>
            </div>
          ))}
          <div className="text-center pt-4">
            <Link href={`${prefix}/terms`} className="text-sm text-emerald-600 hover:underline">
              {locale === "th" ? "ดูข้อกำหนดการใช้บริการ →" : locale === "zh" ? "查看服务条款 →" : "View Terms of Service →"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
