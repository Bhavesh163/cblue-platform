"use client";

import { useState } from "react";

interface GpsDetectButtonProps {
  onDetected: (coords: { lat: number; lng: number }) => void;
}

export default function GpsDetectButton({ onDetected }: GpsDetectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleDetect() {
    if (!navigator.geolocation) {
      setError("เบราว์เซอร์ไม่รองรับ GPS");
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
            ? "กรุณาอนุญาตให้เข้าถึงตำแหน่ง"
            : "ไม่สามารถตรวจจับตำแหน่งได้"
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
        📍 {loading ? "กำลังตรวจจับ..." : "ตรวจจับตำแหน่งอัตโนมัติ (GPS)"}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
