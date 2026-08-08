"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  Suspense,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  HOUSEHOLD_SERVICES,
  PROJECT_SERVICES,
  PROFESSIONAL_SERVICES,
  THAI_PROVINCES,
} from "../../lib/constants";
import { getDistrictsForProvince } from "../../lib/thai-address-data";
import {
  getSubdistrictsForDistrict,
  lookupByPostalCode,
} from "../../lib/thai-subdistrict-data";
import { normalizeGpsAddressForSubmit } from "../../lib/gps-location-normalization";
import ReCaptcha from "../../components/ReCaptcha";
import GpsDetectButton from "../../components/GpsDetectButton";
import GpsResolvedLocation from "../../components/GpsResolvedLocation";
import Link from "next/link";
import DatePickerInput from "../../components/DatePickerInput";
import {
  preparePortfolioFile,
  PORTFOLIO_MAX_FILES,
  PORTFOLIO_MAX_FILE_BYTES,
} from "../../lib/portfolio-image-compression";

interface PriceRow {
  service: string;
  quantity: string;
  unit: string;
  finalPrice: string;
}

type UploadAssessmentResponse = {
  id: string;
  documentType: string;
  assessment?: {
    route?: string;
    confidence?: number | null;
    reasonCodes?: string[];
    evidenceStatus?: string;
  };
};
class KycUploadError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "KycUploadError";
    this.code = code;
  }
}

function applicantKycReason(code: string): string {
  switch (code) {
    case "WRONG_DOCUMENT_TYPE":
      return "Please upload a clear photo of the front of your identity card.";
    case "INVALID_ID_NUMBER":
      return "Please upload a clear, valid identity card photo.";
    case "EXPIRED_ID":
      return "This identity card appears to be expired. Please upload a current card.";
    case "IDENTITY_CONTRADICTION":
      return "The name on this document does not match the profile name.";
    case "UNREADABLE_DOCUMENT":
      return "The image is unclear. Please upload a sharper, well-lit photo.";
    case "LIVENESS_FAILED":
      return "The selfie could not be confirmed. Please upload a clear selfie holding your identity card.";
    case "MISSING_REQUIRED_EVIDENCE":
      return "Please upload both required identity photos to continue.";
    case "DOCUMENT_VALID":
    case "SELFIE_REVIEW_REQUIRED":
    case "HUMAN_REVIEW_REQUIRED":
      return "Your photo was received and is being checked.";
    case "PROVIDER_UNAVAILABLE":
      return "Your photo was received and will be reviewed securely.";
    case "EVIDENCE_REUSED_FOR_DIFFERENT_TYPE":
      return "Please use two different photos for the identity card and selfie.";
    case "EVIDENCE_UPLOAD_IN_PROGRESS":
      return "This photo is already being checked.";
    default:
      return "We could not verify this photo. Please upload a clearer image and try again.";
  }
}

type PersistedEvidenceSlot = {
  documentType: "id-front" | "selfie-with-id";
  localFile: File | null;
  documentId: string | null;
  uploadState: "idle" | "uploading" | "assessing" | "complete" | "error";
  kycStatus: string | null;
  confidence: number | null;
  reasonCodes: string[];
  message: string | null;
};

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  companyHouseNumber: string;
  companyBuilding: string;
  companyFloor: string;
  companyRoad: string;
  companySoi: string;
  companyProvince: string;
  companyDistrict: string;
  companySubdistrict: string;
  companyPostalCode: string;
  password: string;
  confirmPassword: string;
  bio: string;
  yearsExperience: string;
  travelRadius: string;
  selectedSkills: string[];
  scheduledDate: string;
  locationType: "gps" | "dropdown" | "address";
  province: string;
  district: string;
  postalCode: string;
  addressText: string;
  description: string;
  pastExperience: string;
  pastProjectType: "none" | "corporate" | "specialist" | "luxury";
  consent: boolean;
}

const initialForm: FormData = {
  name: "",
  email: "",
  phone: "",
  company: "",
  companyHouseNumber: "",
  companyBuilding: "",
  companyFloor: "",
  companyRoad: "",
  companySoi: "",
  companyProvince: "",
  companyDistrict: "",
  companySubdistrict: "",
  companyPostalCode: "",
  password: "",
  confirmPassword: "",
  bio: "",
  yearsExperience: "",
  travelRadius: "10",
  selectedSkills: [],
  scheduledDate: "",
  locationType: "dropdown",
  province: "",
  district: "",
  postalCode: "",
  addressText: "",
  description: "",
  pastExperience: "",
  pastProjectType: "none",
  consent: false,
};

function normalizeDateToIso(value: string): string | null {
  const input = (value || "").trim();
  if (!input) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const parts = input.split("-").map((v) => parseInt(v, 10));
    if (parts.length !== 3) return null;
    const y = parts[0]!;
    const m = parts[1]!;
    const d = parts[2]!;
    const dt = new Date(y, m - 1, d);
    if (
      dt.getFullYear() === y &&
      dt.getMonth() === m - 1 &&
      dt.getDate() === d
    ) {
      return input;
    }
    return null;
  }

  const ddmmyyyy = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!ddmmyyyy) return null;

  const d = parseInt(ddmmyyyy[1]!, 10);
  const m = parseInt(ddmmyyyy[2]!, 10);
  const y = parseInt(ddmmyyyy[3]!, 10);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }

  return `${y.toString().padStart(4, "0")}-${m
    .toString()
    .padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

function applicantQualificationStatus(status: string | undefined) {
  if (status === "APPROVED") return "Verified";
  if (status === "NEEDS_RESUBMISSION" || status === "NEEDS_MORE_EVIDENCE")
    return "Updates needed";
  return "Under review";
}

function FixerRegisterContent() {
  const t = useTranslations("fixer");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "1";
  const [form, setForm] = useState<FormData>(initialForm);
  const [kycSlots, setKycSlots] = useState<PersistedEvidenceSlot[]>([]);
  const [qualificationDraftId, setQualificationDraftId] = useState<
    string | null
  >(null);
  const [portfolioImages, setPortfolioImages] = useState<File[]>([]);
  const [companyAffidavit, setCompanyAffidavit] = useState<File | null>(null);
  const [portfolioProcessing, setPortfolioProcessing] = useState(false);
  const [qualificationOutcome, setQualificationOutcome] = useState<{
    submissionId: string;
    status: string;
    reviewRequired: boolean;
    recommendedTier: string;
  } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [priceRows, setPriceRows] = useState<PriceRow[]>([
    { service: "", quantity: "", unit: "", finalPrice: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (error) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [error]);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [subscriber, setSubscriber] = useState<{
    name: string;
    email?: string;
  } | null>(null);

  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [isAlreadyFixer, setIsAlreadyFixer] = useState(false);
  const [isRegisteredFixer, setIsRegisteredFixer] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const prefix = `/${locale}`;

  const [scheduledDateInput, setScheduledDateInput] = useState("");

  const populateFixerForm = useCallback((user: any, fixer: any) => {
    const primaryAddress =
      fixer?.user?.addresses?.find((a: any) => a?.isDefault) ||
      fixer?.user?.addresses?.[0] ||
      user?.addresses?.find((a: any) => a?.isDefault) ||
      user?.addresses?.[0] ||
      user?.address;

    const normalizedDate =
      normalizeDateToIso(
        fixer?.availableStartDate || fixer?.scheduledDate || "",
      ) || "";
    const displayDate = normalizedDate
      ? `${normalizedDate.slice(8, 10)}/${normalizedDate.slice(5, 7)}/${normalizedDate.slice(0, 4)}`
      : "";

    setForm((prev) => ({
      ...prev,
      name: user?.name || prev.name,
      email: user?.email || prev.email,
      phone: user?.phone || prev.phone,
      company: fixer?.user?.company || user?.company || prev.company,
      bio: fixer?.bio || "",
      yearsExperience:
        fixer?.yearsExperience !== null && fixer?.yearsExperience !== undefined
          ? String(fixer.yearsExperience)
          : "",
      travelRadius:
        fixer?.travelRadius !== null && fixer?.travelRadius !== undefined
          ? String(fixer.travelRadius)
          : prev.travelRadius,
      selectedSkills: Array.isArray(fixer?.skills)
        ? fixer.skills
            .map((skill: any) =>
              typeof skill === "string"
                ? skill
                : (skill?.name ?? skill?.category ?? ""),
            )
            .filter(Boolean)
        : [],
      province: fixer?.serviceProvince || "",
      district: fixer?.serviceDistrict || "",
      postalCode: fixer?.servicePostalCode || "",
      scheduledDate: displayDate,
      description: fixer?.description || "",
      pastExperience: fixer?.pastExperience || "",
      pastProjectType: fixer?.pastProjectType || "none",
      companyHouseNumber:
        fixer?.companyAddress?.houseNumber ||
        fixer?.address?.houseNumber ||
        primaryAddress?.houseNumber ||
        "",
      companyBuilding:
        fixer?.companyAddress?.building ||
        fixer?.address?.building ||
        primaryAddress?.building ||
        "",
      companyFloor:
        fixer?.companyAddress?.floor ||
        fixer?.address?.floor ||
        primaryAddress?.floor ||
        "",
      companyRoad:
        fixer?.companyAddress?.road ||
        fixer?.address?.road ||
        primaryAddress?.road ||
        "",
      companySoi:
        fixer?.companyAddress?.soi ||
        fixer?.address?.soi ||
        primaryAddress?.soi ||
        "",
      companyProvince:
        fixer?.companyAddress?.province ||
        fixer?.address?.province ||
        primaryAddress?.province ||
        "",
      companyDistrict:
        fixer?.companyAddress?.district ||
        fixer?.address?.district ||
        primaryAddress?.district ||
        "",
      companySubdistrict:
        fixer?.companyAddress?.subdistrict ||
        fixer?.address?.subdistrict ||
        primaryAddress?.subdistrict ||
        "",
      companyPostalCode:
        fixer?.companyAddress?.postalCode ||
        fixer?.address?.postalCode ||
        primaryAddress?.postalCode ||
        "",
      consent: true,
    }));

    const nextPriceRows =
      Array.isArray(fixer?.priceList) && fixer.priceList.length > 0
        ? fixer.priceList.map((row: any) => ({
            service: row?.service || "",
            quantity: row?.quantity ? String(row.quantity) : "",
            unit: row?.unit || "",
            finalPrice: row?.finalPrice ? String(row.finalPrice) : "",
          }))
        : Array.isArray(fixer?.pricing) && fixer.pricing.length > 0
          ? fixer.pricing.map((row: any) => ({
              service: row?.service || row?.name || "",
              quantity: row?.quantity ? String(row.quantity) : "",
              unit: row?.unit || "",
              finalPrice: row?.finalPrice ? String(row.finalPrice) : "",
            }))
          : [{ service: "", quantity: "", unit: "", finalPrice: "" }];

    setPriceRows(nextPriceRows);
    setScheduledDateInput(
      normalizedDate
        ? `${normalizedDate.slice(8, 10)}/${normalizedDate.slice(5, 7)}/${normalizedDate.slice(0, 4)}`
        : "",
    );
  }, []);

  useEffect(() => {
    async function checkFixer() {
      try {
        const token = localStorage.getItem("subscriber_token");
        if (!token) {
          setCheckingStatus(false);
          return;
        }

        const res = await fetch("/api/v1/users/me", {
          headers: { Authorization: "Bearer " + token },
        });
        if (!res.ok) {
          setError(
            locale === "th"
              ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง"
              : locale === "zh"
                ? "会话已过期，请重新登录。"
                : "Your session has expired. Please sign in again.",
          );
          setCheckingStatus(false);
          return;
        }
        const data = await res.json();

        const fixerRes = await fetch("/api/v1/fixers/me", {
          headers: { Authorization: "Bearer " + token },
        });

        let fixerProfile = null;
        if (fixerRes.ok) {
          fixerProfile = await fixerRes.json();
        } else if (data?.fixer) {
          fixerProfile = data.fixer;
        } else if (fixerRes.status !== 404) {
          setError(
            locale === "th"
              ? "ไม่สามารถตรวจสอบสถานะพาร์ทเนอร์ได้ กรุณาลองใหม่"
              : locale === "zh"
                ? "无法验证合作伙伴状态，请重试。"
                : "Unable to verify partner registration status. Please retry.",
          );
          setCheckingStatus(false);
          return;
        }

        const registered = Boolean(fixerProfile?.id);
        setIsAlreadyFixer(registered);
        setIsRegisteredFixer(registered);
        populateFixerForm(data, fixerProfile);
        if (registered && isEditMode) {
          const draftResponse = await fetch(
            "/api/v1/qualification/submissions/draft",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
              },
              body: JSON.stringify({
                consentVersion: "cblue-fixer-qualification-v3",
              }),
            },
          );
          if (draftResponse.ok) {
            const draft = (await draftResponse.json()) as {
              id?: string;
              documents?: Array<{
                id: string;
                documentType: string;
                lifecycleState: string;
                evidenceStatus: string;
                assessmentReasonCodes?: string[];
              }>;
            };
            if (draft.id) setQualificationDraftId(draft.id);
            const persisted = (draft.documents || [])
              .filter(
                (document) =>
                  document.documentType === "id-front" ||
                  document.documentType === "selfie-with-id",
              )
              .map((document) => ({
                documentType: document.documentType as
                  | "id-front"
                  | "selfie-with-id",
                localFile: null,
                documentId: document.id,
                uploadState:
                  document.lifecycleState === "ASSESSING"
                    ? ("assessing" as const)
                    : ("complete" as const),
                kycStatus: document.evidenceStatus,
                confidence: null,
                reasonCodes: document.assessmentReasonCodes || [],
                message: null,
              }));
            setKycSlots(persisted.slice(0, 2));
          }
        }
      } catch {
        // ignore
      }
      setCheckingStatus(false);
    }
    checkFixer();
  }, [isEditMode, locale, populateFixerForm]);

  const addPortfolioImages = useCallback(
    async (incoming: File[]) => {
      if (incoming.length === 0) return;
      const remaining = PORTFOLIO_MAX_FILES - portfolioImages.length;
      if (remaining <= 0) {
        setError("Maximum 10 portfolio images allowed");
        return;
      }
      setPortfolioProcessing(true);
      setError("");
      try {
        const selected = incoming.slice(0, remaining);
        if (incoming.length > remaining) {
          setError(
            "Only " + remaining + " more portfolio image(s) can be added",
          );
        }
        const compressed: File[] = [];
        for (const file of selected) {
          compressed.push(await preparePortfolioFile(file));
        }
        const merged = [...portfolioImages, ...compressed].slice(
          0,
          PORTFOLIO_MAX_FILES,
        );
        setPortfolioImages(merged);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to prepare portfolio images",
        );
      } finally {
        setPortfolioProcessing(false);
      }
    },
    [portfolioImages],
  );

  /* Browser preflight only. Authoritative KYC decisions are made server-side. */
  const [kycValidating, setKycValidating] = useState(false);

  const validateKycImage = useCallback(
    async (
      file: File,
      _slotIndex: number,
    ): Promise<{ valid: boolean; reason?: string }> => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return {
          valid: false,
          reason: "Only JPEG, PNG, or WebP images are supported",
        };
      }

      return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const image = new window.Image();
        image.onload = () => {
          URL.revokeObjectURL(url);
          resolve(
            image.naturalWidth < 200 || image.naturalHeight < 150
              ? {
                  valid: false,
                  reason:
                    "Image too small; minimum resolution is 200x150 pixels",
                }
              : { valid: true },
          );
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({ valid: false, reason: "Cannot read image file" });
        };
        image.src = url;
      });
    },
    [],
  );

  const uploadKycImmediately = useCallback(
    async (
      documentType: "id-front" | "selfie-with-id",
      file: File,
    ): Promise<UploadAssessmentResponse> => {
      const token = localStorage.getItem("subscriber_token");
      if (!token) {
        throw new Error("Please sign in before uploading identity photos.");
      }
      try {
        let draftId = qualificationDraftId;
        if (!draftId) {
          const draftResponse = await fetch(
            "/api/v1/qualification/submissions/draft",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
              },
              body: JSON.stringify({
                consentVersion: "cblue-fixer-qualification-v3",
              }),
            },
          );
          if (!draftResponse.ok) {
            throw new Error("We could not start your secure verification.");
          }
          const draft = (await draftResponse.json()) as { id?: string };
          draftId = draft.id || null;
          if (!draftId) {
            throw new Error("We could not start your secure verification.");
          }
          setQualificationDraftId(draftId);
        }
        const body = new globalThis.FormData();
        body.append("documentType", documentType);
        body.append("file", file);
        const response = await fetch(
          "/api/v1/qualification/submissions/" + draftId + "/documents",
          {
            method: "POST",
            headers: { Authorization: "Bearer " + token },
            body,
          },
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            message?: string | string[];
            code?: string;
          } | null;
          const code = typeof payload?.code === "string" ? payload.code : "";
          if (code) throw new KycUploadError(code);
          throw new Error(
            "We could not receive this file. Please try again with a clearer image.",
          );
        }
        return (await response.json()) as UploadAssessmentResponse;
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error("We could not receive this file. Please try again.");
      }
    },
    [qualificationDraftId],
  );

  const addKycImagesWithValidation = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setKycValidating(true);
      setError("");
      const currentCount = kycSlots.length;
      const newSlots: PersistedEvidenceSlot[] = [];

      for (
        let index = 0;
        index < files.length && currentCount + newSlots.length < 2;
        index += 1
      ) {
        const slotIndex = currentCount + newSlots.length;
        const file = files[index]!;
        const result = await validateKycImage(file, slotIndex);
        if (!result.valid) {
          setError(result.reason || "Image rejected");
          setKycValidating(false);
          return;
        }
        const documentType = slotIndex === 0 ? "id-front" : "selfie-with-id";
        let uploaded: UploadAssessmentResponse | null = null;
        try {
          uploaded = await uploadKycImmediately(documentType, file);
        } catch (error) {
          setError(
            error instanceof KycUploadError
              ? applicantKycReason(error.code)
              : "We could not save this photo securely. Please try again.",
          );
          setKycValidating(false);
          return;
        }
        const immediateReason = uploaded.assessment?.reasonCodes?.find((code) =>
          [
            "WRONG_DOCUMENT_TYPE",
            "INVALID_ID_NUMBER",
            "UNREADABLE_DOCUMENT",
            "EXPIRED_ID",
            "IDENTITY_CONTRADICTION",
            "LIVENESS_FAILED",
          ].includes(code),
        );
        if (
          immediateReason === "WRONG_DOCUMENT_TYPE" ||
          immediateReason === "INVALID_ID_NUMBER" ||
          immediateReason === "UNREADABLE_DOCUMENT" ||
          immediateReason === "EXPIRED_ID" ||
          immediateReason === "IDENTITY_CONTRADICTION" ||
          immediateReason === "LIVENESS_FAILED"
        ) {
          setError(applicantKycReason(immediateReason));
          setKycValidating(false);
          return;
        }
        newSlots.push({
          documentType,
          localFile: file,
          documentId: uploaded.id,
          uploadState: "complete",
          kycStatus:
            uploaded?.assessment?.evidenceStatus ||
            uploaded?.assessment?.route ||
            null,
          confidence: uploaded?.assessment?.confidence ?? null,
          reasonCodes: uploaded?.assessment?.reasonCodes || [],
          message: null,
        });
      }

      if (newSlots.length > 0) {
        setKycSlots((current) => [...current, ...newSlots].slice(0, 2));
      }
      setKycValidating(false);
    },
    [kycSlots.length, validateKycImage, uploadKycImmediately],
  );
  /* Camera helpers for KYC */
  const startCamera = async () => {
    setError("");
    try {
      if (typeof window === "undefined" || typeof navigator === "undefined")
        return;
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          locale === "th"
            ? "เบราว์เซอร์ไม่รองรับกล้อง กรุณาใช้ปุ่มอัพโหลดไฟล์แทน"
            : locale === "zh"
              ? "浏览器不支持摄像头，请使用上传文件按钮"
              : "Browser does not support camera access. Please use the Upload File button instead.",
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setShowCamera(true);
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";
      const msg = err instanceof Error ? err.message : String(err);
      if (name === "NotAllowedError" || msg.includes("Permission")) {
        setError(
          locale === "th"
            ? "กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่าเบราว์เซอร์ แล้วกดเปิดกล้องอีกครั้ง"
            : locale === "zh"
              ? "请在浏览器设置中允许摄像头访问，然后再次点击打开摄像头"
              : "Camera access was denied. Please allow camera permissions in your browser settings, then click Open Camera again.",
        );
      } else if (
        name === "NotFoundError" ||
        name === "DevicesNotFoundError" ||
        msg.includes("Requested device not found")
      ) {
        setError(
          locale === "th"
            ? "ไม่พบกล้องบนอุปกรณ์นี้ กรุณาใช้ปุ่มอัพโหลดไฟล์แทน"
            : locale === "zh"
              ? "未找到摄像头，请使用上传文件按钮"
              : "No camera found on this device. Please use the Upload File button instead.",
        );
      } else if (name === "NotReadableError" || name === "AbortError") {
        setError(
          locale === "th"
            ? "กล้องถูกใช้งานโดยแอปอื่น กรุณาปิดแอปอื่นแล้วลองใหม่"
            : locale === "zh"
              ? "摄像头被其他应用占用，请关闭其他应用后重试"
              : "Camera is being used by another application. Please close other apps and try again.",
        );
      } else {
        setError(
          locale === "th"
            ? "ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบว่าเบราว์เซอร์อนุญาตการเข้าถึงกล้อง"
            : locale === "zh"
              ? "无法打开摄像头，请检查浏览器权限设置"
              : `Could not access camera: ${msg}. Please check your browser camera permissions.`,
        );
      }
    }
  };
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `kyc-capture-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          addKycImagesWithValidation([file]);
        }
      },
      "image/jpeg",
      0.9,
    );
  };
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const handleRecaptcha = useCallback(
    (token: string) => setRecaptchaToken(token),
    [],
  );
  const handleRecaptchaExpire = useCallback(() => setRecaptchaToken(""), []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("subscriber");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSubscriber(parsed);
        setForm((prev) => ({
          ...prev,
          name: parsed.name || prev.name,
          email: parsed.email || prev.email,
          phone: parsed.phone || prev.phone,
        }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const target = e.target;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;
    if (target.name === "province") {
      setForm((prev) => ({ ...prev, province: value as string, district: "" }));
    } else if (target.name === "district") {
      setForm((prev) => ({ ...prev, district: value as string }));
    } else if (target.name === "companyProvince") {
      setForm((prev) => ({
        ...prev,
        companyProvince: value as string,
        companyDistrict: "",
        companySubdistrict: "",
      }));
    } else if (target.name === "companyDistrict") {
      setForm((prev) => ({
        ...prev,
        companyDistrict: value as string,
        companySubdistrict: "",
      }));
    } else if (target.name === "postalCode") {
      const pc = value as string;
      setForm((prev) => ({ ...prev, postalCode: pc }));
      if (pc.length === 5) {
        const lookup = lookupByPostalCode(pc);
        if (lookup)
          setForm((prev) => ({
            ...prev,
            postalCode: pc,
            province: lookup.province,
            district: lookup.district,
          }));
      }
    } else if (target.name === "companyPostalCode") {
      const pc = value as string;
      setForm((prev) => ({ ...prev, companyPostalCode: pc }));
      if (pc.length === 5) {
        const lookup = lookupByPostalCode(pc);
        if (lookup)
          setForm((prev) => ({
            ...prev,
            companyPostalCode: pc,
            companyProvince: lookup.province,
            companyDistrict: lookup.district,
          }));
      }
    } else {
      setForm((prev) => ({ ...prev, [target.name]: value }));
    }
  }

  async function handleGpsDetected(coords: { lat: number; lng: number }) {
    setGpsCoords(coords);
    setForm((prev) => ({
      ...prev,
      province: "",
      district: "",
      postalCode: "",
    }));
    const resolved = await normalizeGpsAddressForSubmit(coords);
    if (!resolved) return;
    setForm((prev) => ({
      ...prev,
      province: resolved.province || prev.province,
      district: resolved.district || prev.district,
      postalCode: resolved.postalCode || prev.postalCode,
      addressText: resolved.subdistrict || prev.addressText,
    }));
  }

  function handleSkillToggle(skillValue: string) {
    setForm((prev) => ({
      ...prev,
      selectedSkills: prev.selectedSkills.includes(skillValue)
        ? prev.selectedSkills.filter((s) => s !== skillValue)
        : [...prev.selectedSkills, skillValue],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Inline auth — if not logged in, validate & create/login account via backend
    if (!subscriber) {
      if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) {
        setError(
          locale === "th"
            ? "กรุณากรอกอีเมลที่ถูกต้อง"
            : locale === "zh"
              ? "请输入有效的电子邮件"
              : "Please enter a valid email address",
        );
        return;
      }
      if (!form.password || form.password.length < 8) {
        setError(
          locale === "th"
            ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"
            : locale === "zh"
              ? "密码至少8个字符"
              : "Password must be at least 8 characters",
        );
        return;
      }
      if (
        !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/`~])/.test(
          form.password,
        )
      ) {
        setError(
          locale === "th"
            ? "รหัสผ่านต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ"
            : locale === "zh"
              ? "密码必须包含小写字母、大写字母、数字和特殊字符"
              : "Password must contain uppercase, lowercase, number, and special character",
        );
        return;
      }
      if (authMode === "register" && form.password !== form.confirmPassword) {
        setError(
          locale === "th"
            ? "รหัสผ่านไม่ตรงกัน"
            : locale === "zh"
              ? "密码不匹配"
              : "Passwords do not match",
        );
        return;
      }
      try {
        const endpoint =
          authMode === "login"
            ? "/api/v1/subscription/login"
            : "/api/v1/subscription/register";
        const body =
          authMode === "login"
            ? { email: form.email.toLowerCase(), password: form.password }
            : {
                name: form.name || form.email,
                email: form.email.toLowerCase(),
                phone: form.phone,
                company: form.company || undefined,
                password: form.password,
              };
        const authRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!authRes.ok) {
          const errData = await authRes.json().catch(() => ({ message: "" }));
          if (
            authRes.status === 403 ||
            authRes.status === 500 ||
            authRes.status === 502 ||
            authRes.status === 530 ||
            authRes.status === 503
          ) {
            setError(
              locale === "th"
                ? "ระบบกำลังปรับปรุง กรุณาลองใหม่ในอีกสักครู่"
                : locale === "zh"
                  ? "系统正在维护中，请稍后再试"
                  : "Service temporarily unavailable. Please try again shortly.",
            );
            return;
          }
          if (authRes.status === 429) {
            setError(
              locale === "th"
                ? "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่"
                : locale === "zh"
                  ? "请求过多，请稍后再试"
                  : "Too many requests. Please wait a moment and try again.",
            );
            return;
          }
          // Auto-fallback: if register returns 409 (email exists), retry as login
          if (authRes.status === 409 && authMode === "register") {
            const loginRes = await fetch("/api/v1/subscription/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: form.email.toLowerCase(),
                password: form.password,
              }),
            });
            if (loginRes.ok) {
              const loginData = await loginRes.json();
              localStorage.setItem("subscriber_token", loginData.accessToken);
              localStorage.setItem(
                "subscriber",
                JSON.stringify(loginData.subscriber),
              );
              setSubscriber(loginData.subscriber);
              setAuthMode("login");
            } else {
              setError(
                locale === "th"
                  ? "อีเมลนี้ลงทะเบียนแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านที่ถูกต้อง"
                  : locale === "zh"
                    ? "此电子邮件已注册，请使用正确的密码登录"
                    : "This email is already registered. Please log in with the correct password.",
              );
              return;
            }
          } else {
            const msg = Array.isArray(errData.message)
              ? errData.message.join(", ")
              : errData.message ||
                (locale === "th"
                  ? "เข้าสู่ระบบ/สมัครสมาชิกล้มเหลว"
                  : locale === "zh"
                    ? "登录/注册失败"
                    : "Login/Register failed");
            setError(msg);
            return;
          }
        } else {
          const authData = await authRes.json();
          localStorage.setItem("subscriber_token", authData.accessToken);
          localStorage.setItem(
            "subscriber",
            JSON.stringify(authData.subscriber),
          );
          setSubscriber(authData.subscriber);
        }
      } catch {
        setError(
          locale === "th"
            ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"
            : locale === "zh"
              ? "无法连接服务器"
              : "Cannot connect to server",
        );
        return;
      }
    }
    if (!form.consent) {
      setError(t("consent"));
      return;
    }
    if (!recaptchaToken) {
      setError("reCAPTCHA");
      return;
    }
    if (form.selectedSkills.length === 0) {
      setError(t("skillError"));
      return;
    }
    if (kycSlots.length < 2) {
      setError(
        locale === "th"
          ? "กรุณาอัปโหลด KYC ให้ครบ 2 รูป (ด้านหน้าและเซลฟี่คู่บัตร)"
          : locale === "zh"
            ? "请上传完整2张KYC图片（正面和手持自拍）"
            : "Please upload both KYC images (front and selfie with ID)",
      );
      return;
    }
    // Added new required fields checks
    if (
      !form.companyHouseNumber ||
      !form.companyProvince ||
      !form.companyDistrict
    ) {
      setError(
        locale === "th"
          ? "กรุณากรอกที่อยู่บริษัท / ที่อยู่ตามทะเบียนบ้านให้ครบถ้วน"
          : locale === "zh"
            ? "请填写完整的公司/住址"
            : "Please complete the company / registered address",
      );
      return;
    }
    if (!form.yearsExperience && !form.pastExperience) {
      setError(
        locale === "th"
          ? "กรุณาระบุประสบการณ์"
          : locale === "zh"
            ? "请说明经验"
            : "Please specify your experience",
      );
      return;
    }
    const normalizedScheduledDate = normalizeDateToIso(
      form.scheduledDate || scheduledDateInput,
    );
    if (!normalizedScheduledDate) {
      setError(
        locale === "th"
          ? "กรุณาระบุวันที่พร้อมเริ่มงานในรูปแบบ DD/MM/YYYY"
          : locale === "zh"
            ? "请输入DD/MM/YYYY格式的可开始日期"
            : "Please enter a valid start date in DD/MM/YYYY format",
      );
      return;
    }
    if (form.locationType !== "gps" && (!form.province || !form.district)) {
      setError(
        locale === "th"
          ? "กรุณาระบุสถานที่ตั้ง / พื้นที่ให้บริการ"
          : locale === "zh"
            ? "请指定服务区域"
            : "Please specify the service area",
      );
      return;
    }
    const validPrices = priceRows.filter((r) => r.service && r.finalPrice);
    if (validPrices.length === 0) {
      setError(
        locale === "th"
          ? "กรุณาระบุตารางราคาบริการอย่างน้อย 1 รายการ"
          : locale === "zh"
            ? "请至少指定一项服务价格"
            : "Please specified at least one price list item",
      );
      return;
    }
    if (portfolioProcessing) {
      setError("Please wait for portfolio image compression to finish");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("subscriber_token");
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        bio: form.bio,
        description: form.description,
        pastExperience: form.pastExperience,
        pastProjectType: form.pastProjectType,
        yearsExperience:
          form.yearsExperience && !isNaN(parseInt(form.yearsExperience))
            ? parseInt(form.yearsExperience)
            : undefined,
        travelRadius: !isNaN(parseInt(form.travelRadius))
          ? parseInt(form.travelRadius)
          : 10,
        skills: form.selectedSkills.map((s) => ({
          category: s,
          name: s,
        })),
        scheduledDate: normalizedScheduledDate,
        address: {
          province: form.province,
          district: form.district,
          subdistrict: form.addressText || undefined,
          postalCode: form.postalCode,
        },
        companyAddress: {
          houseNumber: form.companyHouseNumber || undefined,
          building: form.companyBuilding || undefined,
          floor: form.companyFloor || undefined,
          road: form.companyRoad || undefined,
          soi: form.companySoi || undefined,
          province: form.companyProvince,
          district: form.companyDistrict,
          subdistrict: form.companySubdistrict,
          postalCode: form.companyPostalCode,
        },
        priceList: priceRows
          .filter(
            (r) =>
              r.service &&
              r.finalPrice &&
              /^\d+(\.\d{1,2})?$/.test(r.finalPrice),
          )
          .map((r) => ({
            service: r.service,
            quantity: r.quantity || undefined,
            unit: r.unit,
            finalPrice: r.finalPrice,
          })),
        gpsCoords: gpsCoords || undefined,
        recaptchaToken,
        kycImageCount: kycSlots.length,
        portfolioImageCount: portfolioImages.length,
      };

      const fixerEndpoint = isRegisteredFixer
        ? "/api/v1/fixers/me"
        : "/api/v1/fixers/register";
      const regRes = await fetch(fixerEndpoint, {
        method: isRegisteredFixer ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!regRes.ok) {
        const errData = await regRes.json().catch(() => ({ message: "" }));
        if ([403, 500, 502, 530, 503].includes(regRes.status)) {
          setError(
            locale === "th"
              ? "ระบบกำลังปรับปรุง กรุณาลองใหม่ในอีกสักครู่"
              : locale === "zh"
                ? "系统正在维护中，请稍后再试"
                : "Service temporarily unavailable. Please try again shortly.",
          );
          setSubmitting(false);
          return;
        }
        if (regRes.status === 429) {
          setError(
            locale === "th"
              ? "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่"
              : locale === "zh"
                ? "请求过多，请稍后再试"
                : "Too many requests. Please wait a moment and try again.",
          );
          setSubmitting(false);
          return;
        }
        const msg =
          errData.message ||
          (locale === "th"
            ? "ลงทะเบียนล้มเหลว"
            : locale === "zh"
              ? "注册失败"
              : "Registration failed");
        setError(msg);
        setSubmitting(false);
        return;
      }

      setIsRegisteredFixer(true);
      setIsAlreadyFixer(true);

      const createQualification = await fetch(
        "/api/v1/qualification/submissions/draft",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            consentVersion: "cblue-fixer-qualification-v3",
          }),
        },
      );
      if (!createQualification.ok) {
        const detail = await createQualification.json().catch(() => ({}));
        throw new Error(
          detail.message || "Unable to create qualification submission",
        );
      }
      const qualification = (await createQualification.json()) as {
        id: string;
      };
      setQualificationDraftId(qualification.id);
      const uploadEvidence = async (
        documentType: string,
        file: File,
      ): Promise<UploadAssessmentResponse> => {
        const body = new globalThis.FormData();
        body.append("documentType", documentType);
        body.append("file", file);
        const response = await fetch(
          `/api/v1/qualification/submissions/${qualification.id}/documents`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body,
          },
        );
        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          const code = typeof detail?.code === "string" ? detail.code : "";
          if (code) throw new KycUploadError(code);
          const serverMessage = Array.isArray(detail?.message)
            ? detail.message.join(" ")
            : typeof detail?.message === "string"
              ? detail.message
              : "";
          throw new Error(
            serverMessage ||
              (documentType === "id-front" ||
              documentType === "selfie-with-id"
                ? "We could not receive this photo. Please try again."
                : "We could not receive this document. Please try again."),
          );
        }
        return (await response.json()) as UploadAssessmentResponse;
      };

      const kycTypes = ["id-front", "selfie-with-id"];
      for (let index = 0; index < kycTypes.length; index += 1) {
        if (kycSlots[index]?.documentId) continue;
        setKycSlots((current) =>
          current.map((slot, slotIndex) =>
            slotIndex === index
              ? { ...slot, uploadState: "assessing", message: null }
              : slot,
          ),
        );
        const localFile = kycSlots[index]!.localFile;
        if (!localFile) {
          throw new Error("Please select the identity photo again.");
        }
        const uploaded = await uploadEvidence(
          kycTypes[index]!,
          localFile,
        );
        setKycSlots((current) =>
          current.map((slot, slotIndex) =>
            slotIndex === index
              ? {
                  ...slot,
                  documentId: uploaded.id,
                  uploadState: "complete",
                  kycStatus:
                    uploaded.assessment?.evidenceStatus ||
                    uploaded.assessment?.route ||
                    null,
                  confidence: uploaded.assessment?.confidence ?? null,
                  reasonCodes: uploaded.assessment?.reasonCodes || [],
                  message: uploaded.assessment?.reasonCodes?.[0]
                    ? applicantKycReason(uploaded.assessment.reasonCodes[0])
                    : null,
                }
              : slot,
          ),
        );
      }
      if (companyAffidavit) {
        await uploadEvidence("company-affidavit", companyAffidavit);
      }
      for (const portfolioImage of portfolioImages) {
        await uploadEvidence("portfolio", portfolioImage);
      }

      const finalizeQualification = await fetch(
        `/api/v1/qualification/submissions/${qualification.id}/submit`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!finalizeQualification.ok) {
        const detail = await finalizeQualification.json().catch(() => ({}));
        throw new Error(
          detail.message || "Unable to finalize qualification submission",
        );
      }

      const routedSubmission = (await finalizeQualification.json()) as {
        status?: string;
        confidence?: number | null;
        reasonCodes?: string[];
        humanReviewRequired?: boolean;
      };
      setQualificationOutcome({
        submissionId: qualification.id,
        status: routedSubmission.status || "NEEDS_REVIEW",
        reviewRequired: routedSubmission.humanReviewRequired !== false,
        recommendedTier: "ECONOMY",
      });
      setSuccess(true);
    } catch (cause) {
      setError(
        cause instanceof KycUploadError
          ? applicantKycReason(cause.code)
          : cause instanceof Error
          ? cause.message
          : locale === "th"
            ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"
            : locale === "zh"
              ? "无法连接服务器"
              : "Cannot connect to server",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || checkingStatus)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  if (isAlreadyFixer && !success && !isEditMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-lg text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {locale === "th"
              ? "คุณเป็นช่างของ CBLUE แล้ว"
              : "You are already a CBLUE Fixer"}
          </h2>
          <p className="text-gray-600 mb-8">
            {locale === "th"
              ? "บัญชีของคุณได้รับการลงทะเบียนเป็นช่างและมืออาชีพเรียบร้อยแล้ว คุณสามารถไปที่แดชบอร์ดหรือแก้ไขข้อมูลโปรไฟล์เดิมได้ทันที"
              : "Your account is already registered as a Fixer & Pro. You can go to the dashboard or open your existing fixer profile in edit mode."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`${prefix}/fixers`}
              className="inline-block px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg transition"
            >
              {locale === "th" ? "ไปที่หน้าแดชบอร์ด" : "Go to Dashboard"}
            </Link>
            <Link
              href={`${prefix}/fixers/register?edit=1`}
              className="inline-block px-8 py-3 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-xl border border-gray-300 transition"
            >
              {locale === "th" ? "แก้ไขโปรไฟล์เดิม" : "Edit Existing Profile"}
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (success) {
    const isApproved = qualificationOutcome?.status === "APPROVED";
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-2xl w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {isApproved
              ? locale === "th"
                ? "การยืนยันคุณสมบัติสำเร็จ"
                : locale === "zh"
                  ? "资格验证已完成"
                  : "Qualification Approved"
              : locale === "th"
                ? "ส่งข้อมูลเพื่อพิจารณาแล้ว"
                : locale === "zh"
                  ? "资料已提交审核"
                  : "Qualification Submitted"}
          </h2>
          <p className="text-sm text-gray-600 leading-6">
            {isApproved
              ? locale === "th"
                ? "เราได้รับข้อมูลยืนยันตัวตนแล้ว โปรไฟล์พร้อมสำหรับการพิจารณางานระดับ Economy"
                : locale === "zh"
                  ? "您的身份资料已收到，资料通过后即可接收Economy级别的工作。"
                  : "Your identity information has been received and the profile is ready for Economy-level work."
              : locale === "th"
                ? "เราได้รับเอกสารและผลงานของคุณไว้แล้ว เราจะแจ้งให้ทราบหากต้องแก้ไขข้อมูลหรือเมื่อโปรไฟล์พร้อมรับงาน"
                : locale === "zh"
                  ? "我们已收到您的资料和作品文件。如需补充或修正，我们会及时通知您。"
                  : "Your information has been received. We will notify you if anything needs correction and when your profile is ready to receive work."}
          </p>
          <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-gray-200 p-4">
              <dt className="text-gray-500">Profile review</dt>
              <dd className="font-semibold text-gray-900 mt-1">
                {applicantQualificationStatus(qualificationOutcome?.status)}
              </dd>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <dt className="text-gray-500">Recommended partner level</dt>
              <dd className="font-semibold text-gray-900 mt-1">
                {qualificationOutcome?.recommendedTier || "ECONOMY"}
              </dd>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 sm:col-span-2">
              <dt className="text-gray-500">Documents received</dt>
              <dd className="font-semibold text-gray-900 mt-1">
                {kycSlots.length} identity photo(s) and {portfolioImages.length}{" "}
                portfolio file(s)
              </dd>
            </div>
          </dl>
          {!isApproved && (
            <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Your submitted information is being reviewed. We will let you know
              if anything needs to be corrected and when your profile is ready.
            </p>
          )}
          <div className="mt-7">
            <Link
              href={prefix + "/fixers"}
              className="inline-flex px-6 py-3 bg-green-700 hover:bg-green-800 text-white rounded-lg font-semibold transition"
            >
              {locale === "th"
                ? "ไปที่หน้าพาร์ทเนอร์"
                : locale === "zh"
                  ? "前往合作伙伴页面"
                  : "Go to Partner Page"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode
              ? locale === "th"
                ? "แก้ไขโปรไฟล์ช่าง"
                : locale === "zh"
                  ? "编辑技工个人资料"
                  : "Edit Fixer Profile"
              : locale === "th"
                ? "สมัครเป็นช่าง CBLUE และมืออาชีพ"
                : locale === "zh"
                  ? "注册为 CBLUE 技工与专业人士"
                  : "Register as CBLUE Fixer & Pro"}
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            {isEditMode
              ? locale === "th"
                ? "อัปเดตข้อมูลและข้อมูลประจำตัวของคุณ"
                : locale === "zh"
                  ? "更新您的信息和身份信息"
                  : "Update your information and credentials"
              : locale === "th"
                ? "สมัครเพื่อเข้าถึงบริการมืออาชีพและจัดการคำขอของคุณ"
                : locale === "zh"
                  ? "注册以访问专业服务并管理您的请求"
                  : "Sign up to access professional services and manage your requests"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6"
        >
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Personal Info */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th"
                ? "ข้อมูลส่วนตัว"
                : locale === "zh"
                  ? "个人信息"
                  : "Personal Information"}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {locale === "th"
                    ? "ชื่อ-นามสกุล"
                    : locale === "zh"
                      ? "姓名"
                      : "Full Name"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder={
                    locale === "th"
                      ? "สมชาย ใจดี"
                      : locale === "zh"
                        ? "张三"
                        : "John Doe"
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {locale === "th"
                    ? "อีเมล"
                    : locale === "zh"
                      ? "电子邮件"
                      : "Email"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  inputMode="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {locale === "th"
                    ? "เบอร์โทรศัพท์"
                    : locale === "zh"
                      ? "电话号码"
                      : "Phone Number"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  inputMode="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="0812345678"
                />
              </div>
              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {locale === "th"
                    ? "บริษัท"
                    : locale === "zh"
                      ? "公司"
                      : "Company"}
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={form.company}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder={
                    locale === "th"
                      ? "บริษัท / ร้าน / ส่วนตัว"
                      : locale === "zh"
                        ? "公司 / 店铺 / 个人"
                        : "Company / Shop / Individual"
                  }
                />
              </div>
            </div>
          </fieldset>

          {/* Company / Personal Formal Address */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {" "}
              {locale === "th"
                ? "ที่อยู่บริษัท / ที่อยู่ตามทะเบียนบ้าน"
                : locale === "zh"
                  ? "公司地址 / 户籍地址"
                  : "Company / Personal Formal Address"}{" "}
              <span className="text-red-500">*</span>
            </legend>
            <p className="text-xs text-gray-500 mb-4">
              {locale === "th"
                ? "ที่อยู่สำหรับออกใบสั่งซื้อ (PO) และเอกสารทางการ"
                : locale === "zh"
                  ? "用于采购订单(PO)和正式文件的地址"
                  : "Address for Purchase Order (PO) and official documents"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th"
                    ? "บ้านเลขที่"
                    : locale === "zh"
                      ? "门牌号"
                      : "House No."}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  name="companyHouseNumber"
                  type="text"
                  required
                  value={form.companyHouseNumber}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="123/45"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th"
                    ? "อาคาร / ชั้น"
                    : locale === "zh"
                      ? "建筑 / 楼层"
                      : "Building / Floor"}
                </label>
                <div className="flex gap-2">
                  <input
                    name="companyBuilding"
                    type="text"
                    value={form.companyBuilding}
                    onChange={handleChange}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder={
                      locale === "th"
                        ? "อาคาร A"
                        : locale === "zh"
                          ? "A栋"
                          : "Building A"
                    }
                  />
                  <input
                    name="companyFloor"
                    type="text"
                    value={form.companyFloor}
                    onChange={handleChange}
                    className="w-20 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder={
                      locale === "th"
                        ? "ชั้น"
                        : locale === "zh"
                          ? "楼层"
                          : "Fl."
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "ถนน" : locale === "zh" ? "路" : "Road"}
                </label>
                <input
                  name="companyRoad"
                  type="text"
                  required
                  value={form.companyRoad}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder={
                    locale === "th"
                      ? "ถนนสุขุมวิท"
                      : locale === "zh"
                        ? "素坤逸路"
                        : "Sukhumvit Road"
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "ซอย" : locale === "zh" ? "巷" : "Soi"}
                </label>
                <input
                  name="companySoi"
                  type="text"
                  required
                  value={form.companySoi}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder={
                    locale === "th"
                      ? "ซอย 21"
                      : locale === "zh"
                        ? "21巷"
                        : "Soi 21"
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th"
                    ? "จังหวัด"
                    : locale === "zh"
                      ? "府"
                      : "Province"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  name="companyProvince"
                  required
                  value={form.companyProvince}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">
                    --{" "}
                    {locale === "th"
                      ? "เลือกจังหวัด"
                      : locale === "zh"
                        ? "选择府"
                        : "Select Province"}{" "}
                    --
                  </option>
                  {THAI_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th"
                    ? "อำเภอ/เขต"
                    : locale === "zh"
                      ? "县/区"
                      : "District"}
                </label>
                <select
                  name="companyDistrict"
                  required
                  value={form.companyDistrict}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">
                    --{" "}
                    {locale === "th"
                      ? "เลือกอำเภอ/เขต"
                      : locale === "zh"
                        ? "选择县/区"
                        : "Select District"}{" "}
                    --
                  </option>
                  {getDistrictsForProvince(form.companyProvince).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th"
                    ? "ตำบล/แขวง"
                    : locale === "zh"
                      ? "乡/镇"
                      : "Sub-district"}
                </label>
                <select
                  name="companySubdistrict"
                  required
                  value={form.companySubdistrict}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">
                    --{" "}
                    {locale === "th"
                      ? "เลือกตำบล/แขวง"
                      : locale === "zh"
                        ? "选择乡/镇"
                        : "Select Sub-district"}{" "}
                    --
                  </option>
                  {getSubdistrictsForDistrict(
                    form.companyProvince,
                    form.companyDistrict,
                  ).map((sd) => (
                    <option key={sd} value={sd}>
                      {sd}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th"
                    ? "รหัสไปรษณีย์"
                    : locale === "zh"
                      ? "邮政编码"
                      : "Postal Code"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  name="companyPostalCode"
                  type="text"
                  required
                  maxLength={5}
                  value={form.companyPostalCode}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="10110"
                />
              </div>
            </div>
          </fieldset>

          {/* Login / Create Account */}
          <fieldset className="bg-sky-50 rounded-xl p-5 border border-sky-200">
            <legend className="text-lg font-semibold text-gray-900 mb-1">
              {locale === "th"
                ? "🔐 เข้าสู่ระบบ / สร้างบัญชี (จำเป็น)"
                : locale === "zh"
                  ? "🔐 登录/创建账户（必填）"
                  : "🔐 Login / Create Account (Required)"}
            </legend>
            {subscriber ? (
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-lg font-bold">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-green-700">
                    {locale === "th"
                      ? "เข้าสู่ระบบแล้ว"
                      : locale === "zh"
                        ? "已登录"
                        : "Logged In"}
                  </p>
                  <p className="text-sm text-gray-500">{subscriber.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("subscriber");
                    localStorage.removeItem("subscriber_token");
                    setSubscriber(null);
                  }}
                  className="ml-auto text-xs text-gray-400 hover:text-red-500"
                >
                  {locale === "th"
                    ? "ออกจากระบบ"
                    : locale === "zh"
                      ? "退出"
                      : "Log Out"}
                </button>
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${authMode === "login" ? "bg-sky-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                  >
                    {locale === "th"
                      ? "เข้าสู่ระบบ"
                      : locale === "zh"
                        ? "登录"
                        : "Login"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("register")}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${authMode === "register" ? "bg-sky-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                  >
                    {locale === "th"
                      ? "สมัครสมาชิกใหม่"
                      : locale === "zh"
                        ? "注册新账户"
                        : "Register New Account"}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {locale === "th"
                    ? "ใช้อีเมลจากข้อมูลติดต่อด้านบน รหัสผ่านอย่างน้อย 8 ตัวอักษร"
                    : locale === "zh"
                      ? "使用上方联系信息中的电子邮件，密码至少8个字符"
                      : "Uses the email from Contact Info above. Password must be at least 8 characters."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {locale === "th"
                        ? "รหัสผ่าน"
                        : locale === "zh"
                          ? "密码"
                          : "Password"}
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                  {authMode === "register" && (
                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        {locale === "th"
                          ? "ยืนยันรหัสผ่าน"
                          : locale === "zh"
                            ? "确认密码"
                            : "Confirm Password"}
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                        placeholder="••••••••"
                      />
                    </div>
                  )}
                </div>
                {authMode === "login" && (
                  <Link
                    href={`${prefix}/subscription/forgot-password`}
                    className="text-xs text-sky-600 hover:underline"
                  >
                    {locale === "th"
                      ? "ลืมรหัสผ่าน?"
                      : locale === "zh"
                        ? "忘记密码？"
                        : "Forgot password?"}
                  </Link>
                )}
              </div>
            )}
          </fieldset>

          {/* KYC */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th"
                ? "ยืนยันตัวตน (KYC)"
                : locale === "zh"
                  ? "身份验证 (KYC)"
                  : "Identity Verification (KYC)"}
            </legend>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th"
                    ? "ถ่ายรูป / อัพโหลดรูปบัตรประชาชน"
                    : locale === "zh"
                      ? "拍照或上传身份证照片"
                      : "Capture / Upload ID Card Photos"}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {locale === "th"
                    ? "ถ่ายรูปด้านหน้าบัตรประชาชนและภาพถ่ายคู่กับบัตร (selfie) สูงสุด 2 รูป"
                    : locale === "zh"
                      ? "拍摄身份证正面及手持身份证自拍照，最多2张"
                      : "Upload a photo of the front of your identity card and a selfie with your ID (max 2)"}
                </p>

                {/* Camera view */}
                {showCamera && (
                  <div className="mb-3 rounded-lg overflow-hidden bg-black relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-h-64 object-contain"
                    />
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-4 py-2 bg-white text-gray-900 rounded-full text-sm font-bold shadow-lg hover:bg-gray-100 transition"
                      >
                        📸{" "}
                        {locale === "th"
                          ? "ถ่ายรูป"
                          : locale === "zh"
                            ? "拍照"
                            : "Capture"}
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-bold shadow-lg hover:bg-red-700 transition"
                      >
                        ✕{" "}
                        {locale === "th"
                          ? "ปิดกล้อง"
                          : locale === "zh"
                            ? "关闭"
                            : "Close"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 mb-3">
                  {/* Open Camera — desktop only (hidden on mobile/tablet) */}
                  {!showCamera && (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700 transition shadow"
                    >
                      📷{" "}
                      {locale === "th"
                        ? "เปิดกล้อง"
                        : locale === "zh"
                          ? "打开摄像头"
                          : "Open Camera"}
                    </button>
                  )}
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-100 transition shadow cursor-pointer border border-amber-200">
                    📁{" "}
                    {locale === "th"
                      ? "อัพโหลดไฟล์"
                      : locale === "zh"
                        ? "上传文件"
                        : "Upload File"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files)
                          addKycImagesWithValidation(
                            Array.from(e.target.files),
                          );
                      }}
                    />
                  </label>
                </div>
                {/* KYC photo guide */}
                <p className="text-xs text-gray-400 mb-2">
                  {locale === "th"
                    ? "อัพโหลดตามลำดับ: 1) บัตรด้านหน้า 2) เซลฟี่คู่กับบัตร"
                    : locale === "zh"
                      ? "按顺序上传：1) 证件正面 2) 手持证件自拍"
                      : "Upload in order: 1) ID card front 2) Selfie with ID"}
                </p>
                <p className="text-xs text-sky-600 mb-2">
                  {" "}
                  {locale === "th"
                    ? "blue กำลังตรวจสอบเอกสารยืนยันตัวตนของคุณอย่างปลอดภัย"
                    : locale === "zh"
                      ? "blue 正在安全检查您的身份资料"
                      : "blue is checking your identity securely"}
                </p>

                {/* Validating indicator */}
                {kycValidating && (
                  <div className="flex items-center gap-2 text-sm text-sky-600 mb-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    {locale === "th"
                      ? "blue AI กำลังตรวจสอบรูปภาพ..."
                      : locale === "zh"
                        ? "blue AI 正在检查照片..."
                        : "blue AI is checking the photo..."}
                  </div>
                )}

                {/* Preview captured/uploaded images */}
                {kycSlots.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {kycSlots.map((slot, i) => {
                      const kycLabel =
                        slot.documentType === "id-front"
                          ? locale === "th"
                            ? "ด้านหน้า"
                            : locale === "zh"
                              ? "正面"
                              : "Front"
                          : locale === "th"
                            ? "เซลฟี่คู่บัตร"
                            : locale === "zh"
                              ? "手持证件自拍"
                              : "Selfie with ID";
                      const status =
                        slot.uploadState === "error" ? "rejected" : "valid";
                      return (
                        <div key={i} className="relative group text-center">
                          {slot.localFile ? (
                            <img
                              src={URL.createObjectURL(slot.localFile)}
                              alt={`KYC ${i + 1}`}
                              className={`w-20 h-20 object-cover rounded-lg border-2 ${status === "valid" ? "border-green-400" : "border-gray-200"}`}
                            />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-slate-300 bg-slate-50 px-2 text-center text-[10px] text-slate-600">
                              Stored securely
                            </div>
                          )}
                          <span className="block text-[10px] text-gray-500 mt-0.5">
                            {kycLabel}
                          </span>
                          {slot.uploadState === "assessing" && (
                            <span className="block max-w-28 text-[10px] text-sky-600">
                              Assessing evidence...
                            </span>
                          )}
                          {slot.kycStatus && slot.kycStatus !== "VALIDATED" && (
                            <span className="block max-w-28 text-[10px] text-slate-600">
                              {slot.reasonCodes.length > 0
                                ? applicantKycReason(slot.reasonCodes[0]!)
                                : "Your photo is being reviewed."}
                            </span>
                          )}
                          {status === "valid" && (
                            <span className="absolute top-0.5 left-0.5 text-green-500 text-xs">
                              ✓
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setKycSlots((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              );
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                    <p className="text-xs text-green-600 self-end">
                      {kycSlots.length}/2{" "}
                      {locale === "th"
                        ? "รูป"
                        : locale === "zh"
                          ? "张照片"
                          : "photo(s)"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </fieldset>

          {/* Optional company evidence */}
          <div className="mb-6 w-full rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-semibold text-slate-800">
              {locale === "th"
                ? "หนังสือรับรองบริษัท (ไม่บังคับ)"
                : locale === "zh"
                  ? "公司证明（可选）"
                  : "Company affidavit (optional)"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="mt-2 block w-full text-sm text-slate-600"
                onChange={(event) =>
                  setCompanyAffidavit(event.target.files?.[0] || null)
                }
              />
            </label>
            {companyAffidavit && (
              <p className="mt-2 text-xs text-slate-500">
                {companyAffidavit.name}
              </p>
            )}
          </div>

          {/* Portfolio */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th"
                ? "ผลงาน / Portfolio"
                : locale === "zh"
                  ? "作品集"
                  : "Portfolio"}
            </legend>
            <div>
              <label
                htmlFor="portfolioImages"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {locale === "th"
                  ? "อัพโหลดรูปภาพผลงาน"
                  : locale === "zh"
                    ? "上传作品图片"
                    : "Upload Portfolio Images"}
              </label>
              <p className="text-xs text-gray-500 mb-2">
                {locale === "th"
                  ? "อัปโหลดรูปผลงานหรือไฟล์ PDF ได้สูงสุด 10 ไฟล์ ระบบจะบีบอัดแต่ละไฟล์โดยอัตโนมัติให้มีขนาดไม่เกิน 0.3 MB"
                  : locale === "zh"
                    ? "最多上传10个作品图片或PDF文件。系统会自动将每个文件压缩至不超过0.3 MB。"
                    : "Upload up to 10 portfolio images or PDF files. Images and PDFs are compressed automatically to no more than 0.3 MB each."}
              </p>
              <input
                id="portfolioImages"
                name="portfolioImages"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                disabled={
                  portfolioProcessing ||
                  portfolioImages.length >= PORTFOLIO_MAX_FILES
                }
                onChange={async (event) => {
                  const files = event.target.files
                    ? Array.from(event.target.files)
                    : [];
                  event.target.value = "";
                  await addPortfolioImages(files);
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-800 hover:file:bg-green-100 disabled:opacity-50"
              />
              <p className="mt-2 text-xs text-gray-500">
                {portfolioImages.length}/{PORTFOLIO_MAX_FILES} files, maximum{" "}
                {Math.round(PORTFOLIO_MAX_FILE_BYTES / 1024)} KiB each
              </p>
              {portfolioProcessing && (
                <p className="mt-2 text-xs text-green-700">
                  Preparing selected portfolio files...
                </p>
              )}
              {portfolioImages.length > 0 && (
                <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {portfolioImages.map((file, index) => (
                    <li
                      key={file.name + "-" + file.lastModified + "-" + index}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-xs"
                    >
                      <span className="min-w-0 truncate text-gray-700">
                        {file.name} ({Math.ceil(file.size / 1024)} KiB)
                      </span>
                      <button
                        type="button"
                        className="shrink-0 font-semibold text-red-700 hover:text-red-800"
                        onClick={() =>
                          setPortfolioImages((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </fieldset>

          {/* Skills Selection */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th"
                ? "บริการที่ให้บริการ"
                : locale === "zh"
                  ? "提供的服务"
                  : "Services Offered"}{" "}
              <span className="text-red-500">*</span>
            </legend>
            <p className="text-xs text-gray-500 mb-3">
              {locale === "th"
                ? "เลือกบริการที่ท่านสามารถให้บริการได้ (เลือกได้หลายรายการ)"
                : locale === "zh"
                  ? "选择您可以提供的服务（可多选）"
                  : "Select services you can provide (multiple selections allowed)"}
            </p>

            {/* Household Maintenance */}
            <h4 className="text-sm font-semibold text-blue-700 mt-4 mb-2 flex items-center gap-2">
              {" "}
              {locale === "th"
                ? "งานซ่อมบำรุงบ้าน"
                : locale === "zh"
                  ? "家庭维修"
                  : "Household Maintenance"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {HOUSEHOLD_SERVICES.map((svc) => (
                <label
                  key={svc.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.selectedSkills.includes(svc.value)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.selectedSkills.includes(svc.value)}
                    onChange={() => handleSkillToggle(svc.value)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {locale === "th"
                      ? svc.labelTh
                      : locale === "zh"
                        ? svc.labelZh
                        : svc.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Project Work */}
            <h4 className="text-sm font-semibold text-green-700 mt-4 mb-2 flex items-center gap-2">
              🏗️{" "}
              {locale === "th"
                ? "งานโครงการ"
                : locale === "zh"
                  ? "项目工程"
                  : "Project Work"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {PROJECT_SERVICES.map((svc) => (
                <label
                  key={svc.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.selectedSkills.includes(svc.value)
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.selectedSkills.includes(svc.value)}
                    onChange={() => handleSkillToggle(svc.value)}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">
                    {locale === "th"
                      ? svc.labelTh
                      : locale === "zh"
                        ? svc.labelZh
                        : svc.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Book Professionals */}
            <h4 className="text-sm font-semibold text-purple-700 mt-4 mb-2 flex items-center gap-2">
              {" "}
              {locale === "th"
                ? "มืออาชีพ"
                : locale === "zh"
                  ? "专业人士"
                  : "Book Professionals"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PROFESSIONAL_SERVICES.map((svc) => (
                <label
                  key={svc.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.selectedSkills.includes(svc.value)
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.selectedSkills.includes(svc.value)}
                    onChange={() => handleSkillToggle(svc.value)}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">
                    {locale === "th"
                      ? svc.labelTh
                      : locale === "zh"
                        ? svc.labelZh
                        : svc.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Experience */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th"
                ? "ประสบการณ์"
                : locale === "zh"
                  ? "经验"
                  : "Experience"}{" "}
              <span className="text-red-500">*</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="yearsExperience"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {locale === "th"
                    ? "ประสบการณ์ (ปี)"
                    : locale === "zh"
                      ? "经验（年）"
                      : "Experience (years)"}
                </label>
                <input
                  id="yearsExperience"
                  name="yearsExperience"
                  type="number"
                  min={0}
                  max={50}
                  value={form.yearsExperience}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="5"
                />
              </div>
              <div>
                <label
                  htmlFor="travelRadius"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {locale === "th"
                    ? "รัศมีเดินทาง (กม.)"
                    : locale === "zh"
                      ? "服务半径（公里）"
                      : "Travel Radius (km)"}
                </label>
                <input
                  id="travelRadius"
                  name="travelRadius"
                  type="number"
                  min={1}
                  max={100}
                  value={form.travelRadius}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="10"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="bio"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {locale === "th"
                    ? "แนะนำตัว"
                    : locale === "zh"
                      ? "自我介绍"
                      : "About Me"}
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  value={form.bio}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  placeholder={
                    locale === "th"
                      ? "บอกเล่าประสบการณ์และความเชี่ยวชาญของท่าน"
                      : locale === "zh"
                        ? "请介绍您的经验和专长"
                        : "Tell us about your experience and expertise"
                  }
                />
              </div>
            </div>
          </fieldset>

          {/* Availability */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th"
                ? "วันที่พร้อมเริ่มงาน"
                : locale === "zh"
                  ? "可开始工作日期"
                  : "Available Start Date"}{" "}
              <span className="text-red-500">*</span>
            </legend>
            <div>
              <label
                htmlFor="scheduledDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {locale === "th"
                  ? "วันที่ต้องการเริ่มงาน"
                  : locale === "zh"
                    ? "期望开始日期"
                    : "Desired Start Date"}
              </label>
              <DatePickerInput
                id="scheduledDate"
                name="scheduledDate"
                value={form.scheduledDate}
                onChange={handleChange}
                placeholder="DD/MM/YYYY"
                required
              />
            </div>
          </fieldset>

          {/* Location */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th"
                ? "สถานที่ตั้ง / พื้นที่ให้บริการ"
                : locale === "zh"
                  ? "服务地点 / 服务区域"
                  : "Location / Service Area"}{" "}
              <span className="text-red-500">*</span>
            </legend>
            <div className="space-y-4">
              {/* Location method selector — 3 mutually exclusive options */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="locationType"
                    value="gps"
                    checked={form.locationType === "gps"}
                    onChange={handleChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  📍{" "}
                  {locale === "th"
                    ? "ตรวจจับตำแหน่งอัตโนมัติ (GPS)"
                    : locale === "zh"
                      ? "自动检测位置 (GPS)"
                      : "Auto-detect Location (GPS)"}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="locationType"
                    value="dropdown"
                    checked={form.locationType === "dropdown"}
                    onChange={handleChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  {locale === "th"
                    ? "เลือกจากรายการ"
                    : locale === "zh"
                      ? "从列表选择"
                      : "Select from list"}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="locationType"
                    value="address"
                    checked={form.locationType === "address"}
                    onChange={handleChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  {locale === "th"
                    ? "กรอกที่อยู่ / รหัสไปรษณีย์"
                    : locale === "zh"
                      ? "输入地址 / 邮政编码"
                      : "Enter address / postal code"}
                </label>
              </div>

              {/* GPS mode */}
              {form.locationType === "gps" && (
                <div className="space-y-2">
                  <GpsDetectButton onDetected={handleGpsDetected} />
                  <GpsResolvedLocation
                    locale={locale}
                    gpsCoords={gpsCoords}
                    postalCode={form.postalCode}
                    province={form.province}
                    district={form.district}
                    subdistrict={form.addressText}
                  />
                </div>
              )}

              {/* Dropdown mode */}
              {form.locationType === "dropdown" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="province"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {locale === "th"
                        ? "จังหวัด"
                        : locale === "zh"
                          ? "府"
                          : "Province"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="province"
                      name="province"
                      required
                      value={form.province}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">
                        --{" "}
                        {locale === "th"
                          ? "เลือกจังหวัด"
                          : locale === "zh"
                            ? "选择府"
                            : "Select Province"}{" "}
                        --
                      </option>
                      {THAI_PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="district"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {locale === "th"
                        ? "อำเภอ/เขต"
                        : locale === "zh"
                          ? "县/区"
                          : "District"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="district"
                      name="district"
                      required
                      value={form.district}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">
                        --{" "}
                        {locale === "th"
                          ? "เลือกอำเภอ/เขต"
                          : locale === "zh"
                            ? "选择县/区"
                            : "Select District"}{" "}
                        --
                      </option>
                      {getDistrictsForProvince(form.province).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="postalCode"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {locale === "th"
                        ? "รหัสไปรษณีย์"
                        : locale === "zh"
                          ? "邮政编码"
                          : "Postal Code"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      required
                      maxLength={5}
                      value={form.postalCode}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="10260"
                    />
                  </div>
                </div>
              )}

              {/* Address text mode */}
              {form.locationType === "address" && (
                <div>
                  <label
                    htmlFor="addressText"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {locale === "th"
                      ? "ที่อยู่ หรือ รหัสไปรษณีย์"
                      : locale === "zh"
                        ? "地址或邮政编码"
                        : "Address or Postal Code"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="addressText"
                    name="addressText"
                    required
                    rows={3}
                    value={form.addressText}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    placeholder={
                      locale === "th"
                        ? "กรอกที่อยู่เต็ม หรือ รหัสไปรษณีย์"
                        : locale === "zh"
                          ? "输入完整地址或邮政编码"
                          : "Enter full address or postal code"
                    }
                  />
                </div>
              )}
            </div>
          </fieldset>

          {/* Description */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th"
                ? "รายละเอียดเพิ่มเติม"
                : locale === "zh"
                  ? "其他详情"
                  : "Additional Details"}
            </legend>
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {locale === "th"
                  ? "รายละเอียดโปรเจกต์ / ความต้องการ"
                  : locale === "zh"
                    ? "项目详情 / 需求"
                    : "Project Details / Requirements"}
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={form.description}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                placeholder={
                  locale === "th"
                    ? "ข้อมูลเพิ่มเติมที่ต้องการแจ้ง"
                    : locale === "zh"
                      ? "请填写其他需要告知的信息"
                      : "Any additional information you'd like to share"
                }
              />
            </div>
          </fieldset>

          {/* Price List Table */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th"
                ? "ตารางราคาบริการ *"
                : locale === "zh"
                  ? "服务价格表 *"
                  : "Service Price List *"}
            </legend>
            <p className="text-xs text-gray-500 mb-3">
              {locale === "th"
                ? "กรอกบริการและราคาสุดท้ายรวม VAT (ถ้ามี) เป็นบาท"
                : locale === "zh"
                  ? "填写服务名称和最终价格（含增值税，如适用），单位为泰铢"
                  : "Enter your service and final price including VAT if applicable (THB)"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 font-medium text-gray-700 border-b">
                      {locale === "th"
                        ? "บริการ *"
                        : locale === "zh"
                          ? "服务 *"
                          : "Service *"}
                    </th>
                    <th className="text-center px-3 py-2 font-medium text-gray-700 border-b">
                      {locale === "th"
                        ? "จำนวน *"
                        : locale === "zh"
                          ? "数量 *"
                          : "Quantity *"}
                    </th>
                    <th className="text-center px-3 py-2 font-medium text-gray-700 border-b">
                      {locale === "th"
                        ? "หน่วย *"
                        : locale === "zh"
                          ? "单位 *"
                          : "Unit *"}
                    </th>
                    <th className="text-center px-3 py-2 font-medium text-sky-700 border-b bg-sky-50">
                      {locale === "th"
                        ? "ราคาสุดท้าย รวม VAT (บาท) *"
                        : locale === "zh"
                          ? "最终价格 含增值税（泰铢）*"
                          : "Final Price incl. VAT (THB) *"}
                    </th>
                    <th className="px-2 py-2 border-b w-10" />
                  </tr>
                </thead>
                <tbody>
                  {priceRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          required
                          value={row.service}
                          placeholder={
                            locale === "th"
                              ? "เช่น ซ่อมท่อ"
                              : locale === "zh"
                                ? "例如 修水管"
                                : "e.g. Pipe repair"
                          }
                          onChange={(e) => {
                            const nr = [...priceRows];
                            nr[idx] = { ...nr[idx]!, service: e.target.value };
                            setPriceRows(nr);
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5 w-20">
                        <input
                          type="text"
                          required
                          value={row.quantity}
                          placeholder={
                            locale === "th"
                              ? "เช่น 1"
                              : locale === "zh"
                                ? "例如 1"
                                : "e.g. 1"
                          }
                          onChange={(e) => {
                            const nr = [...priceRows];
                            nr[idx] = { ...nr[idx]!, quantity: e.target.value };
                            setPriceRows(nr);
                          }}
                          className="w-full px-2 py-1.5 text-sm text-center border border-gray-200 rounded focus:border-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          required
                          value={row.unit}
                          placeholder={
                            locale === "th"
                              ? "เช่น จุด, ตร.ม."
                              : locale === "zh"
                                ? "例如 个, 平方米"
                                : "e.g. point, sq.m."
                          }
                          onChange={(e) => {
                            const nr = [...priceRows];
                            nr[idx] = { ...nr[idx]!, unit: e.target.value };
                            setPriceRows(nr);
                          }}
                          className="w-full px-2 py-1.5 text-sm text-center border border-gray-200 rounded focus:border-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          required
                          min={0}
                          value={row.finalPrice}
                          placeholder="฿"
                          onChange={(e) => {
                            const nr = [...priceRows];
                            nr[idx] = {
                              ...nr[idx]!,
                              finalPrice: e.target.value,
                            };
                            setPriceRows(nr);
                          }}
                          className="w-full px-2 py-1.5 text-sm text-center border border-gray-200 rounded focus:border-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        {priceRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPriceRows(
                                priceRows.filter((_, i) => i !== idx),
                              )
                            }
                            className="text-red-400 hover:text-red-600 text-lg"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() =>
                setPriceRows([
                  ...priceRows,
                  { service: "", quantity: "", unit: "", finalPrice: "" },
                ])
              }
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              +{" "}
              {locale === "th"
                ? "เพิ่มรายการ"
                : locale === "zh"
                  ? "添加行"
                  : "Add Row"}
            </button>
          </fieldset>

          {/* Past Work Experience */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th"
                ? "ประสบการณ์งานที่ผ่านมา"
                : locale === "zh"
                  ? "过往工作经验"
                  : "Past Work Experience"}
            </legend>
            <p className="text-xs text-gray-500 mb-3">
              {locale === "th"
                ? "ผู้ที่มีประสบการณ์ระดับองค์กร จะมีสิทธิ์ได้รับระดับ Corporate, ผู้ชำนาญพิเศษได้รับ Specialist และผู้มีประสบการณ์โครงการหรู/มีชื่อเสียง ได้รับ Expert"
                : locale === "zh"
                  ? "有企业经验者获得 Corporate，专业经验获得 Specialist，豪华/知名项目经验获得 Expert"
                  : "Corporate experience qualifies for Corporate tier. Specialist experience qualifies for Specialist. Famous/luxury project experience qualifies for Expert tier."}
            </p>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="pastExperience"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {locale === "th"
                    ? "อธิบายประสบการณ์งานที่ผ่านมา"
                    : locale === "zh"
                      ? "描述过往工作经验"
                      : "Describe your past work experience"}
                </label>
                <textarea
                  id="pastExperience"
                  name="pastExperience"
                  rows={3}
                  value={form.pastExperience}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  placeholder={
                    locale === "th"
                      ? "รายละเอียดผลงาน ชื่อโครงการ บริษัทที่เคยทำงานด้วย"
                      : locale === "zh"
                        ? "项目名称、合作公司、知名项目等"
                        : "Project names, companies worked with, notable projects"
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {locale === "th"
                    ? "ประเภทผลงานที่ผ่านมา"
                    : locale === "zh"
                      ? "过往项目类型"
                      : "Past Project Type"}
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {(
                    [
                      {
                        value: "none",
                        label:
                          locale === "th"
                            ? "ทั่วไป (Economy/Standard)"
                            : locale === "zh"
                              ? "一般（Economy/Standard）"
                              : "General (Economy/Standard)",
                      },
                      {
                        value: "corporate",
                        label:
                          locale === "th"
                            ? "ระดับองค์กร → Corporate"
                            : locale === "zh"
                              ? "企业级 → Corporate"
                              : "Corporate Level → Corporate Tier",
                      },
                      {
                        value: "specialist",
                        label:
                          locale === "th"
                            ? "ผู้ชำนาญพิเศษ → Specialist"
                            : locale === "zh"
                              ? "专业级 → Specialist"
                              : "Specialist Level → Specialist Tier",
                      },
                      {
                        value: "luxury",
                        label:
                          locale === "th"
                            ? "โครงการหรู/มีชื่อเสียง → Expert"
                            : locale === "zh"
                              ? "豪华/知名项目 → Expert"
                              : "Famous/Luxury Project → Expert Tier",
                      },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${
                        form.pastProjectType === opt.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="pastProjectType"
                        value={opt.value}
                        checked={form.pastProjectType === opt.value}
                        onChange={handleChange}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

          {/* Consent & Submit */}
          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <input
                id="consent"
                name="consent"
                type="checkbox"
                checked={form.consent}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="consent" className="text-sm text-gray-600">
                {locale === "th" ? (
                  <>
                    ข้าพเจ้ายืนยันว่าข้อมูลทั้งหมดเป็นความจริง และยอมรับ{" "}
                    <a href="/terms" className="text-blue-600 hover:underline">
                      เงื่อนไขการใช้งาน
                    </a>{" "}
                    และ{" "}
                    <a
                      href="/privacy"
                      className="text-blue-600 hover:underline"
                    >
                      นโยบายความเป็นส่วนตัว
                    </a>
                  </>
                ) : locale === "zh" ? (
                  <>
                    我确认所有信息均为真实，并接受{" "}
                    <a href="/terms" className="text-blue-600 hover:underline">
                      使用条款
                    </a>{" "}
                    和{" "}
                    <a
                      href="/privacy"
                      className="text-blue-600 hover:underline"
                    >
                      隐私政策
                    </a>
                  </>
                ) : (
                  <>
                    I confirm that all information is accurate and I accept the{" "}
                    <a href="/terms" className="text-blue-600 hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy"
                      className="text-blue-600 hover:underline"
                    >
                      Privacy Policy
                    </a>
                  </>
                )}
              </label>
            </div>

            <ReCaptcha
              onVerify={handleRecaptcha}
              onExpire={handleRecaptchaExpire}
            />

            <button
              type="submit"
              disabled={submitting || !form.consent || !recaptchaToken}
              className={`w-full py-3 px-6 text-base font-semibold rounded-xl transition-colors ${
                form.consent && recaptchaToken
                  ? "text-white bg-blue-700 hover:bg-blue-800"
                  : "text-gray-400 bg-gray-200 cursor-not-allowed"
              }`}
            >
              {submitting
                ? locale === "th"
                  ? "กำลังส่ง..."
                  : locale === "zh"
                    ? "提交中..."
                    : "Submitting..."
                : locale === "th"
                  ? isEditMode
                    ? "บันทึกการแก้ไขโปรไฟล์"
                    : "สมัครเป็นช่าง CBLUE"
                  : locale === "zh"
                    ? isEditMode
                      ? "保存资料修改"
                      : "注册成为 CBLUE 技工"
                    : isEditMode
                      ? "Save Profile Changes"
                      : "Register as CBLUE Fixer"}
            </button>
            {isEditMode && (
              <Link
                href={`${prefix}/fixers`}
                className="block text-center w-full py-2.5 px-6 text-sm font-medium rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                {locale === "th"
                  ? "ยกเลิกการแก้ไข"
                  : locale === "zh"
                    ? "取消编辑"
                    : "Cancel Edit"}
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FixerRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <FixerRegisterContent />
    </Suspense>
  );
}
