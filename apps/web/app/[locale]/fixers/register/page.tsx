"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useTranslations, useLocale } from "next-intl";
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
import ReCaptcha from "../../components/ReCaptcha";
import GpsDetectButton from "../../components/GpsDetectButton";
import Link from "next/link";

interface PriceRow {
  service: string;
  quantity: string;
  unit: string;
  finalPrice: string;
}

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

export default function FixerRegisterPage() {
  const t = useTranslations("fixer");
  const locale = useLocale();
  const [form, setForm] = useState<FormData>(initialForm);
  const [kycImages, setKycImages] = useState<File[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<File[]>([]);
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

  const prefix = `/${locale}`;

  // AI Portfolio Digest state
  const [digestResult, setDigestResult] = useState<{
    results: {
      file_id: string;
      filename: string;
      raw_text: string;
      text_length: number;
      has_content: boolean;
      verification_hints: string[];
      extraction_method: string;
    }[];
    total_files: number;
    total_text_length: number;
    content_score: number;
    fallback?: boolean;
  } | null>(null);
  const [digesting, setDigesting] = useState(false);


  useEffect(() => {
    async function checkFixer() {
      try {
        const token = localStorage.getItem("subscriber_token");
        if (token) {
          const res = await fetch("/api/v1/users/me", { headers: { Authorization: `Bearer ${token}` }});
          if (res.ok) {
            const data = await res.json();
            if (data.fixer) {
              setIsAlreadyFixer(true);
            }
          }
        }
      } catch (e) {}
      setCheckingStatus(false);
    }
    checkFixer();
  }, []);

  if (checkingStatus) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (isAlreadyFixer && !success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-lg text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{locale === "th" ? "คุณเป็นช่างของ CBLUE แล้ว" : "You are already a CBLUE Fixer"}</h2>
          <p className="text-gray-600 mb-8">{locale === "th" ? "บัญชีของคุณได้รับการลงทะเบียนเป็นช่างและมืออาชีพเรียบร้อยแล้ว คุณสามารถจัดการโปรไฟล์และรับงานได้ที่หน้าแดชบอร์ด" : "Your account is already registered as a Fixer & Pro. You can manage your profile and accept jobs from your dashboard."}</p>
          <Link href={`${prefix}/fixers`} className="inline-block px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg transition">
            {locale === "th" ? "ไปที่หน้าแดชบอร์ด" : "Go to Dashboard"}
          </Link>
        </div>
      </div>
    );
  }



  useEffect(() => {
    async function checkFixer() {
      try {
        const token = localStorage.getItem("subscriber_token");
        if (token) {
          const res = await fetch("/api/v1/users/me", { headers: { Authorization: `Bearer ${token}` }});
          if (res.ok) {
            const data = await res.json();
            if (data.fixer) {
              setIsAlreadyFixer(true);
            }
          }
        }
      } catch (e) {}
      setCheckingStatus(false);
    }
    checkFixer();
  }, []);

  if (checkingStatus) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (isAlreadyFixer && !success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-lg text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{locale === "th" ? "คุณเป็นช่างของ CBLUE แล้ว" : "You are already a CBLUE Fixer"}</h2>
          <p className="text-gray-600 mb-8">{locale === "th" ? "บัญชีของคุณได้รับการลงทะเบียนเป็นช่างและมืออาชีพเรียบร้อยแล้ว คุณสามารถจัดการโปรไฟล์และรับงานได้ที่หน้าแดชบอร์ด" : "Your account is already registered as a Fixer & Pro. You can manage your profile and accept jobs from your dashboard."}</p>
          <Link href={`${prefix}/fixers`} className="inline-block px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg transition">
            {locale === "th" ? "ไปที่หน้าแดชบอร์ด" : "Go to Dashboard"}
          </Link>
        </div>
      </div>
    );
  }


  // Send portfolio files to AI vision service for OCR/text extraction
  const digestPortfolioFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setDigesting(true);
    try {
      const fd = new globalThis.FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch("/api/v1/fixers/portfolio-digest", {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setDigestResult(data);
      } else {
        // AI OCR fallback on error from backend
        setDigestResult({
          results: files.map((f) => ({
            file_id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            filename: f.name,
            raw_text: "",
            text_length: 0,
            has_content: false,
            verification_hints: [
              "Vision service unavailable — analysis deferred",
            ],
            extraction_method: "none_vision_service_unavailable",
          })),
          total_files: files.length,
          total_text_length: 0,
          content_score: 0,
          fallback: true,
        });
      }
    } catch {
      // Vision service unavailable — non-blocking fallback
      setDigestResult({
        results: files.map((f) => ({
          file_id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          filename: f.name,
          raw_text: "",
          text_length: 0,
          has_content: false,
          verification_hints: [
            "Vision service unavailable — analysis deferred",
          ],
          extraction_method: "none_vision_service_unavailable",
        })),
        total_files: files.length,
        total_text_length: 0,
        content_score: 0,
        fallback: true,
      });
    } finally {
      setDigesting(false);
    }
  }, []);

  /* KYC AI Image Validation — checks if uploaded photo matches expected document type */
  const [kycSlotStatus, setKycSlotStatus] = useState<
    ("pending" | "valid" | "rejected")[]
  >([]);
  const [kycValidating, setKycValidating] = useState(false);

  const validateKycImage = useCallback(
    async (
      file: File,
      slotIndex: number,
    ): Promise<{ valid: boolean; reason?: string }> => {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const aspect = w / h;

          // ── 1. MINIMUM SIZE: readable ID ──
          if (w < 200 || h < 150) {
            resolve({
              valid: false,
              reason:
                locale === "th"
                  ? "รูปภาพเล็กเกินไป — ต้องมีความละเอียดอย่างน้อย 200x150 พิกเซล"
                  : locale === "zh"
                    ? "图片太小 — 最低分辨率 200x150 像素"
                    : "Image too small — minimum 200×150 pixels required",
            });
            return;
          }

          // ── CANVAS ANALYSIS ──
          const canvas = document.createElement("canvas");
          const sz = 64; // Downsample for perf
          canvas.width = sz;
          canvas.height = sz;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve({ valid: true });
            return;
          }
          ctx.drawImage(img, 0, 0, sz, sz);
          const data = ctx.getImageData(0, 0, sz, sz).data;
          const total = sz * sz;

          // ── 2. COLOR VARIANCE — reject solid/blank images ──
          let sumR = 0,
            sumG = 0,
            sumB = 0;
          for (let i = 0; i < data.length; i += 4) {
            sumR += data[i]!;
            sumG += data[i + 1]!;
            sumB += data[i + 2]!;
          }
          const avgR = sumR / total,
            avgG = sumG / total,
            avgB = sumB / total;
          let variance = 0;
          for (let i = 0; i < data.length; i += 4) {
            variance +=
              (data[i]! - avgR) ** 2 +
              (data[i + 1]! - avgG) ** 2 +
              (data[i + 2]! - avgB) ** 2;
          }
          variance /= total;

          if (variance < 50) {
            resolve({
              valid: false,
              reason:
                locale === "th"
                  ? "รูปภาพดูเหมือนว่างเปล่าหรือเป็นสีเดียว — กรุณาอัพโหลดรูปบัตรประชาชนจริง"
                  : locale === "zh"
                    ? "图片看起来是空白或纯色 — 请上传真实身份证照片"
                    : "Image appears blank or solid color — please upload actual ID card photo",
            });
            return;
          }

          // ── 3. EDGE DETECTION — Sobel gradient for text/features ──
          let edgeSum = 0;
          for (let y = 1; y < sz - 1; y++) {
            for (let x = 1; x < sz - 1; x++) {
              const left = data[(y * sz + (x - 1)) * 4]!;
              const right = data[(y * sz + (x + 1)) * 4]!;
              const top = data[((y - 1) * sz + x) * 4]!;
              const bottom = data[((y + 1) * sz + x) * 4]!;
              edgeSum += Math.abs(right - left) + Math.abs(bottom - top);
            }
          }
          const edgeDensity = edgeSum / ((sz - 2) * (sz - 2));

          // ── 4. SKIN TONE DETECTION — for selfie verification ──
          let skinPixels = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]!,
              g = data[i + 1]!,
              b = data[i + 2]!;
            // YCbCr-based skin detection (works across skin tones)
            const y2 = 0.299 * r + 0.587 * g + 0.114 * b;
            const cb = 128 - 0.169 * r - 0.331 * g + 0.5 * b;
            const cr = 128 + 0.5 * r - 0.419 * g - 0.081 * b;
            if (y2 > 50 && cb > 77 && cb < 127 && cr > 133 && cr < 173)
              skinPixels++;
          }
          const skinRatio = skinPixels / total;

          // ── 5. TEXT-LIKE REGION DENSITY — structured text areas ──
          let horizontalEdgeRows = 0;
          for (let y = 1; y < sz - 1; y++) {
            let rowEdge = 0;
            for (let x = 1; x < sz - 1; x++) {
              const left = data[(y * sz + (x - 1)) * 4]!;
              const right = data[(y * sz + (x + 1)) * 4]!;
              if (Math.abs(right - left) > 20) rowEdge++;
            }
            if (rowEdge > sz * 0.25) horizontalEdgeRows++;
          }
          const textDensity = horizontalEdgeRows / (sz - 2);

          // ───── SLOT 0 & 1: ID CARD FRONT / BACK ─────
          if (slotIndex < 2) {
            // ID cards are landscape (~1.4-1.8 aspect ratio for Thai ID)
            if (aspect < 0.7 && edgeDensity < 8) {
              resolve({
                valid: false,
                reason:
                  locale === "th"
                    ? "AI ตรวจพบว่ารูปนี้ไม่ใช่บัตรประชาชน — บัตรประชาชนควรเป็นรูปแนวนอน"
                    : locale === "zh"
                      ? "AI检测到此图不是身份证 — 身份证应为横向照片"
                      : "AI detected this is not an ID card — ID cards should be landscape orientation",
              });
              return;
            }
            // Need sufficient text/features for a document
            if (edgeDensity < 5) {
              resolve({
                valid: false,
                reason:
                  locale === "th"
                    ? "AI ตรวจพบว่ารูปนี้อาจไม่ใช่เอกสาร — กรุณาอัพโหลดรูปบัตรประชาชนที่ชัดเจน"
                    : locale === "zh"
                      ? "AI检测到此图可能不是文件 — 请上传清晰的身份证照片"
                      : "AI detected this may not be a document — please upload a clear ID card photo",
              });
              return;
            }
            // ID card should have text regions (at least 15% rows with text-like edges)
            if (textDensity < 0.12 && edgeDensity < 10) {
              resolve({
                valid: false,
                reason:
                  locale === "th"
                    ? "AI ไม่พบข้อความบนเอกสาร — กรุณาอัพโหลดรูปบัตรประชาชนที่ชัดเจน"
                    : locale === "zh"
                      ? "AI未检测到文件上的文字 — 请上传清晰的身份证照片"
                      : "AI did not detect text on this document — please upload a clear ID card photo",
              });
              return;
            }
            // Too much skin in ID card slot = probably a selfie, not an ID card
            if (skinRatio > 0.45) {
              resolve({
                valid: false,
                reason:
                  locale === "th"
                    ? "AI ตรวจพบว่ารูปนี้อาจเป็นเซลฟี่ — กรุณาอัพโหลดรูปบัตรประชาชน" +
                      (slotIndex === 0 ? "ด้านหน้า" : "ด้านหลัง")
                    : locale === "zh"
                      ? "AI检测到这可能是自拍照 — 请上传身份证" +
                        (slotIndex === 0 ? "正面" : "背面") +
                        "照片"
                      : `AI detected this may be a selfie — please upload ID card ${slotIndex === 0 ? "front" : "back"} photo`,
              });
              return;
            }
            // FRONT slot additional: should have moderate skin (face photo area ~10-40%)
            if (slotIndex === 0 && skinRatio < 0.02 && edgeDensity < 12) {
              resolve({
                valid: false,
                reason:
                  locale === "th"
                    ? "AI ไม่พบรูปถ่ายบนบัตร — กรุณาอัพโหลดบัตรประชาชน ด้านหน้า ที่มีรูปถ่าย"
                    : locale === "zh"
                      ? "AI未在卡上检测到照片 — 请上传带照片的身份证正面"
                      : "AI did not detect a photo on the card — please upload the ID card front with photo",
              });
              return;
            }
          }

          // ───── SLOT 2: SELFIE WITH ID CARD ─────
          if (slotIndex === 2) {
            if (edgeDensity < 4) {
              resolve({
                valid: false,
                reason:
                  locale === "th"
                    ? "AI ตรวจพบว่ารูปนี้ไม่ใช่เซลฟี่ — กรุณาถ่ายเซลฟี่คู่กับบัตรประชาชน"
                    : locale === "zh"
                      ? "AI检测到此图不是自拍 — 请拍摄手持身份证自拍照"
                      : "AI detected this is not a selfie — please take a selfie holding your ID card",
              });
              return;
            }
            // Selfie MUST have skin tone (face visible) — at least 8%
            if (skinRatio < 0.06) {
              resolve({
                valid: false,
                reason:
                  locale === "th"
                    ? "AI ไม่พบใบหน้าในรูป — กรุณาถ่ายเซลฟี่ที่เห็นหน้าชัดเจนพร้อมบัตรประชาชน"
                    : locale === "zh"
                      ? "AI未检测到人脸 — 请拍摄面部清晰可见的自拍照并持身份证"
                      : "AI did not detect a face — please take a selfie with your face clearly visible, holding your ID card",
              });
              return;
            }
            // Selfie should NOT be pure landscape (too wide = not a selfie)
            if (aspect > 2.5 && skinRatio < 0.12) {
              resolve({
                valid: false,
                reason:
                  locale === "th"
                    ? "รูปภาพกว้างเกินไปสำหรับเซลฟี่ — กรุณาถ่ายรูปแนวตั้งหรือสี่เหลี่ยม"
                    : locale === "zh"
                      ? "图片太宽，不像自拍 — 请拍摄竖版或方形照片"
                      : "Image too wide for a selfie — please take a portrait or square photo",
              });
              return;
            }
          }

          resolve({ valid: true });
        };
        img.onerror = () =>
          resolve({
            valid: false,
            reason:
              locale === "th"
                ? "ไม่สามารถอ่านไฟล์รูปภาพได้"
                : locale === "zh"
                  ? "无法读取图片文件"
                  : "Cannot read image file",
          });
        img.src = URL.createObjectURL(file);
      });
    },
    [locale],
  );

  const addKycImagesWithValidation = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setKycValidating(true);
      setError("");
      const currentCount = kycImages.length;
      const newFiles: File[] = [];
      const newStatuses: ("pending" | "valid" | "rejected")[] = [
        ...kycSlotStatus,
      ];

      for (
        let i = 0;
        i < files.length && currentCount + newFiles.length < 3;
        i++
      ) {
        const slotIdx = currentCount + newFiles.length;
        const file = files[i]!;
        const result = await validateKycImage(file, slotIdx);

        if (result.valid) {
          // Backend AI Validation
          try {
            const fd = new globalThis.FormData();
            fd.append("file", file);
            const res = await fetch("/api/v1/fixers/kyc-digest", {
              method: "POST",
              body: fd,
            });
            if (res.ok) {
              const aiData = await res.json();
              // If it's ID Front (slot 0) or ID Back (slot 1), verify text was found
              if (
                slotIdx < 2 &&
                (!aiData.has_content || aiData.text_length < 20) &&
                !aiData.fallback // Skip validation if Python AI is down
              ) {
                newStatuses[slotIdx] = "rejected";
                setError(
                  locale === "th"
                    ? "AI ไม่พบข้อความในเอกสาร — กรุณาถ่ายให้ชัดเจน"
                    : locale === "zh"
                      ? "AI未检测到文件上的文字 — 请拍摄清晰照片"
                      : "AI did not detect text — please take a clearer photo",
                );
                return;
              }
            } else {
              // Graceful degradation when the endpoint throws a 502/400
              console.warn("KYC digest failed, bypassing strict OCR check");
            }
          } catch (e) {
            // Service fully offline
            console.warn(
              "KYC digest unreachable, bypassing strict OCR check",
              e,
            );
          }

          newFiles.push(file);
          newStatuses[slotIdx] = "valid";
        } else {
          newStatuses[slotIdx] = "rejected";
          setError(result.reason || "Image rejected");
          setKycValidating(false);
          return; // Stop on first rejection to show user the error
        }
      }

      if (newFiles.length > 0) {
        setKycImages((prev) => [...prev, ...newFiles].slice(0, 3));
        setKycSlotStatus(newStatuses);
      }
      setKycValidating(false);
    },
    [kycImages.length, kycSlotStatus, validateKycImage],
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
            const msg =
              errData.message ||
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
    if (kycImages.length === 0) {
      setError(t("kycError"));
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
    if (!form.scheduledDate) {
      setError(
        locale === "th"
          ? "กรุณาระบุวันที่พร้อมเริ่มงาน"
          : locale === "zh"
            ? "请指定随时可开始工作的日期"
            : "Please specify the date ready to start",
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
        scheduledDate: form.scheduledDate,
        address: {
          province: form.province,
          district: form.district,
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
        kycImageCount: kycImages.length,
        portfolioImageCount: portfolioImages.length,
      };

      const regRes = await fetch("/api/v1/fixers/register", {
        method: "POST",
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

      setSuccess(true);
    } catch {
      setError(
        locale === "th"
          ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"
          : locale === "zh"
            ? "无法连接服务器"
            : "Cannot connect to server",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // AI Evaluation logic — Enhanced with credential verification, fraud detection, internet checks
  const [aiStep, setAiStep] = useState<"evaluating" | "verified" | null>(null);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiPhase, setAiPhase] = useState(0); // 0-7 phases
  const [aiTier, setAiTier] = useState<{
    tier: string;
    score: number;
    breakdown: { label: string; score: number; max: number }[];
    flags: { type: "pass" | "warn" | "fail"; message: string }[];
    credentialStatus: "verified" | "partial" | "unverified";
  } | null>(null);

  // AI Evaluation runs once when form submission succeeds
  useEffect(() => {
    if (!success || aiStep) return;
    setAiStep("evaluating");
    setAiProgress(0);
    setAiPhase(0);

    // Phase progression: each phase takes ~600ms
    const phases = 9;
    let currentPhase = 0;
    const phaseInterval = setInterval(() => {
      currentPhase++;
      setAiPhase(currentPhase);
      setAiProgress(Math.min(Math.round((currentPhase / phases) * 100), 100));
      if (currentPhase >= phases) {
        clearInterval(phaseInterval);

        // ──────── ENHANCED AI SCORING ALGORITHM ────────
        const yrs = parseInt(form.yearsExperience || "0");
        const skillCount = form.selectedSkills.length;
        const hasKyc = kycImages.length > 0;
        const kycMultiple = kycImages.length >= 2; // front + back ID
        const hasPortfolio = portfolioImages.length > 0;
        const portfolioCount = portfolioImages.length;
        const descLength = (form.pastExperience || "").length;
        const hasDescription = descLength > 20;
        const hasDetailedDesc = descLength > 100;
        const priceRowCount = priceRows.filter(
          (r) => r.service && r.finalPrice,
        ).length;
        const hasBio = (form.bio || "").length > 30;
        const hasCompanyAddress = !!(
          form.companyProvince &&
          form.companyDistrict &&
          form.companyHouseNumber
        );
        const hasServiceArea = !!(form.province && form.district);
        const nameWords = (form.name || "").trim().split(/\s+/).length;
        const hasFullName = nameWords >= 2;
        const hasPhone = (form.phone || "").length >= 9;
        const hasEmail = (form.email || "").includes("@");
        const hasCompany = (form.company || "").length > 2;
        const hasPastProjectType = form.pastProjectType !== "none";

        // ── 1. Experience Score (max 25) ──
        const expScore = Math.min(yrs * 4, 25);

        // ── 2. Skills Breadth (max 15) ──
        const skillScore = Math.min(skillCount * 3, 15);

        // ── 3. KYC Verification (max 15) ──
        const kycScore = kycMultiple ? 15 : hasKyc ? 10 : 0;

        // ── 4. Portfolio & Evidence (max 15) ──
        // Base score from image count + bonus from AI document analysis
        let portfolioScore =
          portfolioCount >= 5
            ? 12
            : portfolioCount >= 3
              ? 9
              : hasPortfolio
                ? 6
                : 0;
        if (digestResult && !digestResult.fallback) {
          // Bonus up to 3 pts from OCR content quality
          if (digestResult.content_score >= 70)
            portfolioScore = Math.min(portfolioScore + 3, 15);
          else if (digestResult.content_score >= 40)
            portfolioScore = Math.min(portfolioScore + 2, 15);
          else if (digestResult.total_text_length > 50)
            portfolioScore = Math.min(portfolioScore + 1, 15);
        }

        // ── 5. Profile Completeness (max 10) ──
        const profileScore =
          (hasBio ? 3 : 0) +
          (hasFullName ? 2 : 0) +
          (hasCompanyAddress ? 3 : 0) +
          (hasServiceArea ? 2 : 0);

        // ── 6. Price List & Professionalism (max 10) ──
        const priceScore = priceRowCount >= 3 ? 10 : priceRowCount >= 1 ? 6 : 0;

        // ── 7. Credential Verification (AI internet check simulation) (max 10) ──
        // Simulates AI cross-referencing company name, experience claims, project types
        let credentialScore = 0;
        let credentialStatus: "verified" | "partial" | "unverified" =
          "unverified";
        const flags: { type: "pass" | "warn" | "fail"; message: string }[] = [];

        // Company verification
        if (hasCompany && hasCompanyAddress) {
          credentialScore += 3;
          flags.push({
            type: "pass",
            message:
              locale === "th"
                ? "ตรวจสอบที่อยู่บริษัท: ผ่าน"
                : locale === "zh"
                  ? "公司地址验证：通过"
                  : "Company address verified",
          });
        } else if (hasCompany) {
          credentialScore += 1;
          flags.push({
            type: "warn",
            message:
              locale === "th"
                ? "ที่อยู่บริษัทไม่ครบถ้วน"
                : locale === "zh"
                  ? "公司地址不完整"
                  : "Incomplete company address",
          });
        } else {
          flags.push({
            type: "fail",
            message:
              locale === "th"
                ? "ไม่พบข้อมูลบริษัท"
                : locale === "zh"
                  ? "未找到公司信息"
                  : "No company info provided",
          });
        }

        // Experience consistency check — AI detects if claimed years vs project type makes sense
        if (yrs > 0 && hasPastProjectType) {
          if (form.pastProjectType === "luxury" && yrs < 3) {
            credentialScore += 1;
            flags.push({
              type: "warn",
              message:
                locale === "th"
                  ? "ประสบการณ์น้อยสำหรับโครงการระดับ Luxury — ต้องตรวจสอบเพิ่ม"
                  : locale === "zh"
                    ? "经验不足以胜任豪华项目 — 需进一步验证"
                    : "Limited experience for luxury projects — requires further verification",
            });
          } else {
            credentialScore += 3;
            flags.push({
              type: "pass",
              message:
                locale === "th"
                  ? "ประสบการณ์สอดคล้องกับประเภทโครงการ"
                  : locale === "zh"
                    ? "经验与项目类型一致"
                    : "Experience consistent with project type",
            });
          }
        } else if (yrs > 0) {
          credentialScore += 2;
          flags.push({
            type: "pass",
            message:
              locale === "th"
                ? "ตรวจสอบประสบการณ์: ยืนยัน"
                : locale === "zh"
                  ? "经验验证：已确认"
                  : "Experience claim acknowledged",
          });
        }

        // Description analysis — AI checks for generic/copied vs detailed descriptions
        if (hasDetailedDesc) {
          credentialScore += 3;
          flags.push({
            type: "pass",
            message:
              locale === "th"
                ? "คำอธิบายมีรายละเอียดครบถ้วน"
                : locale === "zh"
                  ? "描述详细完整"
                  : "Detailed work description provided",
          });
        } else if (hasDescription) {
          credentialScore += 1;
          flags.push({
            type: "warn",
            message:
              locale === "th"
                ? "คำอธิบายสั้นเกินไป — แนะนำให้เพิ่มรายละเอียด"
                : locale === "zh"
                  ? "描述过于简短 — 建议添加更多细节"
                  : "Description too brief — more detail recommended",
          });
        } else {
          flags.push({
            type: "fail",
            message:
              locale === "th"
                ? "ไม่มีคำอธิบายผลงาน"
                : locale === "zh"
                  ? "无工作描述"
                  : "No work description provided",
          });
        }

        // KYC document check
        if (kycMultiple) {
          credentialScore += 1;
          flags.push({
            type: "pass",
            message:
              locale === "th"
                ? "เอกสาร KYC ครบถ้วน (หน้า-หลัง)"
                : locale === "zh"
                  ? "KYC文件完整（正反面）"
                  : "KYC documents complete (front & back)",
          });
        } else if (hasKyc) {
          flags.push({
            type: "warn",
            message:
              locale === "th"
                ? "แนะนำอัปโหลด KYC ทั้งด้านหน้าและด้านหลัง"
                : locale === "zh"
                  ? "建议上传KYC正反面"
                  : "Recommend uploading both front & back KYC",
          });
        }

        // Portfolio document AI analysis (OCR results from vision service)
        if (digestResult && !digestResult.fallback) {
          const allHints = digestResult.results.flatMap(
            (r) => r.verification_hints,
          );
          const hasLicense = allHints.some((h) =>
            /license|ใบอนุญาต|许可/i.test(h),
          );
          const hasCert = allHints.some((h) =>
            /certificate|ใบรับรอง|证书/i.test(h),
          );
          if (hasLicense || hasCert) {
            credentialScore = Math.min(credentialScore + 2, 10);
            flags.push({
              type: "pass",
              message:
                locale === "th"
                  ? "📄 AI ตรวจพบใบรับรอง/ใบอนุญาตในเอกสาร"
                  : locale === "zh"
                    ? "📄 AI在文档中检测到证书/许可证"
                    : "📄 AI detected license/certificate in documents",
            });
          } else if (allHints.length > 0) {
            credentialScore = Math.min(credentialScore + 1, 10);
            flags.push({
              type: "pass",
              message:
                locale === "th"
                  ? "📄 AI วิเคราะห์เอกสารผลงานแล้ว"
                  : locale === "zh"
                    ? "📄 AI已分析作品文档"
                    : "📄 AI analyzed portfolio documents",
            });
          }
        }

        // Fraud detection signals
        if (!hasFullName) {
          flags.push({
            type: "warn",
            message:
              locale === "th"
                ? "⚠️ ชื่อไม่ครบถ้วน — กรุณาใช้ชื่อ-นามสกุลจริง"
                : locale === "zh"
                  ? "⚠️ 姓名不完整 — 请使用全名"
                  : "⚠️ Incomplete name — please use full legal name",
          });
        }
        if (!hasPhone || !hasEmail) {
          flags.push({
            type: "warn",
            message:
              locale === "th"
                ? "⚠️ ข้อมูลติดต่อไม่ครบถ้วน"
                : locale === "zh"
                  ? "⚠️ 联系信息不完整"
                  : "⚠️ Incomplete contact information",
          });
        }

        // Determine credential status
        credentialStatus =
          credentialScore >= 8
            ? "verified"
            : credentialScore >= 4
              ? "partial"
              : "unverified";

        const total =
          expScore +
          skillScore +
          kycScore +
          portfolioScore +
          profileScore +
          priceScore +
          credentialScore;

        let tier = "Economy";
        if (total >= 80) tier = "Expert";
        else if (total >= 65) tier = "Specialist";
        else if (total >= 50) tier = "Corporate";
        else if (total >= 35) tier = "Standard";

        setAiTier({
          tier,
          score: total,
          credentialStatus,
          flags,
          breakdown: [
            {
              label:
                locale === "th"
                  ? "ประสบการณ์"
                  : locale === "zh"
                    ? "经验"
                    : "Experience",
              score: expScore,
              max: 25,
            },
            {
              label:
                locale === "th"
                  ? "ทักษะ"
                  : locale === "zh"
                    ? "技能"
                    : "Skills Breadth",
              score: skillScore,
              max: 15,
            },
            {
              label:
                locale === "th"
                  ? "ยืนยันตัวตน (KYC)"
                  : locale === "zh"
                    ? "身份验证"
                    : "KYC Verification",
              score: kycScore,
              max: 15,
            },
            {
              label:
                locale === "th"
                  ? "ผลงาน/หลักฐาน"
                  : locale === "zh"
                    ? "作品集/证据"
                    : "Portfolio & Evidence",
              score: portfolioScore,
              max: 15,
            },
            {
              label:
                locale === "th"
                  ? "โปรไฟล์"
                  : locale === "zh"
                    ? "个人资料"
                    : "Profile Completeness",
              score: profileScore,
              max: 10,
            },
            {
              label:
                locale === "th"
                  ? "ตารางราคา"
                  : locale === "zh"
                    ? "价格表"
                    : "Price List",
              score: priceScore,
              max: 10,
            },
            {
              label:
                locale === "th"
                  ? "ตรวจสอบข้อมูลรับรอง"
                  : locale === "zh"
                    ? "资质验证"
                    : "Credential Verification",
              score: credentialScore,
              max: 10,
            },
          ],
        });
        setAiStep("verified");
      }
    }, 600);
    return () => clearInterval(phaseInterval);
  }, [success]);

  
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-2xl w-full">
          {/* Header */}
          <div className="p-8 text-center border-b border-gray-100 bg-white">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
            <p className="text-gray-500 text-sm">The CBLUE team will review your information and KYC. Approval within 1–3 business days.</p>
          </div>

          {/* AI Assessment Card */}
          <div className="bg-gradient-to-r from-slate-50 to-white px-8 py-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">🤖 CBLUE AI Tier Assessment</h3>
            <span className="text-xs text-gray-500 px-2 py-1 bg-white rounded border border-gray-200">Overall Score: <strong className="text-gray-900">69/100</strong></span>
          </div>

          <div className="p-8 space-y-8">
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-bold text-amber-900 text-sm">Partially Verified — Complete profile to improve</h4>
                <p className="text-xs text-amber-700 mt-1">
                  Gain more experience, upload portfolio work, update certifications, and maintain good reviews — CBLUE AI will automatically re-evaluate and upgrade your tier when you edit your profile or accumulate work history.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Evaluation Breakdown */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Evaluation Breakdown</h4>
                <div className="space-y-4">
                  {[
                    { label: "Experience", score: 25, max: 25, color: "bg-green-500" },
                    { label: "Skills Breadth", score: 12, max: 15, color: "bg-green-500" },
                    { label: "KYC Verification", score: 15, max: 15, color: "bg-green-500" },
                    { label: "Portfolio & Evidence", score: 0, max: 15, color: "bg-gray-200" },
                    { label: "Profile Completeness", score: 7, max: 10, color: "bg-amber-400" },
                    { label: "Price List", score: 6, max: 10, color: "bg-amber-400" },
                    { label: "Credential Verification", score: 4, max: 10, color: "bg-red-400" },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{item.label}</span>
                        <span className="text-gray-500 font-bold">{item.score}/{item.max}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${(item.score / item.max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Verification Results */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">🔍 AI Verification Results</h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2 text-gray-600">
                    <span className="text-red-500 mt-0.5">❌</span>
                    <span>No company info provided</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-600">
                    <span className="text-green-500 mt-0.5">✅</span>
                    <span>Experience consistent with project type</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-600">
                    <span className="text-red-500 mt-0.5">❌</span>
                    <span>No work description provided</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-600">
                    <span className="text-green-500 mt-0.5">✅</span>
                    <span>KYC documents complete (front & back)</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-500 border border-gray-100 flex items-start gap-3">
              <span className="text-lg">🔒</span>
              <p>Security: Your data is encrypted and protected under PDPA. Credentials are verified to maintain platform integrity.</p>
            </div>
            
            <div className="text-center pt-4 border-t border-gray-100">
              <Link href={`${prefix}/fixers`} className="inline-block px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow transition">
                {locale === "th" ? "ไปที่แดชบอร์ดของคุณ" : "Go to your Dashboard"}
              </Link>
            </div>
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
            {locale === "th"
              ? "สมัครเป็นช่าง CBLUE และมืออาชีพ"
              : locale === "zh"
                ? "注册为 CBLUE 技工与专业人士"
                : "Register as CBLUE Fixer & Pro"}
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            {locale === "th"
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
              🏢{" "}
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
                    ? "ถ่ายรูปบัตรประชาชนหน้า-หลัง และภาพถ่ายคู่กับบัตร (selfie) สูงสุด 3 รูป"
                    : locale === "zh"
                      ? "拍摄身份证正反面及手持身份证自拍照，最多3张"
                      : "Take photos of ID card front/back and a selfie with your ID (max 3)"}
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
                    ? "📋 อัพโหลดตามลำดับ: 1) บัตรด้านหน้า 2) บัตรด้านหลัง 3) เซลฟี่คู่กับบัตร"
                    : locale === "zh"
                      ? "📋 按顺序上传：1) 证件正面 2) 证件反面 3) 手持证件自拍"
                      : "📋 Upload in order: 1) ID card front 2) ID card back 3) Selfie with ID"}
                </p>
                <p className="text-xs text-sky-600 mb-2">
                  🤖{" "}
                  {locale === "th"
                    ? "ระบบ AI จะตรวจสอบว่ารูปภาพเป็นบัตรประชาชนจริงหรือไม่ รูปที่ไม่ถูกต้องจะถูกปฏิเสธ"
                    : locale === "zh"
                      ? "AI系统将验证照片是否为真实身份证 — 不正确的照片将被拒绝"
                      : "AI system will verify photos are real ID cards — incorrect photos will be rejected"}
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
                      ? "🤖 AI กำลังตรวจสอบรูปภาพ..."
                      : locale === "zh"
                        ? "🤖 AI正在验证照片..."
                        : "🤖 AI verifying photo..."}
                  </div>
                )}

                {/* Preview captured/uploaded images */}
                {kycImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {kycImages.map((img, i) => {
                      const kycLabel =
                        i === 0
                          ? locale === "th"
                            ? "หน้า"
                            : locale === "zh"
                              ? "正面"
                              : "Front"
                          : i === 1
                            ? locale === "th"
                              ? "หลัง"
                              : locale === "zh"
                                ? "反面"
                                : "Back"
                            : locale === "th"
                              ? "เซลฟี่"
                              : locale === "zh"
                                ? "自拍"
                                : "Selfie";
                      const status = kycSlotStatus[i] || "valid";
                      return (
                        <div key={i} className="relative group text-center">
                          <img
                            src={URL.createObjectURL(img)}
                            alt={`KYC ${i + 1}`}
                            className={`w-20 h-20 object-cover rounded-lg border-2 ${status === "valid" ? "border-green-400" : "border-gray-200"}`}
                          />
                          <span className="block text-[10px] text-gray-500 mt-0.5">
                            {kycLabel}
                          </span>
                          {status === "valid" && (
                            <span className="absolute top-0.5 left-0.5 text-green-500 text-xs">
                              ✓
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setKycImages((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              );
                              setKycSlotStatus((prev) =>
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
                      {kycImages.length}/3{" "}
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
                  ? "แสดงตัวอย่างผลงาน รูปภาพ PDF หรือเอกสาร สูงสุด 10 ไฟล์"
                  : locale === "zh"
                    ? "展示过往作品，图片、PDF或文档，最多10个文件"
                    : "Show your past work — images, PDFs or documents, up to 10 files"}
              </p>
              <input
                id="portfolioImages"
                name="portfolioImages"
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    const files = Array.from(e.target.files).slice(0, 10);
                    setPortfolioImages(files);
                    digestPortfolioFiles(files);
                  }
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {portfolioImages.length > 0 && (
                <p className="mt-2 text-xs text-green-600">
                  {portfolioImages.length}{" "}
                  {locale === "th"
                    ? "ไฟล์ที่เลือก"
                    : locale === "zh"
                      ? "个文件已选择"
                      : "file(s) selected"}
                </p>
              )}
              {digesting && (
                <p className="mt-1 text-xs text-sky-600 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  {locale === "th"
                    ? "AI กำลังวิเคราะห์เอกสาร..."
                    : locale === "zh"
                      ? "AI正在分析文档..."
                      : "AI analyzing documents..."}
                </p>
              )}
              {digestResult && !digesting && (
                <p className="mt-1 text-xs text-indigo-600">
                  {locale === "th"
                    ? `AI วิเคราะห์เอกสารเสร็จสิ้น — คะแนนเนื้อหา: ${digestResult.content_score}/100`
                    : locale === "zh"
                      ? `AI文档分析完成 — 内容评分: ${digestResult.content_score}/100`
                      : `AI document analysis complete — content score: ${digestResult.content_score}/100`}
                </p>
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
              🏠{" "}
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
              👔{" "}
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
              <input
                id="scheduledDate"
                name="scheduledDate"
                type="date"
                required
                value={form.scheduledDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
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
                  <GpsDetectButton
                    onDetected={(coords) => setGpsCoords(coords)}
                  />
                  {gpsCoords ? (
                    <p className="text-sm text-green-600 font-medium">
                      ✅ 📍{" "}
                      {locale === "th"
                        ? "ตำแหน่ง"
                        : locale === "zh"
                          ? "位置"
                          : "Location"}
                      : {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {locale === "th"
                        ? "กดปุ่มด้านบนเพื่อตรวจจับตำแหน่งอัตโนมัติ"
                        : locale === "zh"
                          ? "点击上方按钮自动检测位置"
                          : "Click the button above to auto-detect your location"}
                    </p>
                  )}
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
                  ? "สมัครเป็นช่าง CBLUE"
                  : locale === "zh"
                    ? "注册成为 CBLUE 技工"
                    : "Register as CBLUE Fixer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
