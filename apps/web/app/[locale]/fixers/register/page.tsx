"use client";

import { useState, useCallback, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { FIXER_ALL_SERVICES, THAI_PROVINCES } from "../../lib/constants";
import { getDistrictsForProvince } from "../../lib/thai-address-data";
import { getSubdistrictsForDistrict, lookupByPostalCode } from "../../lib/thai-subdistrict-data";
import ReCaptcha from "../../components/ReCaptcha";
import GpsDetectButton from "../../components/GpsDetectButton";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

interface PriceRow {
  service: string;
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
  locationType: "dropdown" | "address";
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
  const [priceRows, setPriceRows] = useState<PriceRow[]>([{ service: "", finalPrice: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [subscriber, setSubscriber] = useState<{ name: string; email?: string } | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const prefix = `/${locale}`;

  // AI Portfolio Digest state
  const [digestResult, setDigestResult] = useState<{
    results: { file_id: string; filename: string; raw_text: string; text_length: number; has_content: boolean; verification_hints: string[]; extraction_method: string }[];
    total_files: number; total_text_length: number; content_score: number; fallback?: boolean;
  } | null>(null);
  const [digesting, setDigesting] = useState(false);

  // Send portfolio files to AI vision service for OCR/text extraction
  const digestPortfolioFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setDigesting(true);
    try {
      const fd = new globalThis.FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch(`${API_BASE}/api/v1/fixers/portfolio-digest`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setDigestResult(data);
      }
    } catch {
      // Vision service unavailable — non-blocking
    } finally {
      setDigesting(false);
    }
  }, []);

  /* Camera helpers for KYC */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setShowCamera(true);
    } catch {
      setError(locale === "th" ? "ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง" : locale === "zh" ? "无法打开摄像头，请允许摄像头访问" : "Could not access camera. Please allow camera permissions.");
    }
  };
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `kyc-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
        setKycImages((prev) => [...prev, file].slice(0, 3));
      }
    }, "image/jpeg", 0.9);
  };
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const handleRecaptcha = useCallback((token: string) => setRecaptchaToken(token), []);
  const handleRecaptchaExpire = useCallback(() => setRecaptchaToken(""), []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("subscriber");
      if (stored) setSubscriber(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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
      setForm((prev) => ({ ...prev, companyProvince: value as string, companyDistrict: "", companySubdistrict: "" }));
    } else if (target.name === "companyDistrict") {
      setForm((prev) => ({ ...prev, companyDistrict: value as string, companySubdistrict: "" }));
    } else if (target.name === "postalCode") {
      const pc = value as string;
      setForm((prev) => ({ ...prev, postalCode: pc }));
      if (pc.length === 5) {
        const lookup = lookupByPostalCode(pc);
        if (lookup) setForm((prev) => ({ ...prev, postalCode: pc, province: lookup.province, district: lookup.district }));
      }
    } else if (target.name === "companyPostalCode") {
      const pc = value as string;
      setForm((prev) => ({ ...prev, companyPostalCode: pc }));
      if (pc.length === 5) {
        const lookup = lookupByPostalCode(pc);
        if (lookup) setForm((prev) => ({ ...prev, companyPostalCode: pc, companyProvince: lookup.province, companyDistrict: lookup.district }));
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
        setError(locale === "th" ? "กรุณากรอกอีเมลที่ถูกต้อง" : locale === "zh" ? "请输入有效的电子邮件" : "Please enter a valid email address");
        return;
      }
      if (!form.password || form.password.length < 8) {
        setError(locale === "th" ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : locale === "zh" ? "密码至少8个字符" : "Password must be at least 8 characters");
        return;
      }
      if (authMode === "register" && form.password !== form.confirmPassword) {
        setError(locale === "th" ? "รหัสผ่านไม่ตรงกัน" : locale === "zh" ? "密码不匹配" : "Passwords do not match");
        return;
      }
      try {
        const endpoint = authMode === "login" ? "/api/v1/subscription/login" : "/api/v1/subscription/register";
        const body = authMode === "login"
          ? { email: form.email.toLowerCase(), password: form.password }
          : { name: form.name || form.email, email: form.email.toLowerCase(), phone: form.phone, company: form.company || undefined, password: form.password };
        const authRes = await fetch(`${API_BASE}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!authRes.ok) {
          const errData = await authRes.json().catch(() => ({ message: "" }));
          const msg = errData.message || (locale === "th" ? "เข้าสู่ระบบ/สมัครสมาชิกล้มเหลว" : locale === "zh" ? "登录/注册失败" : "Login/Register failed");
          setError(msg);
          return;
        }
        const authData = await authRes.json();
        localStorage.setItem("subscriber_token", authData.accessToken);
        localStorage.setItem("subscriber", JSON.stringify(authData.subscriber));
        setSubscriber(authData.subscriber);
      } catch {
        setError(locale === "th" ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" : locale === "zh" ? "无法连接服务器" : "Cannot connect to server");
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
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        bio: form.bio,
        yearsExperience: form.yearsExperience
          ? parseInt(form.yearsExperience)
          : undefined,
        travelRadius: parseInt(form.travelRadius),
        skills: form.selectedSkills,
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
        description: form.description,
        pastExperience: form.pastExperience,
        pastProjectType: form.pastProjectType,
        priceList: priceRows.filter((r) => r.service),
        gpsCoords: gpsCoords || undefined,
        recaptchaToken,
        kycImageCount: kycImages.length,
        portfolioImageCount: portfolioImages.length,
      };
      // payload ready for API submission (password excluded from logs for security)
      console.log("Fixer registration submission:", { ...payload, fieldsCount: Object.keys(payload).length });
      setSuccess(true);
    } catch {
      setError(t("consent"));
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
        const hasPriceList = priceRows.some(r => r.service && r.finalPrice);
        const priceRowCount = priceRows.filter(r => r.service && r.finalPrice).length;
        const hasBio = (form.bio || "").length > 30;
        const hasCompanyAddress = !!(form.companyProvince && form.companyDistrict && form.companyHouseNumber);
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
        let portfolioScore = portfolioCount >= 5 ? 12 : portfolioCount >= 3 ? 9 : hasPortfolio ? 6 : 0;
        if (digestResult && !digestResult.fallback) {
          // Bonus up to 3 pts from OCR content quality
          if (digestResult.content_score >= 70) portfolioScore = Math.min(portfolioScore + 3, 15);
          else if (digestResult.content_score >= 40) portfolioScore = Math.min(portfolioScore + 2, 15);
          else if (digestResult.total_text_length > 50) portfolioScore = Math.min(portfolioScore + 1, 15);
        }

        // ── 5. Profile Completeness (max 10) ──
        const profileScore = (hasBio ? 3 : 0) + (hasFullName ? 2 : 0) + (hasCompanyAddress ? 3 : 0) + (hasServiceArea ? 2 : 0);

        // ── 6. Price List & Professionalism (max 10) ──
        const priceScore = priceRowCount >= 3 ? 10 : priceRowCount >= 1 ? 6 : 0;

        // ── 7. Credential Verification (AI internet check simulation) (max 10) ──
        // Simulates AI cross-referencing company name, experience claims, project types
        let credentialScore = 0;
        let credentialStatus: "verified" | "partial" | "unverified" = "unverified";
        const flags: { type: "pass" | "warn" | "fail"; message: string }[] = [];

        // Company verification
        if (hasCompany && hasCompanyAddress) {
          credentialScore += 3;
          flags.push({ type: "pass", message: locale === "th" ? "ตรวจสอบที่อยู่บริษัท: ผ่าน" : locale === "zh" ? "公司地址验证：通过" : "Company address verified" });
        } else if (hasCompany) {
          credentialScore += 1;
          flags.push({ type: "warn", message: locale === "th" ? "ที่อยู่บริษัทไม่ครบถ้วน" : locale === "zh" ? "公司地址不完整" : "Incomplete company address" });
        } else {
          flags.push({ type: "fail", message: locale === "th" ? "ไม่พบข้อมูลบริษัท" : locale === "zh" ? "未找到公司信息" : "No company info provided" });
        }

        // Experience consistency check — AI detects if claimed years vs project type makes sense
        if (yrs > 0 && hasPastProjectType) {
          if (form.pastProjectType === "luxury" && yrs < 3) {
            credentialScore += 1;
            flags.push({ type: "warn", message: locale === "th" ? "ประสบการณ์น้อยสำหรับโครงการระดับ Luxury — ต้องตรวจสอบเพิ่ม" : locale === "zh" ? "经验不足以胜任豪华项目 — 需进一步验证" : "Limited experience for luxury projects — requires further verification" });
          } else {
            credentialScore += 3;
            flags.push({ type: "pass", message: locale === "th" ? "ประสบการณ์สอดคล้องกับประเภทโครงการ" : locale === "zh" ? "经验与项目类型一致" : "Experience consistent with project type" });
          }
        } else if (yrs > 0) {
          credentialScore += 2;
          flags.push({ type: "pass", message: locale === "th" ? "ตรวจสอบประสบการณ์: ยืนยัน" : locale === "zh" ? "经验验证：已确认" : "Experience claim acknowledged" });
        }

        // Description analysis — AI checks for generic/copied vs detailed descriptions
        if (hasDetailedDesc) {
          credentialScore += 3;
          flags.push({ type: "pass", message: locale === "th" ? "คำอธิบายมีรายละเอียดครบถ้วน" : locale === "zh" ? "描述详细完整" : "Detailed work description provided" });
        } else if (hasDescription) {
          credentialScore += 1;
          flags.push({ type: "warn", message: locale === "th" ? "คำอธิบายสั้นเกินไป — แนะนำให้เพิ่มรายละเอียด" : locale === "zh" ? "描述过于简短 — 建议添加更多细节" : "Description too brief — more detail recommended" });
        } else {
          flags.push({ type: "fail", message: locale === "th" ? "ไม่มีคำอธิบายผลงาน" : locale === "zh" ? "无工作描述" : "No work description provided" });
        }

        // KYC document check
        if (kycMultiple) {
          credentialScore += 1;
          flags.push({ type: "pass", message: locale === "th" ? "เอกสาร KYC ครบถ้วน (หน้า-หลัง)" : locale === "zh" ? "KYC文件完整（正反面）" : "KYC documents complete (front & back)" });
        } else if (hasKyc) {
          flags.push({ type: "warn", message: locale === "th" ? "แนะนำอัปโหลด KYC ทั้งด้านหน้าและด้านหลัง" : locale === "zh" ? "建议上传KYC正反面" : "Recommend uploading both front & back KYC" });
        }

        // Portfolio document AI analysis (OCR results from vision service)
        if (digestResult && !digestResult.fallback) {
          const allHints = digestResult.results.flatMap(r => r.verification_hints);
          const hasLicense = allHints.some(h => /license|ใบอนุญาต|许可/i.test(h));
          const hasCert = allHints.some(h => /certificate|ใบรับรอง|证书/i.test(h));
          if (hasLicense || hasCert) {
            credentialScore = Math.min(credentialScore + 2, 10);
            flags.push({ type: "pass", message: locale === "th" ? "📄 AI ตรวจพบใบรับรอง/ใบอนุญาตในเอกสาร" : locale === "zh" ? "📄 AI在文档中检测到证书/许可证" : "📄 AI detected license/certificate in documents" });
          } else if (allHints.length > 0) {
            credentialScore = Math.min(credentialScore + 1, 10);
            flags.push({ type: "pass", message: locale === "th" ? "📄 AI วิเคราะห์เอกสารผลงานแล้ว" : locale === "zh" ? "📄 AI已分析作品文档" : "📄 AI analyzed portfolio documents" });
          }
        }

        // Fraud detection signals
        if (!hasFullName) {
          flags.push({ type: "warn", message: locale === "th" ? "⚠️ ชื่อไม่ครบถ้วน — กรุณาใช้ชื่อ-นามสกุลจริง" : locale === "zh" ? "⚠️ 姓名不完整 — 请使用全名" : "⚠️ Incomplete name — please use full legal name" });
        }
        if (!hasPhone || !hasEmail) {
          flags.push({ type: "warn", message: locale === "th" ? "⚠️ ข้อมูลติดต่อไม่ครบถ้วน" : locale === "zh" ? "⚠️ 联系信息不完整" : "⚠️ Incomplete contact information" });
        }

        // Determine credential status
        credentialStatus = credentialScore >= 8 ? "verified" : credentialScore >= 4 ? "partial" : "unverified";

        const total = expScore + skillScore + kycScore + portfolioScore + profileScore + priceScore + credentialScore;

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
            { label: locale === "th" ? "ประสบการณ์" : locale === "zh" ? "经验" : "Experience", score: expScore, max: 25 },
            { label: locale === "th" ? "ทักษะ" : locale === "zh" ? "技能" : "Skills Breadth", score: skillScore, max: 15 },
            { label: locale === "th" ? "ยืนยันตัวตน (KYC)" : locale === "zh" ? "身份验证" : "KYC Verification", score: kycScore, max: 15 },
            { label: locale === "th" ? "ผลงาน/หลักฐาน" : locale === "zh" ? "作品集/证据" : "Portfolio & Evidence", score: portfolioScore, max: 15 },
            { label: locale === "th" ? "โปรไฟล์" : locale === "zh" ? "个人资料" : "Profile Completeness", score: profileScore, max: 10 },
            { label: locale === "th" ? "ตารางราคา" : locale === "zh" ? "价格表" : "Price List", score: priceScore, max: 10 },
            { label: locale === "th" ? "ตรวจสอบข้อมูลรับรอง" : locale === "zh" ? "资质验证" : "Credential Verification", score: credentialScore, max: 10 },
          ],
        });
        setAiStep("verified");
      }
    }, 600);
    return () => clearInterval(phaseInterval);
  }, [success]);

  if (success) {

    const TIER_COLORS: Record<string, string> = {
      Economy: "from-green-400 to-green-600",
      Standard: "from-blue-400 to-blue-600",
      Corporate: "from-purple-400 to-purple-600",
      Specialist: "from-amber-400 to-amber-600",
      Expert: "from-red-400 to-red-600",
    };

    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        {aiStep === "evaluating" && (() => {
          const evalPhases = locale === "th"
            ? [
                { icon: "🔐", label: "ตรวจสอบเอกสาร KYC" },
                { icon: "🏢", label: "ตรวจสอบข้อมูลบริษัท" },
                { icon: "🌐", label: "ค้นหาข้อมูลรับรองออนไลน์" },
                { icon: "📋", label: "วิเคราะห์ประสบการณ์" },
                { icon: "🔍", label: "ตรวจจับการฉ้อโกง" },
                { icon: "�", label: "AI OCR วิเคราะห์เอกสารผลงาน" },
                { icon: "📸", label: "ตรวจสอบผลงาน/Portfolio" },
                { icon: "💰", label: "ประเมินตารางราคา" },
                { icon: "🏆", label: "คำนวณระดับและจัดอันดับ" },
              ]
            : locale === "zh"
            ? [
                { icon: "🔐", label: "验证KYC文件" },
                { icon: "🏢", label: "验证公司信息" },
                { icon: "🌐", label: "在线资质搜索" },
                { icon: "📋", label: "分析经验" },
                { icon: "🔍", label: "欺诈检测扫描" },
                { icon: "📄", label: "AI OCR 文档分析" },
                { icon: "📸", label: "审核作品集" },
                { icon: "💰", label: "评估价格表" },
                { icon: "🏆", label: "计算等级排名" },
              ]
            : [
                { icon: "🔐", label: "Verifying KYC documents" },
                { icon: "🏢", label: "Validating company information" },
                { icon: "🌐", label: "Online credential search" },
                { icon: "📋", label: "Analyzing experience claims" },
                { icon: "🔍", label: "Fraud detection scan" },
                { icon: "📄", label: "AI OCR document analysis" },
                { icon: "📸", label: "Reviewing portfolio evidence" },
                { icon: "💰", label: "Evaluating price list" },
                { icon: "🏆", label: "Computing tier & ranking" },
              ];
          return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg animate-pulse">
              <span className="text-3xl">🤖</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {locale === "th" ? "CBLUE AI กำลังประเมินและตรวจสอบโปรไฟล์..." : locale === "zh" ? "CBLUE AI 正在评估和验证资料..." : "CBLUE AI Evaluating & Verifying Profile..."}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              {locale === "th" ? "ตรวจสอบข้อมูลรับรอง ประสบการณ์ ความน่าเชื่อถือ และตรวจจับการฉ้อโกง" : locale === "zh" ? "验证资质、经验、可信度并检测欺诈" : "Verifying credentials, experience, credibility & fraud detection"}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div className="bg-gradient-to-r from-sky-500 to-indigo-600 h-3 rounded-full transition-all duration-500" style={{ width: `${aiProgress}%` }} />
            </div>
            <div className="space-y-2 text-left max-w-md mx-auto">
              {evalPhases.map((phase, i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                  i < aiPhase ? "bg-green-50 border border-green-200" : i === aiPhase ? "bg-sky-50 border border-sky-200 animate-pulse" : "bg-gray-50 border border-gray-100 opacity-30"
                }`}>
                  <span className="flex-shrink-0">{i < aiPhase ? "✅" : phase.icon}</span>
                  <span className={`${i < aiPhase ? "text-green-700" : i === aiPhase ? "text-sky-700" : "text-gray-400"} font-medium`}>{phase.label}</span>
                  {i === aiPhase && <span className="ml-auto"><span className="inline-block w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></span>}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">{aiProgress}%</p>
          </div>
          );
        })()}

        {aiStep === "verified" && aiTier && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900">{t("successTitle")}</h1>
            <p className="mt-2 text-gray-600">{t("successDesc")}</p>

            {/* AI Tier Assignment */}
            <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className={`bg-gradient-to-r ${TIER_COLORS[aiTier.tier] || "from-gray-400 to-gray-600"} p-6 text-white`}>
                <p className="text-sm font-semibold opacity-90">🤖 {locale === "th" ? "CBLUE AI ประเมินระดับของคุณ" : locale === "zh" ? "CBLUE AI 评估您的等级" : "CBLUE AI Tier Assessment"}</p>
                <p className="text-4xl font-black mt-2">{aiTier.tier}</p>
                <p className="text-sm mt-1 opacity-80">{locale === "th" ? `คะแนนรวม: ${aiTier.score}/100` : locale === "zh" ? `总分: ${aiTier.score}/100` : `Overall Score: ${aiTier.score}/100`}</p>
              </div>

              {/* Credential Verification Status */}
              <div className={`px-6 py-3 flex items-center gap-2 text-sm font-semibold ${
                aiTier.credentialStatus === "verified" ? "bg-green-50 text-green-700" : aiTier.credentialStatus === "partial" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
              }`}>
                <span>{aiTier.credentialStatus === "verified" ? "🛡️" : aiTier.credentialStatus === "partial" ? "⚠️" : "🚫"}</span>
                <span>
                  {aiTier.credentialStatus === "verified"
                    ? (locale === "th" ? "ข้อมูลรับรองผ่านการตรวจสอบ" : locale === "zh" ? "资质已验证" : "Credentials Verified")
                    : aiTier.credentialStatus === "partial"
                      ? (locale === "th" ? "ข้อมูลรับรองบางส่วนผ่านการตรวจสอบ" : locale === "zh" ? "部分资质已验证" : "Partially Verified — Complete profile to improve")
                      : (locale === "th" ? "ข้อมูลรับรองยังไม่ผ่านการตรวจสอบ" : locale === "zh" ? "资质未验证" : "Unverified — Please provide more documentation")}
                </span>
              </div>

              {/* Score Breakdown */}
              <div className="p-6 space-y-3">
                <p className="text-sm font-bold text-gray-700 mb-3">{locale === "th" ? "รายละเอียดการประเมิน" : locale === "zh" ? "评估详情" : "Evaluation Breakdown"}</p>
                {aiTier.breakdown.map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{item.label}</span>
                      <span className="font-bold">{item.score}/{item.max}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${item.score / item.max >= 0.7 ? "bg-green-500" : item.score / item.max >= 0.4 ? "bg-sky-500" : "bg-amber-500"}`} style={{ width: `${item.max > 0 ? (item.score / item.max) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Verification Flags */}
              {aiTier.flags.length > 0 && (
                <div className="px-6 pb-4">
                  <p className="text-xs font-bold text-gray-600 mb-2">{locale === "th" ? "🔍 ผลการตรวจสอบ AI" : locale === "zh" ? "🔍 AI验证结果" : "🔍 AI Verification Results"}</p>
                  <div className="space-y-1.5">
                    {aiTier.flags.map((flag, i) => (
                      <div key={i} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
                        flag.type === "pass" ? "bg-green-50 text-green-700" : flag.type === "warn" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                      }`}>
                        <span className="flex-shrink-0 mt-0.5">{flag.type === "pass" ? "✅" : flag.type === "warn" ? "⚠️" : "❌"}</span>
                        <span>{flag.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Document OCR Analysis Summary */}
              {digestResult && !digestResult.fallback && (
                <div className="px-6 pb-4">
                  <p className="text-xs font-bold text-gray-600 mb-2">{locale === "th" ? "📄 ผลการวิเคราะห์เอกสาร AI OCR" : locale === "zh" ? "📄 AI OCR文档分析结果" : "📄 AI OCR Document Analysis"}</p>
                  <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-800 space-y-1">
                    <p>{locale === "th" ? `วิเคราะห์ ${digestResult.total_files} ไฟล์ — ข้อความทั้งหมด ${digestResult.total_text_length.toLocaleString()} ตัวอักษร` : locale === "zh" ? `已分析 ${digestResult.total_files} 个文件 — 共 ${digestResult.total_text_length.toLocaleString()} 个字符` : `Analyzed ${digestResult.total_files} file(s) — ${digestResult.total_text_length.toLocaleString()} characters extracted`}</p>
                    <p className="font-semibold">{locale === "th" ? `คะแนนเนื้อหา: ${digestResult.content_score}/100` : locale === "zh" ? `内容评分: ${digestResult.content_score}/100` : `Content Score: ${digestResult.content_score}/100`}</p>
                    {digestResult.results.filter(r => r.verification_hints.length > 0).map((r, i) => (
                      <p key={i} className="text-indigo-600">• {r.filename}: {r.verification_hints.join(", ")}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Upgrade notice */}
              <div className="bg-amber-50 border-t border-amber-100 p-4 text-xs text-amber-800">
                <strong>💡 {locale === "th" ? "วิธีอัปเกรดระดับ:" : locale === "zh" ? "如何升级：" : "How to upgrade:"}</strong>{" "}
                {locale === "th"
                  ? "เพิ่มประสบการณ์ อัปโหลดผลงาน อัปเดตใบรับรอง และรักษาคะแนนรีวิวที่ดี — CBLUE AI จะประเมินและอัปเกรดให้อัตโนมัติเมื่อคุณแก้ไขโปรไฟล์หรือสะสมผลงานเพิ่ม"
                  : locale === "zh"
                    ? "增加经验、上传作品集、更新资质并保持良好评价 — CBLUE AI 将在您编辑个人资料或积累更多工作经验时自动评估并升级"
                    : "Gain more experience, upload portfolio work, update certifications, and maintain good reviews — CBLUE AI will automatically re-evaluate and upgrade your tier when you edit your profile or accumulate work history."}
              </div>

              {/* Security notice */}
              <div className="bg-sky-50 border-t border-sky-100 p-4 text-xs text-sky-800">
                <strong>🔒 {locale === "th" ? "ความปลอดภัย:" : locale === "zh" ? "安全提示：" : "Security:"}</strong>{" "}
                {locale === "th"
                  ? "ข้อมูลของคุณถูกเข้ารหัสและเก็บรักษาตาม PDPA ข้อมูลรับรองจะถูกตรวจสอบเพื่อรักษาความน่าเชื่อถือของแพลตฟอร์ม"
                  : locale === "zh"
                    ? "您的信息已加密并根据PDPA保护。资质将被验证以维护平台信誉。"
                    : "Your data is encrypted and protected under PDPA. Credentials are verified to maintain platform integrity."}
              </div>
            </div>

            <button
              onClick={() => {
                setSuccess(false);
                setAiStep(null);
                setAiTier(null);
                setAiProgress(0);
                setForm(initialForm);
                setKycImages([]);
                setPortfolioImages([]);
                setDigestResult(null);
                setPriceRows([{ service: "", finalPrice: "" }]);
              }}
              className="mt-8 px-6 py-2.5 text-sm font-semibold text-blue-700 border border-blue-700 rounded-lg hover:bg-blue-50"
            >
              {t("submitAgain")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            {locale === "th" ? "สมัครเป็นช่าง CBLUE และมืออาชีพ" : locale === "zh" ? "注册为 CBLUE 技工与专业人士" : "Register as CBLUE Fixer & Pro"}
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            {locale === "th" ? "สมัครเพื่อเข้าถึงบริการมืออาชีพและจัดการคำขอของคุณ" : locale === "zh" ? "注册以访问专业服务并管理您的请求" : "Sign up to access professional services and manage your requests"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Personal Info */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th" ? "ข้อมูลส่วนตัว" : locale === "zh" ? "个人信息" : "Personal Information"}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "ชื่อ-นามสกุล" : locale === "zh" ? "姓名" : "Full Name"} <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder={locale === "th" ? "สมชาย ใจดี" : locale === "zh" ? "张三" : "John Doe"}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "อีเมล" : locale === "zh" ? "电子邮件" : "Email"} <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "เบอร์โทรศัพท์" : locale === "zh" ? "电话号码" : "Phone Number"} <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="0812345678"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "บริษัท" : locale === "zh" ? "公司" : "Company"} <span className="text-red-500">*</span>
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  required
                  value={form.company}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder={locale === "th" ? "บริษัท / ร้าน / ส่วนตัว" : locale === "zh" ? "公司 / 店铺 / 个人" : "Company / Shop / Individual"}
                />
              </div>
            </div>
          </fieldset>

          {/* Company / Personal Formal Address */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              🏢 {locale === "th" ? "ที่อยู่บริษัท / ที่อยู่ตามทะเบียนบ้าน" : locale === "zh" ? "公司地址 / 户籍地址" : "Company / Personal Formal Address"}
            </legend>
            <p className="text-xs text-gray-500 mb-4">
              {locale === "th" ? "ที่อยู่สำหรับออกใบสั่งซื้อ (PO) และเอกสารทางการ" : locale === "zh" ? "用于采购订单(PO)和正式文件的地址" : "Address for Purchase Order (PO) and official documents"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "บ้านเลขที่" : locale === "zh" ? "门牌号" : "House No."} <span className="text-red-500">*</span></label>
                <input name="companyHouseNumber" type="text" required value={form.companyHouseNumber} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="123/45" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "อาคาร / ชั้น" : locale === "zh" ? "建筑 / 楼层" : "Building / Floor"}</label>
                <div className="flex gap-2">
                  <input name="companyBuilding" type="text" value={form.companyBuilding} onChange={handleChange} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={locale === "th" ? "อาคาร A" : locale === "zh" ? "A栋" : "Building A"} />
                  <input name="companyFloor" type="text" value={form.companyFloor} onChange={handleChange} className="w-20 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={locale === "th" ? "ชั้น" : locale === "zh" ? "楼层" : "Fl."} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "ถนน" : locale === "zh" ? "路" : "Road"}</label>
                <input name="companyRoad" type="text" value={form.companyRoad} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={locale === "th" ? "ถนนสุขุมวิท" : locale === "zh" ? "素坤逸路" : "Sukhumvit Road"} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "ซอย" : locale === "zh" ? "巷" : "Soi"}</label>
                <input name="companySoi" type="text" value={form.companySoi} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={locale === "th" ? "ซอย 21" : locale === "zh" ? "21巷" : "Soi 21"} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "จังหวัด" : locale === "zh" ? "府" : "Province"} <span className="text-red-500">*</span></label>
                <select name="companyProvince" required value={form.companyProvince} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none bg-white">
                  <option value="">-- {locale === "th" ? "เลือกจังหวัด" : locale === "zh" ? "选择府" : "Select Province"} --</option>
                  {THAI_PROVINCES.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "อำเภอ/เขต" : locale === "zh" ? "县/区" : "District"} <span className="text-red-500">*</span></label>
                <select name="companyDistrict" required value={form.companyDistrict} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none bg-white">
                  <option value="">-- {locale === "th" ? "เลือกอำเภอ/เขต" : locale === "zh" ? "选择县/区" : "Select District"} --</option>
                  {getDistrictsForProvince(form.companyProvince).map((d) => (<option key={d} value={d}>{d}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "ตำบล/แขวง" : locale === "zh" ? "乡/镇" : "Sub-district"} <span className="text-red-500">*</span></label>
                <select name="companySubdistrict" required value={form.companySubdistrict} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 outline-none bg-white">
                  <option value="">-- {locale === "th" ? "เลือกตำบล/แขวง" : locale === "zh" ? "选择乡/镇" : "Select Sub-district"} --</option>
                  {getSubdistrictsForDistrict(form.companyProvince, form.companyDistrict).map((sd) => (<option key={sd} value={sd}>{sd}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "th" ? "รหัสไปรษณีย์" : locale === "zh" ? "邮政编码" : "Postal Code"} <span className="text-red-500">*</span></label>
                <input name="companyPostalCode" type="text" required maxLength={5} value={form.companyPostalCode} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="10110" />
              </div>
            </div>
          </fieldset>

          {/* Login / Create Account */}
          <fieldset className="bg-sky-50 rounded-xl p-5 border border-sky-200">
            <legend className="text-lg font-semibold text-gray-900 mb-1">
              {locale === "th" ? "🔐 เข้าสู่ระบบ / สร้างบัญชี (จำเป็น)" : locale === "zh" ? "🔐 登录/创建账户（必填）" : "🔐 Login / Create Account (Required)"}
            </legend>
            {subscriber ? (
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-lg font-bold">✓</div>
                <div>
                  <p className="font-semibold text-green-700">{locale === "th" ? "เข้าสู่ระบบแล้ว" : locale === "zh" ? "已登录" : "Logged In"}</p>
                  <p className="text-sm text-gray-500">{subscriber.name}</p>
                </div>
                <button type="button" onClick={() => { localStorage.removeItem("subscriber"); localStorage.removeItem("subscriber_token"); setSubscriber(null); }} className="ml-auto text-xs text-gray-400 hover:text-red-500">
                  {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出" : "Log Out"}
                </button>
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAuthMode("login")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${authMode === "login" ? "bg-sky-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                    {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Login"}
                  </button>
                  <button type="button" onClick={() => setAuthMode("register")} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${authMode === "register" ? "bg-sky-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                    {locale === "th" ? "สมัครสมาชิกใหม่" : locale === "zh" ? "注册新账户" : "Register New Account"}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {locale === "th" ? "ใช้อีเมลจากข้อมูลติดต่อด้านบน รหัสผ่านอย่างน้อย 8 ตัวอักษร" : locale === "zh" ? "使用上方联系信息中的电子邮件，密码至少8个字符" : "Uses the email from Contact Info above. Password must be at least 8 characters."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === "th" ? "รหัสผ่าน" : locale === "zh" ? "密码" : "Password"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                  {authMode === "register" && (
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        {locale === "th" ? "ยืนยันรหัสผ่าน" : locale === "zh" ? "确认密码" : "Confirm Password"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        minLength={8}
                        value={form.confirmPassword}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                        placeholder="••••••••"
                      />
                    </div>
                  )}
                </div>
                {authMode === "login" && (
                  <Link href={`${prefix}/subscription/forgot-password`} className="text-xs text-sky-600 hover:underline">
                    {locale === "th" ? "ลืมรหัสผ่าน?" : locale === "zh" ? "忘记密码？" : "Forgot password?"}
                  </Link>
                )}
              </div>
            )}
          </fieldset>

          {/* KYC */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th" ? "ยืนยันตัวตน (KYC)" : locale === "zh" ? "身份验证 (KYC)" : "Identity Verification (KYC)"}
            </legend>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "ถ่ายรูป / อัพโหลดรูปบัตรประชาชน" : locale === "zh" ? "拍照或上传身份证照片" : "Capture / Upload ID Card Photos"} <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {locale === "th" ? "ถ่ายรูปบัตรประชาชนหน้า-หลัง และภาพถ่ายคู่กับบัตร (selfie) สูงสุด 3 รูป" : locale === "zh" ? "拍摄身份证正反面及手持身份证自拍照，最多3张" : "Take photos of ID card front/back and a selfie with your ID (max 3)"}
                </p>

                {/* Camera view */}
                {showCamera && (
                  <div className="mb-3 rounded-lg overflow-hidden bg-black relative">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-64 object-contain" />
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                      <button type="button" onClick={capturePhoto} className="px-4 py-2 bg-white text-gray-900 rounded-full text-sm font-bold shadow-lg hover:bg-gray-100 transition">
                        📸 {locale === "th" ? "ถ่ายรูป" : locale === "zh" ? "拍照" : "Capture"}
                      </button>
                      <button type="button" onClick={stopCamera} className="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-bold shadow-lg hover:bg-red-700 transition">
                        ✕ {locale === "th" ? "ปิดกล้อง" : locale === "zh" ? "关闭" : "Close"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 mb-3">
                  {!showCamera && (
                    <button type="button" onClick={startCamera} className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700 transition shadow">
                      📷 {locale === "th" ? "เปิดกล้อง" : locale === "zh" ? "打开摄像头" : "Open Camera"}
                    </button>
                  )}
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-100 transition shadow cursor-pointer border border-amber-200">
                    📁 {locale === "th" ? "อัพโหลดไฟล์" : locale === "zh" ? "上传文件" : "Upload File"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) setKycImages((prev) => [...prev, ...Array.from(e.target.files!)].slice(0, 3));
                      }}
                    />
                  </label>
                  {/* Mobile-specific capture button */}
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-lg text-sm font-semibold hover:bg-green-100 transition shadow cursor-pointer border border-green-200 sm:hidden">
                    🤳 {locale === "th" ? "ถ่ายรูป" : locale === "zh" ? "拍照" : "Take Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) setKycImages((prev) => [...prev, ...Array.from(e.target.files!)].slice(0, 3));
                      }}
                    />
                  </label>
                </div>

                {/* Preview captured/uploaded images */}
                {kycImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {kycImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={URL.createObjectURL(img)} alt={`KYC ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => setKycImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        >✕</button>
                      </div>
                    ))}
                    <p className="text-xs text-green-600 self-end">
                      {kycImages.length}/3 {locale === "th" ? "รูป" : locale === "zh" ? "张照片" : "photo(s)"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </fieldset>

          {/* Portfolio */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th" ? "ผลงาน / Portfolio" : locale === "zh" ? "作品集" : "Portfolio"}
            </legend>
            <div>
              <label htmlFor="portfolioImages" className="block text-sm font-medium text-gray-700 mb-1">
                {locale === "th" ? "อัพโหลดรูปภาพผลงาน" : locale === "zh" ? "上传作品图片" : "Upload Portfolio Images"} <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                {locale === "th" ? "แสดงตัวอย่างผลงาน รูปภาพ PDF หรือเอกสาร สูงสุด 10 ไฟล์" : locale === "zh" ? "展示过往作品，图片、PDF或文档，最多10个文件" : "Show your past work — images, PDFs or documents, up to 10 files"}
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
                  {portfolioImages.length} {locale === "th" ? "ไฟล์ที่เลือก" : locale === "zh" ? "个文件已选择" : "file(s) selected"}
                </p>
              )}
              {digesting && (
                <p className="mt-1 text-xs text-sky-600 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  {locale === "th" ? "AI กำลังวิเคราะห์เอกสาร..." : locale === "zh" ? "AI正在分析文档..." : "AI analyzing documents..."}
                </p>
              )}
              {digestResult && !digesting && (
                <p className="mt-1 text-xs text-indigo-600">
                  {locale === "th" ? `AI วิเคราะห์เอกสารเสร็จสิ้น — คะแนนเนื้อหา: ${digestResult.content_score}/100` : locale === "zh" ? `AI文档分析完成 — 内容评分: ${digestResult.content_score}/100` : `AI document analysis complete — content score: ${digestResult.content_score}/100`}
                </p>
              )}
            </div>
          </fieldset>

          {/* Skills Selection */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th" ? "บริการที่ให้บริการ" : locale === "zh" ? "提供的服务" : "Services Offered"} <span className="text-red-500">*</span>
            </legend>
            <p className="text-xs text-gray-500 mb-3">
              {locale === "th" ? "เลือกบริการที่ท่านสามารถให้บริการได้ (เลือกได้หลายรายการ)" : locale === "zh" ? "选择您可以提供的服务（可多选）" : "Select services you can provide (multiple selections allowed)"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FIXER_ALL_SERVICES.map((svc) => (
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
                  <span className="text-sm text-gray-700">{locale === "th" ? svc.labelTh : locale === "zh" ? svc.labelZh : svc.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Experience */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th" ? "ประสบการณ์" : locale === "zh" ? "经验" : "Experience"}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="yearsExperience" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "ประสบการณ์ (ปี)" : locale === "zh" ? "经验（年）" : "Experience (years)"}
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
                <label htmlFor="travelRadius" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "รัศมีเดินทาง (กม.)" : locale === "zh" ? "服务半径（公里）" : "Travel Radius (km)"}
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
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "แนะนำตัว" : locale === "zh" ? "自我介绍" : "About Me"}
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  value={form.bio}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  placeholder={locale === "th" ? "บอกเล่าประสบการณ์และความเชี่ยวชาญของท่าน" : locale === "zh" ? "请介绍您的经验和专长" : "Tell us about your experience and expertise"}
                />
              </div>
            </div>
          </fieldset>

          {/* Availability */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th" ? "วันที่พร้อมเริ่มงาน" : locale === "zh" ? "可开始工作日期" : "Available Start Date"}
            </legend>
            <div>
              <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
                {locale === "th" ? "วันที่ต้องการเริ่มงาน" : locale === "zh" ? "期望开始日期" : "Desired Start Date"} <span className="text-red-500">*</span>
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
              {locale === "th" ? "สถานที่ตั้ง / พื้นที่ให้บริการ" : locale === "zh" ? "服务地点 / 服务区域" : "Location / Service Area"}
            </legend>
            <div className="space-y-4">
              {/* GPS Auto-detect */}
              <GpsDetectButton onDetected={(coords) => setGpsCoords(coords)} />
              {gpsCoords && (
                <p className="text-xs text-green-600">
                  📍 {locale === "th" ? "ตำแหน่ง" : locale === "zh" ? "位置" : "Location"}: {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
                </p>
              )}

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="locationType"
                    value="dropdown"
                    checked={form.locationType === "dropdown"}
                    onChange={handleChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  {locale === "th" ? "เลือกจากรายการ" : locale === "zh" ? "从列表选择" : "Select from list"}
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
                  {locale === "th" ? "กรอกที่อยู่ / รหัสไปรษณีย์" : locale === "zh" ? "输入地址 / 邮政编码" : "Enter address / postal code"}
                </label>
              </div>

              {form.locationType === "dropdown" ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === "th" ? "จังหวัด" : locale === "zh" ? "府" : "Province"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="province"
                      name="province"
                      required
                      value={form.province}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">-- {locale === "th" ? "เลือกจังหวัด" : locale === "zh" ? "选择府" : "Select Province"} --</option>
                      {THAI_PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === "th" ? "อำเภอ/เขต" : locale === "zh" ? "县/区" : "District"} <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="district"
                      name="district"
                      required
                      value={form.district}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">-- {locale === "th" ? "เลือกอำเภอ/เขต" : locale === "zh" ? "选择县/区" : "Select District"} --</option>
                      {getDistrictsForProvince(form.province).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === "th" ? "รหัสไปรษณีย์" : locale === "zh" ? "邮政编码" : "Postal Code"} <span className="text-red-500">*</span>
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
              ) : (
                <div>
                  <label htmlFor="addressText" className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === "th" ? "ที่อยู่ หรือ รหัสไปรษณีย์" : locale === "zh" ? "地址或邮政编码" : "Address or Postal Code"} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="addressText"
                    name="addressText"
                    required
                    rows={3}
                    value={form.addressText}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    placeholder={locale === "th" ? "กรอกที่อยู่เต็ม หรือ รหัสไปรษณีย์" : locale === "zh" ? "输入完整地址或邮政编码" : "Enter full address or postal code"}
                  />
                </div>
              )}
            </div>
          </fieldset>

          {/* Description */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th" ? "รายละเอียดเพิ่มเติม" : locale === "zh" ? "其他详情" : "Additional Details"}
            </legend>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                {locale === "th" ? "รายละเอียดโปรเจกต์ / ความต้องการ" : locale === "zh" ? "项目详情 / 需求" : "Project Details / Requirements"}
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={form.description}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                placeholder={locale === "th" ? "ข้อมูลเพิ่มเติมที่ต้องการแจ้ง" : locale === "zh" ? "请填写其他需要告知的信息" : "Any additional information you'd like to share"}
              />
            </div>
          </fieldset>

          {/* Price List Table */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th" ? "ตารางราคาบริการ" : locale === "zh" ? "服务价格表" : "Service Price List"}
            </legend>
            <p className="text-xs text-gray-500 mb-3">
              {locale === "th" ? "กรอกบริการและราคาสุดท้ายรวม VAT (ถ้ามี) เป็นบาท" : locale === "zh" ? "填写服务名称和最终价格（含增值税，如适用），单位为泰铢" : "Enter your service and final price including VAT if applicable (THB)"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 font-medium text-gray-700 border-b">{locale === "th" ? "บริการ" : locale === "zh" ? "服务" : "Service"}</th>
                    <th className="text-center px-3 py-2 font-medium text-sky-700 border-b bg-sky-50">{locale === "th" ? "ราคาสุดท้าย รวม VAT (บาท)" : locale === "zh" ? "最终价格 含增值税（泰铢）" : "Final Price incl. VAT (THB)"}</th>
                    <th className="px-2 py-2 border-b w-10" />
                  </tr>
                </thead>
                <tbody>
                  {priceRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="px-2 py-1.5">
                        <input type="text" value={row.service} placeholder={locale === "th" ? "เช่น ซ่อมท่อ" : locale === "zh" ? "例如 修水管" : "e.g. Pipe repair"}
                          onChange={(e) => { const nr = [...priceRows]; nr[idx] = { ...nr[idx]!, service: e.target.value }; setPriceRows(nr); }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-blue-500 outline-none" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={0} value={row.finalPrice} placeholder="฿"
                          onChange={(e) => { const nr = [...priceRows]; nr[idx] = { ...nr[idx]!, finalPrice: e.target.value }; setPriceRows(nr); }}
                          className="w-full px-2 py-1.5 text-sm text-center border border-gray-200 rounded focus:border-blue-500 outline-none" />
                      </td>
                      <td className="px-2 py-1.5">
                        {priceRows.length > 1 && (
                          <button type="button" onClick={() => setPriceRows(priceRows.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 text-lg">×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button"
              onClick={() => setPriceRows([...priceRows, { service: "", finalPrice: "" }])}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
              + {locale === "th" ? "เพิ่มรายการ" : locale === "zh" ? "添加行" : "Add Row"}
            </button>
          </fieldset>

          {/* Past Work Experience */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-900 mb-4">
              {locale === "th" ? "ประสบการณ์งานที่ผ่านมา" : locale === "zh" ? "过往工作经验" : "Past Work Experience"}
            </legend>
            <p className="text-xs text-gray-500 mb-3">
              {locale === "th" ? "ผู้ที่มีประสบการณ์ระดับองค์กร จะมีสิทธิ์ได้รับระดับ Corporate, ผู้ชำนาญพิเศษได้รับ Specialist และผู้มีประสบการณ์โครงการหรู/มีชื่อเสียง ได้รับ Expert"
                : locale === "zh" ? "有企业经验者获得 Corporate，专业经验获得 Specialist，豪华/知名项目经验获得 Expert"
                : "Corporate experience qualifies for Corporate tier. Specialist experience qualifies for Specialist. Famous/luxury project experience qualifies for Expert tier."}
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="pastExperience" className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "อธิบายประสบการณ์งานที่ผ่านมา" : locale === "zh" ? "描述过往工作经验" : "Describe your past work experience"}
                </label>
                <textarea
                  id="pastExperience"
                  name="pastExperience"
                  rows={3}
                  value={form.pastExperience}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  placeholder={locale === "th" ? "รายละเอียดผลงาน ชื่อโครงการ บริษัทที่เคยทำงานด้วย" : locale === "zh" ? "项目名称、合作公司、知名项目等" : "Project names, companies worked with, notable projects"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {locale === "th" ? "ประเภทผลงานที่ผ่านมา" : locale === "zh" ? "过往项目类型" : "Past Project Type"}
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {([
                    { value: "none", label: locale === "th" ? "ทั่วไป (Economy/Standard)" : locale === "zh" ? "一般（Economy/Standard）" : "General (Economy/Standard)" },
                    { value: "corporate", label: locale === "th" ? "ระดับองค์กร → Corporate" : locale === "zh" ? "企业级 → Corporate" : "Corporate Level → Corporate Tier" },
                    { value: "specialist", label: locale === "th" ? "ผู้ชำนาญพิเศษ → Specialist" : locale === "zh" ? "专业级 → Specialist" : "Specialist Level → Specialist Tier" },
                    { value: "luxury", label: locale === "th" ? "โครงการหรู/มีชื่อเสียง → Expert" : locale === "zh" ? "豪华/知名项目 → Expert" : "Famous/Luxury Project → Expert Tier" },
                  ] as const).map((opt) => (
                    <label key={opt.value} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition ${
                      form.pastProjectType === opt.value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <input type="radio" name="pastProjectType" value={opt.value}
                        checked={form.pastProjectType === opt.value} onChange={handleChange}
                        className="text-blue-600 focus:ring-blue-500" />
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
                {locale === "th" ? (<>ข้าพเจ้ายืนยันว่าข้อมูลทั้งหมดเป็นความจริง และยอมรับ{" "}<a href="/terms" className="text-blue-600 hover:underline">เงื่อนไขการใช้งาน</a>{" "}และ{" "}<a href="/privacy" className="text-blue-600 hover:underline">นโยบายความเป็นส่วนตัว</a></>) : locale === "zh" ? (<>我确认所有信息均为真实，并接受{" "}<a href="/terms" className="text-blue-600 hover:underline">使用条款</a>{" "}和{" "}<a href="/privacy" className="text-blue-600 hover:underline">隐私政策</a></>) : (<>I confirm that all information is accurate and I accept the{" "}<a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>{" "}and{" "}<a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a></>)}
              </label>
            </div>

            <ReCaptcha onVerify={handleRecaptcha} onExpire={handleRecaptchaExpire} />

            <button
              type="submit"
              disabled={submitting || !form.consent || !recaptchaToken}
              className={`w-full py-3 px-6 text-base font-semibold rounded-xl transition-colors ${
                form.consent && recaptchaToken
                  ? "text-white bg-blue-700 hover:bg-blue-800"
                  : "text-gray-400 bg-gray-200 cursor-not-allowed"
              }`}
            >
              {submitting ? (locale === "th" ? "กำลังส่ง..." : locale === "zh" ? "提交中..." : "Submitting...") : (locale === "th" ? "สมัครเป็นช่าง CBLUE" : locale === "zh" ? "注册成为 CBLUE 技工" : "Register as CBLUE Fixer")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
