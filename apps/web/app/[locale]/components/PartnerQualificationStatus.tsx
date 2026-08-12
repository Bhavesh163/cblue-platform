"use client";

import { useEffect, useState } from "react";

type QualificationSnapshot = {
  fixer?: {
    tier?: string | null;
    verified?: boolean | null;
    updatedAt?: string | null;
  } | null;
  submission?: {
    status?: string | null;
    submittedAt?: string | null;
    reviewedAt?: string | null;
  } | null;
  eligibility?: {
    status?:
      | "PENDING"
      | "ELIGIBLE"
      | "EXPIRING"
      | "REVERIFICATION_REQUIRED"
      | "EXPIRED"
      | "SUSPENDED";
    newJobEligible?: boolean;
    kycValidUntil?: string | null;
    daysUntilExpiry?: number | null;
    tierReevaluationPending?: boolean;
    suspendedAt?: string | null;
    suspensionReason?: string | null;
  } | null;
  tierQualification?: {
    approvedTier?: string | null;
    recommendedTier?: string | null;
    effectiveAt?: string | null;
  } | null;
};

type Props = {
  locale: string;
  fallbackTier?: string | null;
  fallbackVerified?: boolean;
  partnerId?: string | null;
  variant?: "full" | "compact";
};

type Copy = {
  heading: string;
  approvedTier: string;
  accountStatus: string;
  verified: string;
  reviewInProgress: string;
  updateNeeded: string;
  moreEvidence: string;
  draft: string;
  approvedTitle: string;
  approvedBody: string;
  reviewTitle: string;
  reviewBody: string;
  updateTitle: string;
  updateBody: string;
  evidenceTitle: string;
  evidenceBody: string;
  draftTitle: string;
  draftBody: string;
  upgradeTitle: string;
  upgradeBody: string;
  securityTitle: string;
  securityBody: string;
  expiring: string;
  reverifyBody: string;
  suspended: string;
  suspendedBody: string;
  expired: string;
  reverify: string;
  eligible: string;
  tierReview: string;
};

const COPY: Record<"en" | "th" | "zh", Copy> = {
  en: {
    heading: "Qualification status",
    approvedTier: "Approved tier",
    accountStatus: "Account status",
    verified: "Verified",
    reviewInProgress: "Review in progress",
    updateNeeded: "Information update needed",
    moreEvidence: "More information needed",
    draft: "Application in progress",
    approvedTitle: "Identity verified",
    approvedBody: "Your identity has been approved.",
    reviewTitle: "Review in progress",
    reviewBody:
      "We have received your information and will notify you when the review is complete.",
    updateTitle: "Information update needed",
    updateBody:
      "Please open Edit Profile and replace the identity information that needs correction.",
    evidenceTitle: "More information needed",
    evidenceBody:
      "Please open Edit Profile and provide the remaining identity information.",
    draftTitle: "Application evidence saved",
    draftBody:
      "Complete your profile and submit it when your identity and qualification evidence is ready.",
    upgradeTitle: "How to upgrade",
    upgradeBody:
      "Add relevant experience, completed work, and certificates. New evidence is reviewed separately from identity verification, and tier changes take effect after approval.",
    securityTitle: "Privacy and security",
    securityBody:
      "Your qualification evidence is stored privately, access is audited, and retention is managed under the CBLUE privacy policy.",
    expiring: "Identity verification expires soon",
    expired: "Identity verification has expired",
    reverify: "Identity verification update required",
    eligible: "Eligible for new opportunities",
    reverifyBody:
      "Your approved partner status remains active for new opportunities while we review your updated information.",
    suspended: "Partner profile paused",
    suspendedBody:
      "Your partner profile cannot receive new opportunities until an administrator restores it.",
    tierReview: "Tier review in progress",
  },
  th: {
    heading: "สถานะคุณสมบัติ",
    approvedTier: "ระดับที่อนุมัติ",
    accountStatus: "สถานะบัญชี",
    verified: "ยืนยันแล้ว",
    reviewInProgress: "กำลังตรวจสอบ",
    updateNeeded: "ต้องแก้ไขข้อมูล",
    moreEvidence: "ต้องเพิ่มข้อมูล",
    draft: "กำลังจัดเตรียมใบสมัคร",
    approvedTitle: "ยืนยันตัวตนแล้ว",
    approvedBody: "ข้อมูลยืนยันตัวตนของคุณได้รับการอนุมัติแล้ว",
    reviewTitle: "กำลังตรวจสอบ",
    reviewBody:
      "เราได้รับข้อมูลของคุณแล้ว และจะแจ้งให้ทราบเมื่อการตรวจสอบเสร็จสิ้น",
    updateTitle: "ต้องแก้ไขข้อมูล",
    updateBody:
      "กรุณาเปิดหน้าแก้ไขโปรไฟล์และเปลี่ยนข้อมูลยืนยันตัวตนที่ต้องแก้ไข",
    evidenceTitle: "ต้องเพิ่มข้อมูล",
    evidenceBody:
      "กรุณาเปิดหน้าแก้ไขโปรไฟล์และเพิ่มข้อมูลยืนยันตัวตนที่ยังไม่ครบถ้วน",
    draftTitle: "บันทึกหลักฐานแล้ว",
    draftBody:
      "กรอกโปรไฟล์ให้ครบและส่งใบสมัครเมื่อข้อมูลยืนยันตัวตนและหลักฐานคุณสมบัติพร้อม",
    upgradeTitle: "การปรับระดับ",
    upgradeBody:
      "เพิ่มประสบการณ์ ผลงานที่เกี่ยวข้อง และใบรับรอง หลักฐานใหม่จะได้รับการตรวจแยกจากการยืนยันตัวตน และระดับใหม่จะมีผลหลังได้รับอนุมัติ",
    securityTitle: "ความเป็นส่วนตัวและความปลอดภัย",
    securityBody:
      "หลักฐานคุณสมบัติถูกจัดเก็บแบบส่วนตัว การเข้าถึงมีบันทึกตรวจสอบ และระยะเวลาจัดเก็บเป็นไปตามนโยบายความเป็นส่วนตัวของ CBLUE",
    expiring: "การยืนยันตัวตนใกล้หมดอายุ",
    expired: "การยืนยันตัวตนหมดอายุแล้ว",
    reverify: "ต้องอัปเดตการยืนยันตัวตน",
    reverifyBody:
      "สถานะพาร์ทเนอร์ที่ได้รับอนุมัติยังคงพร้อมรับโอกาสงานใหม่ระหว่างที่เราตรวจสอบข้อมูลที่อัปเดต",
    suspended: "ระงับโปรไฟล์พาร์ทเนอร์ชั่วคราว",
    suspendedBody:
      "โปรไฟล์พาร์ทเนอร์ไม่สามารถรับโอกาสงานใหม่ได้จนกว่าผู้ดูแลระบบจะเปิดใช้งานอีกครั้ง",
    eligible: "พร้อมรับโอกาสงานใหม่",
    tierReview: "กำลังตรวจสอบการปรับระดับ",
  },
  zh: {
    heading: "资格状态",
    approvedTier: "已批准等级",
    accountStatus: "账户状态",
    verified: "已验证",
    reviewInProgress: "审核中",
    updateNeeded: "需要更新资料",
    moreEvidence: "需要补充资料",
    draft: "申请准备中",
    approvedTitle: "身份已验证",
    approvedBody: "您的身份资料已获批准。",
    reviewTitle: "审核中",
    reviewBody: "我们已收到您的资料，审核完成后会通知您。",
    updateTitle: "需要更新资料",
    updateBody: "请打开编辑资料页面，更换需要更正的身份资料。",
    evidenceTitle: "需要补充资料",
    evidenceBody: "请打开编辑资料页面，补充尚未完整的身份资料。",
    draftTitle: "申请资料已保存",
    draftBody: "身份和资格证明准备完成后，请完善资料并提交申请。",
    upgradeTitle: "如何提升等级",
    upgradeBody:
      "添加相关经验、完工记录和证书。新证明将与身份验证分开审核，等级变更在批准后生效。",
    securityTitle: "隐私与安全",
    securityBody:
      "您的资格证明以私密方式存储，访问均有审计记录，保留期限依照 CBLUE 隐私政策管理。",
    expiring: "身份验证即将到期",
    expired: "身份验证已过期",
    reverify: "需要更新身份验证",
    reverifyBody:
      "在我们审核您更新的资料期间，已批准的合作伙伴状态仍可接收新工作机会。",
    suspended: "合作伙伴资料已暂停",
    suspendedBody: "管理员恢复您的合作伙伴资料前，您无法接收新的工作机会。",
    eligible: "可接收新工作机会",
    tierReview: "等级审核中",
  },
};

function language(locale: string): "en" | "th" | "zh" {
  return locale === "th" || locale === "zh" ? locale : "en";
}

function statusPresentation(
  snapshot: QualificationSnapshot | null,
  copy: Copy,
) {
  const eligibility = snapshot?.eligibility;
  if (eligibility?.status === "SUSPENDED") {
    return {
      title: copy.suspended,
      body: eligibility.suspensionReason
        ? `${copy.suspendedBody} ${eligibility.suspensionReason}`
        : copy.suspendedBody,
      status: copy.suspended,
      approved: false,
    };
  }
  if (eligibility?.status === "EXPIRED") {
    return {
      title: copy.expired,
      body: copy.updateBody,
      status: copy.expired,
      approved: false,
    };
  }
  if (eligibility?.status === "REVERIFICATION_REQUIRED") {
    return {
      title: copy.reverify,
      body: copy.reverifyBody,
      status: copy.reverify,
      approved: true,
    };
  }
  if (eligibility?.status === "EXPIRING") {
    return {
      title: copy.expiring,
      body: copy.expiring,
      status: copy.expiring,
      approved: true,
    };
  }
  if (snapshot?.fixer?.verified) {
    return {
      title: copy.approvedTitle,
      body: copy.approvedBody,
      status: copy.verified,
      approved: true,
    };
  }
  const status = snapshot?.submission?.status || "DRAFT";
  if (status === "NEEDS_RESUBMISSION" || status === "REJECTED") {
    return {
      title: copy.updateTitle,
      body: copy.updateBody,
      status: copy.updateNeeded,
      approved: false,
    };
  }
  if (status === "NEEDS_MORE_EVIDENCE") {
    return {
      title: copy.evidenceTitle,
      body: copy.evidenceBody,
      status: copy.moreEvidence,
      approved: false,
    };
  }
  if (status === "DRAFT") {
    return {
      title: copy.draftTitle,
      body: copy.draftBody,
      status: copy.draft,
      approved: false,
    };
  }
  return {
    title: copy.reviewTitle,
    body: copy.reviewBody,
    status: copy.reviewInProgress,
    approved: false,
  };
}

export default function PartnerQualificationStatus({
  locale,
  fallbackTier,
  fallbackVerified = false,
  partnerId,
  variant = "full",
}: Props) {
  const [snapshot, setSnapshot] = useState<QualificationSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const token = window.localStorage.getItem("subscriber_token");
        if (!token) return;
        const response = await fetch("/api/v1/qualification/status", {
          cache: "no-store",
          headers: { Authorization: "Bearer " + token },
        });
        if (!response.ok) return;
        const payload = (await response.json()) as QualificationSnapshot;
        if (active) setSnapshot(payload);
      } catch {
        if (active) setSnapshot(null);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [partnerId]);

  const copy = COPY[language(locale)];
  const effectiveSnapshot = snapshot || {
    fixer: { tier: fallbackTier, verified: fallbackVerified },
    submission: { status: fallbackVerified ? "APPROVED" : "DRAFT" },
  };
  const presentation = statusPresentation(effectiveSnapshot, copy);
  const tier =
    effectiveSnapshot.tierQualification?.approvedTier ||
    effectiveSnapshot.fixer?.tier ||
    fallbackTier ||
    "-";
  const eligibility = effectiveSnapshot.eligibility;

  if (variant === "compact") {
    const expiry = eligibility?.kycValidUntil
      ? new Intl.DateTimeFormat(language(locale), {
          dateStyle: "medium",
        }).format(new Date(eligibility.kycValidUntil))
      : null;
    return (
      <div className="mt-3 flex w-full flex-wrap items-center gap-2">
        <span className="rounded-md bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
          {tier}
        </span>
        <span
          className={`rounded-md px-3 py-1 text-xs font-bold ${
            eligibility?.newJobEligible
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-900"
          }`}
        >
          {eligibility?.status === "EXPIRING"
            ? copy.expiring
            : eligibility?.status === "EXPIRED"
              ? copy.expired
              : eligibility?.status === "SUSPENDED"
                ? copy.suspended
                : eligibility?.status === "REVERIFICATION_REQUIRED"
                  ? copy.reverify
                  : eligibility?.newJobEligible
                    ? copy.eligible
                    : presentation.status}
          {expiry && eligibility?.status === "EXPIRING" ? `: ${expiry}` : ""}
        </span>
        {eligibility?.tierReevaluationPending ? (
          <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {copy.tierReview}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <section className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-sky-50 px-6 py-4">
        <h3 className="font-bold text-sky-950">{copy.heading}</h3>
        <span className="rounded-lg border border-sky-200 bg-white px-3 py-1 text-sm font-semibold text-sky-800">
          {tier}
        </span>
      </div>
      <div className="p-6">
        <div
          className={`mb-6 rounded-lg border p-4 ${
            presentation.approved
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <p className="font-bold">{presentation.title}</p>
          <p className="mt-1 text-sm leading-6">{presentation.body}</p>
        </div>
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{copy.approvedTier}</p>
            <p className="font-bold text-slate-900">{tier}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{copy.accountStatus}</p>
            <p className="font-bold text-slate-900">{presentation.status}</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-sky-100 bg-sky-50 p-5">
            <p className="font-bold text-sky-950">{copy.upgradeTitle}</p>
            <p className="mt-1 text-sm leading-6 text-sky-900">
              {copy.upgradeBody}
            </p>
          </div>
          <div className="rounded-lg border border-sky-100 bg-sky-50 p-5">
            <p className="font-bold text-sky-950">{copy.securityTitle}</p>
            <p className="mt-1 text-sm leading-6 text-sky-900">
              {copy.securityBody}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
