#!/usr/bin/env python3
import os

path = '/home/ballhog/cblue-platform/apps/web/app/[locale]/dashboard/page.tsx'

content = '''"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import PdpaConsent from "../components/PdpaConsent";

/* ===== Types ===== */
interface SubscriberInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: string;
}

type ServiceType = "household" | "project" | "professional" | "property";
type TabKey = "overview" | "bookings" | "property" | "history" | "chat" | "notifications" | "profile";

/* ===== Demo Data ===== */
const DEMO_ACTIVE = [
  { id: "as-1", type: "household" as ServiceType, service: "Plumbing Repair", serviceTh: "\\u0e0b\\u0e48\\u0e2d\\u0e21\\u0e1b\\u0e23\\u0e30\\u0e1b\\u0e32", serviceZh: "\\u7ba1\\u9053\\u7ef4\\u4fee", partner: "Fixer-1042", tier: "Standard", status: "IN_PROGRESS", date: "2026-04-10", progress: 60 },
  { id: "as-2", type: "professional" as ServiceType, service: "Architect Consult", serviceTh: "\\u0e1b\\u0e23\\u0e36\\u0e01\\u0e29\\u0e32\\u0e2a\\u0e16\\u0e32\\u0e1b\\u0e19\\u0e34\\u0e01", serviceZh: "\\u5efa\\u7b51\\u5e08\\u54a8\\u8be2", partner: "Pro-3087", tier: "Corporate", status: "CONFIRMED", date: "2026-04-12", progress: 20 },
  { id: "as-3", type: "project" as ServiceType, service: "Smart Home Setup", serviceTh: "\\u0e15\\u0e34\\u0e14\\u0e15\\u0e31\\u0e49\\u0e07\\u0e2a\\u0e21\\u0e32\\u0e23\\u0e4c\\u0e17\\u0e42\\u0e2e\\u0e21", serviceZh: "\\u667a\\u80fd\\u5bb6\\u5c45\\u5b89\\u88c5", partner: "Team-5512", tier: "Specialist", status: "DEPOSIT_PENDING", date: "2026-04-15", progress: 10 },
  { id: "as-4", type: "property" as ServiceType, service: "Condo Viewing", serviceTh: "\\u0e14\\u0e39\\u0e04\\u0e2d\\u0e19\\u0e42\\u0e14", serviceZh: "\\u770b\\u516c\\u5bd3", partner: "Lister-7890", tier: "Upper", status: "CONFIRMED", date: "2026-04-14", progress: 40 },
];

const DEMO_HISTORY = [
  { id: "h-1", type: "household" as ServiceType, service: "Electrical", partner: "Fixer-0921", tier: "Economy", date: "2026-03-15", rating: 4.8, fee: "\\u0e3f200" },
  { id: "h-2", type: "project" as ServiceType, service: "Website Dev", partner: "Team-4401", tier: "Corporate", date: "2026-03-01", rating: 4.9, fee: "\\u0e3f600" },
  { id: "h-3", type: "professional" as ServiceType, service: "Lawyer", partner: "Pro-1100", tier: "Expert", date: "2026-02-10", rating: 5.0, fee: "\\u0e3f1,000" },
  { id: "h-4", type: "household" as ServiceType, service: "AC Maintenance", partner: "Fixer-2200", tier: "Standard", date: "2026-01-20", rating: 4.5, fee: "\\u0e3f400" },
  { id: "h-5", type: "property" as ServiceType, service: "House Rental", partner: "Lister-3300", tier: "Luxury", date: "2025-12-05", rating: 4.7, fee: "\\u0e3f800" },
];

const DEMO_PROPERTY_INQUIRIES = [
  { id: "p-1", title: "Sukhumvit Condo 2BR", titleTh: "\\u0e04\\u0e2d\\u0e19\\u0e42\\u0e14\\u0e2a\\u0e38\\u0e02\\u0e38\\u0e21\\u0e27\\u0e34\\u0e17 2 \\u0e2b\\u0e49\\u0e2d\\u0e07\\u0e19\\u0e2d\\u0e19", price: "\\u0e3f5,500,000", type: "SALE", status: "VIEWING_SCHEDULED", lister: "Lister-7890", date: "2026-04-14", image: "\\ud83c\\udfe2" },
  { id: "p-2", title: "Thonglor House 4BR", titleTh: "\\u0e1a\\u0e49\\u0e32\\u0e19\\u0e17\\u0e2d\\u0e07\\u0e2b\\u0e25\\u0e48\\u0e2d 4 \\u0e2b\\u0e49\\u0e2d\\u0e07\\u0e19\\u0e2d\\u0e19", price: "\\u0e3f45,000/mo", type: "RENT", status: "CONTACTED", lister: "Lister-4455", date: "2026-04-11", image: "\\ud83c\\udfe0" },
  { id: "p-3", title: "Phuket Villa", titleTh: "\\u0e27\\u0e34\\u0e25\\u0e25\\u0e32\\u0e20\\u0e39\\u0e40\\u0e01\\u0e47\\u0e15", price: "\\u0e3f18,000,000", type: "SALE", status: "DEPOSIT_PAID", lister: "Lister-6677", date: "2026-04-08", image: "\\ud83c\\udfe1" },
];

const DEMO_NOTIFICATIONS = [
  { id: "n1", msg: "Fixer-1042 is on the way", msgTh: "Fixer-1042 \\u0e01\\u0e33\\u0e25\\u0e31\\u0e07\\u0e40\\u0e14\\u0e34\\u0e19\\u0e17\\u0e32\\u0e07\\u0e21\\u0e32", time: "5m ago", dot: "bg-sky-500", unread: true },
  { id: "n2", msg: "Payment for Architect Consult confirmed", msgTh: "\\u0e22\\u0e37\\u0e19\\u0e22\\u0e31\\u0e19\\u0e01\\u0e32\\u0e23\\u0e0a\\u0e33\\u0e23\\u0e30\\u0e40\\u0e07\\u0e34\\u0e19\\u0e1b\\u0e23\\u0e36\\u0e01\\u0e29\\u0e32\\u0e2a\\u0e16\\u0e32\\u0e1b\\u0e19\\u0e34\\u0e01", time: "1h ago", dot: "bg-green-500", unread: true },
  { id: "n3", msg: "Property viewing confirmed for Apr 14", msgTh: "\\u0e19\\u0e31\\u0e14\\u0e14\\u0e39\\u0e17\\u0e23\\u0e31\\u0e1e\\u0e22\\u0e4c\\u0e2a\\u0e34\\u0e19 14 \\u0e40\\u0e21.\\u0e22. \\u0e22\\u0e37\\u0e19\\u0e22\\u0e31\\u0e19\\u0e41\\u0e25\\u0e49\\u0e27", time: "3h ago", dot: "bg-emerald-500", unread: true },
  { id: "n4", msg: "Rate your service with Fixer-0921", msgTh: "\\u0e43\\u0e2b\\u0e49\\u0e04\\u0e30\\u0e41\\u0e19\\u0e19\\u0e1a\\u0e23\\u0e34\\u0e01\\u0e32\\u0e23\\u0e01\\u0e31\\u0e1a Fixer-0921", time: "2d ago", dot: "bg-amber-500", unread: false },
  { id: "n5", msg: "Meeting with Fixer-1042 in 2 hours", msgTh: "\\u0e01\\u0e32\\u0e23\\u0e19\\u0e31\\u0e14\\u0e1e\\u0e1a\\u0e01\\u0e31\\u0e1a Fixer-1042 \\u0e43\\u0e19\\u0e2d\\u0e35\\u0e01 2 \\u0e0a\\u0e31\\u0e48\\u0e27\\u0e42\\u0e21\\u0e07", time: "2h ago", dot: "bg-red-500", unread: true },
];

const DEMO_CHATS = [
  { id: "c1", name: "Fixer-1042", service: "Plumbing", lastMsg: "On my way, ETA 15 min", lastMsgTh: "\\u0e01\\u0e33\\u0e25\\u0e31\\u0e07\\u0e40\\u0e14\\u0e34\\u0e19\\u0e17\\u0e32\\u0e07 \\u0e16\\u0e36\\u0e07\\u0e43\\u0e19 15 \\u0e19\\u0e32\\u0e17\\u0e35", time: "5m ago", unread: 2, online: true },
  { id: "c2", name: "Pro-3087", service: "Architect", lastMsg: "Design draft prepared", lastMsgTh: "\\u0e40\\u0e15\\u0e23\\u0e35\\u0e22\\u0e21\\u0e41\\u0e1a\\u0e1a\\u0e23\\u0e48\\u0e32\\u0e07\\u0e40\\u0e23\\u0e35\\u0e22\\u0e1a\\u0e23\\u0e49\\u0e2d\\u0e22\\u0e41\\u0e25\\u0e49\\u0e27", time: "2h ago", unread: 0, online: true },
  { id: "c3", name: "Team-5512", service: "Smart Home", lastMsg: "Waiting for your confirmation", lastMsgTh: "\\u0e23\\u0e2d\\u0e01\\u0e32\\u0e23\\u0e22\\u0e37\\u0e19\\u0e22\\u0e31\\u0e19\\u0e08\\u0e32\\u0e01\\u0e04\\u0e38\\u0e13", time: "1d ago", unread: 1, online: false },
  { id: "c4", name: "Lister-7890", service: "Property", lastMsg: "Condo available for viewing Saturday", lastMsgTh: "\\u0e04\\u0e2d\\u0e19\\u0e42\\u0e14\\u0e40\\u0e1b\\u0e34\\u0e14\\u0e43\\u0e2b\\u0e49\\u0e0a\\u0e21\\u0e27\\u0e31\\u0e19\\u0e40\\u0e2a\\u0e32\\u0e23\\u0e4c", time: "3h ago", unread: 1, online: true },
];

const ICON_MAP: Record<ServiceType, string> = { household: "\\ud83c\\udfe0", project: "\\ud83d\\udcbc", professional: "\\ud83d\\udc54", property: "\\ud83c\\udfe2" };
const STATUS_STYLE: Record<string, string> = {
  IN_PROGRESS: "bg-purple-100 text-purple-700",
  CONFIRMED: "bg-green-100 text-green-700",
  DEPOSIT_PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  MATCHING: "bg-yellow-100 text-yellow-700",
  VIEWING_SCHEDULED: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-indigo-100 text-indigo-700",
  DEPOSIT_PAID: "bg-green-100 text-green-700",
};
const TIER_STYLE: Record<string, string> = {
  Economy: "bg-green-50 text-green-700",
  Standard: "bg-blue-50 text-blue-700",
  Corporate: "bg-purple-50 text-purple-700",
  Specialist: "bg-amber-50 text-amber-700",
  Expert: "bg-red-50 text-red-700",
  Upper: "bg-teal-50 text-teal-700",
  Luxury: "bg-amber-50 text-amber-700",
  Grandeur: "bg-purple-50 text-purple-700",
};
'''

print(f"Content length: {len(content)}")
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Written to {path}")
