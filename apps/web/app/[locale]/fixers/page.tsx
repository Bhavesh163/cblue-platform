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
const PO_CODE_PATTERN = /PO-(?:\d{8}|\d{4}-\d{4,})/i;
const PO_CODE_EXACT_PATTERN = /^PO-(?:\d{8}|\d{4}-\d{4,})$/i;
const isPoCode = (value: string) => PO_CODE_EXACT_PATTERN.test(String(value || "").trim());
const extractPoCode = (value: any) => {
  if (!value) return "";
  const direct = String(value?.po || "").trim();
  if (direct && isPoCode(direct)) return direct;
  const desc = String(value?.description || value?.desc || "");
  return desc.match(PO_CODE_PATTERN)?.[0] || "";
};
const parseMeetingInviteDetails = (value: string) => {
  const text = String(value || "");
  const match = text.match(/customer sent meeting invitation(?: for (PO-(?:\d{8}|\d{4}-\d{4,})))?:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+at\s+(.+?)(?:\.|$)/i);
  return {
    po: match?.[1] || "",
    meetingDateLabel: match?.[2] || "",
    meetingTimeLabel: match?.[3] || "",
    meetingVenue: String(match?.[4] || "").trim(),
  };
};
const getWorkflowStepFromStatus = (status?: string) => {
  switch (String(status || '').toUpperCase()) {
    case 'ASSIGNED':
    case 'DEPOSIT_PENDING':
    case 'CONFIRMED':
      return 6;
    case 'IN_PROGRESS':
      return 7;
    case 'MEETING_REQUESTED':
      return 8;
    case 'COMPLETED':
      return 11;
    default:
      return 5;
  }
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
const stripWorkflowPrefix = (value: any) => String(value || '').replace(/^PO-[\w-]+\s*\|\s*(TIER:[a-zA-Z]+\s*\|\s*)?/i, '').trim();
const ORDER_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isOrderUuid = (value: any) => ORDER_UUID_PATTERN.test(String(value || '').trim());
const firstNameOnly = (value: any, fallback = 'User') => {
  const cleaned = String(value || '').trim();
  return cleaned ? cleaned.split(/\s+/)[0] || fallback : fallback;
};
const HIDDEN_TEST_POS = new Set(["PO-2605-6716", "PO-2605-9605", "PO-2605-8699"]);
const isHiddenTestPo = (value: any) => HIDDEN_TEST_POS.has(String(value || '').trim().toUpperCase());
const filterVisibleWorkflowItems = (items: any[]) => items.filter((item: any) => !isHiddenTestPo(item?.po));
const WORKFLOW_STEP_NAMES: Record<number, string> = {
  5: 'Accept',
  6: 'Fee & Proceed',
  7: 'Chat',
  8: 'Meet',
  9: 'Variation',
  10: 'Complete',
  11: 'Rate',
};
const getWorkflowStepName = (step?: number) => WORKFLOW_STEP_NAMES[Number(step || 0)] || 'Rate';
const toCurrencyLabel = (value: any, fallback = '฿0') => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return raw.startsWith('฿') ? raw : `฿${raw.replace(/^฿/, '')}`;
};
const getLocalChatHistory = (po: any) => {
  if (typeof window === 'undefined' || !po) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(`chat_messages_${po}`) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((message: any) => ({
        id: message?.id || `${po}-${message?.createdAt || message?.time || Math.random()}`,
        sender: String(message?.sender || 'system'),
        text: String(message?.text || '').trim(),
        time: String(message?.time || ''),
      }))
      .filter((message: any) => message.text);
  } catch {
    return [];
  }
};

function WorkflowModalMeta({
  step,
  typeOfWork,
  actionText,
  po,
  counterpartLabel,
  counterpartName,
  budget,
  location,
  projectDetails,
}: {
  step: number;
  typeOfWork: string;
  actionText: string;
  po: string;
  counterpartLabel: string;
  counterpartName: string;
  budget: string;
  location: string;
  projectDetails: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-2 text-sm text-gray-800">
      <div className="flex justify-between gap-3"><span className="text-gray-500">Step Name</span><span className="font-bold text-right">{getWorkflowStepName(step)}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">Type of Work</span><span className="font-bold text-right">{typeOfWork}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">What You Need To Do</span><span className="font-bold text-right max-w-[65%]">{actionText}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">PO Number</span><span className="font-mono font-bold text-right">{po}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">{counterpartLabel}</span><span className="font-bold text-right">{counterpartName}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">Budget</span><span className="font-bold text-right">{budget}</span></div>
      <div className="flex justify-between gap-3"><span className="text-gray-500">Project Location</span><span className="font-bold text-right">{location || 'Unknown'}</span></div>
      <div>
        <span className="text-gray-500">Project Details</span>
        <p className="mt-1 rounded-lg border border-gray-100 bg-white px-3 py-2 font-bold text-gray-800">{projectDetails || 'Project details from the draft PO.'}</p>
      </div>
    </div>
  );
}

function WorkflowHistoryCard({ item, compact = false }: { item: any; compact?: boolean }) {
  const [collapsed, setCollapsed] = React.useState(true);
  const chatPreview = collapsed ? [] : (Array.isArray(item.chatHistory) ? item.chatHistory.slice(compact ? -2 : -4) : []);
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm hover:bg-gray-50/60 transition cursor-pointer" onClick={() => setCollapsed(c => !c)}>
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900">{item.service} <span className="text-sm font-normal text-gray-400">· {item.po} · {item.counterpartName || item.customer || 'Customer'}</span></h3>
            <p className="text-sm text-gray-500 mt-1">Completed {fmtDateTime(item.completedAt || item.statusChangedAt || item.createdAt || item.date || Date.now())}</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1 flex-shrink-0">
            <span className="font-bold text-gray-900">{item.fee || item.budget || '฿0'}</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">Step 11 of 11 · {item.stepName || getWorkflowStepName(item.step)}</span>
            <span className="text-xs text-sky-600 font-semibold">{collapsed ? '▼ Show details' : '▲ Hide details'}</span>
          </div>
        </div>
        {!collapsed && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm text-gray-700">
              <div><span className="text-gray-500">Project Location:</span> {item.location || item.subdistrict || 'Unknown'}</div>
              <div><span className="text-gray-500">Tier:</span> {item.tier || 'Standard'}</div>
              <div className="sm:col-span-2"><span className="text-gray-500">Project Details:</span> {item.projectDetails || item.description || 'Project details not available.'}</div>
            </div>
            {chatPreview.length > 0 && (
              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Chat History</p>
                <div className="space-y-2">
                  {chatPreview.map((message: any) => (
                    <div key={message.id} className="text-sm text-gray-700">
                      <span className="font-semibold capitalize text-gray-900">{message.sender}</span>
                      {message.time ? <span className="text-xs text-gray-400"> · {message.time}</span> : null}
                      <p className="mt-0.5">{message.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, Record<string, string>> = {
  IN_PROGRESS: { en: "In Progress", th: "กำลังดำเนินการ", zh: "进行中" },
  CONFIRMED: { en: "Confirmed", th: "ยืนยันแล้ว", zh: "已确认" },
  PENDING: { en: "Pending", th: "รอดำเนินการ", zh: "待处理" },
  COMPLETED: { en: "Completed", th: "เสร็จสิ้น", zh: "已完成" },
  ASSIGNED: { en: "", th: "", zh: "" },
  ACCEPTED: { en: "", th: "", zh: "" },
  MATCHING: { en: "PO Pending", th: "รอตรวจสอบ PO", zh: "待审PO" },
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
  const [waitModalAttachmentUrls, setWaitModalAttachmentUrls] = useState<string[]>([]);
  const handleJobClick = (job: any) => {
    const workflowType = String(job?.workflowType || job?.type || '').toLowerCase();
    const jobStatus = String(job?.status || '').toUpperCase();
    if (workflowType === 'meeting_confirm_partner' || ['MATCHING', 'CREATED', 'MEETING_REQUESTED'].includes(jobStatus)) {
      setWaitModalOrder(job);
    } else {
      const poFromDesc = extractPoCode(job);
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

  useEffect(() => {
    let isMounted = true;

    const resolveWaitModalAttachments = async () => {
      if (!waitModalOrder) {
        if (isMounted) setWaitModalAttachmentUrls([]);
        return;
      }

      const directUrls = [
        waitModalOrder?.issueImage,
        waitModalOrder?.image,
        waitModalOrder?.fileUrl,
        ...(Array.isArray(waitModalOrder?.projectImages) ? waitModalOrder.projectImages : []),
        ...(Array.isArray(waitModalOrder?.images) ? waitModalOrder.images : []),
        ...(Array.isArray(waitModalOrder?.metadata?.images) ? waitModalOrder.metadata.images : []),
        waitModalOrder?.metadata?.issueImageUrl,
        waitModalOrder?.metadata?.issueImage,
      ].filter(Boolean);

      const poFromDesc = extractPoCode(waitModalOrder);
      const poKey = waitModalOrder?.po || poFromDesc;
      const attachmentOrderId = waitModalOrder?.orderId || (poKey ? localStorage.getItem(`po_to_order_${poKey}`) : '') || waitModalOrder?.id;

      try {
        const poMap = JSON.parse(localStorage.getItem('cblue_po_attachments') || '{}');
        const orderMap = JSON.parse(localStorage.getItem('cblue_order_attachments') || '{}');
        if (poKey && Array.isArray(poMap[poKey])) {
          directUrls.push(...poMap[poKey]);
        }
        if (attachmentOrderId && Array.isArray(orderMap[attachmentOrderId])) {
          directUrls.push(...orderMap[attachmentOrderId]);
        }
      } catch {}

      const uniqueDirectUrls = Array.from(new Set(directUrls.filter(Boolean)));
      if (uniqueDirectUrls.length > 0) {
        if (isMounted) setWaitModalAttachmentUrls(uniqueDirectUrls);
        return;
      }

      if (!attachmentOrderId) {
        if (isMounted) setWaitModalAttachmentUrls([]);
        return;
      }

      try {
        const token = localStorage.getItem('subscriber_token') || '';
        if (!token) {
          if (isMounted) setWaitModalAttachmentUrls([]);
          return;
        }

        const res = await fetch(`/api/v1/orders/${attachmentOrderId}/attachments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (isMounted) setWaitModalAttachmentUrls([]);
          return;
        }

        const attachments = await res.json();
        const backendUrls = Array.isArray(attachments)
          ? attachments.map((attachment: any) => attachment?.url).filter(Boolean)
          : [];
        if (isMounted) setWaitModalAttachmentUrls(Array.from(new Set(backendUrls)));
      } catch {
        if (isMounted) setWaitModalAttachmentUrls([]);
      }
    };

    void resolveWaitModalAttachments();

    return () => {
      isMounted = false;
    };
  }, [waitModalOrder]);



  const [isFixer, setIsFixer] = useState(false);

  
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("subscriber_token");
      if (!token) {
        setPartner(null);
        setIsFixer(false);
        setOrders([]);
        setMyProperties([]);
        setChatFeed([]);
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

  useEffect(() => {
    let isMounted = true;

    const syncPartnerData = async () => {
      try {
        const token = localStorage.getItem("subscriber_token");
        if (!token) return;

        const [ordersRes, propRes] = await Promise.all([
          fetch("/api/v1/orders/fixer", {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
          fetch("/api/v1/properties/my", {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
        ]);

        if (ordersRes && ordersRes.ok && isMounted) {
          setOrders(await ordersRes.json());
        }
        if (propRes && propRes.ok && isMounted) {
          setMyProperties(await propRes.json());
        }
      } catch {
        // Preserve last visible partner data during transient polling failures.
      }
    };

    void syncPartnerData();
    const timer = setInterval(() => {
      void syncPartnerData();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [partner?.id]);

  const isSubscribed = !!partner;


  
  const mappedOrders = orders.map(o => {
    const desc = o.description || "";
    let extractedPo = extractPoCode(o);
    if (!extractedPo) {
      const created = new Date(o.createdAt || Date.now());
      const yy = String(created.getFullYear()).slice(-2);
      const mm = String(created.getMonth() + 1).padStart(2, '0');
      const numericSeed = String(o.id || '').replace(/\D/g, '').slice(0, 4) || String(created.getTime()).slice(-4);
      extractedPo = `PO-${yy}${mm}-${numericSeed.padStart(4, '0')}`;
    }
    if (isHiddenTestPo(extractedPo)) return null;
    const attachmentUrls = Array.isArray(o.images)
      ? o.images
          .map((image: any) => (typeof image === 'string' ? image : image?.url || ''))
          .filter(Boolean)
      : [];
    
    return {
      id: o.id,
      po: extractedPo,
      hasAttachment: attachmentUrls.length > 0,
      images: attachmentUrls,
      issueImage: attachmentUrls[0] || "",
      subdistrict: o.address?.subdistrict || o.address?.district || o.address?.province || o.subdistrict || "",
      createdAt: o.createdAt,
      customer: o.user?.name || "Customer",
      orderType: o.orderType?.toLowerCase() || "household",
      phone: o.user?.phone || "",
      service: (o.serviceCategory || "").replace(/_/g, " "),
      serviceTh: (o.serviceCategory || "").replace(/_/g, " "),
      serviceZh: (o.serviceCategory || "").replace(/_/g, " "),
      date: fmtDateTime(o.createdAt),
      description: desc,
      statusNote: o.statusHistory?.[0]?.note || "",
      statusChangedAt: o.statusHistory?.[0]?.createdAt || o.updatedAt || o.createdAt,
      tier: desc.includes('TIER:') ? desc.split('TIER:')[1].split(' |')[0] : "Standard",
      status: o.status,
      progress: o.status === 'COMPLETED' ? 100 : (['IN_PROGRESS', 'CONFIRMED', 'ACCEPTED'].includes(o.status) ? 40 : 15),
      fee: o.estimatedPrice ? `฿${o.estimatedPrice.toLocaleString()}` : "0", 
      budget: o.estimatedPrice ? o.estimatedPrice.toLocaleString() : "0"
    };
  }).filter(Boolean) as any[];

  
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
        if (!isPoCode(po)) {
          localStorage.removeItem(key);
          localStorage.removeItem(`chat_title_${po}`);
          localStorage.removeItem(`chat_from_${po}`);
          continue;
        }
        if (localStorage.getItem(`chat_closed_${po}`)) continue;
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

    // Use user entity ID (from subscriber) to correctly identify own messages
    let viewerUserId = "";
    try { viewerUserId = JSON.parse(localStorage.getItem("subscriber") || "{}")?.id || ""; } catch {}
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

        const po = extractPoCode(order);
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
  const [partnerDynReqs, setPartnerDynReqs] = useState<any[]>([]);
  const [mockHistory, setMockHistory] = useState<any[]>([]);
  useEffect(() => {
    const checkMock = () => {
      try {
        const d = localStorage.getItem("ghis_mock_dyn_req"); if (d) setMockDynReqs(filterVisibleWorkflowItems(JSON.parse(d)));
        const a = localStorage.getItem("ghis_mock_active"); if (a) setMockActiveState(filterVisibleWorkflowItems(JSON.parse(a)));
        const h = localStorage.getItem("ghis_mock_history"); if (h) setMockHistory(filterVisibleWorkflowItems(JSON.parse(h)));
        const p = localStorage.getItem("partner_mock_dyn_req");
        setPartnerDynReqs(
          p
            ? filterVisibleWorkflowItems(JSON.parse(p)).map((item: any) => ({
                ...item,
                workflowType:
                  item?.workflowType ||
                  (['variation_partner', 'complete_partner', 'rate_partner'].includes(item?.type) ? item.type : undefined),
              }))
            : [],
        );
      } catch {}
    };
    checkMock();
    window.addEventListener('storage', checkMock);
    const interval = setInterval(checkMock, 1000);
    return () => { clearInterval(interval); window.removeEventListener('storage', checkMock); };
  }, []);

  const completedHistoryPos = new Set(mockHistory.map((h: any) => h.po));
  let activeJobs = mappedOrders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status) && !completedHistoryPos.has(o.po));
  activeJobs = activeJobs.map(job => {
      const stepLookup = mockActiveState.find((x: any) => x.po === job.po);
      const backendStep = getWorkflowStepFromStatus(job.status);
      const partnerWorkflowStep = Math.max(0, ...partnerDynReqs.filter((x: any) => x.po === job.po).map((x: any) => Number(x.step || 0)));
      const step = Math.max(Number(stepLookup?.step || 0), backendStep, partnerWorkflowStep);
      // For partner view: actionNeeded = partner has a pending workflow request OR backend requires partner action
      const hasPartnerDynAction = partnerDynReqs.some((r: any) => r.po === job.po);
      const partnerActionNeeded = hasPartnerDynAction ||
        String(job.status || '').toUpperCase() === 'MEETING_REQUESTED' ||
        backendStep === 5;
      return { ...job, step, mockStep: step, actionNeeded: partnerActionNeeded };
  });
  const backendCompletedJobs = mappedOrders.filter(o => o.status === 'COMPLETED');
  // Merge localStorage history (same-browser simulation) with backend completed orders
  const backendCompletedPos = new Set(backendCompletedJobs.map((j: any) => j.po));
  const completedJobs = Array.from(
    [...backendCompletedJobs, ...mockHistory.filter((h: any) => h.po)].reduce((map: Map<string, any>, entry: any) => {
      const po = entry.po || entry.id;
      if (!po || isHiddenTestPo(po)) return map;
      const existing = map.get(po) || {};
      const service = entry.service || entry.title || existing.service || po;
      const customer = firstNameOnly(entry.customer || entry.customerName || entry.fixerAlias || existing.customer, 'Customer');
      const completedAt = entry.completedAt || entry.statusChangedAt || entry.updatedAt || entry.createdAt || entry.date || existing.completedAt || existing.statusChangedAt || existing.createdAt || Date.now();
      const description = stripWorkflowPrefix(entry.description || entry.desc || existing.description || existing.projectDetails || '');
      map.set(po, {
        ...existing,
        ...entry,
        id: existing.id || entry.id || po,
        po,
        service,
        serviceTh: entry.serviceTh || existing.serviceTh || service,
        serviceZh: entry.serviceZh || existing.serviceZh || service,
        customer,
        customerName: customer,
        counterpartName: customer,
        date: fmtDateTime(completedAt),
        createdAt: existing.createdAt || entry.createdAt || completedAt,
        completedAt,
        statusChangedAt: entry.statusChangedAt || existing.statusChangedAt || completedAt,
        budget: entry.budget || existing.budget || toCurrencyLabel(entry.fee || existing.fee),
        fee: toCurrencyLabel(entry.fee || entry.budget || existing.fee || existing.budget),
        tier: entry.tier || existing.tier || 'Standard',
        status: 'COMPLETED',
        step: 11,
        stepName: getWorkflowStepName(11),
        location: entry.location || entry.subdistrict || existing.location || existing.subdistrict || '',
        subdistrict: entry.subdistrict || entry.location || existing.subdistrict || existing.location || '',
        projectDetails: description,
        description: description || existing.description || '',
        chatHistory: getLocalChatHistory(po),
        partnerRating: entry.partnerRating ?? existing.partnerRating,
      });
      return map;
    }, new Map<string, any>()).values(),
  ).sort((a: any, b: any) => {
    const aTs = new Date(a.statusChangedAt || a.completedAt || a.createdAt || a.date || 0).getTime();
    const bTs = new Date(b.statusChangedAt || b.completedAt || b.createdAt || b.date || 0).getTime();
    return bTs - aTs;
  });
  const earningsSeries = (() => {
    const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const seedByMonth = Object.fromEntries(EARNINGS_MOCK.map((item) => {
      const [monthLabel = 'Jan', yearLabel = '26'] = item.month.split(' ');
      const monthNumber = enMonths.indexOf(monthLabel) + 1;
      return [
        `20${yearLabel}-${String(monthNumber > 0 ? monthNumber : 1).padStart(2, '0')}`,
        item.amount,
      ];
    }));
    const completedByMonth = new Map<string, number>();

    for (const job of (completedJobs as any[])) {
      const ts = new Date((job as any).statusChangedAt || (job as any).createdAt || (job as any).date || 0).getTime();
      if (!ts) continue;
      const dt = new Date(ts);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const amount = Number(String(job.budget || job.fee || '0').replace(/[^0-9.]/g, '')) || 0;
      completedByMonth.set(key, (completedByMonth.get(key) || 0) + amount);
    }

    const now = new Date();
    const items: any[] = [];
    for (let offset = 12; offset >= 0; offset -= 1) {
      const dt = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const monthIdx = dt.getMonth();
      const yy = String(dt.getFullYear()).slice(-2);
      items.push({
        month: `${enMonths[monthIdx]} ${yy}`,
        monthTh: `${thMonths[monthIdx]} ${yy}`,
        monthZh: `${monthIdx + 1}月 ${yy}`,
        amount: completedByMonth.size > 0 ? (completedByMonth.get(key) || 0) : (seedByMonth[key] || 0),
      });
    }
    return items;
  })();
  const stats = {
    activeJobs: activeJobs.length,
    completedJobs: completedJobs.length,
    monthlyEarnings: `฿${(earningsSeries[earningsSeries.length - 1]?.amount || 0).toLocaleString()}`,
    rating: 0,
    responseRate: '0%',
    repeatClients: 0,
  };
    const acceptedPos = new Set(mockActiveState.filter((x: any) => Number(x.step || 0) >= 6).map((x: any) => x.po));
    // MEETING_REQUESTED always shows for partner to confirm, regardless of mock step state
    let incomingJobs = mappedOrders.filter(o =>
      (['CREATED', 'PENDING', 'MATCHING'].includes(o.status) && !acceptedPos.has(o.po)) ||
      o.status === 'MEETING_REQUESTED'
    );

  const parseTs = (v: any) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const parsed = parseInt(v, 10);
      if (!isNaN(parsed)) return parsed;
      return new Date(v).getTime();
    }
    return 0;
  };

  const scheduledMeetings = mockDynReqs
    .filter((r: any) => !isHiddenTestPo(r.po))
    .filter((r: any) => r.type === 'meeting_scheduled')
    .sort((a: any, b: any) => parseTs(a.date) - parseTs(b.date));

  useEffect(() => {
    if (!chatFeed || chatFeed.length === 0) return;

    setPartnerDynReqs(prev => {
      let next = [...prev];
      let changed = false;

      const upsert = (item: any) => {
        const exists = next.some((x: any) => x.po === item.po && x.type === item.type);
        if (exists) return;
        next = [...next.filter((x: any) => !(x.po === item.po && x.type === item.type)), item];
        changed = true;
      };

      let histFromStorage: any[] = [];
      try { histFromStorage = filterVisibleWorkflowItems(JSON.parse(localStorage.getItem('ghis_mock_history') || '[]')); } catch {}

      for (const chat of chatFeed) {
        const po = chat.po;
        const lower = String(chat.lastMsg || "").toLowerCase();
        const order = mappedOrders.find((x: any) => x.po === po);
        const localActive = mockActiveState.find((x: any) => x.po === po);
        const historyEntry = mockHistory.find((x: any) => x.po === po) || histFromStorage.find((x: any) => x.po === po);
        const variationAlreadySubmitted = Number(localActive?.step || 0) >= 9 && localActive?.actionNeeded === false;
        const completeAlreadySubmitted = Number(localActive?.step || 0) >= 10 && localActive?.actionNeeded === false;
        const partnerAlreadyRated = Boolean(historyEntry?.partnerRating);
        if (!po || !order) continue;
        // Skip ALL reconstruction for completed jobs - prevents step 8 from reappearing after partner rates
        if (historyEntry) continue;

        if (lower.includes('customer sent meeting invitation')) {
          const inviteDetails = parseMeetingInviteDetails(String(chat.lastMsg || order.statusNote || ''));
          const createdAt = Number(chat.sort || 0) || Date.now();
          upsert({
            id: `meeting-confirm-${po}`,
            orderId: order.id,
            po,
            service: order.service,
            serviceTh: order.serviceTh,
            serviceZh: order.serviceZh,
            customer: order.customer,
            date: chat.time || fmtDateTime(createdAt),
            createdAt,
            fee: order.fee,
            budget: order.budget,
            tier: order.tier,
            description: 'Customer sent a site meeting invitation. Please review and confirm the meeting time.',
            projectDetails: String(order.description || '').replace(/^PO-[\w-]+\s*\|\s*(TIER:[a-zA-Z]+\s*\|\s*)?/, '').trim(),
            meetingMessage: String(chat.lastMsg || ''),
            meetingDateLabel: inviteDetails.meetingDateLabel,
            meetingTimeLabel: inviteDetails.meetingTimeLabel,
            meetingVenue: inviteDetails.meetingVenue || order.subdistrict || '',
            subdistrict: order.subdistrict || '',
            type: 'meeting_confirm_partner',
            workflowType: 'meeting_confirm_partner',
            status: 'MEETING_REQUESTED',
            step: 8,
          });
        }

        if (lower.includes('partner confirmed site meeting') || lower.includes('meeting confirmed by partner')) {
          next = next.filter((x: any) => !(x.po === po && (x.workflowType === 'meeting_confirm_partner' || x.type === 'meeting_confirm_partner')));
          try {
            const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
            const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 9, mockStep: 9, actionNeeded: true } : x);
            localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
          } catch {}
          if (!variationAlreadySubmitted && !partnerAlreadyRated) {
            upsert({
              id: `variation-${po}`,
              orderId: order.id,
              po,
              service: order.service,
              serviceTh: order.serviceTh,
              serviceZh: order.serviceZh,
              customer: order.customer,
              date: fmtDateTime(Date.now()),
              createdAt: Date.now(),
              fee: order.fee,
              budget: order.budget,
              tier: order.tier,
              description: 'Proceed to submit variation request if extra work or price adjustment is required.',
              type: 'variation_partner',
              workflowType: 'variation_partner',
              step: 9,
            });
          }
        }
        if (lower.includes('customer approved variation')) {
          try {
            const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
            const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 10, mockStep: 10, actionNeeded: true } : x);
            localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
          } catch {}
          next = next.filter((x: any) => !(x.po === po && (x.type === 'variation_partner' || x.type === 'meeting_confirm_partner' || x.workflowType === 'meeting_confirm_partner')));
          if (!completeAlreadySubmitted && !partnerAlreadyRated) {
            upsert({
              id: `complete-${po}`,
              orderId: order.id,
              po,
              service: order.service,
              serviceTh: order.serviceTh,
              serviceZh: order.serviceZh,
              customer: order.customer,
              date: fmtDateTime(Date.now()),
              createdAt: Date.now(),
              fee: order.fee,
              budget: order.budget,
              tier: order.tier,
              description: 'Customer approved the variation. Please submit project complete for confirmation.',
              type: 'complete_partner',
              workflowType: 'complete_partner',
              step: 10,
            });
          }
        }
        if (lower.includes('customer confirmed job complete')) {
          try {
            const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
            const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 11, mockStep: 11, actionNeeded: true } : x);
            localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
          } catch {}
          next = next.filter((x: any) => !(x.po === po && (x.type === 'complete_partner' || x.type === 'variation_partner' || x.type === 'meeting_confirm_partner' || x.workflowType === 'meeting_confirm_partner')));
          if (!partnerAlreadyRated) {
            upsert({
              id: `rate-${po}`,
              orderId: order.id,
              po,
              service: order.service,
              serviceTh: order.serviceTh,
              serviceZh: order.serviceZh,
              customer: order.customer,
              date: fmtDateTime(Date.now()),
              createdAt: Date.now(),
              fee: order.fee,
              budget: order.budget,
              tier: order.tier,
              description: 'Customer confirmed completion. Please rate the customer to close this job.',
              type: 'rate_partner',
              workflowType: 'rate_partner',
              step: 11,
            });
          }
        }
      }

      if (!changed) return prev;
      try { localStorage.setItem("partner_mock_dyn_req", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [chatFeed, mappedOrders, mockActiveState, mockHistory]);

  const partnerRequestItems = Array.from([
    ...partnerDynReqs,
    ...incomingJobs.filter((job: any) => !(String(job.status || '').toUpperCase() === 'MEETING_REQUESTED' && partnerDynReqs.some((req: any) => req.po === job.po && req.workflowType === 'meeting_confirm_partner'))),
  ].reduce((map: Map<string, any>, item: any) => {
    const key = item.po || item.id;
    const current = map.get(key);
    if (!current) {
      map.set(key, item);
      return map;
    }
    const currentStep = Number(current.step || 0);
    const nextStep = Number(item.step || 0);
    const currentTs = parseTs(current.createdAt || current.date);
    const nextTs = parseTs(item.createdAt || item.date);
    if (nextStep > currentStep || (nextStep === currentStep && nextTs >= currentTs)) {
      map.set(key, item);
    }
    return map;
  }, new Map<string, any>()).values())
    .sort((a: any, b: any) => parseTs(b.createdAt || b.date) - parseTs(a.createdAt || a.date));

  const dynamicNotifications = mockDynReqs.map((r: any) => {
    const displayTime = typeof r.date === "string" && r.date.includes(":") ? r.date : (r.date ? fmtDateTime(r.date) : "");
    if (r.type === "meeting_pending_partner") return { id: `dyn-${r.id}`, msg: "Confirm meeting at site", unread: true, time: displayTime, dot: "bg-amber-500" };
    if (r.type === "meeting_scheduled") return { id: `dyn-${r.id}`, msg: "Confirm meeting at site", unread: true, time: displayTime, dot: "bg-teal-500" };
    if (r.type === "variation_pending") return { id: `dyn-${r.id}`, msg: "Request for Approval of Variation", unread: true, time: displayTime, dot: "bg-purple-500" };
    if (r.type === "complete_pending") return { id: `dyn-${r.id}`, msg: "Request for job complete", unread: true, time: displayTime, dot: "bg-green-500" };
    return null;
  }).filter(Boolean) as any[];

  const partnerWorkflowNotifications = partnerDynReqs.map((r: any) => {
    const displayTime = typeof r.date === "string" && r.date.includes(":") ? r.date : (r.date ? fmtDateTime(r.date) : "");
    if (r.workflowType === "meeting_confirm_partner" || r.type === "meeting_confirm_partner") return { id: `p-${r.id}`, msg: "Confirm meeting at site", unread: true, time: displayTime, dot: "bg-amber-500" };
    if (r.type === "variation_partner") return { id: `p-${r.id}`, msg: "Request for Approval of Variation", unread: true, time: displayTime, dot: "bg-purple-500" };
    if (r.type === "complete_partner") return { id: `p-${r.id}`, msg: "Request for job complete", unread: true, time: displayTime, dot: "bg-green-500" };
    if (r.type === "rate_partner") return { id: `p-${r.id}`, msg: "Rate customer to close job", unread: true, time: displayTime, dot: "bg-sky-500" };
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
    if (o.status === 'MEETING_REQUESTED') return [{ id: `order-meeting-${po}`, msg: `Confirm meeting at site for ${svc}`, unread: true, time: displayTime, dot: "bg-amber-500" }];
    if (o.status === 'IN_PROGRESS') return [{ id: `order-inprogress-${po}`, msg: `Chat room active for ${svc} — coordinate meeting`, unread: false, time: displayTime, dot: "bg-sky-400" }];
    return [];
  });

  const displayNotifications = [...orderAlerts, ...dynamicNotifications, ...partnerWorkflowNotifications]
    .sort((a: any, b: any) => parseTs(b.time) - parseTs(a.time));

  const tabs: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: "overview", label: locale === "th" ? "ภาพรวม" : locale === "zh" ? "概览" : "Overview", icon: "" },
    { key: "requests", label: locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "Requests", icon: "📋", badge: partnerRequestItems.length || undefined },
        { key: "active", label: locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "当前工作" : "Active Jobs", icon: "", badge: activeJobs.length || undefined },
    
    { key: "properties", label: locale === "th" ? "อสังหาริมทรัพย์" : locale === "zh" ? "房产" : "Properties", icon: "" },
    { key: "history", label: locale === "th" ? "ประวัติงาน" : locale === "zh" ? "历史" : "History", icon: "" },
    { key: "chat", label: locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat", icon: "", badge: 0 },
    { key: "notifications", label: locale === "th" ? "แจ้งเตือน" : locale === "zh" ? "通知" : "Alerts", icon: "", badge: 0 },
    { key: "profile", label: locale === "th" ? "โปรไฟล์" : locale === "zh" ? "个人资料" : "Profile", icon: "" },
  ];
  const isMeetingConfirmation = waitModalOrder
    ? String(waitModalOrder?.workflowType || waitModalOrder?.type || '').toLowerCase() === 'meeting_confirm_partner' || String(waitModalOrder?.status || '').toUpperCase() === 'MEETING_REQUESTED'
    : false;
  const parsedWaitModalMeeting = parseMeetingInviteDetails(String(waitModalOrder?.meetingMessage || waitModalOrder?.statusNote || waitModalOrder?.description || waitModalOrder?.desc || ''));
  const waitModalMeetingDetails = {
    meetingDateLabel: waitModalOrder?.meetingDateLabel || parsedWaitModalMeeting.meetingDateLabel,
    meetingTimeLabel: waitModalOrder?.meetingTimeLabel || parsedWaitModalMeeting.meetingTimeLabel,
    meetingVenue: waitModalOrder?.meetingVenue || parsedWaitModalMeeting.meetingVenue || waitModalOrder?.subdistrict || 'Unknown',
    meetingMessage: waitModalOrder?.meetingMessage || '',
  };
  const waitModalServiceName = waitModalOrder?.serviceTh || waitModalOrder?.service || 'Project';
  const waitModalCounterpart = firstNameOnly(waitModalOrder?.customer || waitModalOrder?.customerAlias, 'Customer');
  const waitModalBudgetDisplay = waitModalOrder?.fee || (waitModalOrder?.budget ? `฿${String(waitModalOrder.budget).replace(/^฿/, '')}` : `฿${waitModalOrder?.estimatedPrice || waitModalOrder?.finalPrice || '0'}`);
  const waitModalStepName = isMeetingConfirmation ? 'Meeting Confirmation' : 'PO Acceptance';
  const waitModalInstruction = isMeetingConfirmation
    ? 'Review the proposed site meeting time and confirm it for the customer.'
    : 'Review the draft PO, project details, budget basis, and uploaded files before accepting.';
  const waitModalProjectDetails = stripWorkflowPrefix(waitModalOrder?.projectDetails || waitModalOrder?.description || waitModalOrder?.service || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50/30">
      {/* PDPA Consent Modal */}

      {/* PO Accept/Decline Modal */}
      {waitModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[calc(100dvh-6rem)] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="mb-2 text-sm font-semibold text-purple-600 bg-purple-50 inline-block px-3 py-1 rounded-full">{isMeetingConfirmation ? 'Step 8 of 11' : 'Step 5 of 11'}</div>
              <button onClick={() => setWaitModalOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">{isMeetingConfirmation ? 'Confirm Site Meeting' : 'Review PO Details'}</h2>
            <p className="text-gray-500 mt-2">{isMeetingConfirmation ? `Customer sent a site meeting invitation for ${waitModalOrder.serviceTh || waitModalOrder.service}. Please review the proposed venue, date, and time before confirming.` : `Customer has placed a request for ${waitModalOrder.serviceTh || waitModalOrder.service}. Please review the PO details below and accept or decline.`}</p>
            
            <div className="w-full bg-gray-50 rounded-xl p-5 mt-6 space-y-3 text-sm text-left border border-gray-100 shadow-inner">
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">PO Number</span><span className="font-mono font-bold text-gray-800">{waitModalOrder.po || `PO-2605-${waitModalOrder.id?.slice(0, 4)}`}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Step Name</span><span className="font-bold text-gray-800">{waitModalStepName}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Type of Work</span><span className="font-bold text-gray-800 text-right">{waitModalServiceName}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">What You Need To Do</span><span className="font-bold text-gray-800 text-right max-w-[60%]">{waitModalInstruction}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Customer</span><span className="font-bold text-gray-800">{waitModalCounterpart}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Budget</span><span className="font-bold text-amber-600">{waitModalBudgetDisplay}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Project Location</span><span className="font-bold text-gray-800 text-right">{waitModalOrder.meetingVenue || waitModalOrder.subdistrict || 'Unknown'}</span></div>
              {isMeetingConfirmation && (
                <>
                  <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Proposed Date</span><span className="font-bold text-gray-800">{waitModalMeetingDetails.meetingDateLabel || '-'}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Proposed Time</span><span className="font-bold text-gray-800">{waitModalMeetingDetails.meetingTimeLabel || '-'}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Venue</span><span className="font-bold text-gray-800 text-right">{waitModalMeetingDetails.meetingVenue}</span></div>
                </>
              )}
              <div className="flex flex-col gap-1 pb-2"><span className="text-gray-500">Project Details</span><span className="font-bold text-gray-800 bg-white p-2 rounded border border-gray-100">{waitModalProjectDetails}</span></div>
              {isMeetingConfirmation && waitModalMeetingDetails.meetingMessage && <div className="flex flex-col gap-1 pb-2"><span className="text-gray-500">Customer Invitation</span><span className="text-gray-800 bg-white p-2 rounded border border-gray-100">{waitModalMeetingDetails.meetingMessage}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Uploaded Files</span><span className="font-semibold text-sky-600 cursor-pointer hover:underline" onClick={() => {
                const url = waitModalAttachmentUrls[0] || '';
                if (url) {
                  window.open(url, "_blank");
                  return;
                }
                alert("No uploaded file found for this order. Please re-submit from booking so file can be attached to this PO.");
              }}>
                {waitModalAttachmentUrls.length > 0
                  ? `${waitModalAttachmentUrls.length} file${waitModalAttachmentUrls.length > 1 ? 's' : ''} attached (Click to View)`
                  : (waitModalOrder?.hasAttachment ? '1 file attached (Click to View)' : 'No file attached')}
              </span></div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={async () => {
                  const po = waitModalOrder.po || `PO-2605-${waitModalOrder.id?.slice(0, 4)}`;
                  const backendOrderId = waitModalOrder.orderId || localStorage.getItem(`po_to_order_${po}`) || (isOrderUuid(waitModalOrder.id) ? waitModalOrder.id : '');
                  const now = fmtDateTime(new Date());
                  const partnerName = partner?.name || partner?.company || 'Partner';
                  const serviceTitle = waitModalOrder.serviceTh || waitModalOrder.service;
                  const budgetLabel = waitModalOrder.fee || (waitModalOrder.budget ? `฿${String(waitModalOrder.budget).replace(/^฿/, '')}` : '฿0');
                  try {
                    const token = localStorage.getItem("subscriber_token");
                    try {
                      let wf = JSON.parse(localStorage.getItem("cblue_workflow") || "{}");
                      if(wf) {
                        wf.step = isMeetingConfirmation ? 8 : 6;
                        localStorage.setItem("cblue_workflow", JSON.stringify(wf));
                      }
                    } catch(e) {}
                    if (isMeetingConfirmation) {
                      const schedId = `meet-scheduled-${po}`;
                      const meetingSummary = [waitModalMeetingDetails.meetingDateLabel, waitModalMeetingDetails.meetingTimeLabel].filter(Boolean).join(' ');
                      // Use PO-based matching (not waitModalOrder.id) because mockDynReqs IDs are
                      // 'meet-pending-{po}', not the backend UUID stored in waitModalOrder.id
                      const nextReqs = [
                        ...mockDynReqs.filter((r: any) => !(r.po === po && r.type === 'meeting_pending_partner') && r.id !== schedId),
                        { id: schedId, po, title: waitModalOrder.service || serviceTitle, customer: waitModalOrder.customer || 'Ghis Cafe', date: now, createdAt: Date.now(), budget: budgetLabel, tier: waitModalOrder.tier, type: 'meeting_scheduled', step: 8, venue: waitModalMeetingDetails.meetingVenue, meetingDate: waitModalOrder.meetingDate || waitModalMeetingDetails.meetingDateLabel, meetingTime: waitModalOrder.meetingTime || waitModalMeetingDetails.meetingTimeLabel, desc: `Meeting confirmed by partner${meetingSummary ? ` for ${meetingSummary}` : ''}${waitModalMeetingDetails.meetingVenue ? ` at ${waitModalMeetingDetails.meetingVenue}` : ''}. Proceed after the site meeting then mark variation.` },
                      ];
                      const nextActive = mockActiveState.map((x: any) => x.po === po ? { ...x, step: 9, mockStep: 9, actionNeeded: true } : x);
                      localStorage.setItem("ghis_mock_dyn_req", JSON.stringify(nextReqs));
                      localStorage.setItem("ghis_mock_active", JSON.stringify(nextActive));
                      const nextPartnerReqs = [
                        ...partnerDynReqs.filter((r: any) => !(r.po === po && ['variation_partner', 'meeting_confirm_partner'].includes(r.type))),
                        { id: `variation-${po}`, orderId: backendOrderId || waitModalOrder.orderId || undefined, po, service: waitModalOrder.service || serviceTitle, serviceTh: waitModalOrder.service || serviceTitle, serviceZh: waitModalOrder.service || serviceTitle, customer: waitModalOrder.customer || 'Ghis Cafe', date: now, createdAt: Date.now(), fee: budgetLabel, budget: String(budgetLabel).replace(/[^0-9]/g, ''), tier: waitModalOrder.tier, description: 'Proceed to submit variation request if extra work or price adjustment is required.', type: 'variation_partner', step: 9 },
                      ];
                      localStorage.setItem("partner_mock_dyn_req", JSON.stringify(nextPartnerReqs));
                      setMockDynReqs(nextReqs);
                      setMockActiveState(nextActive);
                      setPartnerDynReqs(nextPartnerReqs);
                      window.dispatchEvent(new Event("storage"));
                      // Update backend: MEETING_REQUESTED → IN_PROGRESS (meeting confirmed; customer page polls and auto-detects)
                      if (backendOrderId && !waitModalOrder.mock && token && String(waitModalOrder.status || '').toUpperCase() !== 'IN_PROGRESS') {
                        fetch(`/api/v1/orders/${backendOrderId}/status`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ status: 'IN_PROGRESS', note: 'Partner confirmed meeting time' }),
                        }).catch(() => {});
                        fetch(`/api/v1/orders/${backendOrderId}/chat`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ text: `[SYSTEM] Partner confirmed site meeting for ${po}. Variation request can now be submitted if needed.` }),
                        }).catch(() => {});
                      }
                      setWaitModalOrder(null);
                      return;
                    }

                    let backendAcceptError = "";
                    if (waitModalOrder.id && !waitModalOrder.mock) {
                      const currentStatus = String(waitModalOrder.status || '').toUpperCase();
                      const acceptancePath: Record<string, string[]> = {
                        CREATED: ['MATCHING', 'ASSIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'],
                        MATCHING: ['ASSIGNED', 'DEPOSIT_PENDING', 'CONFIRMED'],
                        ASSIGNED: ['DEPOSIT_PENDING', 'CONFIRMED'],
                        DEPOSIT_PENDING: ['CONFIRMED'],
                        CONFIRMED: [],
                      };
                      for (const nextStatus of acceptancePath[currentStatus] || []) {
                        const hopRes = await fetch(`/api/v1/orders/${backendOrderId || waitModalOrder.id}/status`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({ status: nextStatus, note: 'Partner accepted draft PO' }),
                        });
                        if (!hopRes.ok) {
                          backendAcceptError = await hopRes.text();
                          break;
                        }
                      }
                    }

                    const activeStateRaw = localStorage.getItem("ghis_mock_active");
                    const dynReqRaw = localStorage.getItem("ghis_mock_dyn_req");
                    const activeState = activeStateRaw ? JSON.parse(activeStateRaw) : [];
                    const dynReqs = dynReqRaw ? JSON.parse(dynReqRaw) : [];

                    const nextActive = [
                      ...activeState.filter((x: any) => x.po !== po),
                      {
                        id: backendOrderId || waitModalOrder.id,
                        orderId: backendOrderId || waitModalOrder.id,
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
                        orderId: backendOrderId || waitModalOrder.id,
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
                {isMeetingConfirmation ? 'Confirm Meeting Time' : 'Accept PO'}
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
                <Link href={`subscription/login?redirect=/fixers`} className="px-6 py-3 bg-white text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-50 transition shadow-lg whitespace-nowrap">
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
          <PartnerOverview locale={locale} partner={partner} activeJobs={activeJobs} incomingJobs={partnerRequestItems} scheduledMeetings={scheduledMeetings} completedJobs={completedJobs} earnings={earningsSeries} stats={stats} notifications={displayNotifications} chats={chatFeed} onJobClick={handleJobClick} onTabChange={(tab) => setActiveTab(tab as TabKey)} />
        </div>
        {activeTab === "requests" && <PartnerRequests locale={locale} incomingJobs={partnerRequestItems} onJobClick={handleJobClick} />}
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
  const recentIncomingChats = chats.filter((c: any) => c.hasIncoming).slice(0, 3);
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
            <div key={req.id} className="px-6 py-4 flex items-center gap-4 hover:bg-amber-50 transition cursor-default" onClick={() => onJobClick && onJobClick(req)}>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-lg"></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? req.serviceTh : locale === "zh" ? req.serviceZh : req.service}{(req.po || req.step) ? <span className="text-xs font-normal text-gray-400">{req.po ? ` · ${req.po}` : ''}{req.step ? ` · Step ${req.step} of 11` : ''}</span> : null}</p>
                <p className="text-xs text-gray-500">{req.customer} &middot; {req.date} &middot; {locale === "th" ? "งบ" : locale === "zh" ? "预算" : "Budget"}: {req.fee || `฿${req.budget || '0'}`}</p>
                {(req.meetingVenue || req.subdistrict) && <p className="text-xs text-gray-500 mt-0.5">{[req.meetingVenue || req.subdistrict].filter(Boolean).join(' · ')}</p>}
                <p className="text-xs text-gray-500 mt-1" style={{ whiteSpace: "pre-wrap" }}>{stripWorkflowPrefix(req.description || req.desc || req.statusNote)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[req.tier] || ""}`}>{req.tier}</span>
                {req.workflowType ? (
                  <button onClick={(e) => { e.stopPropagation(); onTabChange && onTabChange("requests"); }} className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition">Open Request</button>
                ) : (
                  <>
                    {req.urgency === "urgent" && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">{locale === "th" ? "เร่งด่วน" : locale === "zh" ? "紧急" : "Urgent"}</span>}
                    <button onClick={(e) => { e.stopPropagation(); onJobClick && onJobClick(req); }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">{locale === "th" ? "รับ" : locale === "zh" ? "接受" : "Accept"}</button>
                    <button className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">{locale === "th" ? "ปฏิเสธ" : locale === "zh" ? "拒绝" : "Decline"}</button>
                  </>
                )}
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
                  <p className="text-xs text-gray-500 mt-1">Location: {meeting.meetingVenue || meeting.venue || meeting.subdistrict || '-'} | Customer: {meeting.customer}</p>
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
                  <p className="text-sm font-semibold text-gray-800">{c.name}{c.service && c.service !== c.po && c.service !== c.name && !String(c.name || '').includes(String(c.service || '')) ? <span className="text-gray-400 font-normal"> · {c.service}</span> : null}</p>
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
            <div key={job.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-lg flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? job.serviceTh : locale === "zh" ? job.serviceZh : job.service}{job.po ? <span className="text-xs font-normal text-gray-400"> · {job.po}</span> : null}</p>
                    <p className="text-xs text-gray-500">{job.customer} &middot; {job.date} &middot; {locale === "th" ? "งบ" : "Budget"}: ฿{job.budget || "0"}</p>
                    {job.subdistrict && <p className="text-xs text-gray-500 mt-0.5">{job.subdistrict}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[job.tier] || "bg-gray-100 text-gray-600"}`}>{job.tier}</span>
                    {job.actionNeeded && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-700">Action Needed</span>}
                    {job.earnings && <span className="text-xs font-bold text-gray-700">{job.earnings}</span>}
                  </div>
                </div>
                <div className="mt-2 w-full pt-1">
                  <div className="w-2/3 overflow-x-auto pb-4 hide-scrollbar">
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
                {getStatusLabel(job.status, locale) !== "" && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[job.status] || ""}`}>{getStatusLabel(job.status, locale)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Recent History</h2>
            <span className="text-xs text-purple-600 font-bold cursor-pointer hover:underline" onClick={() => onTabChange && onTabChange("history")}>View All →</span>
          </div>
          <div className="space-y-3 p-4">
            {completedJobs.slice(0, 2).length > 0 ? completedJobs.slice(0, 2).map((h) => (
              <WorkflowHistoryCard key={h.id || h.po} item={h} compact />
            )) : (
              <div className="py-6 text-center text-gray-500">No completed jobs yet.</div>
            )}
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
  const writePartnerReqs = (updater: (items: any[]) => any[]) => {
    try {
      const current = JSON.parse(localStorage.getItem("partner_mock_dyn_req") || "[]");
      const next = updater(Array.isArray(current) ? current : []);
      localStorage.setItem("partner_mock_dyn_req", JSON.stringify(next));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  };
  const handlePartnerAction = (job: any, action: 'variation' | 'complete' | 'rate', extraData?: string) => {
    try {
      const po = job.po || job.id;
      const createdAt = Date.now();
      const token = localStorage.getItem("subscriber_token") || "";
      const orderDbId = job.orderId || localStorage.getItem(`po_to_order_${po}`) || (isOrderUuid(job.id) ? job.id : "");
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
        writePartnerReqs(prev => prev.filter((x: any) => !(x.po === po && ['variation_partner', 'meeting_confirm_partner'].includes(x.type))));
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
        writePartnerReqs(prev => prev.filter((x: any) => !(x.po === po && ['complete_partner', 'variation_partner', 'meeting_confirm_partner'].includes(x.type))));
        const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
        const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 10, mockStep: 10, actionNeeded: false } : x);
        localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
        window.dispatchEvent(new Event("storage"));
        postSystemMsg(`[SYSTEM] Partner has marked the job as complete for ${po}. Please review and confirm in your Requests tab.`);
      } else if (action === 'rate') {
        const rating = extraData || '5';
        writePartnerReqs(prev => prev.filter((x: any) => !(x.po === po && x.type === 'rate_partner')));
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
          <div key={job.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-lg flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? job.serviceTh : locale === "zh" ? job.serviceZh : job.service}{job.po ? <span className="text-xs font-normal text-gray-400"> · {job.po}</span> : null}</p>
                  <p className="text-xs text-gray-500">{job.customer} &middot; {job.date} &middot; {locale === "th" ? "งบ" : "Budget"}: ฿{job.budget || "0"}</p>
                  {job.subdistrict && <p className="text-xs text-gray-500 mt-0.5">{job.subdistrict}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[job.tier] || "bg-gray-100 text-gray-600"}`}>{job.tier}</span>
                  {job.actionNeeded && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-700">Action Needed</span>}
                  {job.earnings && <span className="text-xs font-bold text-gray-700">{job.earnings}</span>}
                </div>
              </div>
              <div className="mt-2 w-full pt-1">
                <div className="w-2/3 overflow-x-auto pb-4 hide-scrollbar">
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
                {getStatusLabel(job.status, locale) !== "" && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[job.status] || ""}`}>{getStatusLabel(job.status, locale)}</span>}
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto my-auto max-h-[90dvh] overflow-y-auto">
          <div className="bg-amber-500 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Submit Variation</h3>
            <p className="text-amber-100 text-sm mt-1">{variationModal.po} &middot; {variationModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <strong>Step 9 of 11 • Variation.</strong> Review the original PO budget, describe the extra scope or revised pricing, and send it to the customer for approval.
            </div>
            <WorkflowModalMeta
              step={9}
              typeOfWork={variationModal.service || 'Project'}
              actionText="Review the original PO and send your variation request to the customer for approval."
              po={variationModal.po || '-'}
              counterpartLabel="Customer"
              counterpartName={firstNameOnly(variationModal.customer, 'Customer')}
              budget={toCurrencyLabel(variationModal.budget)}
              location={variationModal.location || variationModal.subdistrict || 'Unknown'}
              projectDetails={stripWorkflowPrefix(variationModal.description || variationModal.desc || variationModal.projectDetails || variationModal.service || '')}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Budget</label>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 font-bold text-amber-800">{toCurrencyLabel(variationModal.budget)}</div>
              <p className="text-xs text-gray-500 mt-1">Original PO total. Describe extra scope or revised amount in the variation below.</p>
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
      <div className="fixed inset-0 z-50 flex items-center justify-start pt-[76px] bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-y-auto max-h-[calc(100dvh-6rem)]">
          <div className="bg-sky-600 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Rate Customer</h3>
            <p className="text-sky-200 text-sm mt-1">{ratingModal.po} &middot; {ratingModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <WorkflowModalMeta
              step={11}
              typeOfWork={ratingModal.service || 'Project'}
              actionText="Rate the customer to close this job and move it to history."
              po={ratingModal.po || '-'}
              counterpartLabel="Customer"
              counterpartName={firstNameOnly(ratingModal.customer, 'Customer')}
              budget={toCurrencyLabel(ratingModal.budget || ratingModal.fee)}
              location={ratingModal.location || ratingModal.subdistrict || 'Unknown'}
              projectDetails={stripWorkflowPrefix(ratingModal.description || ratingModal.desc || ratingModal.projectDetails || ratingModal.service || '')}
            />
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
      <div className="fixed inset-0 z-50 flex items-center justify-start pt-[76px] bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-y-auto max-h-[calc(100dvh-6rem)] mx-auto">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Mark Job Complete</h3>
            <p className="text-green-100 text-sm mt-1">{completeModal.po} · {completeModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <WorkflowModalMeta
              step={10}
              typeOfWork={completeModal.service || 'Project'}
              actionText="Send the project complete request to the customer for final confirmation."
              po={completeModal.po || '-'}
              counterpartLabel="Customer"
              counterpartName={firstNameOnly(completeModal.customer, 'Customer')}
              budget={toCurrencyLabel(completeModal.budget || completeModal.fee)}
              location={completeModal.location || completeModal.subdistrict || 'Unknown'}
              projectDetails={stripWorkflowPrefix(completeModal.description || completeModal.desc || completeModal.projectDetails || completeModal.service || '')}
            />
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
  const [variationModal, setVariationModal] = React.useState<any>(null);
  const [variationDesc, setVariationDesc] = React.useState("");
  const [completeModal, setCompleteModal] = React.useState<any>(null);
  const [completeNote, setCompleteNote] = React.useState("");
  const [ratingModal, setRatingModal] = React.useState<any>(null);
  const [ratingStars, setRatingStars] = React.useState(5);

  const writePartnerReqs = (updater: (items: any[]) => any[]) => {
    try {
      const current = JSON.parse(localStorage.getItem("partner_mock_dyn_req") || "[]");
      const next = updater(Array.isArray(current) ? current : []);
      localStorage.setItem("partner_mock_dyn_req", JSON.stringify(next));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  };

  const handlePartnerAction = (job: any, action: 'variation' | 'complete' | 'rate', extraData?: string) => {
    try {
      const po = job.po || job.id;
      const createdAt = Date.now();
      const token = localStorage.getItem("subscriber_token") || "";
      const orderDbId = job.orderId || localStorage.getItem(`po_to_order_${po}`) || (isOrderUuid(job.id) ? job.id : "");
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
        writePartnerReqs(prev => prev.filter((x: any) => !(x.po === po && ['variation_partner', 'meeting_confirm_partner'].includes(x.type))));
        const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
        const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 9, mockStep: 9, actionNeeded: false } : x);
        localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
        window.dispatchEvent(new Event("storage"));
        postSystemMsg(`[SYSTEM] Partner has submitted a variation request for ${po}. Please review in your Requests tab.`);
      } else if (action === 'complete') {
        const complId = `compl-${po}`;
        const completeDesc = extraData?.trim() ? `Partner completion request: ${extraData.trim()}` : 'Work is completed. Please review and mark as complete to close this project.';
        const next = [...dynReqs.filter((x: any) => x.po !== po), { id: complId, po, title: job.service, customer: job.customer, date: fmtDt(createdAt), createdAt, budget: job.budget || job.fee, tier: job.tier, desc: completeDesc, type: 'complete_pending', step: 10 }];
        localStorage.setItem("ghis_mock_dyn_req", JSON.stringify(next));
        writePartnerReqs(prev => prev.filter((x: any) => !(x.po === po && ['complete_partner', 'variation_partner', 'meeting_confirm_partner'].includes(x.type))));
        const active = JSON.parse(localStorage.getItem("ghis_mock_active") || "[]");
        const updatedActive = active.map((x: any) => x.po === po ? { ...x, step: 10, mockStep: 10, actionNeeded: false } : x);
        localStorage.setItem("ghis_mock_active", JSON.stringify(updatedActive));
        window.dispatchEvent(new Event("storage"));
        postSystemMsg(`[SYSTEM] Partner has marked the job as complete for ${po}. Please review and confirm in your Requests tab.`);
      } else if (action === 'rate') {
        const rating = extraData || '5';
        writePartnerReqs(prev => prev.filter((x: any) => !(x.po === po && x.type === 'rate_partner')));
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
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新订单" : "Incoming Requests"}</h2>
        <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">{incomingJobs.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {incomingJobs.map((req) => (
          <div key={req.id} className="px-6 py-4 flex items-center gap-4 hover:bg-amber-50 transition cursor-default" onClick={() => onJobClick && onJobClick(req)}>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-lg"></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? req.serviceTh : locale === "zh" ? req.serviceZh : req.service}{(req.po || req.step) ? <span className="text-xs font-normal text-gray-400">{req.po ? ` · ${req.po}` : ''}{req.step ? ` · Step ${req.step} of 11` : ''}</span> : null}</p>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">{req.type === 'variation_partner' ? 'Please decide whether to submit a variation request.' : req.type === 'complete_partner' ? 'Please send project complete request to customer.' : req.type === 'rate_partner' ? 'Please rate the customer to close this job.' : String(req.status || '').toUpperCase() === 'MEETING_REQUESTED' ? 'Please review and confirm the site meeting invitation.' : locale === "th" ? "โปรดพิจารณาและรับงานนี้เพื่อดำเนินการต่อ" : locale === "zh" ? "请审核并接受此工作以继续" : "Please review and accept this job to proceed"}</p>
              <p className="text-xs text-gray-500 mt-0.5">{req.customer} &middot; {req.date} &middot; {locale === "th" ? "งบ" : locale === "zh" ? "预算" : "Budget"}: {req.fee || `฿${req.budget || '0'}`}</p>
              {(req.meetingVenue || req.subdistrict) && <p className="text-xs text-gray-500 mt-0.5">{[req.meetingVenue || req.subdistrict].filter(Boolean).join(' · ')}</p>}
              <p className="text-xs text-gray-500 mt-1" style={{ whiteSpace: "pre-wrap" }}>{stripWorkflowPrefix(req.description || req.desc || req.statusNote)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[req.tier] || ""}`}>{req.tier}</span>
              {req.type === 'variation_partner' ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setVariationDesc(''); setVariationModal(req); }} className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition">Yes</button>
                  <button onClick={(e) => { e.stopPropagation(); writePartnerReqs(prev => prev.filter((x: any) => !(x.po === req.po && x.type === 'variation_partner'))); }} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">No</button>
                </>
              ) : req.type === 'complete_partner' ? (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setCompleteNote(''); setCompleteModal(req); }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">Send</button>
                  <button onClick={(e) => { e.stopPropagation(); writePartnerReqs(prev => prev.filter((x: any) => !(x.po === req.po && x.type === 'complete_partner'))); }} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">No</button>
                </>
              ) : req.type === 'rate_partner' ? (
                <button onClick={(e) => { e.stopPropagation(); setRatingStars(5); setRatingModal(req); }} className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition">Start</button>
              ) : String(req.status || '').toUpperCase() === 'MEETING_REQUESTED' ? (
                <button onClick={(e) => { e.stopPropagation(); onJobClick && onJobClick(req); }} className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition">Confirm</button>
              ) : (
                <>
                  {req.urgency === "urgent" && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">{locale === "th" ? "เร่งด่วน" : locale === "zh" ? "紧急" : "Urgent"}</span>}
                  <button onClick={(e) => { e.stopPropagation(); onJobClick && onJobClick(req); }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">{locale === "th" ? "รับ" : locale === "zh" ? "接受" : "Accept"}</button>
                  <button className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">{locale === "th" ? "ปฏิเสธ" : locale === "zh" ? "拒绝" : "Decline"}</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
    {variationModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto my-auto max-h-[90dvh] overflow-y-auto">
          <div className="bg-amber-500 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Submit Variation</h3>
            <p className="text-amber-100 text-sm mt-1">{variationModal.po} · {variationModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <strong>Step 9 of 11 • Variation.</strong> Review the original PO budget, describe the extra scope or revised pricing, and send it to the customer for approval.
            </div>
            <WorkflowModalMeta
              step={9}
              typeOfWork={variationModal.service || 'Project'}
              actionText="Review the original PO and send your variation request to the customer for approval."
              po={variationModal.po || '-'}
              counterpartLabel="Customer"
              counterpartName={firstNameOnly(variationModal.customer, 'Customer')}
              budget={toCurrencyLabel(variationModal.budget)}
              location={variationModal.location || variationModal.subdistrict || 'Unknown'}
              projectDetails={stripWorkflowPrefix(variationModal.description || variationModal.desc || variationModal.projectDetails || variationModal.service || '')}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Budget</label>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 font-bold text-amber-800">{toCurrencyLabel(variationModal.budget)}</div>
              <p className="text-xs text-gray-500 mt-1">Original PO total. Describe extra scope or revised amount in the variation below.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Variation Description <span className="text-red-500">*</span></label>
              <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" rows={4} placeholder="Describe the variation scope, extra work, or cost changes..." value={variationDesc} onChange={e => setVariationDesc(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { if (!variationDesc.trim()) return; handlePartnerAction(variationModal, 'variation', `Partner variation request: ${variationDesc.trim()}`); setVariationModal(null); }} disabled={!variationDesc.trim()} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm">Submit Variation</button>
              <button onClick={() => setVariationModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
    {completeModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-start pt-[76px] bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-y-auto max-h-[calc(100dvh-6rem)] mx-auto">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Mark Job Complete</h3>
            <p className="text-green-100 text-sm mt-1">{completeModal.po} · {completeModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <WorkflowModalMeta
              step={10}
              typeOfWork={completeModal.service || 'Project'}
              actionText="Send the project complete request to the customer for final confirmation."
              po={completeModal.po || '-'}
              counterpartLabel="Customer"
              counterpartName={firstNameOnly(completeModal.customer, 'Customer')}
              budget={toCurrencyLabel(completeModal.budget || completeModal.fee)}
              location={completeModal.location || completeModal.subdistrict || 'Unknown'}
              projectDetails={stripWorkflowPrefix(completeModal.description || completeModal.desc || completeModal.projectDetails || completeModal.service || '')}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Completion Note <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={completeNote} onChange={e => setCompleteNote(e.target.value)} rows={3} placeholder="e.g. All tasks finished, site cleaned, client signed off..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { handlePartnerAction(completeModal, 'complete', completeNote.trim() || 'Job marked complete by partner'); setCompleteModal(null); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition text-sm">Confirm Complete</button>
              <button onClick={() => setCompleteModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
    {ratingModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-start pt-[76px] bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-y-auto max-h-[calc(100dvh-6rem)]">
          <div className="bg-sky-600 px-6 py-4">
            <h3 className="text-white font-bold text-lg">Rate Customer</h3>
            <p className="text-sky-200 text-sm mt-1">{ratingModal.po} · {ratingModal.service}</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <WorkflowModalMeta
              step={11}
              typeOfWork={ratingModal.service || 'Project'}
              actionText="Rate the customer to close this job and move it to history."
              po={ratingModal.po || '-'}
              counterpartLabel="Customer"
              counterpartName={firstNameOnly(ratingModal.customer, 'Customer')}
              budget={toCurrencyLabel(ratingModal.budget || ratingModal.fee)}
              location={ratingModal.location || ratingModal.subdistrict || 'Unknown'}
              projectDetails={stripWorkflowPrefix(ratingModal.description || ratingModal.desc || ratingModal.projectDetails || ratingModal.service || '')}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Your Rating</label>
              <div className="flex gap-2 text-3xl">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setRatingStars(n)} className={`transition-transform hover:scale-110 ${n <= ratingStars ? 'text-amber-400' : 'text-gray-300'}`}>★</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { handlePartnerAction(ratingModal, 'rate', String(ratingStars)); setRatingModal(null); }} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl transition text-sm">Submit Rating</button>
              <button onClick={() => setRatingModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function PartnerHistory({ locale, completedJobs }: { locale: string; completedJobs: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "ประวัติการทำงาน" : locale === "zh" ? "工作历史" : "Job History"}</h2>
      </div>
      <div className="space-y-4 p-4">
        {completedJobs.length > 0 ? completedJobs.map((h) => (
          <WorkflowHistoryCard key={h.id || h.po} item={h} />
        )) : (
          <div className="py-8 text-center text-gray-500">No completed jobs yet.</div>
        )}
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
                if (c.name) {
                  localStorage.setItem(`chat_title_${c.po}`, c.name);
                }
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
                  {c.service && c.service !== c.po && c.service !== c.name ? <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{c.service}</span> : null}
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

