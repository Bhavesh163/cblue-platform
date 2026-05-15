"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ClientChatPage({ orderId, locale }: { orderId: string, locale: string }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [chatTitle, setChatTitle] = useState(`Chat - ${orderId}`);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "system",
      text: "Dear Khun Ghis, Please inform us of your available time to meet at the jobsite. This chat room is now created for you to connect",
      time: "Just now"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentEmailRef = useRef<string>("guest");
  const bcRef = useRef<BroadcastChannel | null>(null);
  
  useEffect(() => {
    setMounted(true);
    try { const sub = JSON.parse(localStorage.getItem("subscriber") || "{}"); currentEmailRef.current = sub?.email || "guest"; } catch {}

    // Load chat title
    try {
      const storedTitle = localStorage.getItem(`chat_title_${orderId}`);
      if (storedTitle) {
        setChatTitle(storedTitle);
      } else {
        // Try to construct from mock active items
        const mockActive = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
        const found = mockActive.find((x: any) => x.po === orderId);
        if (found) setChatTitle(`${found.title} - ${found.po} - ${found.budget}`);
      }
    } catch {}

    // Load messages
    const key = `chat_messages_${orderId}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {}

    // BroadcastChannel for real-time cross-tab sync
    const bc = new BroadcastChannel(`chat_${orderId}`);
    bcRef.current = bc;
    bc.onmessage = (e) => {
      if (Array.isArray(e.data)) setMessages(e.data);
    };

    // Storage event fallback for cross-window sync (different browser windows)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setMessages(parsed);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      bc.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if(!inputText.trim()) return;
    const key = `chat_messages_${orderId}`;
    setMessages(prev => {
      const updated = [...prev, {
        id: Date.now(),
        sender: currentEmailRef.current,
        text: inputText.trim(),
        time: new Date().toLocaleTimeString()
      }];
      try {
        localStorage.setItem(key, JSON.stringify(updated));
        bcRef.current?.postMessage(updated);
      } catch {}
      return updated;
    });
    setInputText("");
  };

  if (!mounted) return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-6.5rem)] mt-4 flex flex-col transition-none bg-gray-50 border-x border-gray-200 shadow-xl rounded-t-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 shrink-0 flex items-center gap-4">
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 text-lg">{chatTitle}</h2>
          <p className="text-xs text-green-600 font-medium">Online</p>
        </div>
        <button
          onClick={() => {
            try {
              const returnTo = localStorage.getItem(`chat_from_${orderId}`);
              if (returnTo === "fixers") router.push(`/${locale}/fixers`);
              else router.push(`/${locale}/dashboard`);
            } catch { router.push('/' + locale + '/' + 'dashboard' + '?tab=chat'); }
          }}
          className="text-gray-400 hover:text-gray-800 transition text-2xl font-light leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map(msg => {
          const isMine = msg.sender === currentEmailRef.current || msg.sender === "me";
          return (
          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
              <p>{msg.text}</p>
              <div className={`text-[10px] mt-1 text-right ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>{msg.time}</div>
            </div>
          </div>
        );})}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..." 
            className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-full px-4 py-2 outline-none transition"
          />
          <button type="submit" className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition shrink-0">
            <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </div>
    </div>
  );
}
