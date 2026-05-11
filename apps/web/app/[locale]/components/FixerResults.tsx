"use client";

import { useState, useRef, useEffect } from "react";

interface Fixer {
  id: string;
  alias: string;
  tier: "economy" | "standard" | "corporate" | "specialist" | "expert";
  rating: number;
  totalJobs: number;
  price: number;
  estimatedTotal?: number;
  estimatedUnit?: string;
  estimatedQty?: number;
  satisfaction: number;
  specialties: string[];
  experienceYears: number;
}

interface ChatMessage {
  id: string;
  sender: "customer" | "fixer";
  text: string;
  time: string;
}

type BookingType = "household" | "project" | "professional" | "property";

const T: Record<string, Record<string, string>> = {
  en: {
    matchTitle: "Matched Fixers & Professionals",
    matchDesc: "We found {count} professionals matching your request. Review and select one to proceed.",
    tier: "Tier",
    rating: "Rating",
    jobs: "jobs",
    satisfaction: "Satisfaction",
    processingFee: "Processing Fee",
    experience: "Experience",
    years: "yrs",
    priceListTitle: "Processing Fee Schedule",
    selectFixer: "Select",
    confirmTitle: "Confirm Booking",
    confirmDesc: "You selected {fixer} ({tier} tier). A processing fee of {fee} is required to confirm.",
    confirmBtn: "Confirm & Send to Partner",
    cancel: "Cancel",
    paymentTitle: "PromptPay Payment",
    paymentDesc: "Scan the QR code to pay the processing fee",
    paymentAmount: "Amount",
    paymentRef: "Reference",
    paymentComplete: "I have paid",
    chatTitle: "Chat with {fixer}",
    chatPlaceholder: "Type a message...",
    chatSend: "Send",
    chatNotice: "This chat is anonymous. Your real identity is not shared with the fixer.",
    bookingConfirmed: "Booking Confirmed!",
    bookingConfirmedDesc: "Your fixer will contact you within 30 minutes.",
    newBooking: "New Booking",
    economy: "Economy",
    standard: "Standard",
    corporate: "Corporate",
    specialist: "Specialist",
    expert: "Expert",
    // PO & notification
    poTitle: "Purchase Order Created",
    poNumber: "PO Number",
    poDate: "Date",
    poService: "Service",
    poTier: "Tier",
    poFee: "Processing Fee",
    poStatus: "Status",
    poDisclaimer: "The final service price is negotiated directly between you and the service provider. CBLUE acts only as a matching platform and does not determine or guarantee final pricing. The processing fee is non-refundable as the matching service is completed once the customer initiates the process.",
    notifyTitle: "Waiting for Partner Confirmation",
    notifyDesc: "We've notified {fixer} about your booking. They will review and confirm shortly.",
    notifyWaiting: "Waiting for confirmation...",
    partnerAccepted: "Partner Accepted!",
    partnerAcceptedDesc: "{fixer} has accepted your booking. You may now proceed with payment.",
    proceedPayment: "Proceed to Payment",
    // Meeting confirmation
    meetingTitle: "Schedule & Confirm Meeting",
    meetingDesc: "Arrange a meeting with {fixer} to discuss the job details.",
    meetingDate: "Meeting Date",
    meetingTime: "Meeting Time",
    meetingNotes: "Notes / Special Instructions",
    meetingConfirmBtn: "Confirm Meeting",
    meetingConfirmed: "Meeting Confirmed",
    meetingConfirmedDesc: "Both parties have confirmed. Please attend the meeting as scheduled.",
    // Work completion & rating
    completeTitle: "Work Completion & Review",
    completeDesc: "The job has been completed. Please review and rate the service.",
    rateLabel: "Your Rating",
    commentLabel: "Comments (optional)",
    commentPlaceholder: "Share your experience...",
    submitReview: "Submit Review",
    pricingDisclaimer: "Pricing Disclaimer",
    variationTitle: "Variation / Addendum",
    variationDesc: "The service provider has requested a variation to the original scope.",
    variationAmount: "Additional Amount",
    variationReason: "Reason",
    approveVariation: "Approve",
    rejectVariation: "Reject",
    finalTitle: "Job Completed — Thank You!",
    finalDesc: "Your booking is complete. Both parties have rated the job.",
    yourRating: "Your Rating",
    fixerRating: "Partner's Rating of You",
    viewDashboard: "View Dashboard",
  },
  th: {
    matchTitle: "ช่างและมืออาชีพที่เหมาะสม",
    matchDesc: "เราพบ {count} มืออาชีพที่ตรงกับคำขอของคุณ ตรวจสอบและเลือกเพื่อดำเนินการต่อ",
    tier: "ระดับ",
    rating: "คะแนน",
    jobs: "งาน",
    satisfaction: "ความพึงพอใจ",
    processingFee: "ค่าธรรมเนียม",
    experience: "ประสบการณ์",
    years: "ปี",
    priceListTitle: "ตารางค่าประสานงาน",
    selectFixer: "เลือก",
    confirmTitle: "ยืนยันการจอง",
    confirmDesc: "คุณเลือก {fixer} (ระดับ {tier}) ค่าธรรมเนียม {fee} เพื่อยืนยัน",
    confirmBtn: "ยืนยันและส่งให้พาร์ทเนอร์",
    cancel: "ยกเลิก",
    paymentTitle: "ชำระเงินผ่าน PromptPay",
    paymentDesc: "สแกน QR code เพื่อชำระค่าธรรมเนียม",
    paymentAmount: "จำนวนเงิน",
    paymentRef: "อ้างอิง",
    paymentComplete: "ชำระเงินแล้ว",
    chatTitle: "แชทกับ {fixer}",
    chatPlaceholder: "พิมพ์ข้อความ...",
    chatSend: "ส่ง",
    chatNotice: "แชทนี้ไม่ระบุตัวตน ข้อมูลจริงของคุณไม่ถูกแชร์กับช่าง",
    bookingConfirmed: "ยืนยันการจองสำเร็จ!",
    bookingConfirmedDesc: "ช่างจะติดต่อกลับภายใน 30 นาที",
    newBooking: "จองใหม่",
    economy: "ประหยัด",
    standard: "มาตรฐาน",
    corporate: "องค์กร",
    specialist: "ผู้ชำนาญ",
    expert: "ผู้เชี่ยวชาญ",
    poTitle: "สร้างใบสั่งซื้อแล้ว",
    poNumber: "เลขที่ PO",
    poDate: "วันที่",
    poService: "บริการ",
    poTier: "ระดับ",
    poFee: "ค่าธรรมเนียม",
    poStatus: "สถานะ",
    poDisclaimer: "ราคาบริการสุดท้ายเป็นการเจรจาโดยตรงระหว่างคุณและผู้ให้บริการ CBLUE ทำหน้าที่เป็นแพลตฟอร์มจับคู่เท่านั้น ไม่ได้กำหนดหรือรับประกันราคาสุดท้าย ค่าธรรมเนียมดำเนินการไม่สามารถคืนเงินได้เนื่องจากบริการจับคู่ได้ดำเนินการเสร็จสิ้นแล้ว",
    notifyTitle: "รอการยืนยันจากพาร์ทเนอร์",
    notifyDesc: "เราแจ้ง {fixer} เกี่ยวกับการจองของคุณแล้ว กรุณารอการยืนยัน",
    notifyWaiting: "กำลังรอการยืนยัน...",
    partnerAccepted: "พาร์ทเนอร์ยอมรับแล้ว!",
    partnerAcceptedDesc: "{fixer} ยอมรับการจองของคุณแล้ว คุณสามารถชำระเงินได้",
    proceedPayment: "ดำเนินการชำระเงิน",
    meetingTitle: "นัดหมายและยืนยันการประชุม",
    meetingDesc: "นัดหมายกับ {fixer} เพื่อหารือรายละเอียดงาน",
    meetingDate: "วันนัดหมาย",
    meetingTime: "เวลานัดหมาย",
    meetingNotes: "หมายเหตุ / คำแนะนำพิเศษ",
    meetingConfirmBtn: "ยืนยันนัดหมาย",
    meetingConfirmed: "ยืนยันนัดหมายแล้ว",
    meetingConfirmedDesc: "ทั้งสองฝ่ายยืนยันเรียบร้อย กรุณาไปตามนัดหมาย",
    completeTitle: "งานเสร็จสิ้น & รีวิว",
    completeDesc: "งานเสร็จเรียบร้อยแล้ว กรุณาให้คะแนนและรีวิว",
    rateLabel: "ให้คะแนน",
    commentLabel: "แสดงความคิดเห็น (ไม่บังคับ)",
    commentPlaceholder: "แบ่งปันประสบการณ์ของคุณ...",
    submitReview: "ส่งรีวิว",
    pricingDisclaimer: "ข้อจำกัดความรับผิดชอบด้านราคา",
    variationTitle: "แก้ไข / เพิ่มเติม",
    variationDesc: "ผู้ให้บริการขอเปลี่ยนแปลงขอบเขตงานเดิม",
    variationAmount: "จำนวนเพิ่มเติม",
    variationReason: "เหตุผล",
    approveVariation: "อนุมัติ",
    rejectVariation: "ปฏิเสธ",
    finalTitle: "งานเสร็จสมบูรณ์ — ขอบคุณ!",
    finalDesc: "การจองเสร็จสมบูรณ์ ทั้งสองฝ่ายได้ให้คะแนนแล้ว",
    yourRating: "คะแนนของคุณ",
    fixerRating: "คะแนนจากพาร์ทเนอร์",
    viewDashboard: "ดูแดชบอร์ด",
  },
  zh: {
    matchTitle: "匹配的技工与专业人士",
    matchDesc: "我们找到了 {count} 位匹配您需求的专业人士。请查看并选择。",
    tier: "等级",
    rating: "评分",
    jobs: "工作",
    satisfaction: "满意度",
    processingFee: "处理费",
    experience: "经验",
    years: "年",
    priceListTitle: "服务费价格表",
    selectFixer: "选择",
    confirmTitle: "确认预约",
    confirmDesc: "您选择了 {fixer}（{tier} 等级）。需支付 {fee} 处理费确认。",
    confirmBtn: "确认并通知合作伙伴",
    cancel: "取消",
    paymentTitle: "PromptPay 支付",
    paymentDesc: "扫描二维码支付处理费",
    paymentAmount: "金额",
    paymentRef: "参考号",
    paymentComplete: "我已支付",
    chatTitle: "与 {fixer} 聊天",
    chatPlaceholder: "输入消息...",
    chatSend: "发送",
    chatNotice: "此聊天是匿名的。您的真实身份不会与技工共享。",
    bookingConfirmed: "预约已确认！",
    bookingConfirmedDesc: "技工将在 30 分钟内联系您。",
    newBooking: "新预约",
    economy: "经济",
    standard: "标准",
    corporate: "企业",
    specialist: "专员",
    expert: "专家",
    poTitle: "采购订单已创建",
    poNumber: "PO 编号",
    poDate: "日期",
    poService: "服务",
    poTier: "等级",
    poFee: "处理费",
    poStatus: "状态",
    poDisclaimer: "最终服务价格由您与服务商直接协商。CBLUE 仅作为匹配平台，不确定或保证最终价格。处理费不可退还，因为匹配服务在客户发起流程后已完成。",
    notifyTitle: "等待合作伙伴确认",
    notifyDesc: "我们已通知 {fixer} 您的预约。他们将尽快确认。",
    notifyWaiting: "等待确认中...",
    partnerAccepted: "合作伙伴已接受！",
    partnerAcceptedDesc: "{fixer} 已接受您的预约。您现在可以付款。",
    proceedPayment: "继续付款",
    meetingTitle: "安排和确认会议",
    meetingDesc: "与 {fixer} 安排会议讨论工作细节。",
    meetingDate: "会议日期",
    meetingTime: "会议时间",
    meetingNotes: "备注 / 特殊说明",
    meetingConfirmBtn: "确认会议",
    meetingConfirmed: "会议已确认",
    meetingConfirmedDesc: "双方已确认。请按时参加会议。",
    completeTitle: "工作完成 & 评价",
    completeDesc: "工作已完成。请评价服务。",
    rateLabel: "您的评分",
    commentLabel: "评论（可选）",
    commentPlaceholder: "分享您的体验...",
    submitReview: "提交评价",
    pricingDisclaimer: "价格免责声明",
    variationTitle: "变更 / 补充",
    variationDesc: "服务商请求变更原始范围。",
    variationAmount: "附加金额",
    variationReason: "原因",
    approveVariation: "批准",
    rejectVariation: "拒绝",
    finalTitle: "工作完成 — 谢谢！",
    finalDesc: "您的预约已完成。双方已评分。",
    yourRating: "您的评分",
    fixerRating: "合作伙伴对您的评分",
    viewDashboard: "查看仪表板",
  },
};

function generateDemoFixers(service: string): Fixer[] {
  const tiers: ("economy" | "standard" | "corporate" | "specialist" | "expert")[] = ["economy", "standard", "corporate", "specialist", "expert"];
  // Generate a pool of 15–20 candidate partners in the area
  const poolSize = 15 + Math.floor(Math.random() * 6);
  const pool: Fixer[] = [];
  for (let i = 0; i < poolSize; i++) {
    const tierIdx = Math.floor(Math.random() * 5);
    const tier = tiers[tierIdx]!;
    const basePrice = tier === "economy" ? 200 + Math.floor(Math.random() * 100) : tier === "standard" ? 350 + Math.floor(Math.random() * 150) : tier === "corporate" ? 500 + Math.floor(Math.random() * 200) : tier === "specialist" ? 700 + Math.floor(Math.random() * 250) : 950 + Math.floor(Math.random() * 300);
    const rating = parseFloat((2.5 + Math.random() * 2.5).toFixed(1));
    pool.push({
      id: `f-${2000 + i}`,
      alias: `Partner-${String(2000 + i).padStart(4, "0")}`,
      tier,
      rating,
      totalJobs: 5 + Math.floor(Math.random() * 300),
      price: basePrice,
      satisfaction: 60 + Math.floor(Math.random() * 40),
      specialties: [service || "General"],
      experienceYears: tier === "economy" ? 1 + Math.floor(Math.random() * 3) : tier === "standard" ? 3 + Math.floor(Math.random() * 3) : tier === "corporate" ? 5 + Math.floor(Math.random() * 3) : tier === "specialist" ? 7 + Math.floor(Math.random() * 4) : 10 + Math.floor(Math.random() * 6),
    });
  }

  // ── AI TOP-8 SELECTION ALGORITHM ──
  // Partners MUST provide services in the area (all in pool are assumed to)
  const tierRank = { economy: 0, standard: 1, corporate: 2, specialist: 3, expert: 4 };
  const selected: Fixer[] = [];
  const used = new Set<string>();

  function pick(f: Fixer) {
    if (!used.has(f.id)) { selected.push(f); used.add(f.id); }
  }

  // Sort helpers
  const byPrice = [...pool].sort((a, b) => a.price - b.price);
  const bySatisfaction = [...pool].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating; // highest stars first
    if (b.satisfaction !== a.satisfaction) return b.satisfaction - a.satisfaction; // tiebreak: satisfaction %
    return b.totalJobs - a.totalJobs; // tiebreak: more jobs = more good reviews
  });

  // 1. TWO CHEAPEST in area
  for (const f of byPrice) { if (selected.length < 2) pick(f); else break; }

  // 2. TWO HIGHEST SATISFACTION (stars, tiebreak by satisfaction %, then totalJobs)
  for (const f of bySatisfaction) {
    if (selected.length >= 4) break;
    if (!used.has(f.id)) pick(f);
  }

  // 3. ONE CHEAPEST OF UPPER TIER (corporate+specialist+expert)
  const upperTiers = byPrice.filter(f => tierRank[f.tier] >= 2 && !used.has(f.id));
  if (upperTiers[0]) pick(upperTiers[0]);

  // 4. ONE HIGHEST SATISFACTION OF UPPER TIER
  const upperBySat = bySatisfaction.filter(f => tierRank[f.tier] >= 2 && !used.has(f.id));
  if (upperBySat[0]) pick(upperBySat[0]);

  // 5. ONE RETURNING / LAST SAME-JOB PARTNER (simulate with a random pick flagged as returning)
  const remaining = pool.filter(f => !used.has(f.id));
  if (remaining.length > 0) {
    const returningIdx = Math.floor(Math.random() * remaining.length);
    const returning = remaining[returningIdx]!;
    returning.alias = `★ ${returning.alias}`;
    pick(returning);
  }

  // 6. SLOT 8 reserved for customer nomination — leave it open (handled in UI)
  // If fewer than 7 partners available, fill what we can
  for (const f of pool) { if (selected.length >= 7) break; pick(f); }

  return selected;
}

function getProcessingFee(bookingType: BookingType, tier: string): number {
  // Property uses economy/standard/upper/luxury/grandeur tiers
  if (bookingType === "property") {
    if (tier === "economy") return 100;
    if (tier === "standard") return 400;
    if (tier === "upper") return 600;
    if (tier === "luxury") return 800;
    if (tier === "grandeur") return 1000;
    return 100;
  }
  // Fixer/Pro uses economy/standard/corporate/specialist/expert tiers
  if (tier === "economy") return 100;
  if (tier === "standard") return 400;
  if (tier === "corporate") return 600;
  if (tier === "specialist") return 800;
  if (tier === "expert") return 1000;
  return 100;
}

function generatePONumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `PO-${y}${m}-${seq}`;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= Math.round(rating) ? "text-yellow-400" : "text-gray-300"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-gray-500">{rating.toFixed(1)}</span>
    </div>
  );
}

function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
        >
          <svg
            className={`w-8 h-8 transition ${star <= (hover || value) ? "text-yellow-400" : "text-gray-300"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
      <span className="ml-2 text-lg font-bold text-gray-700">{value > 0 ? `${value}/5` : ""}</span>
    </div>
  );
}

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  economy: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  standard: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  corporate: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  specialist: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  expert: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

const getTierColor = (tier: string) => tierColors[tier] ?? tierColors["standard"]!;

type Step = "matching" | "select" | "po" | "notify" | "confirm" | "payment" | "chat" | "meeting" | "variation" | "complete" | "rate" | "done";

import generatePayload from "promptpay-qr";
import { QRCodeSVG } from "qrcode.react";

export default function FixerResults({
  locale,
  bookingType,
  service,
  tier,
  description,
  issueImages,
  onNewBooking,
  initialStep,
  initialOrderData,
}: {
  locale: string;
  bookingType: BookingType;
  service: string;
  tier?: string;
  description?: string;
  issueImages?: File[];
  onNewBooking: () => void;
  initialStep?: string;
  initialOrderData?: any;
}) {

  const t = (key: string) => T[locale]?.[key] || T["en"]![key] || key;
  const [fixers, setFixers] = useState<Fixer[]>([]);
  const [matchError, setMatchError] = useState("");
  const [step, setStep] = useState<Step>((initialStep as any) || "matching");
  const [selectedFixer, setSelectedFixer] = useState<Fixer | null>(initialOrderData?.fixer || null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [aiStep, setAiStep] = useState(0);

  // Issue image preview URLs — created client-side only
  const [issueImageUrls, setIssueImageUrls] = useState<string[]>([]);

  // PO state
  const [poNumber, setPoNumber] = useState(initialOrderData?.poNumber || "PO-0000-0000");




  const [partnerConfirmed, setPartnerConfirmed] = useState(initialOrderData?.status?.toUpperCase() === "PENDING");

  // Meeting state
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");

  // Rating state
  const [customerRating, setCustomerRating] = useState(0);
  const [customerComment, setCustomerComment] = useState("");
  const [fixerRatingOfCustomer, setFixerRatingOfCustomer] = useState(4);
  const [fixerCommentOfCustomer, setFixerCommentOfCustomer] = useState("");
  const [partnerRateReady, setPartnerRateReady] = useState(false);
  const [customerRated, setCustomerRated] = useState(false);

  // Variation state
  const [showVariation, setShowVariation] = useState(false);
  const [variationApproved, setVariationApproved] = useState<boolean | null>(null);

  // Nomination state (must be at top level, not after early returns)
  const [nominateId, setNominateId] = useState("");
  const [nominatedFixer, setNominatedFixer] = useState<Fixer | null>(null);

  // Variation amount (stored in state to avoid Math.random() on re-render)
  const [variationAmount, setVariationAmount] = useState(0);

    // Poll order status to auto-advance when partner accepts
  useEffect(() => {
    if ((step === "notify" || step === "matching") && initialOrderData?.id) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/v1/orders/${initialOrderData.id}`);
          if (res.ok) {
            const updated = await res.json();
            if (updated.status === 'PENDING' && !partnerConfirmed) {
              setPartnerConfirmed(true);
              setStep("payment"); // proceed to payment step!
            }
          }
        } catch (e) {
          // ignore
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [step, initialOrderData, partnerConfirmed]);

  // Compute variation amount once when entering variation step
  useEffect(() => {
    if (step === "variation" && selectedFixer) {
      const f = getProcessingFee(bookingType, selectedFixer.tier);
      setVariationAmount(Math.floor(f * 0.3 + Math.random() * f * 0.5));
    }
  }, [step, selectedFixer, bookingType]);

  // Hydration-safe: initialize random/date-dependent values on client
  useEffect(() => {
    const allowDemoFallback = process.env.NODE_ENV === "development";

    // Try fetching real candidates from the backend AI Top-8 algorithm
    const descParam = description ? `&description=${encodeURIComponent(description)}` : '';
    fetch(`/api/v1/fixers/match?service=${encodeURIComponent(service)}&district=auto&province=auto${descParam}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          // ensure data fields align with expected frontend Fixer interface
          const mapped = data.map((d: any) => ({
            id: d.id,
            alias: d.alias,
            tier: d.tier.charAt(0).toUpperCase() + d.tier.slice(1).toLowerCase(),
            rating: d.rating,
            totalJobs: d.totalJobs || d.completedJobs || 0,
            price: d.estimatedTotal ?? d.price,
            estimatedTotal: d.estimatedTotal,
            estimatedUnit: d.estimatedUnit,
            estimatedQty: d.estimatedQty,
            satisfaction: Math.round(d.satisfaction || 85),
            specialties: d.specialties || [],
            experienceYears: d.experienceYears || 1,
            selectedReason: d.selectedReason,
          }));
          setFixers(mapped);
          setMatchError("");
        } else {
          if (allowDemoFallback) {
            setFixers(generateDemoFixers(service));
            setMatchError("");
          } else {
            setFixers([]);
            setMatchError(locale === "th" ? "ไม่พบผลจับคู่จากระบบ กรุณาลองใหม่อีกครั้ง" : locale === "zh" ? "系统暂时无法返回匹配结果，请重试" : "Matching service is temporarily unavailable. Please try again.");
          }
        }
      })
      .catch(() => {
        if (allowDemoFallback) {
          setFixers(generateDemoFixers(service));
          setMatchError("");
        } else {
          setFixers([]);
          setMatchError(locale === "th" ? "ระบบจับคู่ขัดข้องชั่วคราว กรุณาลองใหม่" : locale === "zh" ? "匹配系统暂时故障，请稍后重试" : "Matching service failed. Please try again shortly.");
        }
      });
      
    setIssueImageUrls((issueImages || []).map(f => URL.createObjectURL(f)));
    setPoNumber(generatePONumber());
    setFixerRatingOfCustomer(3 + Math.floor(Math.random() * 3));
    const comments: Record<string, string[]> = {
      en: ["Great customer, very clear instructions", "Punctual and polite", "Easy to work with, would serve again", "Good communication throughout"],
      th: ["ลูกค้าดี บอกรายละเอียดชัดเจน", "ตรงเวลา สุภาพ", "ทำงานด้วยง่าย ยินดีให้บริการอีก", "สื่อสารดีตลอดงาน"],
      zh: ["很好的客户，指示清晰", "准时且礼貌", "合作愉快，愿意再次服务", "全程沟通良好"],
    };
    const pool = comments[locale] ?? comments["en"]!;
    setFixerCommentOfCustomer(pool[Math.floor(Math.random() * pool.length)]!);
  }, [description, locale, service]);

  // Persist workflow state to localStorage
  useEffect(() => {
    if (step !== "matching" && selectedFixer) {
      try {
        localStorage.setItem("cblue_workflow", JSON.stringify({
          step, poNumber, customerRating, customerComment, variationApproved,
          meetingDate, meetingTime, meetingNotes, service, bookingType,
          selectedFixerId: selectedFixer.id,
        }));
      } catch { /* ignore */ }
    }
    // Clean up on done step
    if (step === "done") {
      try { localStorage.removeItem("cblue_workflow"); } catch { /* ignore */ }
    }
  }, [step, selectedFixer, poNumber, customerRating, customerComment, variationApproved, meetingDate, meetingTime, meetingNotes, service, bookingType]);

  // AI Matching animation sequence
  useEffect(() => {
    if (step !== "matching") return;
    const steps = 7;
    const timer = setInterval(() => {
      setAiStep((prev) => {
        if (prev >= steps) {
          clearInterval(timer);
          setTimeout(() => setStep("select"), 400);
          return prev;
        }
        return prev + 1;
      });
    }, 700);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Partner confirmation must be manual or through actual backend
  // Added bypass button for testing
  useEffect(() => {
    if (step !== "notify") return;
    // Auto-simulation removed per user request: "Please wait for partner to click confirmation"
  }, [step]);

  // Simulate variation after meeting confirmed — 50% chance
  useEffect(() => {
    if (step !== "meeting") return;
    // set variation flag randomly when meeting step loads
    setShowVariation(Math.random() > 0.5);
  }, [step]);

  const handleSelect = (fixer: Fixer) => {
    setSelectedFixer(fixer);
    setStep("po");
  };

  const handlePOAcknowledge = async () => {
    // Attempt to persist the order to database
    try {
      const token = localStorage.getItem("subscriber_token");
      if (token && selectedFixer) {
        // Extract plain number from string logic (e.g. ฿25,000,000 or similar)
        const estStr = String(selectedFixer.price || 0).replace(/[^0-9.]/g, '');
        const estPrice = parseFloat(estStr) || 0;

        await fetch("/api/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            orderType: bookingType === "household" ? "HOUSEHOLD" : "PROJECT",
            serviceCategory: service,
            description: `${poNumber} | TIER:${typeof selectedFixer?.tier === "string" ? selectedFixer.tier.toUpperCase() : "STANDARD"} | ${description}`,
            fixerId: selectedFixer.id,
            estimatedPrice: estPrice,
          })
        });
      }
    } catch (e) {
      console.error("Order creation non-blocking fail", e);
    }
    setStep("notify");
  };

  const handleProceedPayment = () => {
    setStep("confirm");
  };

  const handleConfirm = () => {
    setStep("payment");
  };

  const handlePaymentComplete = () => {
    // Avoid simulating fake chat messages answering on behalf of users
    setChatMessages([]);
    setStep("chat");
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "customer",
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
  };

  const handleFinishChat = () => {
    setStep("meeting");
  };

  const handleMeetingConfirm = () => {
    setStep("variation");
  };

  const handleVariationDecision = (approved: boolean) => {
    setVariationApproved(approved);
    // Both cases proceed to complete — approved = addendum accepted, rejected = original scope only
    setStep("complete");
  };

  const handleCompleteConfirm = () => {
    setStep("rate");
  };

  const handleSubmitReview = () => {
    setCustomerRated(true);
    setPartnerRateReady(false);
  };

  const fee = selectedFixer ? getProcessingFee(bookingType, selectedFixer.tier) : 100;
  const tierLabel = selectedFixer ? t(selectedFixer.tier) : "";

  // Step progress bar for the 12-step flow (visible after matching)
  const flowSteps: Step[] = ["matching", "select", "po", "notify", "confirm", "payment", "chat", "meeting", "variation", "complete", "rate", "done"];
  const flowLabels: Record<string, Record<Step, string>> = {
    en: { matching: "Match", select: "Select", confirm: "Confirm", po: "PO", notify: "Notify", payment: "Pay", chat: "Chat", meeting: "Meet", variation: "Variation", complete: "Complete", rate: "Rate", done: "Done" },
    th: { matching: "จับคู่", select: "เลือก", confirm: "ยืนยัน", po: "PO", notify: "แจ้ง", payment: "จ่าย", chat: "แชท", meeting: "นัดหมาย", variation: "เปลี่ยนแปลง", complete: "เสร็จ", rate: "คะแนน", done: "จบ" },
    zh: { matching: "匹配", select: "选择", confirm: "确认", po: "PO", notify: "通知", payment: "支付", chat: "聊天", meeting: "会面", variation: "变更", complete: "完工", rate: "评分", done: "完成" },
  };
  const hideVariation = false; // Always show variation to be strictly 12 steps
  const visibleSteps = hideVariation ? flowSteps.filter(s => s !== "variation") : flowSteps;
  const visibleIndex = visibleSteps.indexOf(step);
  const StepProgressBar = () => step === "matching" ? null : (
    <div className="mx-auto max-w-2xl px-4 mb-4">
      <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
        <div className="flex items-center gap-0.5">
          {visibleSteps.map((s) => {
            const isCurrent = s === step;
            const isDone = visibleSteps.indexOf(s) < visibleIndex;
            const labels = flowLabels[locale] ?? flowLabels["en"]!;
            return (
              <div key={s} className="flex-1 text-center">
                <div className={`h-1.5 rounded-full mb-1 transition-all ${isDone ? "bg-sky-500" : isCurrent ? "bg-sky-400 animate-pulse" : "bg-gray-200"}`} />
                <span className={`text-[10px] font-medium ${isDone ? "text-sky-600" : isCurrent ? "text-sky-700 font-bold" : "text-gray-400"}`}>{labels[s]}</span>
              </div>
            );
          })}
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-1">
          {locale === "th" ? `ขั้นตอนที่ ${visibleIndex + 1} จาก ${visibleSteps.length}` : locale === "zh" ? `第 ${visibleIndex + 1} 步，共 ${visibleSteps.length} 步` : `Step ${visibleIndex + 1} of ${visibleSteps.length}`}
        </p>
      </div>
    </div>
  );

  // Step: AI Matching Animation
  if (step === "matching") {
    const aiSteps = locale === "th"
      ? [
          { label: "วิเคราะห์ความต้องการของคุณ...", icon: "🧠" },
          { label: "ค้นหาพาร์ทเนอร์ในพื้นที่...", icon: "" },
          { label: "กรอง 2 ราคาถูกที่สุด...", icon: "" },
          { label: "กรอง 2 ความพึงพอใจสูงสุด...", icon: "" },
          { label: "เลือกระดับบนที่ดีที่สุด...", icon: "" },
          { label: "ค้นหาช่างเดิมที่เคยใช้...", icon: "🔄" },
          { label: "เตรียม Top 8 ผู้เชี่ยวชาญ...", icon: "" },
        ]
      : locale === "zh"
      ? [
          { label: "分析您的需求...", icon: "🧠" },
          { label: "搜索区域内合作伙伴...", icon: "" },
          { label: "筛选2个最低价...", icon: "" },
          { label: "筛选2个最高满意度...", icon: "" },
          { label: "选择最佳上级合作伙伴...", icon: "" },
          { label: "查找曾合作过的伙伴...", icon: "🔄" },
          { label: "准备前8名专业人士...", icon: "" },
        ]
      : [
          { label: "Analyzing your requirements...", icon: "🧠" },
          { label: "Searching partners in your area...", icon: "" },
          { label: "Selecting 2 cheapest options...", icon: "" },
          { label: "Selecting 2 highest satisfaction...", icon: "" },
          { label: "Finding best upper-tier partners...", icon: "" },
          { label: "Checking for returning partners...", icon: "🔄" },
          { label: "Preparing top 8 matches...", icon: "" },
        ];

    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          {/* Pulsing AI brain icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-3xl"></span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {locale === "th" ? "AI กำลังจับคู่" : locale === "zh" ? "AI 智能匹配中" : "AI Smart Matching"}
          </h2>
          <p className="text-sm text-gray-500 mb-8">
            {locale === "th" ? "ระบบ AI กำลังค้นหาผู้เชี่ยวชาญที่เหมาะสมที่สุดสำหรับคุณ" : locale === "zh" ? "AI 正在为您寻找最合适的专业人士" : "Our AI engine is finding the best professionals for you"}
          </p>
          <div className="space-y-3 text-left">
            {aiSteps.map((s, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                i < aiStep ? "bg-green-50 border border-green-200" : i === aiStep ? "bg-sky-50 border border-sky-200 animate-pulse" : "bg-gray-50 border border-gray-100 opacity-40"
              }`}>
                <span className="text-lg flex-shrink-0">{i < aiStep ? "" : s.icon}</span>
                <span className={`text-sm font-medium ${i < aiStep ? "text-green-700" : i === aiStep ? "text-sky-700" : "text-gray-400"}`}>{s.label}</span>
                {i === aiStep && <span className="ml-auto"><span className="inline-block w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></span>}
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="mt-6 w-full bg-gray-100 rounded-full h-2">
            <div className="bg-gradient-to-r from-sky-500 to-indigo-600 h-2 rounded-full transition-all duration-700" style={{ width: `${Math.min(aiStep / 7 * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{Math.min(Math.round(aiStep / 7 * 100), 100)}%</p>
        </div>
      </div>
    );
  }

  // Step: Done — Final summary with both ratings
  if (step === "done") {
    return (
      <><StepProgressBar />
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900">{t("finalTitle")}</h1>
          <p className="mt-3 text-gray-600">{t("finalDesc")}</p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-sky-50 rounded-xl p-5 border border-sky-200">
              <p className="text-sm text-sky-600 font-medium mb-2">{t("yourRating")}</p>
              <div className="flex justify-center"><Stars rating={customerRating} /></div>
              {customerComment && <p className="text-xs text-gray-500 mt-2 italic">&ldquo;{customerComment}&rdquo;</p>}
            </div>
            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
              <p className="text-sm text-emerald-600 font-medium mb-2">{t("fixerRating")}</p>
              <div className="flex justify-center"><Stars rating={fixerRatingOfCustomer} /></div>
              <p className="text-xs text-gray-500 mt-2 italic">&ldquo;{fixerCommentOfCustomer}&rdquo;</p>
            </div>
          </div>

          {/* PO reference */}
          <div className="mt-6 text-sm text-gray-500">
            {t("poNumber")}: <span className="font-mono font-bold text-gray-800">{poNumber}</span>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
             {t("poDisclaimer")}
          </div>

          <div className="mt-8 flex gap-3 justify-center">
            <button
              onClick={onNewBooking}
              className="px-6 py-2.5 text-sm font-semibold text-sky-700 border border-sky-700 rounded-lg hover:bg-sky-50 transition"
            >
              {t("newBooking")}
            </button>
            <a
              href={`/${locale}/dashboard`}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition"
            >
              {t("viewDashboard")}
            </a>
          </div>
        </div>
      </div>
      </>
    );
  }

  // Step: Work Completion Confirmation (11th step)
  if (step === "complete" && selectedFixer) {
    return (
      <><StepProgressBar />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4"></div>
          <h2 className="text-xl font-bold text-gray-800">{t("completeTitle")}</h2>
          <p className="text-gray-500 text-sm mt-2">{t("completeDesc")}</p>

          {/* Fixer info */}
          <div className="bg-gray-50 rounded-xl p-4 my-6 flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${getTierColor(selectedFixer.tier).bg} flex items-center justify-center`}>
              <span className={`font-bold ${getTierColor(selectedFixer.tier).text}`}>{selectedFixer.alias.split("-")[1]}</span>
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">{selectedFixer.alias}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTierColor(selectedFixer.tier).bg} ${getTierColor(selectedFixer.tier).text}`}>{tierLabel}</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm space-y-2">
            <p className="text-gray-500">{locale === "th" ? "เลขที่ PO" : locale === "zh" ? "PO 编号" : "PO Number"}: <span className="font-mono font-bold text-gray-800">{poNumber}</span></p>
            <p className="text-gray-500">{locale === "th" ? "ค่าบริการ" : locale === "zh" ? "服务费" : "Processing Fee"}: <span className="font-bold text-gray-800">฿{fee.toLocaleString()}</span></p>
            {variationApproved === true && (
              <p className="text-green-700 font-semibold"> {locale === "th" ? "อนุมัติงานเพิ่มเติม (฿" + variationAmount.toLocaleString() + ")" : locale === "zh" ? "已批准附加工作 (฿" + variationAmount.toLocaleString() + ")" : "Addendum Approved (฿" + variationAmount.toLocaleString() + ")"}</p>
            )}
            {variationApproved === false && (
              <p className="text-red-700 font-semibold">❌ {locale === "th" ? "ปฏิเสธงานเพิ่มเติม — ขอบเขตงานเดิม" : locale === "zh" ? "已拒绝附加工作 — 按原始范围" : "Addendum Declined — Original scope only"}</p>
            )}
          </div>

          {/* Disclaimer */}
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
             {t("poDisclaimer")}
          </div>

          <button
            onClick={handleCompleteConfirm}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg transition"
          >
            {locale === "th" ? "ยืนยันเสร็จสิ้น → ให้คะแนน" : locale === "zh" ? "确认完成 → 评分" : "Confirm Complete → Rate"}
          </button>
        </div>
      </div>
      </>
    );
  }

  // Step: Both-Party Star Rating & Comment (+1 step)
  if (step === "rate" && selectedFixer) {
    return (
      <><StepProgressBar />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3"></div>
            <h2 className="text-xl font-bold text-gray-800">
              {locale === "th" ? "ให้คะแนนและรีวิว" : locale === "zh" ? "评分与评论" : "Rate & Review"}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {locale === "th" ? "ทั้งสองฝ่ายให้คะแนนก่อนปิดงาน" : locale === "zh" ? "双方评分后结束" : "Both parties rate before closing"}
            </p>
          </div>

          {/* Customer rating form */}
          {!customerRated ? (
            <>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t("rateLabel")}</label>
                <RatingInput value={customerRating} onChange={setCustomerRating} />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t("commentLabel")}</label>
                <textarea
                  value={customerComment}
                  onChange={(e) => setCustomerComment(e.target.value)}
                  placeholder={t("commentPlaceholder")}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-sky-500"
                />
              </div>
              <button
                onClick={handleSubmitReview}
                disabled={customerRating === 0}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("submitReview")}
              </button>
            </>
          ) : (
            <>
              {/* Customer's submitted rating */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-sky-700 mb-1">{locale === "th" ? "คะแนนของคุณ" : locale === "zh" ? "您的评分" : "Your Rating"}</p>
                <div className="flex justify-center"><Stars rating={customerRating} /></div>
                {customerComment && <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{customerComment}&rdquo;</p>}
              </div>

              {/* Partner rating — loading then reveal */}
              {!partnerRateReady ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-center gap-3">
                    <span className="inline-block w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">{locale === "th" ? "กำลังรอพาร์ทเนอร์ให้คะแนน..." : locale === "zh" ? "等待伙伴评分中..." : "Waiting for partner to submit rating..."}</span>
                  </div>
                  <div className="mt-4 text-center">
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 animate-fade-in">
                  <p className="text-xs font-bold text-emerald-700 mb-1">{locale === "th" ? "คะแนนจากพาร์ทเนอร์" : locale === "zh" ? "合作伙伴评分" : "Partner's Rating of You"}</p>
                  <div className="flex justify-center"><Stars rating={fixerRatingOfCustomer} /></div>
                  <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{fixerCommentOfCustomer}&rdquo;</p>
                </div>
              )}

              <button
                onClick={() => setStep("done")}
                disabled={!partnerRateReady}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {locale === "th" ? "ดูสรุป" : locale === "zh" ? "查看摘要" : "View Summary"}
              </button>
            </>
          )}
        </div>
      </div>
      </>
    );
  }

  // Step: Variation / Addendum
  if (step === "variation" && selectedFixer) {
    return (
      <><StepProgressBar />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-orange-200 p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3"></div>
            <h2 className="text-xl font-bold text-gray-800">{t("variationTitle")}</h2>
            <p className="text-gray-500 text-sm mt-1">{t("variationDesc")}</p>
          </div>

          <div className="bg-orange-50 rounded-xl p-4 mb-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t("variationAmount")}</span>
              <span className="font-bold text-orange-700">฿{variationAmount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">{t("variationReason")}</span>
              <p className="mt-1 text-gray-800">
                {locale === "th"
                  ? "พบงานเพิ่มเติมที่จำเป็นต้องดำเนินการเพื่อให้งานสมบูรณ์"
                  : locale === "zh"
                    ? "发现需要额外工作以完成项目"
                    : "Additional work discovered that is necessary to complete the job properly."}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleVariationDecision(true)}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition"
            >
              {t("approveVariation")}
            </button>
            <button
              onClick={() => handleVariationDecision(false)}
              className="flex-1 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-xl transition"
            >
              {t("rejectVariation")}
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  // Step: Meeting Confirmation
  if (step === "meeting" && selectedFixer) {
    return (
      <><StepProgressBar />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📅</div>
            <h2 className="text-xl font-bold text-gray-800">{t("meetingTitle")}</h2>
            <p className="text-gray-500 text-sm mt-1">{t("meetingDesc").replace("{fixer}", selectedFixer.alias)}</p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("meetingDate")}</label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("meetingTime")}</label>
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("meetingNotes")}</label>
              <textarea
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <button
            onClick={handleMeetingConfirm}
            disabled={!meetingDate || !meetingTime}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("meetingConfirmBtn")}
          </button>

          {/* Disclaimer */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
             {t("poDisclaimer")}
          </div>
        </div>
      </div>
      </>
    );
  }

  // Step: Chat
  if (step === "chat" && selectedFixer) {
    return (
      <><StepProgressBar />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Chat Header */}
          <div className="bg-sky-600 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold">{t("chatTitle").replace("{fixer}", selectedFixer.alias)}</h2>
              <p className="text-sky-100 text-xs mt-0.5">{t("chatNotice")}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(selectedFixer.tier).bg} ${getTierColor(selectedFixer.tier).text}`}>
              {tierLabel}
            </span>
          </div>

          {/* Service Details (visible after payment) */}
          {(description || issueImageUrls.length > 0) && (
            <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
              <p className="text-xs font-bold text-indigo-700 mb-1">
                 {locale === "th" ? "รายละเอียดบริการ" : locale === "zh" ? "服务详情" : "Service Details"}
              </p>
              <p className="text-xs text-indigo-600 mb-1">{service || bookingType}</p>
              {description && <p className="text-xs text-gray-700">{description}</p>}
              {issueImageUrls.length > 0 && (
                <div className="flex gap-2 mt-2 overflow-x-auto">
                  {issueImageUrls.map((url, i) => (
                    <img key={i} src={url} alt={`Issue ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-indigo-200 flex-shrink-0" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3.5 py-2 rounded-xl text-sm ${
                  msg.sender === "customer"
                    ? "bg-sky-600 text-white rounded-br-sm"
                    : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                }`}>
                  {msg.text}
                  <div className={`text-[10px] mt-1 ${msg.sender === "customer" ? "text-sky-200" : "text-gray-400"}`}>
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder={t("chatPlaceholder")}
              className="flex-1 text-sm px-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:border-sky-500"
            />
            <button
              onClick={handleSendChat}
              className="px-4 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition"
            >
              {t("chatSend")}
            </button>
          </div>

          {/* Finish → go to meeting */}
          <div className="px-4 py-3 border-t border-gray-100 text-center">
            <button
              onClick={handleFinishChat}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {locale === "th" ? "เสร็จสิ้นการแชท → นัดหมาย" : locale === "zh" ? "结束聊天 → 安排会议" : "Finish Chat → Schedule Meeting"}
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  // Step: Partner Notification & Confirmation
  if (step === "notify" && selectedFixer) {
    return (
      <><StepProgressBar />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          {!partnerConfirmed ? (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-3xl animate-pulse"></span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">{t("notifyTitle")}</h2>
              <p className="text-gray-500 text-sm mb-6">
                {t("notifyDesc").replace("{fixer}", selectedFixer.alias)}
              </p>

              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="inline-block w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-amber-600 font-medium">{t("notifyWaiting")}</span>
              </div>

              {/* PO reference */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-left mb-6">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500">{t("poNumber")}</span>
                  <span className="font-mono font-bold text-gray-800">{poNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("poFee")}</span>
                  <span className="font-bold text-gray-800">฿{fee}</span>
                </div>
              </div>

              <a 
                href="/en/dashboard"
                className="inline-block mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Go to Our Customer Page
              </a>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-3xl"></span>
              </div>
              <h2 className="text-xl font-bold text-green-700 mb-2">{t("partnerAccepted")}</h2>
              <p className="text-gray-500 text-sm mb-6">
                {t("partnerAcceptedDesc").replace("{fixer}", selectedFixer.alias)}
              </p>

              <button
                onClick={handleProceedPayment}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg transition"
              >
                {t("proceedPayment")}
              </button>
            </>
          )}

          {/* Disclaimer always visible */}
          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 text-left">
             {t("poDisclaimer")}
          </div>
        </div>
      </div>
      </>
    );
  }

  // Step: Payment QR
  if (step === "payment" && selectedFixer) {
    const refCode = `CBLUE-${poNumber.replace("PO-", "")}`;
    
    return (
      <><StepProgressBar />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t("paymentTitle")}</h2>
          <p className="text-gray-500 text-sm mb-6">{t("paymentDesc")}</p>

          <div className="mx-auto bg-yellow-100 text-yellow-800 rounded-xl border-2 border-yellow-200 flex flex-col items-center justify-center mb-6 p-6 shadow-sm">
            <span className="font-bold text-lg mb-2">🚧 Payment system via PromptPay QR 🚧</span>
            <span className="text-sm text-center">Testing Pill: This is a temporary pill showing it is testing period for customer to click and pass the step.</span>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t("paymentAmount")}</span>
              <span className="font-bold text-gray-800">฿{fee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("paymentRef")}</span>
              <span className="font-mono text-gray-800">{refCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("poNumber")}</span>
              <span className="font-mono text-gray-800">{poNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("tier")}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTierColor(selectedFixer.tier).bg} ${getTierColor(selectedFixer.tier).text}`}>
                {tierLabel}
              </span>
            </div>
          </div>

          <button
            onClick={handlePaymentComplete}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg transition"
          >
            {t("paymentComplete")}
          </button>
          <button
            onClick={() => setStep("notify")}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
      </>
    );
  }

  // Step: PO Created
  if (step === "po" && selectedFixer) {
    const today = typeof window !== "undefined" ? new Date().toLocaleDateString(locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
    // Get customer info from localStorage for formal PO address
    let customerName = "";
    let customerAddress = "";
    if (typeof window !== "undefined") {
      try {
        const sub = JSON.parse(localStorage.getItem("subscriber") || "{}");
        customerName = sub.name || sub.email || (locale === "th" ? "ลูกค้า" : locale === "zh" ? "客户" : "Customer");
        customerAddress = sub.address || sub.province || "";
      } catch { /* safe fallback */ }
    }
    return (
      <><StepProgressBar />
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-2xl">📄</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">{t("poTitle")}</h2>
            <p className="text-xs text-gray-400 mt-1">{locale === "th" ? "CBLUE ออกให้เป็นฝ่ายที่สาม" : locale === "zh" ? "CBLUE 作为第三方签发" : "Issued by CBLUE as third party"}</p>
          </div>

          {/* Formal Parties */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-1">{locale === "th" ? "ผู้ว่าจ้าง" : locale === "zh" ? "客户方" : "Client / Hirer"}</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{customerName}</p>
              {customerAddress && <p className="text-[11px] text-gray-500 truncate">{customerAddress}</p>}
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{locale === "th" ? "ผู้ให้บริการ" : locale === "zh" ? "服务方" : "Service Provider"}</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{selectedFixer.alias}</p>
              <p className="text-[11px] text-gray-500">{locale === "th" ? `ระดับ: ${tierLabel}` : locale === "zh" ? `等级: ${tierLabel}` : `Tier: ${tierLabel}`}</p>
            </div>
          </div>

          {/* PO Details */}
          <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm mb-5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">{t("poNumber")}</span>
              <span className="font-mono font-bold text-lg text-gray-900">{poNumber}</span>
            </div>
            <hr className="border-gray-200" />
            <div className="flex justify-between">
              <span className="text-gray-500">{t("poDate")}</span>
              <span className="text-gray-800">{today}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("poService")}</span>
              <span className="text-gray-800">{service || bookingType}</span>
            </div>
            {description && (
              <div>
                <span className="text-gray-500 text-xs">{locale === "th" ? "รายละเอียดบริการ" : locale === "zh" ? "服务描述" : "Service Description"}</span>
                <p className="text-gray-700 text-xs mt-0.5 line-clamp-3">{description}</p>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">{locale === "th" ? "ราคาเริ่มต้นของผู้ให้บริการ" : locale === "zh" ? "服务商起始价" : "Provider Est. Price"}</span>
              <span className="text-gray-800">฿{selectedFixer.price}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">{t("poTier")}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(selectedFixer.tier).bg} ${getTierColor(selectedFixer.tier).text}`}>
                {tierLabel}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("poFee")}</span>
              <span className="font-bold text-lg text-gray-900">฿{fee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("poStatus")}</span>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                {locale === "th" ? "รอการยืนยัน" : locale === "zh" ? "待确认" : "Pending Confirmation"}
              </span>
            </div>
          </div>

          {/* Pricing Disclaimer */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-4">
            <p className="font-bold mb-1"> {t("pricingDisclaimer")}</p>
            <p>{t("poDisclaimer")}</p>
          </div>

          {/* Addendum / Variation Terms */}
          <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg text-[11px] text-gray-600 mb-5">
            <p className="font-semibold text-gray-700 mb-1">
              {locale === "th" ? "📎 เงื่อนไขเพิ่มเติม" : locale === "zh" ? "📎 补充条款" : "📎 Addendum Terms"}
            </p>
            <p>
              {locale === "th"
                ? "การเปลี่ยนแปลงขอบเขตงาน (Variation) จะต้องริเริ่มโดยผู้ให้บริการและได้รับการยืนยันจากลูกค้าก่อนดำเนินการ การเปลี่ยนแปลงที่ได้รับการอนุมัติจะถือเป็นส่วนเพิ่มเติมของ PO นี้ ข้อมูลราคา ข้อตกลงใหม่ หรือประเด็นสำคัญจะไม่ถูกเปิดเผยต่อบุคคลที่สามเพื่อป้องกันความเสี่ยง"
                : locale === "zh"
                ? "工作范围变更（变更）须由服务商发起并经客户确认后方可执行。已批准的变更将构成本采购订单的补充条款。价格差异、新协议或关键问题不会向第三方披露，以防范潜在风险。"
                : "Variation orders must be initiated by the service provider and confirmed by the customer before proceeding. Approved variations constitute an addendum to this PO. Price differentials, new agreements, or crucial issues shall not be disclosed to third parties to prevent potential risks for both parties."}
            </p>
          </div>

          <button
            onClick={handlePOAcknowledge}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg transition"
          >
            {locale === "th" ? "รับทราบ & ส่งให้พาร์ทเนอร์" : locale === "zh" ? "确认并通知合作伙伴" : "Acknowledge & Notify Partner"}
          </button>
          <button
            onClick={() => { setSelectedFixer(null); setStep("select"); }}
            className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
      </>
    );
  }

  // Step: Confirm
  if (step === "confirm" && selectedFixer) {
    return (
      <><StepProgressBar />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sky-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-sky-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t("confirmTitle")}</h2>
          <p className="text-gray-500 text-sm mb-6">
            {t("confirmDesc")
              .replace("{fixer}", selectedFixer.alias)
              .replace("{tier}", tierLabel)
              .replace("{fee}", `฿${fee}`)}
          </p>

          {/* Fixer Summary */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-800">{selectedFixer.alias}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor(selectedFixer.tier).bg} ${getTierColor(selectedFixer.tier).text}`}>
                {tierLabel}
              </span>
            </div>
            <Stars rating={selectedFixer.rating} />
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">{t("processingFee")}</span>
              <span className="font-bold text-lg text-gray-800">฿{fee}</span>
            </div>
          </div>

          {/* Pricing Disclaimer */}
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 text-left">
             {t("poDisclaimer")}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg transition mb-3"
          >
            {t("confirmBtn")}
          </button>
          <button
            onClick={() => { setSelectedFixer(null); setStep("select"); }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
      </>
    );
  }

  // Step: Fixer List — AI Top 8 Selection

  const handleNominate = async () => {
    if (!nominateId.trim()) return;
    
    try {
      const descParam = description ? `&description=${encodeURIComponent(description)}` : '';
      const url = `/api/v1/fixers/match?service=${encodeURIComponent(service)}&district=auto&province=auto${descParam}&nominateId=${encodeURIComponent(nominateId)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const nominated = data.find((f: any) => f.id === nominateId || f.id.endsWith(nominateId) || f.alias.includes(nominateId));
        if (nominated) {
          setNominatedFixer(nominated);
          setMatchError("");
          return;
        }
      }
    } catch (err) {
      console.error(err);
    }

    if (process.env.NODE_ENV === "development") {
      const found: Fixer = {
        id: `f-nom-${nominateId}`,
        alias: `Partner-${nominateId.padStart(4, "0")}`,
        tier: (["economy", "standard", "corporate", "specialist", "expert"] as const)[Math.floor(Math.random() * 5)]!,
        rating: parseFloat((3.0 + Math.random() * 2).toFixed(1)),
        totalJobs: 5 + Math.floor(Math.random() * 100),
        price: 300 + Math.floor(Math.random() * 500),
        satisfaction: 70 + Math.floor(Math.random() * 30),
        specialties: [service || "General"],
        experienceYears: 2 + Math.floor(Math.random() * 10),
      };
      setNominatedFixer(found);
      return;
    }

    setMatchError(
      locale === "th"
        ? "ไม่พบพาร์ทเนอร์ตามรหัสที่ระบุ"
        : locale === "zh"
          ? "未找到您输入的合作伙伴编号"
          : "No partner found for that ID",
    );
  };

  // Selection criteria labels
  const getCriteriaLabel = (idx: number): string => {
    const labels = locale === "th"
      ? [" ราคาถูกสุด", " ราคาถูกอันดับ 2", " พึงพอใจสูงสุด", " พึงพอใจอันดับ 2", " ราคาถูกสุด (ระดับบน)", " พึงพอใจสูงสุด (ระดับบน)", "🔄 ช่างเดิมที่เคยใช้"]
      : locale === "zh"
      ? [" 最低价", " 第二低价", " 最高满意度", " 第二高满意度", " 上级最低价", " 上级最高满意度", "🔄 上次合作伙伴"]
      : [" Cheapest", " 2nd Cheapest", " Highest Rated", " 2nd Highest Rated", " Best Price (Upper Tier)", " Best Rated (Upper Tier)", "🔄 Returning Partner"];
    return labels[idx] || "";
  };

  // Combine fixers list + nominated
  const allDisplayFixers = nominatedFixer ? [...fixers, nominatedFixer] : fixers;

  return (
    <><StepProgressBar />
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="text-center mb-8">
        <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-sky-100 to-indigo-100 text-sky-700 rounded-full text-xs font-bold mb-3 border border-sky-200"> {locale === "th" ? "AI Top 8 จับคู่อัจฉริยะ" : locale === "zh" ? "AI Top 8 智能匹配" : "AI-Powered Top 8 Match"}</span>
        <h1 className="text-2xl font-bold text-gray-900">{t("matchTitle")}</h1>
        <p className="text-gray-500 mt-2">{t("matchDesc").replace("{count}", String(allDisplayFixers.length))}</p>
        {matchError && <p className="mt-3 text-sm text-red-600">{matchError}</p>}
      </div>

      {/* AI Selection Criteria Legend */}
      <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h4 className="text-sm font-bold text-indigo-800 mb-2">{locale === "th" ? " เกณฑ์การคัดเลือก AI" : locale === "zh" ? " AI选择标准" : " AI Selection Criteria"}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-indigo-700">
          <span> {locale === "th" ? "2 ราคาถูกสุด" : locale === "zh" ? "2个最低价" : "2 Cheapest"}</span>
          <span> {locale === "th" ? "2 พึงพอใจสูงสุด" : locale === "zh" ? "2个最高评分" : "2 Highest Rated"}</span>
          <span> {locale === "th" ? "ดีสุดระดับบน" : locale === "zh" ? "上级最佳" : "Best Upper Tier"}</span>
          <span>🔄 {locale === "th" ? "ช่างเดิม" : locale === "zh" ? "上次合作" : "Returning Partner"}</span>
        </div>
        <p className="text-[11px] text-indigo-600 mt-2">{locale === "th" ? "➕ คุณสามารถเสนอพาร์ทเนอร์ลำดับที่ 8 ได้ด้านล่าง (สูงสุด 8 คน)" : locale === "zh" ? "➕ 您可以在下方提名第8位合作伙伴（最多8位）" : "➕ You may nominate an 8th partner below (max 8 in comparison)"}</p>
      </div>

      {/* Processing Fee Price List */}
      <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
        <div className="p-5">
          <h3 className="text-base font-bold text-gray-900 text-center mb-3">{t("priceListTitle")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">{t("tier")}</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-700">{t("processingFee")}</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-700">{t("rating")}</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">{t("experience")}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: t("economy"), fee: "\u0E3F100", stars: "\u2B50", exp: "1-3", key: "economy" },
                  { name: t("standard"), fee: "\u0E3F400", stars: "\u2B50\u2B50", exp: "3-5", key: "standard" },
                  { name: t("corporate"), fee: "\u0E3F600", stars: "\u2B50\u2B50\u2B50", exp: "5-7", key: "corporate" },
                  { name: t("specialist"), fee: "\u0E3F800", stars: "\u2B50\u2B50\u2B50\u2B50", exp: "7-10", key: "specialist" },
                  { name: t("expert"), fee: "\u0E3F1,000", stars: "\u2B50\u2B50\u2B50\u2B50\u2B50", exp: "10+", key: "expert" },
                ].map((row) => {
                  const colors = getTierColor(row.key);
                  const isSelected = tier === row.key;
                  return (
                    <tr key={row.key} className={`border-b border-gray-100 ${isSelected ? "bg-sky-50 ring-1 ring-sky-300" : "hover:bg-gray-50"} transition`}>
                      <td className="py-2 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${colors.bg} ${colors.text}`}>{row.name}</span>
                        {isSelected && <span className="ml-2 text-xs text-sky-600 font-semibold">{locale === "th" ? "← ที่คุณเลือก" : locale === "zh" ? "← 已选" : "← Selected"}</span>}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-gray-900">{row.fee}</td>
                      <td className="py-2 px-3 text-center">{row.stars}</td>
                      <td className="py-2 px-3 text-gray-600">{row.exp} {t("years")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pricing Disclaimer banner */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <span className="font-bold"> {t("pricingDisclaimer")}:</span> {t("poDisclaimer")}
      </div>

      {/* Partner Cards */}
      <div className="space-y-4">
        {allDisplayFixers.map((fixer, idx) => {
          const feeForTier = getProcessingFee(bookingType, fixer.tier);
          const colors = getTierColor(fixer.tier);
          const criteriaTag = idx < fixers.length ? getCriteriaLabel(idx) : (locale === "th" ? " เสนอชื่อโดยคุณ" : locale === "zh" ? " 您提名的" : " Your Nomination");
          const isReturning = fixer.alias.startsWith("★");
          return (
            <div
              key={fixer.id}
              className={`bg-white rounded-xl shadow-md border ${isReturning ? "border-amber-300 ring-1 ring-amber-200" : colors.border} p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-lg transition`}
            >
              {/* Avatar */}
              <div className={`w-14 h-14 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0 relative`}>
                <span className={`text-lg font-bold ${colors.text}`}>
                  {fixer.alias.replace("★ ", "").split("-")[1]}
                </span>
                {isReturning && <span className="absolute -top-1 -right-1 text-sm">🔄</span>}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">{fixer.alias}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                    {t(fixer.tier)}
                  </span>
                  {criteriaTag && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-200">{criteriaTag}</span>}
                </div>
                <Stars rating={fixer.rating} />
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                  <span>{t("experience")}: {fixer.experienceYears} {t("years")}</span>
                  <span>{fixer.totalJobs} {t("jobs")}</span>
                  <span>{t("satisfaction")}: {fixer.satisfaction}%</span>
                </div>
              </div>

              {/* Price + Action */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">{t("processingFee")}</p>
                <p className="text-xl font-bold text-gray-800">฿{feeForTier}</p>
                <p className="text-xs text-gray-400 mb-2">
                  {(fixer as any).estimatedTotal && (fixer as any).estimatedTotal > 1000
                    ? <>
                        <span className="text-green-700 font-semibold">
                          {locale === "th" ? "ประมาณการรวม" : locale === "zh" ? "预估总价" : "Est. total"}
                          {" "}฿{((fixer as any).estimatedTotal as number).toLocaleString()}
                        </span>
                        {(fixer as any).estimatedUnit && (
                          <span className="text-gray-400 ml-1">
                            ({(fixer as any).estimatedQty} {(fixer as any).estimatedUnit})
                          </span>
                        )}
                      </>
                    : <>{locale === "th" ? "ราคาเริ่มต้น" : locale === "zh" ? "起始价" : "Est. from"} ฿{(fixer.price ?? 0).toLocaleString()}</>
                  }
                </p>
                <button
                  onClick={() => handleSelect(fixer)}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition"
                >
                  {t("selectFixer")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nominate 8th Partner */}
      {!nominatedFixer && (
        <div className="mt-6 bg-white rounded-xl shadow-md border border-dashed border-sky-300 p-5">
          <h4 className="text-sm font-bold text-gray-800 mb-2">
             {locale === "th" ? "เสนอพาร์ทเนอร์ลำดับที่ 8" : locale === "zh" ? "提名第8位合作伙伴" : "Nominate 8th Partner"}
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            {locale === "th" ? "กรอกหมายเลข ID ของพาร์ทเนอร์ที่คุณต้องการเพิ่มในรายการเปรียบเทียบ" : locale === "zh" ? "输入您想添加到比较列表的合作伙伴ID号" : "Enter the Partner ID number you want to add to the comparison list"}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={nominateId}
              onChange={(e) => setNominateId(e.target.value.replace(/\D/g, ""))}
              placeholder={locale === "th" ? "หมายเลข ID พาร์ทเนอร์" : locale === "zh" ? "合作伙伴ID号" : "Partner ID number"}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-sky-500"
              maxLength={6}
            />
            <button
              onClick={handleNominate}
              disabled={!nominateId.trim()}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {locale === "th" ? "ค้นหา" : locale === "zh" ? "搜索" : "Search"}
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
