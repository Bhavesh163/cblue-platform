"use client";

import { useState } from "react";
import { useLocale } from "next-intl";

interface GpsDetectButtonProps {
  onDetected: (coords: { lat: number; lng: number }) => void;
}

export default function GpsDetectButton({ onDetected }: GpsDetectButtonProps) {
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleDetect() {
    if (!navigator.geolocation) {
      setError(locale === "th" ? "เบราว์เซอร์ไม่รองรับ GPS" : locale === "zh" ? "浏览器不支持GPS" : "Browser does not support GPS");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onDetected({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === 1
            ? (locale === "th" ? "กรุณาอนุญาตให้เข้าถึงตำแหน่ง" : locale === "zh" ? "请允许访问位置" : "Please allow location access")
            : (locale === "th" ? "ไม่สามารถตรวจจับตำแหน่งได้" : locale === "zh" ? "无法检测位置" : "Unable to detect location")
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDetect}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg border border-blue-200 transition-colors"
      >
        📍 {loading
          ? (locale === "th" ? "กำลังตรวจจับ..." : locale === "zh" ? "检测中..." : "Detecting...")
          : (locale === "th" ? "ตรวจจับตำแหน่งอัตโนมัติ (GPS)" : locale === "zh" ? "自动检测位置 (GPS)" : "Auto-detect Location (GPS)")}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
