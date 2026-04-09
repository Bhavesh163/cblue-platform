"use client";

import { useState, useRef, useEffect } from "react";

interface Fixer {
  id: string;
  alias: string;
  tier: "economy" | "standard" | "corporate" | "specialist" | "expert";
  rating: number;
  totalJobs: number;
  price: number;
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
    poDisclaimer: "The final service price is negotiated directly between you and the service provider. CBLUE acts only as a matching platform and does not determine or guarantee final pricing.",
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
    poDisclaimer: "ราคาบริการสุดท้ายเป็นการเจรจาโดยตรงระหว่างคุณและผู้ให้บริการ CBLUE ทำหน้าที่เป็นแพลตฟอร์มจับคู่เท่านั้น ไม่ได้กำหนดหรือรับประกันราคาสุดท้าย",
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
    poDisclaimer: "最终服务价格由您与服务商直接协商。CBLUE 仅作为匹配平台，不确定或保证最终价格。",
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
  const fixers: Fixer[] = [];
  for (let i = 0; i < 5; i++) {
    const tier = tiers[i % 5] as "economy" | "standard" | "corporate" | "specialist" | "expert";
    const basePrice = tier === "economy" ? 250 : tier === "standard" ? 300 : tier === "corporate" ? 500 : tier === "specialist" ? 700 : 900;
    fixers.push({
      id: `f-${1000 + i}`,
      alias: `Fixer-${String(1000 + i).padStart(4, "0")}`,
      tier,
      rating: 3.5 + Math.random() * 1.5,
      totalJobs: 10 + Math.floor(Math.random() * 200),
      price: basePrice + Math.floor(Math.random() * 200),
      satisfaction: 80 + Math.floor(Math.random() * 20),
      specialties: [service || "General"],
      experienceYears: tier === "economy" ? 1 + Math.floor(Math.random() * 3) : tier === "standard" ? 3 + Math.floor(Math.random() * 3) : tier === "corporate" ? 5 + Math.floor(Math.random() * 3) : tier === "specialist" ? 7 + Math.floor(Math.random() * 4) : 10 + Math.floor(Math.random() * 6),
    });
  }
  return fixers.sort((a, b) => b.rating - a.rating);
}

function getProcessingFee(bookingType: BookingType, tier: string): number {
  if (bookingType === "property") {
    if (tier === "economy") return 300;
    if (tier === "standard") return 500;
    if (tier === "corporate") return 800;
    if (tier === "specialist") return 1200;
    if (tier === "expert") return 2000;
    return 300;
  }
  if (tier === "economy") return 200;
  if (tier === "standard") return 400;
  if (tier === "corporate") return 600;
  if (tier === "specialist") return 800;
  if (tier === "expert") return 1000;
  return 200;
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

type Step = "matching" | "list" | "confirm" | "po" | "notify" | "payment" | "chat" | "meeting" | "variation" | "complete" | "done";

export default function FixerResults({
  locale,
  bookingType,
  service,
  tier,
  onNewBooking,
}: {
  locale: string;
  bookingType: BookingType;
  service: string;
  tier?: string;
  onNewBooking: () => void;
}) {
  const t = (key: string) => T[locale]?.[key] || T["en"]![key] || key;
  const [fixers] = useState<Fixer[]>(() => generateDemoFixers(service));
  const [step, setStep] = useState<Step>("matching");
  const [selectedFixer, setSelectedFixer] = useState<Fixer | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [aiStep, setAiStep] = useState(0);

  // PO state
  const [poNumber] = useState(() => generatePONumber());
  const [partnerConfirmed, setPartnerConfirmed] = useState(false);

  // Meeting state
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");

  // Rating state
  const [customerRating, setCustomerRating] = useState(0);
  const [customerComment, setCustomerComment] = useState("");
  const [fixerRatingOfCustomer] = useState(() => 3 + Math.floor(Math.random() * 3)); // simulated

  // Variation state
  const [showVariation, setShowVariation] = useState(false);

  // AI Matching animation sequence
  useEffect(() => {
    if (step !== "matching") return;
    const steps = 5;
    const timer = setInterval(() => {
      setAiStep((prev) => {
        if (prev >= steps) {
          clearInterval(timer);
          setTimeout(() => setStep("list"), 400);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Simulate partner confirmation after entering notify step
  useEffect(() => {
    if (step !== "notify") return;
    const timer = setTimeout(() => {
      setPartnerConfirmed(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [step]);

  // Simulate variation after meeting confirmed — 50% chance
  useEffect(() => {
    if (step !== "meeting") return;
    // set variation flag randomly when meeting step loads
    setShowVariation(Math.random() > 0.5);
  }, [step]);

  const handleSelect = (fixer: Fixer) => {
    setSelectedFixer(fixer);
    setStep("confirm");
  };

  const handleConfirm = () => {
    setStep("po");
  };

  const handlePOAcknowledge = () => {
    setStep("notify");
  };

  const handleProceedPayment = () => {
    setStep("payment");
  };

  const handlePaymentComplete = () => {
    setChatMessages([
      {
        id: "sys-1",
        sender: "fixer",
        text: locale === "th"
          ? "สวัสดีครับ/ค่ะ ยินดีให้บริการ! กรุณาแจ้งรายละเอียดเพิ่มเติม"
          : locale === "zh"
          ? "你好！很高兴为您服务。请提供更多详情。"
          : "Hello! Happy to help. Please share more details about your request.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
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

    // Simulate fixer reply
    setTimeout(() => {
      const replies: string[] = locale === "th"
        ? ["รับทราบครับ/ค่ะ", "กำลังเตรียมการเดินทาง", "จะถึงตามเวลานัดหมายครับ/ค่ะ"]
        : locale === "zh"
        ? ["收到", "正在准备出发", "会按时到达"]
        : ["Got it!", "Preparing to head out.", "Will arrive as scheduled."];
      const replyText = replies[Math.floor(Math.random() * replies.length)]!;
      setChatMessages((prev) => [
        ...prev,
        {
          id: `reply-${Date.now()}`,
          sender: "fixer" as const,
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1500);
  };

  const handleFinishChat = () => {
    setStep("meeting");
  };

  const handleMeetingConfirm = () => {
    if (showVariation) {
      setStep("variation");
    } else {
      setStep("complete");
    }
  };

  const handleVariationDecision = () => {
    setStep("complete");
  };

  const handleSubmitReview = () => {
    setStep("done");
  };

  const fee = selectedFixer ? getProcessingFee(bookingType, selectedFixer.tier) : 200;
  const tierLabel = selectedFixer ? t(selectedFixer.tier) : "";

  // Step: AI Matching Animation
  if (step === "matching") {
    const aiSteps = locale === "th"
      ? [
          { label: "วิเคราะห์ความต้องการของคุณ...", icon: "🧠" },
          { label: "ค้นหาฐานข้อมูลผู้เชี่ยวชาญ...", icon: "🔍" },
          { label: "คำนวณคะแนนความเข้ากัน...", icon: "⚡" },
          { label: "จัดอันดับตามทำเล ระดับ และคะแนน...", icon: "📊" },
          { label: "เตรียมรายชื่อผู้เชี่ยวชาญ 5 อันดับแรก...", icon: "✅" },
        ]
      : locale === "zh"
      ? [
          { label: "分析您的需求...", icon: "🧠" },
          { label: "搜索专业人士数据库...", icon: "🔍" },
          { label: "计算匹配分数...", icon: "⚡" },
          { label: "按位置、等级和评分排名...", icon: "📊" },
          { label: "准备前 5 名专业人士...", icon: "✅" },
        ]
      : [
          { label: "Analyzing your requirements...", icon: "🧠" },
          { label: "Searching professional database...", icon: "🔍" },
          { label: "Computing compatibility scores...", icon: "⚡" },
          { label: "Ranking by location, tier & rating...", icon: "📊" },
          { label: "Preparing top 5 matches...", icon: "✅" },
        ];

    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          {/* Pulsing AI brain icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-3xl">🤖</span>
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
                <span className="text-lg flex-shrink-0">{i < aiStep ? "✅" : s.icon}</span>
                <span className={`text-sm font-medium ${i < aiStep ? "text-green-700" : i === aiStep ? "text-sky-700" : "text-gray-400"}`}>{s.label}</span>
                {i === aiStep && <span className="ml-auto"><span className="inline-block w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></span>}
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="mt-6 w-full bg-gray-100 rounded-full h-2">
            <div className="bg-gradient-to-r from-sky-500 to-indigo-600 h-2 rounded-full transition-all duration-700" style={{ width: `${Math.min(aiStep / 5 * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{Math.min(aiStep * 20, 100)}%</p>
        </div>
      </div>
    );
  }

  // Step: Done — Final summary with both ratings
  if (step === "done") {
    return (
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
            </div>
          </div>

          {/* PO reference */}
          <div className="mt-6 text-sm text-gray-500">
            {t("poNumber")}: <span className="font-mono font-bold text-gray-800">{poNumber}</span>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            ⚠️ {t("poDisclaimer")}
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
    );
  }

  // Step: Work Completion & Review
  if (step === "complete" && selectedFixer) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">⭐</div>
            <h2 className="text-xl font-bold text-gray-800">{t("completeTitle")}</h2>
            <p className="text-gray-500 text-sm mt-1">{t("completeDesc")}</p>
          </div>

          {/* Fixer info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${getTierColor(selectedFixer.tier).bg} flex items-center justify-center`}>
              <span className={`font-bold ${getTierColor(selectedFixer.tier).text}`}>{selectedFixer.alias.split("-")[1]}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-800">{selectedFixer.alias}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTierColor(selectedFixer.tier).bg} ${getTierColor(selectedFixer.tier).text}`}>{tierLabel}</span>
            </div>
          </div>

          {/* Rating input */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t("rateLabel")}</label>
            <RatingInput value={customerRating} onChange={setCustomerRating} />
          </div>

          {/* Comment */}
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

          {/* Disclaimer */}
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            ⚠️ {t("poDisclaimer")}
          </div>

          <button
            onClick={handleSubmitReview}
            disabled={customerRating === 0}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("submitReview")}
          </button>
        </div>
      </div>
    );
  }

  // Step: Variation / Addendum
  if (step === "variation" && selectedFixer) {
    const variationAmount = Math.floor(fee * 0.3 + Math.random() * fee * 0.5);
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-orange-200 p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📋</div>
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
              onClick={handleVariationDecision}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition"
            >
              {t("approveVariation")}
            </button>
            <button
              onClick={handleVariationDecision}
              className="flex-1 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-xl transition"
            >
              {t("rejectVariation")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step: Meeting Confirmation
  if (step === "meeting" && selectedFixer) {
    return (
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
            ⚠️ {t("poDisclaimer")}
          </div>
        </div>
      </div>
    );
  }

  // Step: Chat
  if (step === "chat" && selectedFixer) {
    return (
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
    );
  }

  // Step: Partner Notification & Confirmation
  if (step === "notify" && selectedFixer) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          {!partnerConfirmed ? (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-3xl animate-pulse">🔔</span>
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
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-left">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500">{t("poNumber")}</span>
                  <span className="font-mono font-bold text-gray-800">{poNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t("poFee")}</span>
                  <span className="font-bold text-gray-800">฿{fee}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-3xl">✅</span>
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
            ⚠️ {t("poDisclaimer")}
          </div>
        </div>
      </div>
    );
  }

  // Step: Payment QR
  if (step === "payment" && selectedFixer) {
    const refCode = `CBLUE-${Date.now().toString(36).toUpperCase()}`;
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t("paymentTitle")}</h2>
          <p className="text-gray-500 text-sm mb-6">{t("paymentDesc")}</p>

          {/* QR Code placeholder */}
          <div className="mx-auto w-48 h-48 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center mb-6">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
              </svg>
              <p className="text-xs text-gray-400">PromptPay QR</p>
            </div>
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
    );
  }

  // Step: PO Created
  if (step === "po" && selectedFixer) {
    const today = new Date().toLocaleDateString(locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long", day: "numeric" });
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-2xl">📄</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">{t("poTitle")}</h2>
          </div>

          {/* PO Details */}
          <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm mb-6">
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
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-6">
            <p className="font-bold mb-1">⚠️ {t("pricingDisclaimer")}</p>
            <p>{t("poDisclaimer")}</p>
          </div>

          <button
            onClick={handlePOAcknowledge}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg transition"
          >
            {locale === "th" ? "รับทราบ & ส่งให้พาร์ทเนอร์" : locale === "zh" ? "确认并通知合作伙伴" : "Acknowledge & Notify Partner"}
          </button>
          <button
            onClick={() => { setSelectedFixer(null); setStep("list"); }}
            className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    );
  }

  // Step: Confirm
  if (step === "confirm" && selectedFixer) {
    return (
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
            ⚠️ {t("poDisclaimer")}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg transition mb-3"
          >
            {t("confirmBtn")}
          </button>
          <button
            onClick={() => { setSelectedFixer(null); setStep("list"); }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    );
  }

  // Step: Fixer List
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="text-center mb-8">
        <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-sky-100 to-indigo-100 text-sky-700 rounded-full text-xs font-bold mb-3 border border-sky-200">🤖 {locale === "th" ? "ผลการจับคู่ AI" : locale === "zh" ? "AI 匹配结果" : "AI-Powered Match Results"}</span>
        <h1 className="text-2xl font-bold text-gray-900">{t("matchTitle")}</h1>
        <p className="text-gray-500 mt-2">{t("matchDesc").replace("{count}", String(fixers.length))}</p>
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
                  { name: t("economy"), fee: "\u0E3F200", stars: "\u2B50", exp: "1-3", key: "economy" },
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
                        {isSelected && <span className="ml-2 text-xs text-sky-600 font-semibold">{locale === "th" ? "\u2190 \u0E17\u0E35\u0E48\u0E04\u0E38\u0E13\u0E40\u0E25\u0E37\u0E2D\u0E01" : "\u2190 Selected"}</span>}
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
        <span className="font-bold">⚠️ {t("pricingDisclaimer")}:</span> {t("poDisclaimer")}
      </div>

      <div className="space-y-4">
        {fixers.map((fixer) => {
          const feeForTier = getProcessingFee(bookingType, fixer.tier);
          const colors = getTierColor(fixer.tier);
          return (
            <div
              key={fixer.id}
              className={`bg-white rounded-xl shadow-md border ${colors.border} p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-lg transition`}
            >
              {/* Avatar */}
              <div className={`w-14 h-14 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                <span className={`text-lg font-bold ${colors.text}`}>
                  {fixer.alias.split("-")[1]}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">{fixer.alias}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                    {t(fixer.tier)}
                  </span>
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
                  {locale === "th" ? "ราคาเริ่มต้น" : locale === "zh" ? "起始价" : "Est. from"} ฿{fixer.price}
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
    </div>
  );
}
