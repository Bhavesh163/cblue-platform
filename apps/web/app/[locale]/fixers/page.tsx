"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import PdpaConsent from "../components/PdpaConsent";

interface PartnerInfo {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: string;
  tier?: string;
  createdAt?: string;
  tierScore?: number;
  breakdown?: any[];
  flags?: any[];
  credentialStatus?: string;
}

const stats = {
  activeJobs: 0,
  completedJobs: 0,
  monthlyEarnings: "฿26,500",
  rating: 0,
  responseRate: "0%",
  repeatClients: 0,
};





  const EARNINGS_MOCK = [
    { month: "May 25", monthTh: "พ.ค. 25", monthZh: "5月 25", amount: 18500 },
    { month: "Jun 25", monthTh: "มิ.ย. 25", monthZh: "6月 25", amount: 16000 },
    { month: "Jul 25", monthTh: "ก.ค. 25", monthZh: "7月 25", amount: 20000 },
    { month: "Aug 25", monthTh: "ส.ค. 25", monthZh: "8月 25", amount: 22000 },
    { month: "Sep 25", monthTh: "ก.ย. 25", monthZh: "9月 25", amount: 19500 },
    { month: "Oct 25", monthTh: "ต.ค. 25", monthZh: "10月 25", amount: 23000 },
    { month: "Nov 25", monthTh: "พ.ย. 25", monthZh: "11月 25", amount: 21000 },
    { month: "Dec 25", monthTh: "ธ.ค. 25", monthZh: "12月 25", amount: 18000 },
    { month: "Jan 26", monthTh: "ม.ค. 26", monthZh: "1月 26", amount: 25000 },
    { month: "Feb 26", monthTh: "ก.พ. 26", monthZh: "2月 26", amount: 24000 },
    { month: "Mar 26", monthTh: "มี.ค. 26", monthZh: "3月 26", amount: 26500 },
    { month: "Apr 26", monthTh: "เม.ย. 26", monthZh: "4月 26", amount: 22000 },
    { month: "May 26", monthTh: "พ.ค. 26", monthZh: "5月 26", amount: 26500 },
  ];

const chats: any[] = [];

const fmtDate = (d: Date | number | string) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
};
const fmtDateTime = (d: Date | number | string) => {
  const dt = new Date(d);
  return `${fmtDate(dt)} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
};
const _n = new Date();
const _fmt = (d: Date) => fmtDateTime(d);
const notifications: any[] = [
    { id: 1, msg: "Review PO Details for GREEN CONSTRUCTION", unread: true, time: _fmt(_n), dot: "bg-purple-500" },
    { id: 2, msg: "Review PO Details for FIT OUT", unread: true, time: _fmt(new Date(_n.getTime() - 2 * 60 * 1000)), dot: "bg-purple-500" },
    { id: 3, msg: "Confirm meeting at site", unread: false, time: _fmt(new Date(_n.getTime() - 60 * 60 * 1000)), dot: "bg-gray-300" },
    { id: 4, msg: "Request for Approval of Variation", unread: false, time: _fmt(new Date(_n.getTime() - 24 * 60 * 60 * 1000)), dot: "bg-gray-300" },
    { id: 5, msg: "Request for job complete", unread: false, time: _fmt(new Date(_n.getTime() - 25 * 60 * 60 * 1000)), dot: "bg-gray-300" },
  ];

const STATUS_STYLE: Record<string, string> = {
  IN_PROGRESS: "bg-purple-100 text-purple-700",
  CONFIRMED: "bg-green-100 text-green-700",
  PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  MATCHING: "bg-amber-100 text-amber-700",
  CREATED: "bg-amber-100 text-amber-700",
};
const TIER_STYLE: Record<string, string> = {
  Economy: "bg-green-50 text-green-700",
  Standard: "bg-blue-50 text-blue-700",
  Corporate: "bg-purple-50 text-purple-700",
  Specialist: "bg-amber-50 text-amber-700",
  Expert: "bg-red-50 text-red-700",
};

const STATUS_LABEL: Record<string, Record<string, string>> = {
  IN_PROGRESS: { en: "In Progress", th: "กำลังดำเนินการ", zh: "进行中" },
  CONFIRMED: { en: "Confirmed", th: "ยืนยันแล้ว", zh: "已确认" },
  PENDING: { en: "Pending", th: "รอดำเนินการ", zh: "待处理" },
  COMPLETED: { en: "Completed", th: "เสร็จสิ้น", zh: "已完成" },
  ASSIGNED: { en: "", th: "", zh: "" },
  ACCEPTED: { en: "", th: "", zh: "" },
  MATCHING: { en: "Action needed", th: "Action needed", zh: "Action needed" },
};
const getStatusLabel = (status: string, locale: string) => { const lbl = STATUS_LABEL[status]; if (lbl !== undefined) return lbl[locale as keyof typeof lbl] ?? ""; return status.replace(/_/g, " "); };

type TabKey = "overview" | "requests" | "active" | "properties" | "history" | "chat" | "notifications" | "profile";

export default function FixerProPage() {
  const locale = useLocale();
  const router = useRouter();
  const prefix = `/${locale}`;

  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showPdpa, setShowPdpa] = useState(false);
  const [chatFeed, setChatFeed] = useState<any[]>([]);

  const [orders, setOrders] = useState<any[]>([]);
  const [waitModalOrder, setWaitModalOrder] = useState<any>(null);
  const handleJobClick = (job: any) => {
    if (job.status && ['MATCHING', 'CREATED', 'MEETING_REQUESTED'].includes(job.status.toUpperCase())) {
      setWaitModalOrder(job);
    } else {
      const poFromDesc = String(job.description || "").match(/PO-[A-Za-z0-9-]+/)?.[0] || "";
      const chatId = job.po || poFromDesc || job.id;
      const displayId = job.po || poFromDesc || (job.id ? `PO-${String(job.id).slice(0,4)}-${String(job.id).slice(4,8)}` : job.id);
      try {
        localStorage.setItem(`chat_from_${chatId}`, "fixers");
        localStorage.setItem(`chat_title_${chatId}`, `${job.service || job.serviceTh || ''} - ${displayId} - ฿${job.budget || '0'}`);
        // Store PO→UUID mapping so ClientChatPage can resolve to backend order
        if (chatId && job.id && chatId !== job.id) {
          localStorage.setItem(`po_to_order_${chatId}`, job.id);
        }
        if (poFromDesc && job.id && poFromDesc !== chatId) {
          localStorage.setItem(`po_to_order_${poFromDesc}`, job.id);
        }
      } catch {}
      window.location.href = `/${locale}/chat/${chatId}`;
    }
  };
  const [myProperties, setMyProperties] = useState<any[]>([]);



  const [isFixer, setIsFixer] = useState(false);

  
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("subscriber_token");
      if (!token) {
        setPartner(null);
        setIsFixer(false);
      } else {
        const stored = localStorage.getItem("subscriber");
        if (stored) setPartner(JSON.parse(stored));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("subscriber_token");
        if (!token) {
          setLoading(false);
          return;
        }

        // Eagerly set state from localStorage to prevent flash of logged-out state
        if (isMounted) {
          const stored = localStorage.getItem("subscriber");
          if (stored) {
            const parsed = JSON.parse(stored);
            setPartner(parsed);
            
            // Only eagerly assume they are a fixer if they actually have a fixer tier in their payload
            if (parsed.tier && parsed.tier !== "Standard") {
              setIsFixer(true);
            }
          }
        }

        const res = await fetch("/api/v1/users/me", {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          console.error("Failed to fetch user data:", err);
          return null;
        });

        if (!res) {
          if (isMounted) setIsFixer(false);
          return;
        }

        if (res.ok) {
          const user = await res.json();
          if (isMounted) {
            const hasFixer = !!user.fixer;
            setIsFixer(hasFixer);
            
            // Generate base info
            let pInfo: any = {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              status: "ACTIVE"
            };

            // If they are actually a fixer, poplate fixer schema
            if (hasFixer) {
              pInfo = {
                id: user.id,
                name: user.fixer?.contactName || user.name,
                email: user.email,
                phone: user.fixer?.contactPhone || user.phone,
                company: user.fixer?.companyName || "-",
                status: user.fixer?.status || "ACTIVE",
                tier: user.fixer?.aiTier || user.fixer?.tier || "Standard",
                tierScore: user.fixer?.aiScore || 69,
                breakdown: user.fixer?.aiBreakdown || [],
                flags: user.fixer?.aiFlags || [],
                credentialStatus: user.fixer?.aiCredentialStatus || "unverified",
                createdAt: user.fixer?.createdAt || user.createdAt
              };
            }
            
            setPartner(pInfo);
            localStorage.setItem("subscriber", JSON.stringify(pInfo));
          }

          const ordersRes = await fetch("/api/v1/orders/fixer", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
          if (ordersRes && ordersRes.ok && isMounted) setOrders(await ordersRes.json());

          const propRes = await fetch("/api/v1/properties/my", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
          if (propRes && propRes.ok && isMounted) setMyProperties(await propRes.json());

        } else if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("subscriber_token");
          localStorage.removeItem("subscriber");
          if (isMounted) {
            setPartner(null); setIsFixer(false);
          }
        }
      } catch { /* ignore */ }
      if (isMounted) setLoading(false);
    };
        fetchUser();
    return () => { isMounted = false; };
  }, []);

  const isSubscribed = !!partner;


  
  const mappedOrders = orders.map(o => {
    const desc = o.description || "";
    let extractedPo = "";
    if (desc.includes("PO-")) {
      extractedPo = desc.match(/PO-[a-zA-Z0-9-]+/)?.[0] || "";
    }
    if (!extractedPo) {
      extractedPo = `PO-2605-${o.id?.slice(0, 4)}`;
    }
    
    return {
      id: o.id,
      po: extractedPo,
      hasAttachment: Array.isArray(o.images) && o.images.length > 0,
      subdistrict: o.location ? o.location.split(' ')[0] : "Saphansong",
      customer: o.user?.name || "Customer",
      type: o.orderType?.toLowerCase() || "household",
      phone: o.user?.phone || "",
      service: (o.serviceCategory || "").replace(/_/g, " "),
      serviceTh: (o.serviceCategory || "").replace(/_/g, " "),
      serviceZh: (o.serviceCategory || "").replace(/_/g, " "),
      date: fmtDate(o.createdAt),
      description: desc,
      tier: desc.includes('TIER:') ? desc.split('TIER:')[1].split(' |')[0] : "Standard",
      status: o.status,
      progress: o.status === 'COMPLETED' ? 100 : (['IN_PROGRESS', 'CONFIRMED', 'ACCEPTED'].includes(o.status) ? 40 : 15),
      fee: o.estimatedPrice ? `฿${o.estimatedPrice.toLocaleString()}` : "0", 
      budget: o.estimatedPrice ? o.estimatedPrice.toLocaleString() : "0"
    };
  });

  
  const properties = myProperties.map(p => ({
    id: p.id,
    type: 'property',
    service: p.title,
    serviceTh: p.titleTh || p.title,
    serviceZh: p.titleZh || p.title,
    location: p.address?.province || "Bangkok",
    status: p.status,
    fee: p.price ? `฿${p.price.toLocaleString()}` : "N/A"
  }));
  const EARNINGS_MOCK = [
    { month: "May 25", monthTh: "พ.ค. 25", monthZh: "5月 25", amount: 18500 },
    { month: "Jun 25", monthTh: "มิ.ย. 25", monthZh: "6月 25", amount: 16000 },
    { month: "Jul 25", monthTh: "ก.ค. 25", monthZh: "7月 25", amount: 20000 },
    { month: "Aug 25", monthTh: "ส.ค. 25", monthZh: "8月 25", amount: 22000 },
    { month: "Sep 25", monthTh: "ก.ย. 25", monthZh: "9月 25", amount: 19500 },
    { month: "Oct 25", monthTh: "ต.ค. 25", monthZh: "10月 25", amount: 23000 },
    { month: "Nov 25", monthTh: "พ.ย. 25", monthZh: "11月 25", amount: 21000 },
    { month: "Dec 25", monthTh: "ธ.ค. 25", monthZh: "12月 25", amount: 18000 },
    { month: "Jan 26", monthTh: "ม.ค. 26", monthZh: "1月 26", amount: 25000 },
    { month: "Feb 26", monthTh: "ก.พ. 26", monthZh: "2月 26", amount: 24000 },
    { month: "Mar 26", monthTh: "มี.ค. 26", monthZh: "3月 26", amount: 26500 },
    { month: "Apr 26", monthTh: "เม.ย. 26", monthZh: "4月 26", amount: 22000 },
    { month: "May 26", monthTh: "พ.ค. 26", monthZh: "5月 26", amount: 26500 },
  ];

  const chats: any[] = [];
  // Use module-level frozen array — avoids re-computing timestamps on remount.
  const staticNotifications = notifications;

  useEffect(() => {
    try {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab && ["overview", "requests", "active", "properties", "history", "chat", "notifications", "profile"].includes(tab)) {
        setActiveTab(tab as TabKey);
      }
    } catch {}
  }, []);

  const buildChatFeed = () => {
    if (typeof window === "undefined") return [];
    let viewerEmail = "";
    let viewerUserId = "";
    try {
      const sub = JSON.parse(localStorage.getItem("subscriber") || "{}");
      viewerEmail = sub?.email || "";
      viewerUserId = sub?.id || "";
    } catch {}
    const normalizedViewerEmail = String(viewerEmail || "").trim().toLowerCase();
    const normalizedViewerUserId = String(viewerUserId || "").trim().toLowerCase();
    const isPoCode = (value: string) => /^PO-[A-Za-z0-9-]+$/.test(value);
    const parseChatSort = (msg: any) => {
      const numericId = Number(String(msg?.id || "").replace(/[^0-9]/g, ""));
      if (Number.isFinite(numericId) && numericId > 0) return numericId;
      const timeTs = new Date(msg?.time || 0).getTime();
      return Number.isFinite(timeTs) ? timeTs : 0;
    };
    const isOwnSender = (sender: any) => {
      const normalizedSender = String(sender || "").trim().toLowerCase();
      if (!normalizedSender) return true;
      if (normalizedSender === normalizedViewerEmail) return true;
      if (normalizedViewerUserId && normalizedSender === normalizedViewerUserId) return true;
      return ["fixer", "partner", "me", "guest", "system"].includes(normalizedSender);
    };
    const isVisibleMessage = (m: any) => {
      if (!m || typeof m.text !== "string") return false;
      if (!m.text.trim()) return false;
      if (m.sender === "system") return false;
      const lowerText = m.text.toLowerCase();
      if (lowerText.includes("just be paid by customer")) return false;
      if (lowerText.includes("notify to proceed")) return false;
      return true;
    };
    const isIncomingMessage = (m: any) => isVisibleMessage(m) && !isOwnSender(m.sender);
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("chat_messages_"));
    const items: any[] = [];
    for (const key of keys) {
      try {
        const po = key.replace("chat_messages_", "");
        if (!isPoCode(po)) continue;
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(parsed) || parsed.length === 0) continue;
        const reversed = [...parsed].reverse();
        const latestVisible = reversed.find((m: any) => isVisibleMessage(m));
        if (!latestVisible) continue;
        const latestIncoming = reversed.find((m: any) => isIncomingMessage(m));
        const title = localStorage.getItem(`chat_title_${po}`) || `Chat - ${po}`;
        items.push({
          id: po,
          po,
          name: title,
          service: po,
          lastMsg: latestVisible.text,
          time: latestVisible.time || "",
          incomingMsg: latestIncoming?.text || "",
          incomingTime: latestIncoming?.time || "",
          hasIncoming: Boolean(latestIncoming),
          sort: parseChatSort(latestVisible),
          unread: latestIncoming ? 1 : 0,
          online: true,
        });
      } catch {}
    }
    items.sort((a, b) => b.sort - a.sort);
    return items;
  };

  const buildBackendChatFeed = async () => {
    if (typeof window === "undefined") return [];
    const token = localStorage.getItem("subscriber_token") || "";
    if (!token) return [];

    const viewerUserId = String(partner?.id || "");
    const isPoCode = (value: string) => /^PO-[A-Za-z0-9-]+$/.test(value);
    const items: any[] = [];

    for (const order of (orders || [])) {
      const orderId = order?.id;
      if (!orderId) continue;

      try {
        const res = await fetch(`/api/v1/orders/${orderId}/chat`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) continue;

        const messages = await res.json();
        if (!Array.isArray(messages) || messages.length === 0) continue;

        const desc = String(order?.description || "");
        const po = desc.match(/PO-\d{4}-\d{4}/i)?.[0] || desc.match(/PO-[A-Z0-9]{4}-[A-Z0-9]{4}/)?.[0];
        if (!po || !isPoCode(po)) continue;

        // Cache PO→UUID so ClientChatPage.resolveOrderDbId() works in Suppadesh's browser
        try { localStorage.setItem(`po_to_order_${po}`, orderId); } catch {}

        const visible = messages.filter((m: any) => {
          const text = String(m?.text || "").trim();
          if (!text) return false;
          const lowerText = text.toLowerCase();
          if (lowerText.includes("just be paid by customer")) return false;
          if (lowerText.includes("notify to proceed")) return false;
          return true;
        });
        if (visible.length === 0) continue;

        const latestVisible = visible[visible.length - 1];
        const incoming = [...visible].reverse().find((m: any) => String(m?.senderUserId || "") !== viewerUserId);
        const title =
          localStorage.getItem(`chat_title_${po}`) ||
          `${String(order?.serviceCategory || "Service").replace(/_/g, " ")} - ${po} - ${order?.estimatedPrice ? `฿${Number(order.estimatedPrice).toLocaleString()}` : "฿0"}`;

        items.push({
          id: po,
          po,
          name: title,
          service: po,
          lastMsg: String(latestVisible?.text || ""),
          time: latestVisible?.createdAt ? fmtDateTime(latestVisible.createdAt) : "",
          incomingMsg: incoming ? String(incoming?.text || "") : "",
          incomingTime: incoming?.createdAt ? fmtDateTime(incoming.createdAt) : "",
          hasIncoming: Boolean(incoming),
          sort: latestVisible?.createdAt ? new Date(latestVisible.createdAt).getTime() : 0,
          unread: incoming ? 1 : 0,
          online: true,
          source: "backend",
        });
      } catch {
        // Ignore per-order failures and continue.
      }
    }

    items.sort((a, b) => b.sort - a.sort);
    return items;
  };

  useEffect(() => {
    let isMounted = true;
    const syncChats = async () => {
      const localItems = buildChatFeed();
      const backendItems = await buildBackendChatFeed();
      const merged = new Map<string, any>();
      for (const item of localItems) merged.set(item.po, item);
      for (const item of backendItems) merged.set(item.po, item);
      const mergedList = Array.from(merged.values()).sort((a: any, b: any) => Number(b.sort || 0) - Number(a.sort || 0));
      if (isMounted) setChatFeed(mergedList);
    };

    void syncChats();

    const syncEvent = () => {
      void syncChats();
    };

    window.addEventListener("storage", syncEvent);
    window.addEventListener("cblue-chat-updated", syncEvent as EventListener);
    const timer = setInterval(() => {
      void syncChats();
    }, 5000);
    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncEvent);
      window.removeEventListener("cblue-chat-updated", syncEvent as EventListener);
      clearInterval(timer);
    };
  }, [orders, partner?.id]);

  const [mockDynReqs, setMockDynReqs] = useState<any[]>([]);
  const [mockActiveState, setMockActiveState] = useState<any[]>([]);
  useEffect(() => {
    const checkMock = () => {
      try {
        const d = localStorage.getItem("ghis_mock_dyn_req"); if (d) setMockDynReqs(JSON.parse(d));
        const a = localStorage.getItem("ghis_mock_active"); if (a) setMockActiveState(JSON.parse(a));
      } catch {}
    };
    checkMock();
    const interval = setInterval(checkMock, 1000);
    return () => clearInterval(interval);
  }, []);

  let activeJobs = mappedOrders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status));
  activeJobs = activeJobs.map(job => {
      const stepLookup = mockActiveState.find((x: any) => x.po === job.po);
      if (stepLookup) return { ...job, mockStep: stepLookup.step, actionNeeded: stepLookup.actionNeeded };
      return job;
  });
  const completedJobs = mappedOrders.filter(o => o.status === 'COMPLETED');
    const acceptedPos = new Set(mockActiveState.filter((x: any) => Number(x.step || 0) >= 6).map((x: any) => x.po));
    let incomingJobs = mappedOrders.filter(o => ['CREATED', 'PENDING', 'MATCHING', 'MEETING_REQUESTED'].includes(o.status) && !acceptedPos.has(o.po));

  const parseTs = (v: any) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const parsed = parseInt(v, 10);
      if (!isNaN(parsed)) return parsed;
      return new Date(v).getTime();
    }
    return 0;
  };
  
  const pendingMeetings = mockDynReqs.filter(r => r.type === 'meeting_pending_partner').map(r => ({
    id: r.id,
    service: r.title,
    serviceTh: r.title,
    serviceZh: r.title,
    customer: r.customer,
    budget: r.budget?.replace(/[^0-9]/g, ''),
    date: r.date,
    tier: r.tier,
    po: r.po,
    status: 'MEETING_REQUESTED',
    description: r.desc,
    mock: true
  }));
  const scheduledMeetings = mockDynReqs
    .filter((r: any) => r.type === 'meeting_scheduled')
    .sort((a: any, b: any) => parseTs(a.date) - parseTs(b.date));
  incomingJobs = [...pendingMeetings, ...incomingJobs] as any[];

  const dynamicNotifications = mockDynReqs.map((r: any) => {
    const displayTime = typeof r.date === "string" && r.date.includes(":") ? r.date : (r.date ? fmtDateTime(r.date) : "");
    if (r.type === "meeting_pending_partner") return { id: `dyn-${r.id}`, msg: "Confirm meeting at site", unread: true, time: displayTime, dot: "bg-amber-500" };
    if (r.type === "meeting_scheduled") return { id: `dyn-${r.id}`, msg: "Confirm meeting at site", unread: true, time: displayTime, dot: "bg-teal-500" };
    if (r.type === "variation_pending") return { id: `dyn-${r.id}`, msg: "Request for Approval of Variation", unread: true, time: displayTime, dot: "bg-purple-500" };
    if (r.type === "complete_pending") return { id: `dyn-${r.id}`, msg: "Request for job complete", unread: true, time: displayTime, dot: "bg-green-500" };
    return null;
  }).filter(Boolean) as any[];

  // Generate alerts from backend orders with actionable statuses
  const orderAlertPos = new Set<string>();
  const orderAlerts = mappedOrders.flatMap((o: any) => {
    const po = o.po || "";
    if (!po || orderAlertPos.has(po)) return [];
    orderAlertPos.add(po);
    const svc = o.service || "Project";
    const displayTime = o.date || "";
    if (['CREATED','PENDING','MATCHING'].includes(o.status)) return [{ id: `order-pending-${po}`, msg: `Review PO Details for ${svc}`, unread: true, time: displayTime, dot: "bg-purple-500" }];
    if (o.status === 'IN_PROGRESS') return [{ id: `order-inprogress-${po}`, msg: `Chat room active for ${svc} — coordinate meeting`, unread: false, time: displayTime, dot: "bg-sky-400" }];
    return [];
  });

  const displayNotifications = [...orderAlerts, ...dynamicNotifications]
    .sort((a: any, b: any) => parseTs(b.time) - parseTs(a.time));

  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: "overview", label: locale === "th" ? "ภาพรวม" : locale === "zh" ? "概览" : "Overview", icon: "" },
    { key: "requests", label: locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "Requests", icon: "📋", badge: incomingJobs.length || undefined },
        { key: "active", label: locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "当前工作" : "Active Jobs", icon: "", badge: activeJobs.length || undefined },
    
    { key: "properties", label: locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房产" : "Properties", icon: "" },
    { key: "history", label: locale === "th" ? "ประวัติงาน" : locale === "zh" ? "历史" : "History", icon: "" },
    { key: "chat", label: locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat", icon: "", badge: 0 },
    { key: "notifications", label: locale === "th" ? "แจ้งเตือน" : locale === "zh" ? "通知" : "Alerts", icon: "", badge: 0 },
    { key: "profile", label: locale === "th" ? "โปรไฟล์" : locale === "zh" ? "个人资料" : "Profile", icon: "" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30">
      {/* PDPA Consent Modal */}

      {/* PO Accept/Decline Modal */}
      {waitModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="mb-2 text-sm font-semibold text-purple-600 bg-purple-50 inline-block px-3 py-1 rounded-full">Step 5 of 11</div>
              <button onClick={() => setWaitModalOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">Review PO Details</h2>
            <p className="text-gray-500 mt-2">Customer has placed a request for {waitModalOrder.serviceTh || waitModalOrder.service}. Please review the PO details below and accept or decline.</p>
            
            <div className="w-full bg-gray-50 rounded-xl p-5 mt-6 space-y-3 text-sm text-left border border-gray-100 shadow-inner">
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">PO Number</span><span className="font-mono font-bold text-gray-800">{waitModalOrder.po || `PO-2605-${waitModalOrder.id?.slice(0, 4)}`}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Customer</span><span className="font-bold text-gray-800">{waitModalOrder.customer || waitModalOrder.customerAlias || 'Customer'}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Budget</span><span className="font-bold text-amber-600">฿{waitModalOrder.budget || waitModalOrder.estimatedPrice || waitModalOrder.finalPrice || '0'}</span></div>
              <div className="flex flex-col gap-1 pb-2"><span className="text-gray-500">Project Details</span><span className="font-bold text-gray-800 bg-white p-2 rounded border border-gray-100">{(waitModalOrder.description || waitModalOrder.service || "").replace(/^PO-[\w-]+\s*\|\s*(TIER:[a-zA-Z]+\s*\|\s*)?/, "")}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Uploaded Files</span><span className="font-semibold text-sky-600 cursor-pointer hover:underline" onClick={async () => { 
                let url = waitModalOrder?.issueImage || waitModalOrder?.image || waitModalOrder?.fileUrl || (waitModalOrder?.projectImages && waitModalOrder?.projectImages[0]) || (waitModalOrder?.images && waitModalOrder?.images[0]) || (waitModalOrder?.metadata?.images && waitModalOrder?.metadata.images[0]) || (waitModalOrder?.metadata?.issueImageUrl) || (waitModalOrder?.metadata?.issueImage);
                const poFromDesc = String(waitModalOrder?.description || "").match(/PO-[A-Za-z0-9-]+/)?.[0] || "";
                const poKey = waitModalOrder?.po || poFromDesc;
                if (!url) {
                  try {
                    const poMap = JSON.parse(localStorage.getItem("cblue_po_attachments") || "{}");
                    const poUrl = poKey ? poMap[poKey]?.[0] : "";
                    if (poUrl) url = poUrl;
                  } catch {}
                }
                if (!url) {
                  try {
                    const orderMap = JSON.parse(localStorage.getItem("cblue_order_attachments") || "{}");
                    const orderUrl = waitModalOrder?.id ? orderMap[waitModalOrder.id]?.[0] : "";
                    if (orderUrl) url = orderUrl;
                  } catch {}
                }
                if (!url && waitModalOrder?.id) {
                  try {
                    const token = localStorage.getItem("subscriber_token") || "";
                    if (token) {
                      const res = await fetch(`/api/v1/orders/${waitModalOrder.id}/attachments`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (res.ok) {
                        const attachments = await res.json();
                        if (Array.isArray(attachments) && attachments.length > 0) {
                          url = attachments[0]?.url || "";
                        }
                      }
                    }
                  } catch {
                    // Ignore and keep local fallback behavior.
                  }
                }
                if(url) window.open(url, "_blank"); 
                else { alert("No uploaded file found for this order. Please re-submit from booking so file can be attached to this PO."); } 
              }}>
                {(() => {
                  const hasDirect = !!(waitModalOrder?.image || (waitModalOrder?.images && waitModalOrder?.images.length > 0) || waitModalOrder?.fileUrl || (waitModalOrder?.projectImages && waitModalOrder?.projectImages.length > 0) || waitModalOrder?.metadata?.images);
                  const hasBackend = !!waitModalOrder?.hasAttachment;
                  let hasMapped = false;
                  try {
                    const poMap = JSON.parse(localStorage.getItem("cblue_po_attachments") || "{}");
                    const orderMap = JSON.parse(localStorage.getItem("cblue_order_attachments") || "{}");
                    const poFromDesc = String(waitModalOrder?.description || "").match(/PO-[A-Za-z0-9-]+/)?.[0] || "";
                    const poKey = waitModalOrder?.po || poFromDesc;
                    hasMapped = Boolean((poKey && poMap[poKey]?.length) || (waitModalOrder?.id && orderMap[waitModalOrder.id]?.length));
                  } catch {}
                  return (hasDirect || hasMapped || hasBackend) ? "1 file attached (Click to View)" : "No file attached";
                })()}
              </span></div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={async () => {
                  const po = waitModalOrder.po || `PO-2605-${waitModalOrder.id?.slice(0, 4)}`;
                  const now = fmtDateTime(new Date());
                  const partnerName = partner?.name || partner?.company || 'Partner';
                  const serviceTitle = waitModalOrder.serviceTh || waitModalOrder.service;
                  const budgetLabel = waitModalOrder.fee || (waitModalOrder.budget ? `฿${String(waitModalOrder.budget).replace(/^฿/, '')}` : '฿0');
                  try {
                    const token = localStorage.getItem("subscriber_token");
                    try {
                      let wf = JSON.parse(localStorage.getItem("cblue_workflow") || "{}");
                      if(wf) {
                        wf.step = waitModalOrder.status === 'MEETING_REQUESTED' ? 8 : 6;
                        localStorage.setItem("cblue_workflow", JSON.stringify(wf));
                      }
                    } catch(e) {}
                    if (waitModalOrder.status === 'MEETING_REQUESTED') {
                      const schedId = `meet-scheduled-${po}`;
                      // Use PO-based matching (not waitModalOrder.id) because mockDynReqs IDs are
                      // 'meet-pending-{po}', not the backend UUID stored in waitModalOrder.id
                      const nextReqs = [
                        ...mockDynReqs.filter((r: any) => !(r.po === po && r.type === 'meeting_pending_partner') && r.id !== schedId),
                        { id: schedId, po, title: waitModalOrder.service || serviceTitle, customer: waitModalOrder.customer || 'Ghis Cafe', date: now, createdAt: Date.now(), budget: budgetLabel, tier: waitModalOrder.tier, type: 'meeting_scheduled', step: 8, desc: 'Meeting confirmed by partner. Proceed after the site meeting then mark variation.' },
                      ];
                      const nextActive = mockActiveState.map((x: any) => x.po === po ? { ...x, step: 8, actionNeeded: true } : x);
                      localStorage.setItem("ghis_mock_dyn_req", JSON.stringify(nextReqs));
                      localStorage.setItem("ghis_mock_active", JSON.stringify(nextActive));
                      setMockDynReqs(nextReqs);
                      setMockActiveState(nextActive);
                      window.dispatchEvent(new Event("storage"));
                      // Update backend: MEETING_REQUESTED → IN_PROGRESS (meeting confirmed; customer page polls and auto-detects)
                      if (waitModalOrder.id && !waitModalOrder.mock && token) {
                        fetch(`/api/v1/orders/${waitModalOrder.id}/status`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ status: 'IN_PROGRESS', note: 'Partner confirmed meeting time' }),
                        }).catch(() => {});
                      }
                      setWaitModalOrder(null);
                      return;
                    }

                    let backendAcceptError = "";
                    if (waitModalOrder.id && !waitModalOrder.mock) {
                      const res = await fetch(`/api/v1/orders/${waitModalOrder.id}/status`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { Authorization: `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({ status: "CONFIRMED" })
                      });
                      if (!res.ok) {
                        backendAcceptError = await res.text();
                      }
                    }

                    const activeStateRaw = localStorage.getItem("ghis_mock_active");
                    const dynReqRaw = localStorage.getItem("ghis_mock_dyn_req");
                    const activeState = activeStateRaw ? JSON.parse(activeStateRaw) : [];
                    const dynReqs = dynReqRaw ? JSON.parse(dynReqRaw) : [];

                    const nextActive = [
                      ...activeState.filter((x: any) => x.po !== po),
                      {
                        id: waitModalOrder.id,
                        orderId: waitModalOrder.id,
                        po,
                        title: serviceTitle,
                        customer: waitModalOrder.customer || 'Ghis Cafe',
                        customerName: waitModalOrder.customer || 'Ghis Cafe',
                        fixerAlias: partnerName,
                        partnerName,
                        date: waitModalOrder.date || now,
                        budget: budgetLabel,
                        location: waitModalOrder.subdistrict || 'Saphansong',
                        tier: waitModalOrder.tier,
                        actionNeeded: true,
                        step: 6,
                        description: waitModalOrder.description,
                      },
                    ];
                    const nextReqs = [
                      ...dynReqs.filter((x: any) => x.po !== po),
                      {
                        id: `pay-${po}`,
                        po,
                        orderId: waitModalOrder.id,
                        title: serviceTitle,
                        customer: partnerName,
                        date: now,
                        budget: budgetLabel,
                        tier: waitModalOrder.tier,
                        desc: 'Partner accepted the PO. Please pay the processing fee and notify to proceed.',
                        type: 'payment_pending',
                        step: 6,
                      },
                    ];

                    localStorage.setItem("ghis_mock_active", JSON.stringify(nextActive));
                    localStorage.setItem("ghis_mock_dyn_req", JSON.stringify(nextReqs));
                    setMockActiveState(nextActive);
                    setMockDynReqs(nextReqs);
                    window.dispatchEvent(new Event("storage"));
                    alert(backendAcceptError ? "PO accepted locally. Customer workflow updated, but backend status sync still needs attention." : "PO Accepted Successfully! Customer can now pay fee and proceed.");
                    setWaitModalOrder(null);
                  } catch (e) {
                    console.error(e);
                  }
                }} 
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow-md"
              >
                {waitModalOrder.status === 'MEETING_REQUESTED' ? 'Confirm Meeting Time' : 'Accept PO'}
              </button>
              <button 
                onClick={() => setWaitModalOrder(null)} 
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdpa && (
        <PdpaConsent
          locale={locale}
          prefix={prefix}
          role="fixer"
          onAccept={(ts) => {
            localStorage.setItem("pdpa_consent_partner", ts);
            setShowPdpa(false);
          }}
        />
      )}
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <Image src="/images/scenic-house.jpg" alt="" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 to-purple-800/80" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {locale === "th" ? "พาร์ทเนอร์ของเรา" : locale === "zh" ? "我们的合作伙伴" : "Our Partner"}
              </h1>
              <p className="text-purple-200 text-sm mt-1">
                {locale === "th" ? "จัดการงาน คำขอ แชท รายได้ และโปรไฟล์" : locale === "zh" ? "管理工作、请求、聊天、收入和个人资料" : "Manage jobs, requests, chat, earnings, and profile"}
              </p>
            </div>
            {partner ? (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-2.5">
                <div className="w-10 h-10 rounded-full bg-purple-400/30 flex items-center justify-center text-white font-bold">{partner.name?.charAt(0) || "P"}</div>
                <div>
                  <p className="text-white text-sm font-semibold">{partner.name}</p>
                  <p className="text-purple-200 text-xs">{partner.email}</p>
                </div>
                <button
                  onClick={() => { localStorage.removeItem("subscriber"); localStorage.removeItem("subscriber_token"); localStorage.removeItem("pdpa_consent_partner"); window.dispatchEvent(new Event("storage")); router.push(prefix); }}
                  className="ml-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition"
                >
                  {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出登录" : "Logout"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 pb-12">
        {/* Not logged in CTA */}
        {!isSubscribed && !loading && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold">{locale === "th" ? "เข้าสู่ระบบพาร์ทเนอร์" : locale === "zh" ? "合作伙伴登录" : "Partner Login"}</h2>
                <p className="text-purple-100 mt-2">{locale === "th" ? "รับงาน จัดการแดชบอร์ด และเพิ่มรายได้" : locale === "zh" ? "接受工作、管理仪表板、增加收入" : "Receive jobs, manage your dashboard, and grow earnings"}</p>
              </div>
              <div className="flex gap-3">
                <Link href={`subscription/login`} className="px-6 py-3 bg-white text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-50 transition shadow-lg whitespace-nowrap">
                  {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Log In"}
                </Link>
                <Link href={`fixers/register`} className="px-6 py-3 border-2 border-white/40 text-white rounded-xl font-bold text-sm hover:bg-white/10 transition whitespace-nowrap">
                  {locale === "th" ? "สมัครสมาชิก" : locale === "zh" ? "注册" : "Register"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {isSubscribed && !isFixer && !loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 text-center max-w-2xl mx-auto">
            <div className="text-5xl mb-4">👷‍♂️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {locale === "th" ? "คุณยังไม่ได้ลงทะเบียนเป็นพาร์ทเนอร์" : locale === "zh" ? "您尚未注册成为合作伙伴" : "You are not yet a registered Partner"}
            </h2>
            <p className="text-gray-500 mb-6">
              {locale === "th" ? "สมัครเข้าร่วมกับ CBLUE วันนี้เพื่อรับงานและเพิ่มรายได้ของคุณ" : locale === "zh" ? "立即注册CBLUE，开始接单并增加您的收入。" : "Register with CBLUE today to start receiving jobs and growing your income."}
            </p>
            <Link href={`fixers/register`} className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-lg">
              {locale === "th" ? "ลงทะเบียนเลย" : locale === "zh" ? "立即注册" : "Register Now"}
            </Link>
          </div>
        )}

        {isSubscribed && isFixer && (
          <>
            <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.key ? "bg-purple-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
              {tab.badge ? (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? "bg-white/30 text-white" : "bg-red-100 text-red-700"}`}>{tab.badge}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={`mt-6 ${activeTab !== 'overview' ? 'hidden' : ''}`}>
          <PartnerOverview locale={locale} partner={partner} activeJobs={activeJobs} incomingJobs={incomingJobs} scheduledMeetings={scheduledMeetings} completedJobs={completedJobs} earnings={EARNINGS_MOCK} stats={stats} notifications={displayNotifications} chats={chatFeed} onJobClick={handleJobClick} onTabChange={(tab) => setActiveTab(tab as TabKey)} />
        </div>
        {activeTab === "requests" && <PartnerRequests locale={locale} incomingJobs={incomingJobs} onJobClick={handleJobClick} />}
        {activeTab === "active" && <PartnerJobs locale={locale} activeJobs={activeJobs} onJobClick={handleJobClick} />}
        
        {activeTab === "properties" && <PartnerProperties locale={locale} prefix={prefix} properties={myProperties} />}
        {activeTab === "history" && <PartnerHistory locale={locale} completedJobs={completedJobs} />}
        {activeTab === "chat" && <PartnerChats locale={locale} chats={chatFeed} />}
        {activeTab === "notifications" && <PartnerNotifications locale={locale} notifications={displayNotifications} />}
        {activeTab === "profile" && <PartnerProfile locale={locale} prefix={prefix} partner={partner} />}
          </>
        )}

        <div className="my-10 border-t border-gray-200" />

        {/* Registration Cards */}
        {(!isSubscribed || !isFixer) && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Register as Fixer & Pro */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition">
            <div className="h-2 bg-gradient-to-r from-sky-500 to-blue-600" />
            <div className="p-7">
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center mb-4 text-xl"></div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{locale === "th" ? "สมัครเป็นช่างและมืออาชีพ CBLUE" : locale === "zh" ? "注册成为CBLUE技工和专业人士" : "Register as CBLUE Fixer & Pro"}</h2>
              <p className="text-gray-500 text-sm mb-5">{locale === "th" ? "เข้าร่วมเครือข่ายช่างมืออาชีพ รับงานทั่วประเทศ" : locale === "zh" ? "加入专业网络，全国接单" : "Join our professional network. Receive jobs nationwide."}</p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
                {[
                  locale === "th" ? "รับงานทั่วประเทศ" : locale === "zh" ? "全国接单" : "Receive jobs nationwide",
                  locale === "th" ? "KYC ยืนยันตัวตน" : locale === "zh" ? "KYC身份验证" : "KYC identity verification",
                  locale === "th" ? "5 ระดับ Economy / Standard / Corporate / Specialist / Expert" : locale === "zh" ? "5个等级：基础到专家" : "5 tiers: Economy to Expert",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span> {item}</li>
                ))}
              </ul>
              <Link href={`fixers/register`} className="block text-center py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow transition">
                {locale === "th" ? "สมัครเป็นช่าง" : locale === "zh" ? "注册成为技工" : "Register as Fixer"}
              </Link>
            </div>
          </div>

          {/* List Property */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition">
            <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
            <div className="p-7">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4 text-xl"></div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{locale === "th" ? "ลงประกาศอสังหาริมทรัพย์" : locale === "zh" ? "发布新房产" : "List New Property"}</h2>
              <p className="text-gray-500 text-sm mb-5">{locale === "th" ? "ลงประกาศขายหรือเช่าคอนโด บ้าน ทาวน์เฮาส์ ที่ดิน" : locale === "zh" ? "发布公寓、别墅、联排别墅或土地出售或出租" : "List condo, house, townhouse, or land for sale or rent."}</p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
                {[
                  locale === "th" ? "เข้าถึงผู้ซื้อและผู้เช่าทั่วไทย" : locale === "zh" ? "触达全国买家和租客" : "Reach buyers & renters nationwide",
                  locale === "th" ? "อัปโหลดรูปภาพและรายละเอียด" : locale === "zh" ? "上传照片和详情" : "Upload photos & details",
                  locale === "th" ? "จัดการประกาศจากแดชบอร์ด" : locale === "zh" ? "从仪表板管理列表" : "Manage listings from dashboard",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span> {item}</li>
                ))}
              </ul>
              <Link href={`properties/register`} className="block text-center py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow transition">
                {locale === "th" ? "ลงประกาศ" : locale === "zh" ? "发布房产" : "List Property"}
              </Link>
            </div>
          </div>
        </div>

        )}

        {/* Price List Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">
              {locale === "th" ? "ตารางราคาค่าประสานงาน" : locale === "zh" ? "处理费价格表" : "Processing Fee Price List"}
            </h2>
            <p className="text-gray-500 text-sm text-center mb-5">
              {locale === "th" ? "ค่าประสานงานที่ลูกค้าจ่ายต่อการจับคู่ 1 ครั้ง" : locale === "zh" ? "客户每次匹配技工/专业人士支付的一次性费用" : "One-time fee per fixer/professional matching"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ระดับ" : locale === "zh" ? "等级" : "Tier"}</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ค่าประสานงาน" : locale === "zh" ? "费用" : "Fee"}</th>
                  
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "คุณสมบัติ" : locale === "zh" ? "资质" : "Qualifications"}</th>
                </tr></thead>
                <tbody>
                  {[
                    { tier: "Economy", fee: "฿100", stars: "", qual: locale === "th" ? "ช่างทั่วไป ประสบการณ์เบื้องต้น" : locale === "zh" ? "普通技工，基础经验" : "General fixer, basic experience", color: "bg-green-50 text-green-700" },
                    { tier: "Standard", fee: "฿400", stars: "", qual: locale === "th" ? "ช่างมีประสบการณ์ ผลงานดี" : locale === "zh" ? "有经验，良好记录" : "Experienced, good track record", color: "bg-blue-50 text-blue-700" },
                    { tier: "Corporate", fee: "฿600", stars: "", qual: locale === "th" ? "ช่างมืออาชีพ หรือทีมงาน" : locale === "zh" ? "专业技工或团队" : "Professional fixer or team", color: "bg-purple-50 text-purple-700" },
                    { tier: "Specialist", fee: "฿800", stars: "", qual: locale === "th" ? "ผู้เชี่ยวชาญเฉพาะทาง มีใบรับรอง" : locale === "zh" ? "认证专家" : "Certified specialist", color: "bg-amber-50 text-amber-700" },
                    { tier: "Expert", fee: "฿1,000", stars: "", qual: locale === "th" ? "ผู้เชี่ยวชาญระดับสูง 10+ ปี" : locale === "zh" ? "高级专家，10+年经验" : "Senior expert, 10+ years", color: "bg-red-50 text-red-700" },
                  ].map((r) => (
                    <tr key={r.tier} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${r.color}`}>{r.tier}</span></td>
                      <td className="py-3 px-4 text-center font-bold text-gray-900">{r.fee}</td>
                      
                      <td className="py-3 px-4 text-gray-600">{r.qual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              {locale === "th" ? "* ค่าประสานงานเป็นค่าบริการแพลตฟอร์ม ไม่รวมค่าจ้างช่าง" : locale === "zh" ? "* 仅平台费用，不包括技工费用。客户直接协商价格。" : "* Platform fee only, excludes fixer charges. Customers negotiate pricing directly."}
            </p>
          </div>
        </div>

        {/* Tier Qualification Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-600" />
          <div className="p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">
              {locale === "th" ? "คุณสมบัติระดับช่าง (Tier Qualification)" : locale === "zh" ? "等级资质标准" : "Tier Qualification Criteria"}
            </h2>
            <p className="text-gray-500 text-sm text-center mb-5">
              {locale === "th" ? "ระดับบริการกำหนดจากประสบการณ์ ผลงาน และใบรับรอง" : locale === "zh" ? "由经验、业绩和证书决定" : "Determined by experience, track record, and certifications"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ระดับ" : locale === "zh" ? "等级" : "Tier"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ประสบการณ์" : locale === "zh" ? "经验" : "Experience"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ผลงาน" : locale === "zh" ? "过往项目" : "Past Projects"}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{locale === "th" ? "ใบรับรอง" : locale === "zh" ? "证书" : "Certifications"}</th>
                </tr></thead>
                <tbody>
                  {[
                    { tier: "Economy", exp: "1+ years", projects: locale === "th" ? "ไม่จำเป็น" : locale === "zh" ? "不需要" : "Not required", certs: locale === "th" ? "ไม่จำเป็น" : locale === "zh" ? "不需要" : "Not required", color: "bg-green-50 text-green-700" },
                    { tier: "Standard", exp: "3+ years", projects: "3+", certs: locale === "th" ? "แนะนำ" : locale === "zh" ? "建议" : "Recommended", color: "bg-blue-50 text-blue-700" },
                    { tier: "Corporate", exp: "5+ years", projects: "10+", certs: locale === "th" ? "จำเป็น" : locale === "zh" ? "必需" : "Required", color: "bg-purple-50 text-purple-700" },
                    { tier: "Specialist", exp: "7+ years", projects: "20+", certs: locale === "th" ? "จำเป็น + เฉพาะทาง" : locale === "zh" ? "必需 + 专业" : "Required + specialized", color: "bg-amber-50 text-amber-700" },
                    { tier: "Expert", exp: "10+ years", projects: "50+", certs: locale === "th" ? "จำเป็น + ขั้นสูง" : locale === "zh" ? "必需 + 高级" : "Required + advanced", color: "bg-red-50 text-red-700" },
                  ].map((r) => (
                    <tr key={r.tier} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${r.color}`}>{r.tier}</span></td>
                      <td className="py-3 px-4 text-gray-600">{r.exp}</td>
                      <td className="py-3 px-4 text-gray-600">{r.projects}</td>
                      <td className="py-3 px-4 text-gray-600">{r.certs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              {locale === "th" ? "* ช่างสามารถอัปเกรดระดับได้เมื่อมีคุณสมบัติครบถ้วน" : locale === "zh" ? "* 技工满足资质后可升级等级" : "* Fixers can upgrade their tier when qualifications are met."}
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-1"> {locale === "th" ? "ข้อจำกัดความรับผิดชอบ" : locale === "zh" ? "免责声明" : "Disclaimer"}</p>
          <p>{locale === "th"
            ? "CBLUE เป็นแพลตฟอร์มจับคู่เท่านั้น ราคาที่ตกลง ขอบเขตงาน และการชำระเงินระหว่างคุณกับพาร์ทเนอร์ (ช่าง/ทีมโครงการ/มืออาชีพ/ผู้ลงประกาศอสังหาริมทรัพย์) เป็นข้อตกลงโดยตรงระหว่างทั้งสองฝ่าย CBLUE ไม่รับผิดชอบต่อข้อพิพาทด้านราคา คุณภาพงาน หรือข้อตกลงที่เกิดขึ้นหลังกระบวนการจับคู่"
            : locale === "zh"
            ? "CBLUE 仅作为匹配平台。您与合作伙伴（技工/项目团队/专业人士/房产发布者）之间约定的价格、工作范围和付款为双方直接安排。CBLUE 不对匹配过程后产生的价格争议、工作质量或协议承担责任。"
            : "CBLUE acts as a matching platform only. The agreed price, scope of work, and payment between you and the partner (fixer/project team/professional/property lister) is a direct arrangement between both parties. CBLUE is not responsible for pricing disputes, work quality, or agreements made after the matching process."
          }</p>
          <p className="mt-2 font-semibold text-gray-700">{locale === "th"
            ? "📌 ค่าธรรมเนียมดำเนินการไม่สามารถคืนเงินได้ เนื่องจากบริการจับคู่ได้ดำเนินการเสร็จสิ้นแล้วเมื่อลูกค้าเริ่มกระบวนการ ค่าธรรมเนียมนี้ครอบคลุมการจับคู่ AI, การตรวจสอบพาร์ทเนอร์, การออก PO และการจัดการการสื่อสาร"
            : locale === "zh"
            ? "📌 处理费不可退还，因为匹配服务在客户发起流程后已完成。此费用涵盖AI匹配、合作伙伴验证、PO签发和通信协调。"
            : "📌 The processing fee is non-refundable as the matching service is completed once the customer initiates the process. This fee covers AI matching, partner verification, PO issuance, and communication facilitation."
          }</p>
        </div>
        {/* Data Retention Notice */}
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
          <p className="font-semibold mb-1">🛡️ {locale === "th" ? "นโยบายการเก็บรักษาข้อมูล (PDPA)" : locale === "zh" ? "数据保留政策 (PDPA)" : "Data Retention Policy (PDPA)"}</p>
          <p>{locale === "th"
            ? "ความยินยอม: 3 ปี | ประวัติบริการ: 18 เดือน | บัญชีไม่ใช้งาน: ลบหลัง 12 เดือน"
            : locale === "zh"
            ? "同意记录: 3年 | 服务历史: 18个月 | 非活跃账户: 12个月后删除"
            : "Consent: 3 years | Service history: 18 months | Inactive accounts: deleted after 12 months"
          }</p>
        </div>
      </div>
    </div>
  );
}

/* ===== PARTNER OVERVIEW ===== */
function PartnerOverview({ locale, partner, activeJobs, incomingJobs, scheduledMeetings, completedJobs, earnings, stats, notifications, chats = [], onJobClick, onTabChange }: { locale: string; partner: PartnerInfo | null; activeJobs: any[]; incomingJobs: any[]; scheduledMeetings: any[]; completedJobs: any[]; earnings: any[]; stats: any; notifications: any[]; chats?: any[]; onJobClick?: (job: any) => void; onTabChange?: (tab: string) => void; }) {
  const earnings12 = earnings;
  const maxEarning = earnings12.length > 0 ? Math.max(...earnings12.map(e => e.amount)) : 0;
  const recentIncomingChats = chats.filter((c: any) => c.hasIncoming).slice(0, 2);
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: locale === "th" ? "งานที่ใช้งานอยู่" : "Active Jobs", value: activeJobs?.length || 0, icon: "", color: "text-amber-600" },
          { label: locale === "th" ? "เสร็จสิ้น" : "Completed", value: completedJobs?.length || 0, icon: "", color: "text-green-600" },
          { label: locale === "th" ? "รายได้ต่อเดือน" : "Monthly Earn", value: stats?.monthlyEarnings || "฿0", icon: "", color: "text-indigo-600" },
          { label: locale === "th" ? "คะแนน" : "Rating", value: `${stats?.rating || 0} `, icon: "", color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-500">{s.label}</span>
              <span className="text-xl">{s.icon}</span>
            </div>
            <p className={`text-2xl sm:text-3xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Profile + Earnings row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile */}
        {partner && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">{partner.name?.charAt(0)}</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{partner.name}</h3>
                <p className="text-sm text-gray-500">{partner.email}</p>
                <p className="text-xs text-gray-400">{partner.phone}</p>
              </div>
              <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">{locale === "th" ? "ใช้งานอยู่" : locale === "zh" ? "活跃" : "Active"}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">{partner.tier || "Standard Tier"}</span>
              <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold">{locale === "th" ? "ยืนยันแล้ว" : locale === "zh" ? "已验证" : "Verified"}</span>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">{locale === "th" ? "KYC ✓ ยืนยันแล้ว" : locale === "zh" ? "KYC ✓ 已验证" : "KYC ✓"}</span>
            </div>
          </div>
        )}

        {/* Earnings Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:col-span-2">
          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">{locale === "th" ? "รายได้รายเดือน" : locale === "zh" ? "月收入" : "Monthly Earnings"}</h3>
          <p className="text-xs text-gray-400 mb-4">{locale === "th" ? "เดือนนี้ + 12 เดือนล่าสุด" : locale === "zh" ? "本月 + 近12个月" : "This month & last 12 months"}</p>
          {/* Bar chart — heights in px relative to 120px max bar */}
          <div className="flex items-end gap-px" style={{ height: "9rem" }}>
            {earnings12.map((e) => {
              const pct = maxEarning > 0 ? e.amount / maxEarning : 0;
              const barPx = Math.max(6, Math.round(pct * 96));
              const label = locale === "th" ? e.monthTh : locale === "zh" ? e.monthZh : e.month;
              return (
                <div key={e.month} className="flex-1 flex flex-col items-center justify-end" style={{ height: "100%" }}>
                  <span className="text-[8px] font-bold text-gray-500 mb-0.5 leading-none">฿{(e.amount / 1000).toFixed(0)}k</span>
                  <div className="w-full rounded-t-sm" style={{ height: `${barPx}px`, background: "linear-gradient(to top,#9333ea,#818cf8)" }} />
                  <span className="text-[7px] text-gray-400 mt-0.5 leading-none truncate w-full text-center">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Incoming Requests Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新订单" : "Incoming Requests"}</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-sky-600 font-bold cursor-pointer" onClick={() => onTabChange && onTabChange("requests")}>View All</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">{incomingJobs.length}</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {incomingJobs.slice(0, 3).map((req) => (
            <div key={req.id} className="px-6 py-4 flex items-center gap-4 hover:bg-amber-50 transition cursor-pointer" onClick={() => onJobClick && onJobClick(req)}>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-lg"></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? req.serviceTh : locale === "zh" ? req.serviceZh : req.service}</p>
                <p className="text-xs text-gray-500">{req.customer} &middot; {req.date} &middot; {locale === "th" ? "งบ" : locale === "zh" ? "预算" : "Budget"}: {req.fee}</p>
                <p className="text-xs text-gray-500 mt-1" style={{ whiteSpace: "pre-wrap" }}>{req.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[req.tier] || ""}`}>{req.tier}</span>
                {req.urgency === "urgent" && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">{locale === "th" ? "เร่งด่วน" : locale === "zh" ? "紧急" : "Urgent"}</span>}
                <button onClick={(e) => { e.stopPropagation(); onJobClick && onJobClick(req); }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">{locale === "th" ? "รับ" : locale === "zh" ? "接受" : "Accept"}</button>
                <button className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">{locale === "th" ? "ปฏิเสธ" : locale === "zh" ? "拒绝" : "Decline"}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications + Chat side by side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center justify-between">⏰ Upcoming Meetings <span className="text-xs text-sky-600 font-bold cursor-pointer" onClick={() => onTabChange && onTabChange("requests")}>View All</span></h3>
          {scheduledMeetings.length > 0 ? (
            <div className="space-y-2">
              {scheduledMeetings.slice(0, 2).map((meeting: any) => (
                <div key={meeting.id} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                  <p className="text-sm font-bold text-gray-800">{meeting.title} ({meeting.po})</p>
                  <p className="text-xs text-gray-500 mt-1">{meeting.date}</p>
                  <p className="text-xs text-gray-500 mt-1">Location: Saphansong | Customer: {meeting.customer}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm italic">
              No upcoming meetings
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center justify-between">{locale === "th" ? "การแจ้งเตือนล่าสุด" : locale === "zh" ? "最近通知" : "Recent Alerts"} <span className="text-xs text-sky-600 font-bold cursor-pointer" onClick={() => onTabChange && onTabChange("notifications")}>View All</span></h3>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((n) => (
              <div key={n.id} className={`flex items-center gap-3 p-3 rounded-lg ${n.unread ? "bg-purple-50 border border-purple-100" : "bg-gray-50"}`}>
                <span className={`w-2 h-2 rounded-full ${n.dot} flex-shrink-0`} />
                <p className="text-sm text-gray-700 flex-1">{locale === "th" ? n.msgTh : locale === "zh" ? n.msgZh : n.msg}</p>
                <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center justify-between">{locale === "th" ? "แชทที่เข้ามาล่าสุด" : locale === "zh" ? "最近收到的来信" : "Recent incoming chats"} <span className="text-xs text-sky-600 font-bold cursor-pointer" onClick={() => onTabChange && onTabChange("chat")}>View All</span></h3>
          <div className="space-y-2">
            {recentIncomingChats.length > 0 ? recentIncomingChats.map((c: any) => (
              <div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg ${c.unread > 0 ? "bg-purple-50 border border-purple-100" : "bg-gray-50"}`}>
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{String(c.name || "C").slice(-3)}</div>
                  {c.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{c.name} <span className="text-gray-400 font-normal">· {c.service || c.po || "Chat"}</span></p>
                  <p className="text-xs text-gray-500 truncate">{c.incomingMsg}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">{c.incomingTime || ""}</span>
                  {c.unread > 0 && <span className="block mt-0.5 ml-auto w-5 h-5 bg-purple-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{c.unread}</span>}
                </div>
              </div>
            )) : <p className="text-sm text-gray-500 py-4 text-center">{locale === "th" ? "ไม่มีแชทล่าสุด" : locale === "zh" ? "没有最近的聊天" : "No recent incoming chats"}</p>}
          </div>
        </div>
      </div>


        {/* Active Jobs Preview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"> {locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "进行中的工作" : "Active Jobs"}</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-sky-600 font-bold cursor-pointer" onClick={() => onTabChange && onTabChange("active")}>View All</span>
            <span className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-bold">{activeJobs.length}</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {activeJobs.slice(0, 5).map((job) => (
            <div key={job.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-lg"></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? job.serviceTh : locale === "zh" ? job.serviceZh : job.service}</p>
                <p className="text-xs text-gray-500">{job.customer} &middot; {job.date} &middot; {locale === "th" ? "งบ" : "Budget"}: ฿{job.budget || "0"} &middot; {job.po} | {job.subdistrict || "Saphansong"}</p>
                <div className="mt-2 w-full pt-1">
                  <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
<div className="flex items-center min-w-max relative px-2">
                    {(() => {
                        const currentStep = job.mockStep || (job.status === 'COMPLETED' ? 11 : 5);
                        return (
                          <>
                      <div className="absolute left-4 right-4 top-3 -translate-y-1/2 h-1 bg-gray-200 rounded-full"></div>
                      <div className="absolute left-4 top-3 -translate-y-1/2 h-1 bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, ((currentStep - 4) / 7) * 100))}%` }}></div>
                      
                      {["Notify", "Accept", "Fee & Proceed", "Chat", "Meet", "Variation", "Complete", "Rate"].map((s, i) => {
                        const stepNum = i + 4; // Notify starts at 4
                        const isCompleted = stepNum < currentStep;
                        const isCurrent = stepNum === currentStep;
                        return (
                          <div key={s} className="relative z-10 flex flex-col items-center flex-1 px-1">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${isCompleted ? 'bg-sky-500 text-white' : isCurrent ? 'bg-sky-500 text-white shadow-[0_0_0_4px_rgba(14,165,233,0.2)]' : 'bg-gray-300'}`}>
                              {isCompleted ? '✓' : ''}
                            </div>
                            <span className={`text-[10px] mt-2 whitespace-nowrap ${isCurrent ? 'text-sky-600 font-bold' : isCompleted ? 'text-sky-500' : 'text-gray-400'}`}>
                              {s}
                            </span>
                          </div>
                        );
                      })}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[job.tier] || "bg-gray-100 text-gray-600"}`}>{job.tier}</span>
                  {getStatusLabel(job.status, locale) !== "" && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[job.status] || ""}`}>{getStatusLabel(job.status, locale)}</span>}
                  {job.actionNeeded && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-700">Action Needed</span>}
                  {job.earnings && <span className="text-xs font-bold text-gray-700">{job.earnings}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Recent History</h2>
            <span className="text-xs text-purple-600 font-bold cursor-pointer hover:underline">View All →</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-4">Service</th>
                  <th className="py-2 px-4">Customer</th>
                  <th className="py-2 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {completedJobs.slice(0, 3).length > 0 ? completedJobs.slice(0, 3).map((h) => (
                  <tr key={h.id} className="border-b border-gray-50">
                    <td className="py-3 px-4 font-medium">{h.service}</td>
                    <td className="py-3 px-4 text-gray-600">{h.customer}</td>
                    <td className="py-3 px-4 text-gray-500">{h.date}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">No completed jobs yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}


/* ===== PARTNER JOBS (Active) ===== */


/* ===== PARTNER JOBS (Active) ===== */
function PartnerJobs({ locale, activeJobs, onJobClick }: { locale: string; activeJobs: any[]; onJobClick?: (job: any) => void; }) {
  const [variationModal, setVariationModal] = React.useState<any>(null);
  const [variationDesc, setVariationDesc] = React.useState("");
  const [ratingModal, setRatingModal] = React.useState<any>(null);
  const [ratingStars, setRatingStars] = React.useState(5);
  const [completeModal, setCompleteModal] = React.useState<any>(null);
  const [completeNote, setCompleteNote] = React.useState("");
  const handlePartnerAction = (job: any, action: 'variation' | 'complete' | 'rate', extraData?: string) => {
    try {
      const po = job.po || job.id;
      const createdAt = Date.now();
      const token = localStorage.getItem("subscriber_token") || "";
      const orderDbId = localStorage.getItem(`po_to_order_${po}`) || job.id || "";
      const fmtDt = (d: number) => {
        const dt = new Date(d);
        return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      };
      const postSystemMsg = (text: string) => {
        if (token && orderDbId) {
          fetch(`/api/v1/orders/${orderDbId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ text }),
          }).catch(() => {});
        }
      };
      const dynReqs = JSON.parse(localStorage.getItem("ghis_mock_dyn_req") || "[]");
      if (action === 'variation') {
        const varId = `var-${po}`;
        const varNote = extraData || 'Your partner has submitted a variation for your approval. Please review and confirm to proceed.';
        const next = [...dynReqs.filter((x: any) => x.po !== po), { id: varId, po, title: job.service, customer: job.customer, date: fmtDt(createdAt), createdAt, budget: job.budget || job.fee, tier: job.tier, desc: varNote, type: 'variation_pending', step: 9 }];
        localStorage.setItem("ghis_mock_dyn_req", JSON.stringify(next));
        // Update partner's own active job step
        const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
        const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 9, mockStep: 9, actionNeeded: false } : x);
        localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
        window.dispatchEvent(new Event("storage"));
        postSystemMsg(`[SYSTEM] Partner has submitted a variation request for ${po}. Please review in your Requests tab.`);
      } else if (action === 'complete') {
        const complId = `compl-${po}`;
        const next = [...dynReqs.filter((x: any) => x.po !== po), { id: complId, po, title: job.service, customer: job.customer, date: fmtDt(createdAt), createdAt, budget: job.budget || job.fee, tier: job.tier, desc: 'Work is completed. Please review and mark as complete to close this project.', type: 'complete_pending', step: 10 }];
        localStorage.setItem("ghis_mock_dyn_req", JSON.stringify(next));
        const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
        const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 10, mockStep: 10, actionNeeded: false } : x);
        localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
        window.dispatchEvent(new Event("storage"));
        postSystemMsg(`[SYSTEM] Partner has marked the job as complete for ${po}. Please review and confirm in your Requests tab.`);
      } else if (action === 'rate') {
        const rating = extraData || '5';
        const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
        const hist = JSON.parse(localStorage.getItem("ghis_mock_history") || "[]");
        const updated = active.filter((x: any) => x.po !== po);
        const completed = { ...(active.find((x: any) => x.po === po) || job), step: 11, completedAt: createdAt, partnerRating: Number(rating) };
        localStorage.setItem("ghis_mock_active", JSON.stringify(updated));
        localStorage.setItem("ghis_mock_history", JSON.stringify([...hist, completed]));
        window.dispatchEvent(new Event("storage"));
        postSystemMsg(`[SYSTEM] Partner has rated this project ${rating}/5 stars. The job is now complete.`);
      }
    } catch (e) { console.error(e); }
  };
  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2"> {locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "进行中的工作" : "Active Jobs"}</h2>
        <span className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-bold">{activeJobs.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {activeJobs.map((job) => (
          <div key={job.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-lg"></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? job.serviceTh : locale === "zh" ? job.serviceZh : job.service}</p>
              <p className="text-xs text-gray-500">{job.customer} &middot; {job.date} &middot; {locale === "th" ? "งบ" : "Budget"}: ฿{job.budget || "0"} &middot; {job.po} | {job.subdistrict || "Saphansong"}</p>
              <div className="mt-2 w-full pt-1">
                <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
                  <div className="flex items-center min-w-max relative px-2">
                    {(() => {
                      const currentStep = job.mockStep || (job.status === 'COMPLETED' ? 11 : 5);
                      return (
                        <>
                    <div className="absolute left-4 right-4 top-3 -translate-y-1/2 h-1 bg-gray-200 rounded-full"></div>
                    <div className="absolute left-4 top-3 -translate-y-1/2 h-1 bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, ((currentStep - 4) / 7) * 100))}%` }}></div>
                    {["Notify", "Accept", "Fee & Proceed", "Chat", "Meet", "Variation", "Complete", "Rate"].map((s, i) => {
                      const stepNum = i + 4;
                      const isCompleted = stepNum < currentStep;
                      const isCurrent = stepNum === currentStep;
                      return (
                        <div key={s} className="relative z-10 flex flex-col items-center flex-1 px-1">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${isCompleted ? 'bg-sky-500 text-white' : isCurrent ? 'bg-sky-500 text-white shadow-[0_0_0_4px_rgba(14,165,233,0.2)]' : 'bg-gray-300'}`}>
                            {isCompleted ? '✓' : ''}
                          </div>
                          <span className={`text-[10px] mt-2 whitespace-nowrap ${isCurrent ? 'text-sky-600 font-bold' : isCompleted ? 'text-sky-500' : 'text-gray-400'}`}>
                            {s}
                          </span>
                        </div>
                      );
                    })}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[job.tier] || "bg-gray-100 text-gray-600"}`}>{job.tier}</span>
                {getStatusLabel(job.status, locale) !== "" && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[job.status] || ""}`}>{getStatusLabel(job.status, locale)}</span>}
                {job.actionNeeded && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-700">Action Needed</span>}
                {job.earnings && <span className="text-xs font-bold text-gray-700">{job.earnings}</span>}
                {/* Step 9: Partner submits variation */}
                {(job.mockStep === 9 || (job.step === 9)) && (
                  <button onClick={() => { setVariationModal(job); setVariationDesc(""); }} className="text-xs px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full transition">Submit Variation</button>
                )}
                {/* Step 10: Partner marks complete */}
                {(job.mockStep === 10 || (job.step === 10)) && (
                  <button onClick={() => { setCompleteNote(""); setCompleteModal(job); }} className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full transition">Mark Complete</button>
                )}
                {/* Step 11: Partner rates customer */}
                {(job.mockStep === 11 || (job.step === 11)) && (
                  <button onClick={() => { setRatingModal(job); setRatingStars(5); }} className="text-xs px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-full transition">Rate Customer</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    {/* Variation Modal */}
    {variationModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          <div className="bg-amber-500 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Submit Variation</h3>
            <p className="text-amber-100 text-sm mt-1">{variationModal.po} &middot; {variationModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Customer</label>
              <p className="text-sm text-gray-800">{variationModal.customer}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Budget</label>
              <p className="text-sm text-gray-800">฿{variationModal.budget || '0'}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Variation Description <span className="text-red-500">*</span></label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                rows={4}
                placeholder="Describe the variation scope, extra work, or cost changes..."
                value={variationDesc}
                onChange={e => setVariationDesc(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  if (!variationDesc.trim()) return;
                  handlePartnerAction(variationModal, 'variation', `Partner variation request: ${variationDesc.trim()}`);
                  setVariationModal(null);
                }}
                disabled={!variationDesc.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm"
              >Submit Variation</button>
              <button onClick={() => setVariationModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
    {/* Rating Modal */}
    {ratingModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          <div className="bg-sky-600 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Rate Customer</h3>
            <p className="text-sky-200 text-sm mt-1">{ratingModal.po} &middot; {ratingModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Customer</label>
              <p className="text-sm text-gray-800">{ratingModal.customer}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Your Rating</label>
              <div className="flex gap-2 text-3xl">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setRatingStars(n)} className={`transition-transform hover:scale-110 ${n <= ratingStars ? 'text-amber-400' : 'text-gray-300'}`}>★</button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">{ratingStars} out of 5 stars</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  handlePartnerAction(ratingModal, 'rate', String(ratingStars));
                  setRatingModal(null);
                }}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl transition text-sm"
              >Submit Rating</button>
              <button onClick={() => setRatingModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
    {completeModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Mark Job Complete</h3>
            <p className="text-green-100 text-sm mt-1">{completeModal.po} · {completeModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Customer</label>
              <p className="text-sm text-gray-800">{completeModal.customer}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Completion Note <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                value={completeNote}
                onChange={e => setCompleteNote(e.target.value)}
                rows={3}
                placeholder="e.g. All tasks finished, site cleaned, client signed off..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  handlePartnerAction(completeModal, 'complete', completeNote.trim() || 'Job marked complete by partner');
                  setCompleteModal(null);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition text-sm"
              >Confirm Complete</button>
              <button onClick={() => setCompleteModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function PartnerRequests({ locale, incomingJobs, onJobClick }: { locale: string; incomingJobs: any[]; onJobClick?: (job: any) => void; }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新订单" : "Incoming Requests"}</h2>
        <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">{incomingJobs.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {incomingJobs.map((req) => (
          <div key={req.id} className="px-6 py-4 flex items-center gap-4 hover:bg-amber-50 transition cursor-pointer" onClick={() => onJobClick && onJobClick(req)}>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-lg"></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? req.serviceTh : locale === "zh" ? req.serviceZh : req.service}</p>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">{locale === "th" ? "โปรดพิจารณาและรับงานนี้เพื่อดำเนินการต่อ" : locale === "zh" ? "请审核并接受此工作以继续" : "Please review and accept this job to proceed"}</p>
              <p className="text-xs text-gray-500 mt-0.5">{req.customer} &middot; {req.date} &middot; {locale === "th" ? "งบ" : locale === "zh" ? "预算" : "Budget"}: {req.fee}</p>
              <p className="text-xs text-gray-500 mt-1" style={{ whiteSpace: "pre-wrap" }}>{req.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[req.tier] || ""}`}>{req.tier}</span>
              {req.urgency === "urgent" && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">{locale === "th" ? "เร่งด่วน" : locale === "zh" ? "紧急" : "Urgent"}</span>}
              <button onClick={(e) => { e.stopPropagation(); onJobClick && onJobClick(req); }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">{locale === "th" ? "รับ" : locale === "zh" ? "接受" : "Accept"}</button>
              <button className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">{locale === "th" ? "ปฏิเสธ" : locale === "zh" ? "拒绝" : "Decline"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartnerHistory({ locale, completedJobs }: { locale: string; completedJobs: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "ประวัติการทำงาน" : locale === "zh" ? "工作历史" : "Job History"}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold">{locale === "th" ? "บริการ" : "Service"}</th>
              <th className="py-3 px-4 font-semibold">{locale === "th" ? "ลูกค้า" : "Customer"}</th>
              <th className="py-3 px-4 font-semibold text-center">{locale === "th" ? "ระดับ" : "Tier"}</th>
              <th className="py-3 px-4 font-semibold text-center">{locale === "th" ? "รายได้" : "Fee"}</th>
              <th className="py-3 px-4 font-semibold text-center">{locale === "th" ? "วันที่" : "Date"}</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {completedJobs.length > 0 ? completedJobs.map((h) => (
              <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                <td className="py-3 px-4 font-medium text-gray-900">{h.service}</td>
                <td className="py-3 px-4 text-gray-600">#{h.customerId || 'Customer'}</td>
                <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{h.tier || 'Standard'}</span></td>
                <td className="py-3 px-4 text-center font-bold text-green-700">{h.fee || '฿0'}</td>
                <td className="py-3 px-4 text-center text-gray-500">{fmtDate(h.updatedAt || Date.now())}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">No completed jobs yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== PARTNER CHAT ===== */

/* ===== PARTNER CHATS ===== */
function PartnerChats({ locale, chats }: { locale: string; chats: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chats"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {chats && chats.length > 0 && chats.map((c: any) => (
          <div key={c.id} className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition hover:bg-gray-50`} onClick={() => {
            try {
              if (c.po) {
                localStorage.setItem(`chat_from_${c.po}`, "fixers");
              }
            } catch {}
            window.location.href = `/${locale}/chat/${c.po || c.id}`;
          }}>
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">{String(c.name || "C").slice(-2)}</div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 truncate">{c.name}</p>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{c.service || c.po || "Chat"}</span>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{c.time || ""}</span>
              </div>
              <p className={`text-sm truncate text-gray-500`}>{c.lastMsg || (locale === "th" ? "คลิกเพื่อดูแชท" : "Click to open chat")}</p>
            </div>
          </div>
        ))}
        {(!chats || chats.length === 0) && <p className="text-sm text-gray-500 py-4 text-center">{locale === "th" ? "ไม่มีแชทล่าสุด" : locale === "zh" ? "没有最近的聊天" : "No recent incoming chats"}</p>}
      </div>
    </div>
  );
}

/* ===== PARTNER NOTIFICATIONS ===== */
function PartnerNotifications({ locale, notifications }: { locale: string; notifications: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "การแจ้งเตือนทั้งหมด" : locale === "zh" ? "所有通知" : "All Notifications"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {notifications.map((n) => (
          <div key={n.id} className={`flex items-center gap-4 px-6 py-4 transition ${n.unread ? "bg-purple-50/50" : "hover:bg-gray-50"}`}>
            <span className={`w-3 h-3 rounded-full ${n.dot} flex-shrink-0`} />
            <p className="text-sm text-gray-800 flex-1">{locale === "th" ? n.msgTh : locale === "zh" ? n.msgZh : n.msg}</p>
            <span className="text-xs text-gray-400 whitespace-nowrap">{n.time}</span>
            {n.unread && <span className="w-2 h-2 bg-purple-500 rounded-full" />}
          </div>
        ))}
      </div>
    </div>
  );
}


/* ===== PARTNER PROFILE ===== */
function PartnerProfile({ locale, prefix, partner }: { locale: string; prefix: string; partner: PartnerInfo | null }) {
  const router = useRouter();
  if (!partner) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
        <div className="text-5xl mb-4"></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{locale === "th" ? "เข้าสู่ระบบเพื่อดูโปรไฟล์" : locale === "zh" ? "登录查看个人资料" : "Log in to view profile"}</h2>
        <p className="text-sm text-gray-500 mb-6">{locale === "th" ? "เข้าสู่ระบบเพื่อจัดการข้อมูลและการตั้งค่า" : locale === "zh" ? "登录管理您的合作伙伴账户" : "Sign in to manage your partner account"}</p>
        <Link href={`subscription/login?redirect=/fixers`} className="px-6 py-2.5 bg-sky-600 text-white rounded-lg font-bold hover:bg-sky-700 transition inline-block">
          {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Log In"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-50 flex items-center justify-center shadow-inner flex-shrink-0 relative">
            <span className="text-5xl"></span>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow">
              <span className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-full text-xs font-bold">✓</span>
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{partner.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">{partner.tier || 'Specialist Tier'}</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><span className="text-green-500">✓</span> {locale === "th" ? "ยืนยันตัวตนแล้ว (KYC)" : "Verified (KYC)"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`fixers/register?edit=1`} className="px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-semibold shadow-sm">
                  {locale === "th" ? "แก้ไขโปรไฟล์" : locale === "zh" ? "编辑资料" : "Edit Profile"}
                </Link>
                <button onClick={() => {
                  if (confirm(locale === "th" ? "ยืนยันการลบบัญชีและข้อมูลทั้งหมดตามกฎหมาย PDPA?" : "Confirm deleting your account and all data per PDPA law?")) {
                    fetch('/api/v1/users/me', { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('subscriber_token')}` } })
                    .then(() => { localStorage.clear(); window.location.href = '/subscription/login'; });
                  }
                }} className="px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-semibold shadow-sm">
                  {locale === "th" ? "ลบบัญชี" : locale === "zh" ? "删除账户" : "Delete Account"}
                </button>
              </div>
            </div>
            
            {/* Contact Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-100">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">{locale === "th" ? "อีเมล" : "Email"}</h3>
                <p className="text-sm font-medium text-gray-900">{partner.email}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">{locale === "th" ? "เบอร์โทรศัพท์" : "Phone"}</h3>
                <p className="text-sm font-medium text-gray-900">{partner.phone || "-"}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">{locale === "th" ? "บริษัท/นิติบุคคล" : "Company"}</h3>
                <p className="text-sm font-medium text-gray-900">{partner.company || "-"}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">{locale === "th" ? "วันที่สมัคร" : "Member Since"}</h3>
                <p className="text-sm font-medium text-gray-900">{fmtDate(partner.createdAt || Date.now())}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assessment & Upgrade Path */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-sky-50 px-6 py-4 border-b border-sky-100 flex items-center justify-between">
          <h3 className="font-bold text-sky-900 flex items-center gap-2">
            <span className="text-xl"></span> CBLUE AI Tier Assessment
          </h3>
          <span className="text-sm text-sky-700 font-semibold bg-white px-3 py-1 rounded-full shadow-sm">Overall Score: {partner.tierScore || 69}/100</span>
        </div>
        
        <div className="p-6">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-2xl flex items-start gap-4 mb-6">
            <div className="text-2xl"></div>
            <div>
              <p className="text-green-800 font-bold">Fully Verified by CBLUE AI</p>
              <p className="text-green-600 text-sm">Your information and KYC documents have been instantly verified by CBLUE AI. Your profile is active and ready to accept bookings.</p>
            </div>
          </div>

          <h4 className="font-bold text-gray-800 mb-4">Evaluation Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {(Array.isArray(partner.breakdown) && partner.breakdown.length > 0 ? partner.breakdown : [
              { label: "Experience", score: 25, max: 25 },
              { label: "Skills Breadth", score: 12, max: 15 },
              { label: "KYC Verification", score: 15, max: 15 },
              { label: "Portfolio & Evidence", score: 0, max: 15 },
              { label: "Profile Completeness", score: 7, max: 10 },
              { label: "Price List", score: 6, max: 10 },
              { label: "Credential Verification", score: 4, max: 10 }
            ]).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-700 font-medium text-sm">{item.label}</span>
                <span className={`font-bold ${item.score === item.max ? 'text-green-600' : item.score === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                  {item.score}/{item.max}
                </span>
              </div>
            ))}
          </div>

          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><span className="text-lg"></span> AI Verification Results</h4>
          <ul className="space-y-3 mb-8 bg-gray-50 p-5 rounded-xl border border-gray-100">
            {(Array.isArray(partner.flags) && partner.flags.length > 0 ? partner.flags : [
              { type: "fail", message: "No company info provided" },
              { type: "pass", message: "Experience consistent with project type" },
              { type: "fail", message: "No work description provided" },
              { type: "pass", message: "KYC documents complete (front & back)" }
            ]).map((flag: any, i: number) => (
              <li key={i} className="flex gap-3">
                <span className={`font-bold ${flag.type === "pass" ? "text-green-500" : flag.type === "fail" ? "text-red-500" : "text-amber-500"}`}>
                  {flag.type === "pass" ? "✓" : flag.type === "fail" ? "✕" : "⚠"}
                </span>
                <span className="text-gray-700 text-sm">{flag.message}</span>
              </li>
            ))}
          </ul>

          <div className="bg-sky-50 rounded-xl p-5 border border-sky-100 space-y-4">
            <div className="flex gap-3">
              <span className="text-sky-600 text-xl mt-0.5"></span>
              <div>
                <p className="font-bold text-sky-900 mb-1">How to upgrade</p>
                <p className="text-sky-800 text-sm leading-relaxed">Gain more experience, upload portfolio work, update certifications, and maintain good reviews — CBLUE AI will automatically re-evaluate and upgrade your tier when you edit your profile or accumulate work history.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-sky-600 text-xl mt-0.5"></span>
              <div>
                <p className="font-bold text-sky-900 mb-1">Security</p>
                <p className="text-sky-800 text-sm leading-relaxed">Your data is encrypted and protected under PDPA. Credentials are verified to maintain platform integrity.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




/* ===== PARTNER PROPERTIES ===== */
function PartnerProperties({ locale, prefix, properties }: { locale: string; prefix: string; properties: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "อสังหาริมทรัพย์ของคุณ" : locale === "zh" ? "您的房产" : "Your Properties"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {properties && properties.length > 0 ? properties.map((p: any) => (
          <div key={p.id} className="p-6 hover:bg-gray-50/50 transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-teal-100 flex items-center justify-center text-3xl"></div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{locale === "th" ? p.serviceTh : locale === "zh" ? p.serviceZh : p.service}</h3>
                    <p className="text-sm text-gray-500 mt-1">{p.location || "-"} &middot; {p.fee}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${p.status === 'AVAILABLE' || p.status === 'CREATED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm mt-4 pt-4 border-t border-gray-100">
              <Link href={`properties/${p.id}/edit`} className="ml-auto px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition">
                {locale === "th" ? "แก้ไข" : locale === "zh" ? "编辑" : "Edit"}
              </Link>
            </div>
          </div>
        )) : (
          <p className="text-sm text-gray-500 p-6 text-center">{locale === "th" ? "ไม่มีประกาศอสังหาริมทรัพย์" : locale === "zh" ? "没有房产列表" : "No properties listed"}</p>
        )}
      </div>
    </div>
  );
}



/* ===== DASHBOARD LOGGED IN STATE ===== */
function PartnerDashboard({ locale, partner, prefix, onLogout, orders }: { locale: string; partner: any; prefix: string; onLogout: () => void, orders?: any[] }) {
  const activeOrders = orders ? orders.filter((o: any) => o.status === 'IN_PROGRESS' || o.status === 'CONFIRMED') : [];
  const requestOrders = orders ? orders.filter((o: any) => o.status === 'PENDING' || o.status === 'CREATED') : [];

  const [activeTab, setActiveTab] = useState<"overview"|"profile"|"active"|"properties"|"history"|"chat"|"notifications">("active");
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pb-12 -mt-6">
      
      {/* Top Navigation Pills */}
      
      <div className="flex gap-2 bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 overflow-x-auto no-scrollbar">
        {[
          { key: "overview", icon: "", label: "Overview", count: null },
          { key: "requests", label: locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "Requests", icon: "📋", badge: 4 },
        { key: "active", icon: "", label: "Active Jobs", count: 3 },
          
          { key: "properties", icon: "", label: "Properties", count: null },
          { key: "history", icon: "", label: "History", count: null },
          { key: "chat", icon: "", label: "Chat", count: 3 },
          { key: "alerts", icon: "", label: "Alerts", count: 3 },
          { key: "profile", icon: "", label: "Profile", count: null },
        ].map((tab, i) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeTab === tab.key ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
            <span>{tab.icon}</span> {tab.label}
            {tab.count && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.key ? 'bg-white/30 text-white' : 'bg-red-100 text-red-700'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === "profile" && <PartnerProfile locale={locale} prefix={prefix} partner={partner} />}
   {activeTab === "active" && <PartnerJobs locale={locale} activeJobs={[...activeOrders, ...(orders || [])]} />}
   
  
      
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${activeTab !== 'overview' ? 'hidden' : ''}`}>


      
        
        {/* LEFT COLUMN: Profile & Stats */}
        <div className="space-y-6">
          
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-0 opacity-50"></div>
            <div className="relative z-10 flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-2xl font-bold shadow-inner">
                {partner.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{partner.name}</h2>
                <p className="text-sm text-gray-500">{partner.email} &middot; {partner.phone || "0819852846"}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded">Active</span>
                  <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded">{partner.tier || "Standard Tier"}</span>
                  <span className="text-xs bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded">KYC ✓</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Active Jobs</p>
                <p className="text-lg font-bold text-gray-900">3</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Completed</p>
                <p className="text-lg font-bold text-gray-900">47</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Rating</p>
                <p className="text-lg font-bold text-gray-900 text-amber-500">4.8 </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Response</p>
                <p className="text-lg font-bold text-green-600">96%</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Repeat Clients</p>
                <p className="text-lg font-bold text-gray-900">12</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Monthly Earn</p>
                <p className="text-lg font-bold text-sky-600">฿26,500</p>
              </div>
            </div>
            <button onClick={onLogout} className="w-full py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-bold rounded-lg transition">
              {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出登录" : "Logout"}
            </button>
          </div>

          {/* Monthly Earnings Chart (Simplified UI) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">Monthly Earnings</h3>
              <span className="text-sky-600 font-bold text-sm">฿26,500 (May 26)</span>
            </div>
            <div className="p-5 flex items-end justify-between h-32">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-200 rounded-t-sm h-12 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿12.5k</span></div>
                <span className="text-xs font-bold text-gray-500">Jan</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-300 rounded-t-sm h-16 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿15.2k</span></div>
                <span className="text-xs font-bold text-gray-500">Feb</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-400 rounded-t-sm h-20 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿18.8k</span></div>
                <span className="text-xs font-bold text-gray-500">Mar</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-500 rounded-t-sm h-16 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿18.5k</span></div>
                <span className="text-xs font-bold text-gray-900">Apr</span>
              </div>
            </div>
          </div>


        </div>

        {/* RIGHT COLUMN: Jobs & Requests */}
        <div className="lg:col-span-2 space-y-6">
          
                    {/* Active Jobs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"> Active Jobs</h2>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{activeOrders.length}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {activeOrders.slice(0, 3).map((o: any, i: number) => (
                <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shadow-sm"></div>
                    <div>
                      <h3 className="font-bold text-gray-900">{o.service}</h3>
                      <p className="text-sm text-gray-500 mt-1">{o.user?.name || "Customer"} &middot; {fmtDate(o.createdAt)} &middot; Budget: ฿{o.estimatedPrice || "0"} &middot; {o.po || `PO-2605-${o.id?.slice(0, 4)}`} | {o.user?.subdistrict || "Saphansong"}</p><div className="mt-2 w-full">
<div className="flex justify-between text-[10px] text-gray-500 mb-1 px-1">
  <span className={['PENDING',''].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Notify</span>
  <span className={['CONFIRMED'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Accept</span>
  <span className={['ACCEPTED'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Fee & Proceed</span>
  <span className={['IN_PROGRESS'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Chat</span>
  <span className={['MEETING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Meet</span>
  <span className={['VARIATION'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Variation</span>
  <span className={['WORKING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Complete</span>
  <span className={['RATING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Rate</span>
</div>
<div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: (o.status === 'COMPLETED' ? '100%' : o.status === 'RATING' ? '88%' : o.status === 'WORKING' ? '77%' : o.status === 'VARIATION' ? '66%' : o.status === 'MEETING' ? '55%' : o.status === 'IN_PROGRESS' ? '44%' : o.status === 'ACCEPTED' ? '33%' : o.status === 'CONFIRMED' ? '22%' : '11%') }} /></div>
</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{o.status}</span>
                    <span className="font-bold text-gray-900 mt-1">฿{o.finalPrice || o.estimatedPrice || 0}</span>
                  </div>
                </div>
              ))}
              {activeOrders.length === 0 && <div className="p-8 text-center text-gray-500">No active jobs.</div>}
            </div>
          </div>

          {/* Recent Chats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">Recent Chats</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { id: "A2X", svc: "Plumbing", msg: "Thank you, waiting for you", time: "2m ago", unread: 2 },
                { id: "B7K", svc: "AC", msg: "Which day works for you?", time: "30m ago", unread: 1 },
                { id: "C4M", svc: "Electrical", msg: "Job is done, thanks!", time: "2h ago", unread: 0 },
              ].map(c => (
                <div key={c.id} className={`p-4 flex items-center gap-4 cursor-pointer transition ${c.unread ? 'bg-purple-50/30 hover:bg-purple-50' : 'hover:bg-gray-50'}`}>
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                    {c.id}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className="font-bold text-gray-900 text-sm">Customer #{c.id} <span className="text-gray-400 font-normal">&middot; {c.svc}</span></p>
                      <span className="text-xs text-gray-400">{c.time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm ${c.unread ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{c.msg}</p>
                      {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">{c.unread}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}



function PartnerActiveJobs({ locale, prefix, orders }: { locale: string; prefix: string; orders: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 flex items-center gap-2"> Active Jobs</h2>
        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{orders.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {orders.map((o: any, i: number) => (
          <div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shadow-sm"></div>
              <div>
                <h3 className="font-bold text-gray-900">{o.service} <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">{o.tier || 'Standard'}</span></h3>
                <p className="text-sm text-gray-500 mt-1">{o.user?.name || "Customer"} &middot; {fmtDate(o.createdAt)} &middot; Budget: ฿{o.estimatedPrice || "0"} &middot; {o.po || `PO-2605-${o.id?.slice(0, 4)}`} | {o.user?.subdistrict || "Saphansong"}</p><div className="mt-2 w-full">
<div className="flex justify-between text-[10px] text-gray-500 mb-1 px-1">
  <span className={['PENDING',''].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Notify</span>
  <span className={['CONFIRMED'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Accept</span>
  <span className={['ACCEPTED'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Fee & Proceed</span>
  <span className={['IN_PROGRESS'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Chat</span>
  <span className={['MEETING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Meet</span>
  <span className={['VARIATION'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Variation</span>
  <span className={['WORKING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Complete</span>
  <span className={['RATING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Rate</span>
</div>
<div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: (o.status === 'COMPLETED' ? '100%' : o.status === 'RATING' ? '88%' : o.status === 'WORKING' ? '77%' : o.status === 'VARIATION' ? '66%' : o.status === 'MEETING' ? '55%' : o.status === 'IN_PROGRESS' ? '44%' : o.status === 'ACCEPTED' ? '33%' : o.status === 'CONFIRMED' ? '22%' : '11%') }} /></div>
</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{o.status}</span>
              <span className="font-bold text-gray-900 mt-1">฿{o.finalPrice || o.estimatedPrice || 0}</span>
              <Link href={`chat/${o.id}`} className="text-gray-400 hover:text-sky-600 transition mt-2"><span className="text-xl">Chat</span></Link>
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="p-8 text-center text-gray-500">No active jobs.</div>}
      </div>
    </div>
  );
}

function PartnerIncomingRequests({ locale, prefix, orders }: { locale: string; prefix: string; orders: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">Incoming Requests</h2>
        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">{orders.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {orders.map((o: any, i: number) => (
          <div key={i} className="p-6 flex items-center justify-between hover:bg-amber-50/30 transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl shadow-sm"></div>
              <div>
                <h3 className="font-bold text-gray-900">{o.service} <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">{o.tier || 'Standard'}</span></h3>
                <p className="text-sm text-gray-500 mt-1">Customer #{o.id.slice(-4)} &middot; {fmtDate(o.createdAt)} &middot; Est: ฿{o.estimatedPrice || 0}</p>
                <p className="text-xs text-gray-400 mt-1">Status: {o.status}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-6 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition shadow-sm">Accept</button>
              <button className="px-6 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200 transition">Decline</button>
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="p-8 text-center text-gray-500">No incoming requests right now.</div>}
      </div>
    </div>
  );
}

