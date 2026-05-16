"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ClientChatPage({ orderId, locale }: { orderId: string, locale: string }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [chatTitle, setChatTitle] = useState(`Chat - ${orderId}`);
  const defaultMessages = useRef([
    {
      id: 1,
      sender: "system",
      text: "Dear Khun Ghis, Please inform us of your available time to meet at the jobsite. This chat room is now created for you to connect",
      time: "Just now"
    }
  ]);
  const [messages, setMessages] = useState([
    ...defaultMessages.current
  ]);
  const [inputText, setInputText] = useState("");
  const [orderDbId, setOrderDbId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
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

    const token = localStorage.getItem("subscriber_token") || "";

    const isUuid = (v: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
    const toLocalMessage = (m: any) => ({
      id: m?.id || Date.now(),
      sender: m?.senderUserId || m?.sender || "system",
      text: m?.text || "",
      time: m?.createdAt ? new Date(m.createdAt).toLocaleString() : (m?.time || ""),
      createdAt: m?.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
    });

    const resolveOrderDbId = async () => {
      if (isUuid(orderId)) return orderId;
      if (!token) return "";

      const endpoints = ["/api/v1/orders/my", "/api/v1/orders/fixer"];
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) continue;
          const orders = await res.json();
          if (!Array.isArray(orders)) continue;
          const found = orders.find((o: any) => {
            const desc = String(o?.description || "");
            const poFromDesc = desc.match(/PO-[A-Za-z0-9-]+/)?.[0] || "";
            return o?.id === orderId || poFromDesc === orderId || o?.po === orderId;
          });
          if (found?.id) return found.id;
        } catch {
          // Ignore and continue to local fallback.
        }
      }

      return "";
    };

    // Load messages once per room.
    const key = `chat_messages_${orderId}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
        else localStorage.setItem(key, JSON.stringify(defaultMessages.current));
      }
      else localStorage.setItem(key, JSON.stringify(defaultMessages.current));
    } catch {}

    const syncFromApi = async () => {
      if (!token) return;
      const resolvedOrderId = await resolveOrderDbId();
      if (!resolvedOrderId) return;
      setOrderDbId(resolvedOrderId);

      try {
        const res = await fetch(`/api/v1/orders/${resolvedOrderId}/chat`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const apiMessages = await res.json();
        if (!Array.isArray(apiMessages)) return;

        const mapped = apiMessages.map((m: any) => toLocalMessage(m));
        if (mapped.length > 0) {
          setMessages(mapped);
          localStorage.setItem(key, JSON.stringify(mapped));
          window.dispatchEvent(new CustomEvent("cblue-chat-updated", { detail: { orderId } }));
        }
      } catch {
        // API offline: local fallback remains available.
      }
    };

    void syncFromApi();
    const apiTimer = setInterval(() => {
      void syncFromApi();
    }, 2500);

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
    const handleChatUpdate = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      } catch {}
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("cblue-chat-updated", handleChatUpdate as EventListener);
    return () => {
      bc.close();
      clearInterval(apiTimer);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cblue-chat-updated", handleChatUpdate as EventListener);
    };
  }, [orderId]);

  useEffect(() => {
    const listEl = chatListRef.current;
    if (!listEl) return;
    listEl.scrollTop = listEl.scrollHeight;
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!inputText.trim()) return;
    const key = `chat_messages_${orderId}`;
    const messageText = inputText.trim();
    const token = localStorage.getItem("subscriber_token") || "";

    if (token && orderDbId) {
      try {
        const res = await fetch(`/api/v1/orders/${orderDbId}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: messageText }),
        });

        if (res.ok) {
          const created = await res.json();
          const createdMessage = {
            id: created?.id || Date.now(),
            sender: created?.senderUserId || currentEmailRef.current,
            text: created?.text || messageText,
            time: created?.createdAt ? new Date(created.createdAt).toLocaleString() : new Date().toLocaleString(),
            createdAt: created?.createdAt ? new Date(created.createdAt).getTime() : Date.now(),
          };

          setMessages(prev => {
            const updated = [...prev, createdMessage];
            try {
              localStorage.setItem(key, JSON.stringify(updated));
              bcRef.current?.postMessage(updated);
              window.dispatchEvent(new Event("storage"));
              window.dispatchEvent(new CustomEvent("cblue-chat-updated", { detail: { orderId } }));
            } catch {}
            return updated;
          });
          setInputText("");
          return;
        }
      } catch {
        // API fallback to local-only message below.
      }
    }

    setMessages(prev => {
      const updated = [...prev, {
        id: Date.now(),
        sender: currentEmailRef.current,
        text: messageText,
        time: new Date().toLocaleString(),
        createdAt: Date.now(),
      }];
      try {
        localStorage.setItem(key, JSON.stringify(updated));
        bcRef.current?.postMessage(updated);
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("cblue-chat-updated", { detail: { orderId } }));
      } catch {}
      return updated;
    });
    setInputText("");
  };

  if (!mounted) return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto h-[calc(100dvh-6.5rem)] mt-4 flex flex-col transition-none bg-gray-50 border-x border-gray-200 shadow-xl rounded-t-2xl overflow-hidden">
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
              localStorage.removeItem(`chat_from_${orderId}`);
              if (returnTo === "fixers") {
                router.push(`/${locale}/fixers?tab=chat`);
                return;
              }
              if (returnTo === "dashboard") {
                router.push(`/${locale}/dashboard?tab=chat`);
                return;
              }
              const sub = JSON.parse(localStorage.getItem("subscriber") || "{}");
              const hasPartnerSignals = Boolean(sub?.company || sub?.credentialStatus || sub?.tier);
              router.push(`/${locale}/${hasPartnerSignals ? "fixers" : "dashboard"}?tab=chat`);
            } catch {
              router.push('/' + locale + '/' + 'dashboard' + '?tab=chat');
            }
          }}
          className="text-gray-400 hover:text-gray-800 transition text-2xl font-light leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Chat Area */}
      <div ref={chatListRef} className="flex-1 p-4 overflow-y-auto space-y-4">
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
