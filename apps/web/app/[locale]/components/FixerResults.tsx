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

type BookingType = "household" | "project" | "professional";

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
    confirmBtn: "Confirm & Pay",
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
    confirmBtn: "ยืนยันและชำระเงิน",
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
    confirmBtn: "确认并支付",
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

function getProcessingFee(_bookingType: BookingType, tier: string): number {
  if (tier === "economy") return 200;
  if (tier === "standard") return 400;
  if (tier === "corporate") return 600;
  if (tier === "specialist") return 800;
  if (tier === "expert") return 1000;
  return 200;
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

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  economy: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  standard: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  corporate: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  specialist: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  expert: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

const getTierColor = (tier: string) => tierColors[tier] ?? tierColors["standard"]!;

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
  const [step, setStep] = useState<"list" | "confirm" | "payment" | "chat" | "done">("list");
  const [selectedFixer, setSelectedFixer] = useState<Fixer | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSelect = (fixer: Fixer) => {
    setSelectedFixer(fixer);
    setStep("confirm");
  };

  const handleConfirm = () => {
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
    setStep("done");
  };

  const fee = selectedFixer ? getProcessingFee(bookingType, selectedFixer.tier) : 200;
  const tierLabel = selectedFixer ? t(selectedFixer.tier) : "";

  // Step: Done
  if (step === "done") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-3xl font-bold text-gray-900">{t("bookingConfirmed")}</h1>
        <p className="mt-4 text-lg text-gray-600">{t("bookingConfirmedDesc")}</p>
        <button
          onClick={onNewBooking}
          className="mt-8 px-6 py-2.5 text-sm font-semibold text-blue-700 border border-blue-700 rounded-lg hover:bg-blue-50"
        >
          {t("newBooking")}
        </button>
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

          {/* Finish */}
          <div className="px-4 py-3 border-t border-gray-100 text-center">
            <button
              onClick={handleFinishChat}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {locale === "th" ? "เสร็จสิ้นการแชท" : locale === "zh" ? "结束聊天" : "Finish Chat"}
            </button>
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
            onClick={() => setStep("confirm")}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700"
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
