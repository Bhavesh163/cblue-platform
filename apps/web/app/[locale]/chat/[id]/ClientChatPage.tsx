"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ChatMessage = {
  id: string | number;
  sender: string;
  senderName?: string;
  text: string;
  time: string;
  createdAt?: number;
};

const fmtDateTime = (d: Date | number | string) => {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2,'0');
  const mm = String(dt.getMonth()+1).padStart(2,'0');
  const hh = String(dt.getHours()).padStart(2,'0');
  const mi = String(dt.getMinutes()).padStart(2,'0');
  return `${dd}/${mm}/${dt.getFullYear()} ${hh}:${mi}`;
};

export default function ClientChatPage({ orderId, locale }: { orderId: string, locale: string }) {
  const router = useRouter();
  const isPropertyPoChat = /^PRE-/i.test(orderId);
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    ...defaultMessages.current
  ]);
  const [inputText, setInputText] = useState("");
  const [orderDbId, setOrderDbId] = useState("");
  const [isChatClosed, setIsChatClosed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  const currentEmailRef = useRef<string>("guest");
  const currentUserIdRef = useRef<string>("");
  const currentNameRef = useRef<string>("You");
  const currentRoleRef = useRef<string>("");
  const bcRef = useRef<BroadcastChannel | null>(null);
  const getInitials = (label: string) => {
    const normalized = String(label || "").trim();
    if (!normalized) return "CB";
    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] || ""}${parts[1]![0] || ""}`.toUpperCase();
  };
  const getOtherPartyLabel = () => currentRoleRef.current === "FIXER" ? "Customer" : "Partner";
  
  useEffect(() => {
    setMounted(true);
    try {
      const sub = JSON.parse(localStorage.getItem("subscriber") || "{}");
      currentEmailRef.current = sub?.email || "guest";
      currentUserIdRef.current = sub?.id || "";
      currentNameRef.current = sub?.name || (String(sub?.role || "").toUpperCase() === "FIXER" ? "Partner" : "Customer");
      currentRoleRef.current = String(sub?.role || "").toUpperCase();
    } catch {}

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
      senderName: m?.senderName || m?.senderUser?.name || m?.user?.name || undefined,
      text: m?.text || "",
      time: m?.createdAt ? fmtDateTime(m.createdAt) : (m?.time || ""),
      createdAt: m?.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
    });
    const detectClosed = (items: any[]) => {
      if (localStorage.getItem(`chat_closed_${orderId}`) === "1") return true;
      return items.some((m: any) => {
        const text = String(m?.text || "").toLowerCase();
        return text.includes('chat room is now closed') || text.includes('customer confirmed job complete');
      });
    };

    const resolveOrderDbId = async () => {
      if (isPropertyPoChat) return "";
      if (isUuid(orderId)) return orderId;
      // Check cached PO→UUID mapping stored at booking time
      const cached = localStorage.getItem(`po_to_order_${orderId}`);
      if (cached) return cached;
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
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            setIsChatClosed(detectClosed(parsed));
          }
        else localStorage.setItem(key, JSON.stringify(defaultMessages.current));
      }
      else localStorage.setItem(key, JSON.stringify(defaultMessages.current));
    } catch {}

    const syncFromApi = async () => {
      if (!token) return;

      try {
        let endpoint = "";
        if (isPropertyPoChat) {
          endpoint = `/api/v1/property-inquiries/by-po/${encodeURIComponent(orderId)}/chat`;
        } else {
          const resolvedOrderId = await resolveOrderDbId();
          if (!resolvedOrderId) return;
          setOrderDbId(resolvedOrderId);
          endpoint = `/api/v1/orders/${resolvedOrderId}/chat`;
        }

        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const apiMessages = await res.json();
        if (!Array.isArray(apiMessages)) return;

        const mapped = apiMessages.map((m: any) => toLocalMessage(m));
        if (mapped.length > 0) {
          setMessages(mapped);
          setIsChatClosed(detectClosed(mapped));
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
    }, 10000);

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
          if (Array.isArray(parsed)) {
            setMessages(parsed);
            setIsChatClosed(detectClosed(parsed));
          }
        } catch {}
      }
    };
    const handleChatUpdate = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setIsChatClosed(detectClosed(parsed));
        }
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
  }, [orderId, isPropertyPoChat]);

  useEffect(() => {
    const listEl = chatListRef.current;
    if (!listEl) return;
    listEl.scrollTop = listEl.scrollHeight;
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChatClosed || !inputText.trim()) return;
    const key = `chat_messages_${orderId}`;
    const messageText = inputText.trim();
    const token = localStorage.getItem("subscriber_token") || "";

    if (token && isPropertyPoChat) {
      try {
        const res = await fetch(`/api/v1/property-inquiries/by-po/${encodeURIComponent(orderId)}/chat`, {
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
            senderName: created?.senderName || currentNameRef.current,
            text: created?.text || messageText,
            time: created?.createdAt ? fmtDateTime(created.createdAt) : fmtDateTime(new Date()),
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
            senderName: created?.senderName || created?.senderUser?.name || currentNameRef.current,
            text: created?.text || messageText,
            time: created?.createdAt ? fmtDateTime(created.createdAt) : fmtDateTime(new Date()),
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
        senderName: currentNameRef.current,
        text: messageText,
        time: fmtDateTime(new Date()),
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
    <div className="min-h-screen bg-slate-800/85 flex flex-col">
      <div className="max-w-2xl w-full mx-auto mt-6 flex flex-col transition-none bg-gray-50 border border-gray-200 shadow-2xl overflow-hidden rounded-t-2xl" style={{ height: "calc(100dvh - 8rem)" }}>
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
              const isPartner = String(sub?.role || "").toUpperCase() === "FIXER";
              router.push(`/${locale}/${isPartner ? "fixers" : "dashboard"}?tab=chat`);
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
          const isMine = msg.sender === currentEmailRef.current || (currentUserIdRef.current !== "" && msg.sender === currentUserIdRef.current) || msg.sender === "me";
          const isSystem = msg.sender === "system" || /^\[(cblue|system)\]/i.test(String(msg.text || ""));
          const senderLabel = isSystem ? "CBLUE" : (isMine ? (msg.senderName || currentNameRef.current) : (msg.senderName || getOtherPartyLabel()));
          const avatarClasses = isSystem
            ? "bg-violet-100 text-violet-700"
            : isMine
              ? "bg-blue-100 text-blue-700"
              : "bg-emerald-100 text-emerald-700";
          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="max-w-[90%] rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 shadow-sm">
                  <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">CB</span>
                    <span>{senderLabel}</span>
                  </div>
                  <p className="mt-2 text-center">{msg.text}</p>
                  <div className="mt-2 text-center text-[10px] text-violet-500">{msg.time}</div>
                </div>
              </div>
            );
          }
          return (
          <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {!isMine && (
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarClasses}`}>
                {getInitials(senderLabel)}
              </div>
            )}
            <div className={`max-w-[80%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
              <div className={`mb-1 text-[11px] font-semibold ${isMine ? 'text-blue-700' : 'text-emerald-700'}`}>{senderLabel}</div>
              <div className={`rounded-2xl px-4 py-2 text-sm ${isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                <p>{msg.text}</p>
                <div className={`text-[10px] mt-1 text-right ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>{msg.time}</div>
              </div>
            </div>
            {isMine && (
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarClasses}`}>
                {getInitials(senderLabel)}
              </div>
            )}
          </div>
        );})}
        <div ref={bottomRef} />
      </div>

      {isChatClosed && (
        <div className="mx-4 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This chat room is now inactive because the job was confirmed complete. Rating can still be completed from the Requests page.
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isChatClosed ? "Chat closed after completion" : "Type your message..."}
            disabled={isChatClosed}
            className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-full px-4 py-2 outline-none transition"
          />
          <button type="submit" disabled={isChatClosed} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 transition shrink-0">
            <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </div>
    </div>
    </div>
  );
}
