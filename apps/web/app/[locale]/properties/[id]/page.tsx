"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useParams } from "next/navigation";


interface PropertyDetail {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  tier?: string | null;
  price: number;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  yearBuilt: number | null;
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
  addressLine: string;
  latitude?: number | null;
  longitude?: number | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
  images: { id: string; url: string; isPrimary: boolean }[];
  user: { name: string } | null;
}

const PLACEHOLDER_PROPERTY_IMAGE = "/images/scenic-house.jpg";
const PLACEHOLDER_LOCATION_PATTERN = /^--\s*select/i;

function isLikelyValidImageDataPayload(payload: string) {
  const compact = String(payload || "").replace(/\s+/g, "");
  if (!compact || compact.length < 128 || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return false;
  if (/^(.)\1+$/.test(compact.replace(/=+$/, ""))) return false;
  return (
    compact.startsWith("/9j/") ||
    compact.startsWith("iVBORw0KGgo") ||
    compact.startsWith("R0lGOD") ||
    compact.startsWith("UklGR")
  );
}

function normalizeImageUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("data:")) {
    const compact = raw.replace(/\s+/g, "");
    const normalized = compact.replace(/;bas(?!e64,)/i, ";base64,");
    const commaIndex = normalized.indexOf(",");
    if (commaIndex <= 0) return "";
    const header = normalized.slice(0, commaIndex);
    const payload = normalized.slice(commaIndex + 1).replace(/\s+/g, "");
    if (!payload || !isLikelyValidImageDataPayload(payload)) return "";
    const fixedHeader = /;base64$/i.test(header)
      ? header
      : header.includes(";")
      ? header
      : `${header};base64`;
    return `${fixedHeader},${payload}`;
  }

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("//") ||
    raw.startsWith("/") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  if (/^[A-Za-z0-9][A-Za-z0-9._~!$&'()*+,;=:@/-]*$/.test(raw)) {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }

  return "";
}

function extractImageUrlCandidate(image: any) {
  if (typeof image === "string") return image;
  if (!image || typeof image !== "object") return "";
  return image.url || image.key || image.imageUrl || image.publicUrl || image.src || "";
}

function cleanLocationPart(value: unknown) {
  const text = String(value || "").trim();
  if (!text || PLACEHOLDER_LOCATION_PATTERN.test(text)) return "";
  return text;
}

function normalizeCoordinate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function hasValidGpsCoordinatePair(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return false;
  if (Math.abs(latitude) < 0.000001 && Math.abs(longitude) < 0.000001) return false;
  return true;
}

function getPropertySiteLocation(property: Partial<PropertyDetail>) {
  const latitude = normalizeCoordinate(property.latitude);
  const longitude = normalizeCoordinate(property.longitude);
  if (latitude !== null && longitude !== null && hasValidGpsCoordinatePair(latitude, longitude)) {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  return [
    cleanLocationPart(property.addressLine),
    cleanLocationPart(property.subdistrict),
    cleanLocationPart(property.district),
    cleanLocationPart(property.province),
  ].filter(Boolean).join(", ") || "Unknown";
}

export default function PropertyDetailPage() {
  const t = useTranslations("realEstate");
  const tc = useTranslations("common");
  const locale = useLocale();
  const prefix = `/${locale}`;
  const params = useParams();
  const id = params.id as string;

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const typeKeys: Record<string, string> = {
    CONDO: "condo",
    HOUSE: "house",
    TOWNHOUSE: "townhouse",
    LAND: "land",
    COMMERCIAL: "commercial",
    APARTMENT: "apartment",
    OFFICE: "office",
    WAREHOUSE: "warehouse",
    SHOPHOUSE: "shophouse",
    FACTORY: "factory",
  };

  const getPropertyTypeLabel = (type: string) => {
    const typeKey = typeKeys[type];
    if (typeKey) {
      try {
        return t(`types.${typeKey}`);
      } catch {
        // Fall through to locale-specific defaults.
      }
    }

    const fallbackLabels: Record<string, { en: string; th: string; zh: string }> = {
      CONDO: { en: "Condo", th: "คอนโด", zh: "公寓" },
      HOUSE: { en: "House", th: "บ้าน", zh: "别墅" },
      TOWNHOUSE: { en: "Townhouse", th: "ทาวน์เฮาส์", zh: "联排别墅" },
      LAND: { en: "Land", th: "ที่ดิน", zh: "土地" },
      COMMERCIAL: { en: "Commercial", th: "อาคารพาณิชย์", zh: "商业物业" },
      APARTMENT: { en: "Apartment", th: "อพาร์ทเมนท์", zh: "公寓楼" },
      OFFICE: { en: "Office", th: "ออฟฟิศ", zh: "办公室" },
      WAREHOUSE: { en: "Warehouse", th: "โกดัง", zh: "仓库" },
      SHOPHOUSE: { en: "Shophouse", th: "ตึกแถว", zh: "商铺" },
      FACTORY: { en: "Factory", th: "โรงงาน", zh: "工厂" },
    };

    const fallback = fallbackLabels[type];
    if (!fallback) return type;
    return locale === "th" ? fallback.th : locale === "zh" ? fallback.zh : fallback.en;
  };

  const getTierLabel = (tier: string | null | undefined) => {
    const upper = String(tier || "STANDARD").toUpperCase();
    const labels: Record<string, { en: string; th: string; zh: string }> = {
      ECONOMY: { en: "Economy", th: "ประหยัด", zh: "经济" },
      STANDARD: { en: "Standard", th: "มาตรฐาน", zh: "标准" },
      UPPER: { en: "Upper", th: "ระดับสูง", zh: "高阶" },
      LUXURY: { en: "Luxury", th: "ลักชัวรี", zh: "豪华" },
      GRANDEUR: { en: "Grandeur", th: "พรีเมียม", zh: "尊享" },
    };
    const selected = labels[upper] || { en: upper, th: upper, zh: upper };
    return locale === "th" ? selected.th : locale === "zh" ? selected.zh : selected.en;
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/properties/${encodeURIComponent(id)}`);
        if (res.ok) {
          setProperty(await res.json());
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function formatPrice(price: number) {
    return new Intl.NumberFormat("th-TH").format(price);
  }

  const galleryImages = (property?.images || [])
    .map((img) => ({ ...img, url: normalizeImageUrl(extractImageUrlCandidate(img)) }))
    .filter((img) => Boolean(img.url));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        {tc("loading")}
      </div>
    );
  }

  if (notFound || !property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 text-lg">Property not found</p>
        <Link href={`${prefix}/properties`} className="text-green-700 underline">
          ← {t("searchProperty")}
        </Link>
      </div>
    );
  }

  const siteLocation = getPropertySiteLocation(property);
  const contactDisplayName =
    String(property.contactName || "CBLUE Lister").trim().split(/\s+/)[0] ||
    "CBLUE";

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Image Gallery */}
      <section className="bg-gray-900">
        <div className="mx-auto max-w-7xl">
          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {galleryImages.map((img, idx) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={`${property.title} ${idx + 1}`}
                  className="w-full h-[250px] object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="h-64 bg-gray-800">
              <img src={PLACEHOLDER_PROPERTY_IMAGE} alt={property.title} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </section>

      {/* Details */}
      <section className="py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    property.listingType === "SALE" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                  }`}>
                    {property.listingType === "SALE" ? t("forSale") : t("forRent")}
                  </span>
                  <span className="text-sm text-gray-500">
                    {getPropertyTypeLabel(property.propertyType)}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                    {locale === "th" ? "ระดับ" : locale === "zh" ? "等级" : "Tier"}: {getTierLabel(property.tier)}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{property.title}</h1>
                <p className="text-3xl font-bold text-green-700 mt-2">
                  ฿{formatPrice(property.price)}
                  {property.listingType === "RENT" && (
                    <span className="text-base font-normal text-gray-500">/mo</span>
                  )}
                </p>
              </div>

              {/* Specs */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  {property.bedrooms != null && (
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{property.bedrooms}</div>
                      <div className="text-sm text-gray-500">{t("bedrooms")}</div>
                    </div>
                  )}
                  {property.bathrooms != null && (
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{property.bathrooms}</div>
                      <div className="text-sm text-gray-500">{t("bathrooms")}</div>
                    </div>
                  )}
                  {property.area != null && (
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{property.area}</div>
                      <div className="text-sm text-gray-500">{t("area")}</div>
                    </div>
                  )}
                  {property.floors != null && (
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{property.floors}</div>
                      <div className="text-sm text-gray-500">{locale === "th" ? "ชั้น" : locale === "zh" ? "楼层" : "Floors"}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {property.description && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="font-semibold text-gray-900 mb-3">{t("details")}</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{property.description}</p>
                </div>
              )}

              {/* Location */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-3">
                  {locale === "th" ? "ที่ตั้ง" : locale === "zh" ? "位置" : "Location"}
                </h2>
                <div className="text-gray-700 space-y-1">
                  <p>
                    {locale === "th" ? "สถานที่โครงการ" : locale === "zh" ? "项目地点" : "Site Location"}: {siteLocation}
                  </p>
                  {property.postalCode && <p>{property.postalCode}</p>}
                </div>
              </div>
            </div>

            {/* Sidebar - Contact */}
            <div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24 space-y-4">
                <h3 className="font-semibold text-gray-900">{t("contactName")}</h3>
                <p className="text-gray-700">{contactDisplayName}</p>
                <Link
                  href={`${prefix}/properties?contact=${encodeURIComponent(property.id)}`}
                  className="block w-full py-3 text-center text-sm font-semibold text-white bg-green-700 hover:bg-green-800 rounded-xl transition"
                >
                  {locale === "th" ? "📩 ติดต่อผู้ลงประกาศ" : locale === "zh" ? "📩 联系发布者" : "📩 Contact Lister"}
                </Link>
                {property.yearBuilt && (
                  <p className="text-xs text-gray-400">
                    {locale === "th" ? "ปีที่สร้าง" : locale === "zh" ? "建造年份" : "Year Built"}: {property.yearBuilt}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  {new Date(property.createdAt).toLocaleDateString(locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-US")}
                </p>
              </div>
            </div>
          </div>

          {/* Back link */}
          <div className="mt-8">
            <Link href={`${prefix}/properties`} className="text-green-700 hover:underline text-sm">
              ← {t("searchProperty")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
