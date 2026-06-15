"use client";

interface GpsResolvedLocationProps {
  locale: string;
  gpsCoords: { lat: number; lng: number } | null;
  province?: string;
  district?: string;
  subdistrict?: string;
  postalCode?: string;
}

export default function GpsResolvedLocation({
  locale,
  gpsCoords,
  province,
  district,
  subdistrict,
  postalCode,
}: GpsResolvedLocationProps) {
  if (!gpsCoords) {
    return (
      <p className="text-xs text-gray-500">
        {locale === "th"
          ? "กดปุ่มด้านบนเพื่อตรวจจับตำแหน่งอัตโนมัติ"
          : locale === "zh"
            ? "点击上方按钮自动检测位置"
            : "Click the button above to auto-detect your location"}
      </p>
    );
  }

  const details = [
    { label: locale === "th" ? "รหัสไปรษณีย์" : locale === "zh" ? "邮政编码" : "Postal Code", value: postalCode },
    { label: locale === "th" ? "จังหวัด" : locale === "zh" ? "省份" : "Province", value: province },
    { label: locale === "th" ? "อำเภอ/เขต" : locale === "zh" ? "县/区" : "District", value: district },
    { label: locale === "th" ? "ตำบล/แขวง" : locale === "zh" ? "乡/镇" : "Subdistrict", value: subdistrict },
  ].filter((item) => item.value);

  return (
    <div className="space-y-2">
      <p className="text-sm text-green-600 font-medium">
        📍 {locale === "th" ? "ตำแหน่ง" : locale === "zh" ? "位置" : "Location"}:{" "}
        {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
      </p>
      {details.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          {details.map((item) => (
            <p key={item.label}>
              {item.label}: {item.value}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
