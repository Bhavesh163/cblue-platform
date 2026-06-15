"use client";

import { useLocale } from "next-intl";
import Link from "next/link";

const T: Record<string, Record<string, string>> = {
  en: {
    title: "Terms of Service",
    subtitle: "Cblue or blue Platform — Effective Date: January 1, 2026",
    s1t: "1. Acceptance of Terms",
    s1: "By accessing or using the Cblue or blue platform (website and mobile applications), you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.",
    s2t: "2. Services Provided",
    s2: "Cblue or blue provides a marketplace platform connecting customers with certified fixers, professionals, and real estate service providers across Thailand. Our services include:\n• Household maintenance booking (Plumbing, Electrical, AC, Interior, Landscaping, Gardening, Cladding/Roofing)\n• Project services (Website Dev, AI, Solar, Smart Building, Green Construction, etc.)\n• Professional services (Lawyers, Architects, Engineers, Accountants, etc.)\n• Real estate listing and search (Condo, House, Townhouse, Land, Commercial, Apartment)",
    s3t: "3. User Accounts & Registration",
    s3: "Users must provide accurate and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials. Cblue or blue reserves the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.",
    s4t: "4. Booking & Payment",
    s4: "When you book a fixer or professional, a processing fee is required based on the selected tier:\n• Economy: ฿100\n• Standard: ฿400\n• Corporate / Upper: ฿600\n• Specialist / Manager / Luxury: ฿800\n• Expert / Director / Grandeur: ฿1,000\n\nPayments are processed via PromptPay QR. All fees are non-refundable once the fixer/professional has confirmed the booking, except where required by applicable law.",
    s5t: "5. Fixer & Professional Obligations",
    s5: "Fixers and professionals registered on Cblue or blue must:\n• Complete KYC identity verification\n• Provide accurate service descriptions and pricing\n• Maintain professional conduct with customers\n• Comply with all applicable Thai laws and regulations\n\nCblue or blue reserves the right to de-list or suspend fixers/professionals who receive repeated negative reviews or violate platform policies.",
    s6t: "6. Real Estate Listings",
    s6: "Property listings must contain accurate information including property type, location, price, and contact details. Cblue or blue does not guarantee the accuracy of listings and is not a party to any real estate transaction. Sellers and renters are responsible for the accuracy of their listings.",
    s7t: "7. Tier System & Quality Standards",
    s7: "Cblue or blue operates a 5-tier quality system. Tier assignment is based on experience, qualifications, and customer satisfaction ratings. Fixers with corporate-level experience may qualify for Corporate tier; those with luxury/famous project experience may qualify for Specialist or Expert tier. Cblue or blue reserves the right to adjust tier assignments based on ongoing performance.",
    s8t: "8. Anonymous Communication",
    s8: "All communication between customers and fixers/professionals through the Cblue or blue chat system is anonymous. Personal contact information (name, phone number) is not shared until both parties consent. Misuse of the communication system may result in account suspension.",
    s9t: "9. Cancellation & Refunds",
    s9: "Customers may cancel a booking before the fixer/professional confirms. Once confirmed and the processing fee is paid, refunds are subject to Cblue or blue's refund policy. Refund requests must be submitted through the Contact Us page within 7 days of the service date.",
    s10t: "10. Limitation of Liability",
    s10: "Cblue or blue acts as a marketplace platform and is not directly responsible for the quality of work performed by fixers or professionals. We facilitate connections and provide quality assurance through our tier and review system. Cblue or blue's total liability shall not exceed the processing fee paid for the relevant booking.",
    s11t: "11. Intellectual Property",
    s11: "All content, trademarks, and intellectual property on the Cblue or blue platform belong to cblue. Users may not reproduce, distribute, or create derivative works without written permission.",
    s12t: "12. Governing Law",
    s12: "These Terms of Service are governed by the laws of the Kingdom of Thailand. Any disputes shall be resolved in Thai courts.",
    s13t: "13. Changes to Terms",
    s13: "Cblue or blue may update these Terms of Service at any time. Continued use of the platform after changes constitutes acceptance of the updated terms. Users will be notified of material changes via email or platform notification.",
    s14t: "14. Contact",
    s14: "For questions about these Terms of Service, please use our Contact Us page or email cblue.thailand@gmail.com.",
    s15t: "15. Data Storage & Retention Policy",
    s15: "To ensure optimal platform performance, Cblue or blue enforces a 5 MB browser storage limit per user account. If your stored data (job records, attachments, and session files) approaches 4.5 MB, the system will automatically delete the oldest completed job or property listing record to free space. All uploaded images are automatically compressed to no more than 0.3 MB each (up to 5 files per booking = 1.5 MB max). Property inquiry data is stored securely on our servers and synced across all your devices. You are advised not to clear browser data while active jobs or inquiries are in progress, as some session data (chat messages, file attachments) may only be stored locally.",
  },
  th: {
    title: "ข้อกำหนดการใช้บริการ",
    subtitle: "แพลตฟอร์ม Cblue or blue — มีผลบังคับใช้: 1 มกราคม 2569",
    s1t: "1. การยอมรับข้อกำหนด",
    s1: "การเข้าถึงหรือใช้แพลตฟอร์ม Cblue or blue (เว็บไซต์และแอปพลิเคชันมือถือ) ถือว่าคุณยอมรับข้อกำหนดการใช้บริการเหล่านี้ หากคุณไม่ยอมรับ กรุณาอย่าใช้บริการของเรา",
    s2t: "2. บริการที่ให้",
    s2: "Cblue or blue เป็นแพลตฟอร์มตลาดกลางที่เชื่อมต่อลูกค้ากับช่าง มืออาชีพ และผู้ให้บริการอสังหาริมทรัพย์ที่ได้รับการรับรองทั่วประเทศไทย บริการของเราประกอบด้วย:\n• การจองบำรุงรักษาบ้าน (ประปา ไฟฟ้า แอร์ ตกแต่งภายใน จัดสวน ทำสวน หลังคา/ผนัง)\n• บริการโครงการ (พัฒนาเว็บ AI โซลาร์ อาคารอัจฉริยะ ก่อสร้างสีเขียว ฯลฯ)\n• บริการมืออาชีพ (ทนายความ สถาปนิก วิศวกร นักบัญชี ฯลฯ)\n• ลงประกาศและค้นหาอสังหาริมทรัพย์ (คอนโด บ้าน ทาวน์เฮาส์ ที่ดิน พาณิชย์ อพาร์ทเมนท์)",
    s3t: "3. บัญชีผู้ใช้และการลงทะเบียน",
    s3: "ผู้ใช้ต้องให้ข้อมูลที่ถูกต้องและครบถ้วนในการลงทะเบียน คุณรับผิดชอบในการรักษาความลับของข้อมูลบัญชี Cblue or blue ขอสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีที่ละเมิดข้อกำหนดหรือมีการฉ้อโกง",
    s4t: "4. การจองและการชำระเงิน",
    s4: "เมื่อจองช่างหรือมืออาชีพ จะมีค่าธรรมเนียมดำเนินการตามระดับที่เลือก:\n• Economy: ฿100\n• Standard: ฿400\n• Corporate / Upper: ฿600\n• Specialist / Manager / Luxury: ฿800\n• Expert / Director / Grandeur: ฿1,000\n\nชำระเงินผ่าน PromptPay QR ค่าธรรมเนียมไม่สามารถขอคืนได้หลังจากช่าง/มืออาชีพยืนยันการจองแล้ว ยกเว้นตามที่กฎหมายกำหนด",
    s5t: "5. ข้อผูกพันของช่างและมืออาชีพ",
    s5: "ช่างและมืออาชีพต้อง:\n• ผ่านการยืนยันตัวตน KYC\n• ให้ข้อมูลบริการและราคาที่ถูกต้อง\n• ประพฤติตนอย่างมืออาชีพ\n• ปฏิบัติตามกฎหมายไทย\n\nCblue or blue ขอสงวนสิทธิ์ในการระงับช่าง/มืออาชีพที่ได้รับรีวิวเชิงลบซ้ำหรือละเมิดนโยบาย",
    s6t: "6. ประกาศอสังหาริมทรัพย์",
    s6: "ประกาศอสังหาริมทรัพย์ต้องมีข้อมูลที่ถูกต้อง Cblue or blue ไม่รับประกันความถูกต้องของประกาศและไม่ใช่คู่สัญญาในธุรกรรมอสังหาริมทรัพย์",
    s7t: "7. ระบบระดับและมาตรฐานคุณภาพ",
    s7: "Cblue or blue ดำเนินระบบคุณภาพ 5 ระดับ การกำหนดระดับขึ้นอยู่กับประสบการณ์ คุณสมบัติ และคะแนนความพึงพอใจ ผู้มีประสบการณ์ระดับองค์กรอาจได้รับระดับ Corporate ผู้มีประสบการณ์โครงการหรู/มีชื่อเสียงอาจได้รับระดับ Specialist หรือ Expert",
    s8t: "8. การติดต่อสื่อสารแบบไม่ระบุตัวตน",
    s8: "การสื่อสารทั้งหมดระหว่างลูกค้าและช่าง/มืออาชีพผ่านระบบแชท Cblue or blue เป็นแบบไม่ระบุตัวตน ข้อมูลส่วนตัวจะไม่ถูกแชร์จนกว่าทั้งสองฝ่ายจะยินยอม",
    s9t: "9. การยกเลิกและการคืนเงิน",
    s9: "ลูกค้าสามารถยกเลิกการจองได้ก่อนที่ช่าง/มืออาชีพจะยืนยัน หลังยืนยันและชำระค่าธรรมเนียมแล้ว การขอคืนเงินเป็นไปตามนโยบายของ Cblue or blue ต้องส่งคำขอภายใน 7 วัน",
    s10t: "10. ข้อจำกัดความรับผิดชอบ",
    s10: "Cblue or blue เป็นแพลตฟอร์มตลาดกลาง ไม่ได้รับผิดชอบโดยตรงต่อคุณภาพงาน ความรับผิดของ Cblue or blue จำกัดที่ค่าธรรมเนียมดำเนินการ",
    s11t: "11. ทรัพย์สินทางปัญญา",
    s11: "เนื้อหาและทรัพย์สินทางปัญญาทั้งหมดบนแพลตฟอร์ม Cblue or blue เป็นของ cblue",
    s12t: "12. กฎหมายที่ใช้บังคับ",
    s12: "ข้อกำหนดนี้อยู่ภายใต้กฎหมายของราชอาณาจักรไทย ข้อพิพาทจะได้รับการแก้ไขในศาลไทย",
    s13t: "13. การเปลี่ยนแปลงข้อกำหนด",
    s13: "Cblue or blue อาจอัปเดตข้อกำหนดได้ตลอดเวลา การใช้ต่อเนื่องหลังเปลี่ยนแปลงถือว่ายอมรับ จะแจ้งผู้ใช้ผ่านอีเมลหรือแจ้งเตือนในแพลตฟอร์ม",
    s14t: "14. ติดต่อ",
    s14: "หากมีคำถามเกี่ยวกับข้อกำหนด กรุณาใช้หน้า ติดต่อเรา หรืออีเมล cblue.thailand@gmail.com",
    s15t: "15. นโยบายการเก็บข้อมูลและขนาดพื้นที่เก็บ",
    s15: "เพื่อประสิทธิภาพในการใช้งาน Cblue or blue กำหนดขีดจำกัดพื้นที่บราวเซอร์ในการเก็บข้อมูลน้อยกว่า 5 MB ต่อผู้ใช้ หากข้อมูลที่บันทึกเข้าใกล้ 4.5 MB ระบบจะลบรายการงานหรือประกาศอสังหาริมทรัพย์ที่เก่าที่สุดและเสร็จสิ้นแล้วโดยอัตโนมัติ ไฟล์ที่อัปโหลดทุกไฟล์จะถูกบีบอัดโดยอัตโนมัติไม่เกิน 0.3 MB ต่อไฟล์ (สูงสุด 5 ไฟล์ต่อการจอง) ข้อมูลการสอบถามอสังหาริมทรัพย์ถูกเก็บไว้อย่างปลอดภัยบนเซิร์ฟเวอร์และซิงค์ส์ระหว่างอุปกรณ์ทุกชิ้น แนะนำให้ไม่ลบข้อมูลบราวเซอร์ขณะที่มีงานหรือการสอบถามที่กำลังดำเนินการอยู่",
  },
  zh: {
    title: "服务条款",
    subtitle: "Cblue or blue 平台 — 生效日期：2026年1月1日",
    s1t: "1. 接受条款",
    s1: "访问或使用 Cblue or blue 平台（网站和移动应用）即表示您同意受这些服务条款的约束。如不同意，请勿使用我们的服务。",
    s2t: "2. 提供的服务",
    s2: "Cblue or blue 提供一个市场平台，连接客户与经过认证的技工、专业人员和房地产服务提供商。服务包括：\n• 家庭维修预约（水管、电气、空调、室内装饰、园艺、屋顶/外墙）\n• 项目服务（网站开发、AI、太阳能、智能建筑、绿色建筑等）\n• 专业服务（律师、建筑师、工程师、会计师等）\n• 房地产发布和搜索（公寓、别墅、联排、土地、商业、公寓）",
    s3t: "3. 用户账户与注册",
    s3: "用户必须在注册时提供准确完整的信息。您有责任维护账户凭据的保密性。Cblue or blue 保留暂停或终止违反条款或从事欺诈活动的账户的权利。",
    s4t: "4. 预约与付款",
    s4: "预约技工或专业人员时，需根据所选等级支付处理费：\n• Economy: ฿100\n• Standard: ฿400\n• Corporate / Upper: ฿600\n• Specialist / Manager / Luxury: ฿800\n• Expert / Director / Grandeur: ฿1,000\n\n通过 PromptPay QR 支付。技工/专业人员确认预约后，费用不可退还，法律规定除外。",
    s5t: "5. 技工与专业人员义务",
    s5: "技工和专业人员必须：\n• 完成 KYC 身份验证\n• 提供准确的服务描述和定价\n• 对客户保持专业态度\n• 遵守泰国法律法规",
    s6t: "6. 房地产发布",
    s6: "房产发布必须包含准确信息。Cblue or blue 不保证发布的准确性，不是任何房地产交易的当事方。",
    s7t: "7. 等级系统与质量标准",
    s7: "Cblue or blue 运营5级质量体系。等级分配基于经验、资质和客户满意度评分。",
    s8t: "8. 匿名通信",
    s8: "通过 Cblue or blue 聊天系统的所有通信都是匿名的。在双方同意前不会共享个人联系信息。",
    s9t: "9. 取消与退款",
    s9: "客户可在技工/专业人员确认前取消预约。确认并支付处理费后，退款须符合 Cblue or blue 退款政策。",
    s10t: "10. 责任限制",
    s10: "Cblue or blue 作为市场平台，不直接负责工作质量。Cblue or blue 的总责任不超过相关处理费。",
    s11t: "11. 知识产权",
    s11: "Cblue or blue 平台上的所有内容和知识产权归 cblue 所有。",
    s12t: "12. 适用法律",
    s12: "这些服务条款受泰王国法律管辖。争议应在泰国法院解决。",
    s13t: "13. 条款变更",
    s13: "Cblue or blue 可随时更新这些服务条款。继续使用即表示接受更新后的条款。",
    s14t: "14. 联系方式",
    s14: "如对这些服务条款有疑问，请使用 联系我们 页面或发邮件至 cblue.thailand@gmail.com。",
    s15t: "15. 数据存储与保留政策",
    s15: "为确保平台性能最优，Cblue or blue 对每个用户账户实施 5 MB 浏览器存储限制。当已存储数据（任务记录、附件和会话文件）接近 4.5 MB 时，系统将自动删除最旧的已完成任务或房产列表记录以释放空间。每个上传的图片将自动压缩至不超过 0.3 MB（每次预订最多 5 个文件 = 最多 1.5 MB）。房产查询数据安全存储在我们的服务器上，并在您的所有设备间同步。建议在活跞任务或查询进行期间不要清除浏览器数据。",
  },
};

export default function TermsPage() {
  const locale = useLocale();
  const t = (key: string) => T[locale]?.[key] || T["en"]![key] || key;
  const prefix = `/${locale}`;

  const sections = Array.from({ length: 15 }, (_, i) => i + 1);

  return (
    <div className="bg-gray-50 min-h-screen">
      <section className="bg-gradient-to-br from-sky-700 to-sky-900 text-white py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold">{t("title")}</h1>
          <p className="mt-3 text-sky-200 text-sm">{t("subtitle")}</p>
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
            <Link href={`${prefix}/privacy`} className="text-sm text-sky-600 hover:underline">
              {locale === "th" ? "ดูนโยบายความเป็นส่วนตัว →" : locale === "zh" ? "查看隐私政策 →" : "View Privacy Policy →"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
