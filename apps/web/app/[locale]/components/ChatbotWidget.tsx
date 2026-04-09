"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { HybridRetriever } from "../lib/retrieval";

interface Message {
  role: "bot" | "user";
  text: string;
}

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10", "q11", "q12", "q13", "q14", "q15", "q16", "q17", "q18", "q19", "q20", "q21", "q22", "q23", "q24", "q25", "q26"] as const;

export function ChatbotWidget() {
  const t = useTranslations("chatbot");
  const locale = useLocale();
  const prefix = `/${locale}`;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFaq, setShowFaq] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "bot", text: t("greeting") }]);
    }
  }, [open, messages.length, t]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleFaq(key: string) {
    const question = t(`faq.${key}` as Parameters<typeof t>[0]);
    const answer = t(`faq.${key.replace("q", "a")}` as Parameters<typeof t>[0]);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: question },
      { role: "bot", text: answer },
    ]);
  }

  function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);

    // 1. Try FAQ keyword matching first
    const lowerMsg = userMsg.toLowerCase();
    let matched = false;

    for (const key of FAQ_KEYS) {
      const q = t(`faq.${key}` as Parameters<typeof t>[0]).toLowerCase();
      const aKey = key.replace("q", "a");
      const qWords = q.split(/\s+/).filter((w) => w.length > 2);
      const matchCount = qWords.filter((w) => lowerMsg.includes(w)).length;
      if (matchCount >= 2 || lowerMsg.includes(q)) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { role: "bot", text: t(`faq.${aKey}` as Parameters<typeof t>[0]) },
          ]);
        }, 300);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // 2. Search the cblue-ai knowledge base (120+ topics)
      setLoading(true);
      setTimeout(() => {
        const lang = HybridRetriever.detectLanguage(userMsg) ||
          (locale === "th" ? "th" : locale === "zh" ? "zh" : "en");
        const result = HybridRetriever.search(userMsg);

        let reply: string;
        if (result && result.score >= 0.15) {
          reply = HybridRetriever.extractResponseByLanguage(result.text, lang);
        } else {
          reply =
            locale === "th"
              ? "ขอบคุณสำหรับคำถาม! ลองเลือกคำถามที่พบบ่อยด้านล่าง หรือติดต่อเราที่ cblue.thailand@gmail.com"
              : locale === "zh"
                ? "感谢您的提问！请选择下方的常见问题，或联系我们：cblue.thailand@gmail.com"
                : "Thanks for your question! Try the FAQ options below, or contact us at cblue.thailand@gmail.com";
        }
        setMessages((prev) => [...prev, { role: "bot", text: reply }]);
        setLoading(false);
      }, 500);
    }
  }

  return (
    <>
      {/* Floating Button with blinking ring */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-700 text-white shadow-lg hover:bg-blue-800 transition-all flex items-center justify-center"
        aria-label="Chat"
      >
        {!open && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
        )}
        <span className="relative flex items-center justify-center">
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <Image src="/images/customer-support.png" alt="Chat" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
        )}
        </span>
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: "480px" }}>
          {/* Header */}
          <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Image src="/images/logo-square.png" alt="Cblue" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
              <div>
                <span className="font-semibold text-sm block">{t("title")}</span>
                <span className="text-xs text-blue-200">Online</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-xl rounded-bl-sm text-sm">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* FAQ Quick Buttons - collapsible */}
          <div className="border-t border-gray-100 flex-shrink-0">
            <button
              onClick={() => setShowFaq(!showFaq)}
              className="w-full px-4 py-1.5 flex items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition"
            >
              <span>{locale === "th" ? "คำถามที่พบบ่อย" : locale === "zh" ? "常见问题" : "Quick Questions"}</span>
              <svg className={`w-3.5 h-3.5 transition-transform ${showFaq ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {showFaq && (
              <div className="px-4 py-2 max-h-[100px] overflow-y-auto">
                <div className="flex flex-wrap gap-1.5">
                  {FAQ_KEYS.filter((k) => k.startsWith("q")).map((key) => (
                    <button
                      key={key}
                      onClick={() => handleFaq(key)}
                      className="text-xs px-2.5 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition whitespace-nowrap"
                    >
                      {t(`faq.${key}` as Parameters<typeof t>[0])}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-gray-200 flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={t("placeholder")}
              className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSend}
              className="p-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </div>

          {/* Quick Links */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-2 text-xs flex-shrink-0">
            <Link href={`${prefix}/booking/household`} className="text-blue-600 hover:underline">
              {locale === "th" ? "จองช่าง" : locale === "zh" ? "预约" : "Book"}
            </Link>
            <span className="text-gray-300">|</span>
            <Link href={`${prefix}/properties`} className="text-blue-600 hover:underline">
              {locale === "th" ? "อสังหาฯ" : locale === "zh" ? "房产" : "Real Estate"}
            </Link>
            <span className="text-gray-300">|</span>
            <Link href={`${prefix}/fixers`} className="text-blue-600 hover:underline">
              {locale === "th" ? "ช่างและมืออาชีพ" : locale === "zh" ? "技工与专业人士" : "Fixer & Pro"}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
