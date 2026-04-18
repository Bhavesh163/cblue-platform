"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { getApiUrl } from "../../lib/api";



interface PropertyDetail {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
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
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
  images: { id: string; url: string; isPrimary: boolean }[];
  user: { name: string } | null;
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
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(getApiUrl(`/properties/${encodeURIComponent(id)}`));
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

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Image Gallery */}
      <section className="bg-gray-900">
        <div className="mx-auto max-w-7xl">
          {property.images.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-[500px] overflow-hidden">
              {property.images.slice(0, 4).map((img, idx) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={`${property.title} ${idx + 1}`}
                  className="w-full h-[250px] object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-6xl bg-gray-800">🏠</div>
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
                    {t(`types.${typeKeys[property.propertyType]}`)}
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
                  {property.addressLine && <p>{property.addressLine}</p>}
                  <p>
                    {[property.subdistrict, property.district, property.province]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {property.postalCode && <p>{property.postalCode}</p>}
                </div>
              </div>
            </div>

            {/* Sidebar - Contact */}
            <div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24 space-y-4">
                <h3 className="font-semibold text-gray-900">{t("contactName")}</h3>
                {property.contactName && (
                  <p className="text-gray-700">{property.contactName}</p>
                )}
                {property.contactPhone && (
                  <a
                    href={`tel:${property.contactPhone}`}
                    className="block w-full py-3 text-center text-sm font-semibold text-white bg-green-700 hover:bg-green-800 rounded-xl transition"
                  >
                    📞 {property.contactPhone}
                  </a>
                )}
                {property.contactEmail && (
                  <a
                    href={`mailto:${property.contactEmail}`}
                    className="block w-full py-3 text-center text-sm font-semibold text-green-700 border border-green-700 hover:bg-green-50 rounded-xl transition"
                  >
                    ✉️ {property.contactEmail}
                  </a>
                )}
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
