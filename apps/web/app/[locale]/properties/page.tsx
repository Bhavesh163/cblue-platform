"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { THAI_PROVINCES } from "../lib/constants";

const PROPERTY_TYPES = ["CONDO", "HOUSE", "TOWNHOUSE", "LAND", "COMMERCIAL", "APARTMENT"] as const;
const LISTING_TYPES = ["SALE", "RENT"] as const;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

interface Property {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  price: number;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  province: string;
  district: string;
  images: { url: string }[];
}

export default function PropertiesPage() {
  const t = useTranslations("realEstate");
  const tc = useTranslations("common");
  const locale = useLocale();
  const prefix = `/${locale}`;

  const [properties, setProperties] = useState<Property[]>([]);
  const [latestProperties, setLatestProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filters, setFilters] = useState({
    propertyType: "",
    listingType: "",
    province: "",
    minPrice: "",
    maxPrice: "",
    bedrooms: "",
    keyword: "",
  });

  useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await fetch(`${API_BASE}/properties?limit=20`);
        if (res.ok) {
          const data = await res.json();
          setLatestProperties(data.properties || []);
        }
      } catch {
        // API not available
      }
    }
    fetchLatest();
  }, []);

  async function handleSearch(overrides?: Partial<typeof filters>) {
    const f = overrides ? { ...filters, ...overrides } : filters;
    if (overrides) setFilters(f);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.propertyType) params.set("propertyType", f.propertyType);
      if (f.listingType) params.set("listingType", f.listingType);
      if (f.province) params.set("province", f.province);
      if (f.minPrice) params.set("minPrice", f.minPrice);
      if (f.maxPrice) params.set("maxPrice", f.maxPrice);
      if (f.bedrooms) params.set("bedrooms", f.bedrooms);
      if (f.keyword) params.set("keyword", f.keyword);

      const res = await fetch(`${API_BASE}/properties?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
      }
    } catch {
      // API not available
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat("th-TH").format(price);
  }

  const typeKeys: Record<string, string> = {
    CONDO: "condo",
    HOUSE: "house",
    TOWNHOUSE: "townhouse",
    LAND: "land",
    COMMERCIAL: "commercial",
    APARTMENT: "apartment",
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-sky-50/30 min-h-screen">
      {/* Hero */}
      <section className="relative text-white min-h-[350px] flex items-center overflow-hidden">
        <Image src="/images/scenic-house.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 to-green-800/70" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center py-16">
          <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur text-emerald-200 rounded-full text-sm font-bold mb-4 border border-white/20">
            🏢 {locale === "th" ? "อสังหาริมทรัพย์" : "Real Estate"}
          </span>
          <h1 className="text-4xl font-bold">{t("title")}</h1>
          <p className="mt-4 text-lg text-emerald-100 max-w-2xl mx-auto">{t("desc")}</p>
          <div className="w-20 h-1 bg-white/50 mx-auto rounded-full mt-6" />
        </div>
      </section>

      {/* Search Filters */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Keyword */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{tc("search")}</label>
                <input
                  type="text"
                  value={filters.keyword}
                  onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                  placeholder="..."
                />
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("propertyType")}</label>
                <select
                  value={filters.propertyType}
                  onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 outline-none bg-white"
                >
                  <option value="">--</option>
                  {PROPERTY_TYPES.map((pt) => (
                    <option key={pt} value={pt}>{t(`types.${typeKeys[pt]}`)}</option>
                  ))}
                </select>
              </div>

              {/* Listing Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("listingType")}</label>
                <select
                  value={filters.listingType}
                  onChange={(e) => setFilters({ ...filters, listingType: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 outline-none bg-white"
                >
                  <option value="">--</option>
                  <option value="SALE">{t("forSale")}</option>
                  <option value="RENT">{t("forRent")}</option>
                </select>
              </div>

              {/* Province */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === "th" ? "จังหวัด" : "Province"}
                </label>
                <select
                  value={filters.province}
                  onChange={(e) => setFilters({ ...filters, province: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 outline-none bg-white"
                >
                  <option value="">--</option>
                  {THAI_PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("priceRange")}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    className="w-1/2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    className="w-1/2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("bedrooms")}</label>
                <select
                  value={filters.bedrooms}
                  onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 outline-none bg-white"
                >
                  <option value="">--</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}+</option>
                  ))}
                </select>
              </div>

              {/* Search button */}
              <div className="flex items-end">
                <button
                  onClick={() => handleSearch()}
                  className="w-full py-2.5 px-6 text-sm font-semibold text-white bg-green-700 hover:bg-green-800 rounded-lg transition-colors"
                >
                  {tc("search")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-12 text-gray-500">{tc("loading")}</div>
          ) : searched && properties.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-gray-500 mb-2">
                {locale === "th" ? "ไม่พบประกาศในขณะนี้" : locale === "zh" ? "暂无相关房源" : "No properties found for this search"}
              </p>
              <p className="text-sm text-gray-400 mb-6">
                {locale === "th" ? "ลองเปลี่ยนตัวกรอง หรือลงประกาศของคุณ" : locale === "zh" ? "请尝试调整筛选条件，或发布您的房产" : "Try adjusting your filters, or list your own property"}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => { setSearched(false); setProperties([]); setFilters({ propertyType: "", listingType: "", province: "", minPrice: "", maxPrice: "", bedrooms: "", keyword: "" }); }}
                  className="px-6 py-2.5 text-green-700 border border-green-700 rounded-lg hover:bg-green-50 transition text-sm font-semibold"
                >
                  {locale === "th" ? "← กลับหน้าหลัก" : locale === "zh" ? "← 返回" : "← Back to browse"}
                </button>
                <Link
                  href={`${prefix}/properties/register`}
                  className="inline-block px-6 py-2.5 bg-green-700 text-white rounded-lg hover:bg-green-800 transition text-sm font-semibold"
                >
                  {t("listProperty")}
                </Link>
              </div>
            </div>
          ) : searched ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => { setSearched(false); setProperties([]); setFilters({ propertyType: "", listingType: "", province: "", minPrice: "", maxPrice: "", bedrooms: "", keyword: "" }); }}
                  className="text-sm text-green-700 hover:text-green-800 font-semibold flex items-center gap-1"
                >
                  ← {locale === "th" ? "กลับ" : locale === "zh" ? "返回" : "Back"}
                </button>
                <span className="text-sm text-gray-500">
                  {properties.length} {locale === "th" ? "ผลลัพธ์" : locale === "zh" ? "个结果" : "results"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((prop) => (
                <Link
                  key={prop.id}
                  href={`${prefix}/properties/${prop.id}`}
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    {prop.images[0] ? (
                      <img src={prop.images[0].url} alt={prop.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">🏠</span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        prop.listingType === "SALE" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                      }`}>
                        {prop.listingType === "SALE" ? t("forSale") : t("forRent")}
                      </span>
                      <span className="text-xs text-gray-500">
                        {t(`types.${typeKeys[prop.propertyType]}`)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{prop.title}</h3>
                    <p className="text-lg font-bold text-green-700 mt-1">
                      ฿{formatPrice(prop.price)}
                      {prop.listingType === "RENT" && "/mo"}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                      {prop.bedrooms && <span>{prop.bedrooms} bed</span>}
                      {prop.bathrooms && <span>{prop.bathrooms} bath</span>}
                      {prop.area && <span>{prop.area} sqm</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{prop.province}, {prop.district}</p>
                  </div>
                </Link>
              ))}
              </div>
            </>
          ) : null}

          {/* CTA to register property */}
          {!searched && (
            <div className="text-center py-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {["CONDO", "HOUSE", "LAND"].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleSearch({ propertyType: type })}
                    className="bg-white rounded-xl p-6 border border-gray-200 text-center hover:border-green-500 hover:shadow-md transition cursor-pointer"
                  >
                    <div className="text-4xl mb-3">
                      {type === "CONDO" ? "🏢" : type === "HOUSE" ? "🏠" : "🌳"}
                    </div>
                    <h3 className="font-semibold text-gray-900">{t(`types.${typeKeys[type]}`)}</h3>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleSearch()}
                  className="px-8 py-3 text-sm font-semibold text-white bg-green-700 hover:bg-green-800 rounded-xl transition-colors"
                >
                  {t("searchProperty")}
                </button>
                <Link
                  href={`${prefix}/properties/register`}
                  className="px-8 py-3 text-sm font-semibold text-green-700 border border-green-700 hover:bg-green-50 rounded-xl transition-colors text-center"
                >
                  {t("listProperty")}
                </Link>
              </div>

              {/* Latest 20 Properties */}
              {latestProperties.length > 0 && (
                <div className="mt-16">
                  <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
                    {locale === "th" ? "ประกาศล่าสุด" : locale === "zh" ? "最新房源" : "Latest Listings"}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {latestProperties.map((prop) => (
                      <Link
                        key={prop.id}
                        href={`${prefix}/properties/${prop.id}`}
                        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                      >
                        <div className="h-40 bg-gray-200 flex items-center justify-center">
                          {prop.images[0] ? (
                            <img src={prop.images[0].url} alt={prop.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl">🏠</span>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              prop.listingType === "SALE" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                            }`}>
                              {prop.listingType === "SALE" ? t("forSale") : t("forRent")}
                            </span>
                            <span className="text-xs text-gray-500">
                              {t(`types.${typeKeys[prop.propertyType]}`)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{prop.title}</h3>
                          <p className="text-base font-bold text-green-700 mt-1">
                            ฿{formatPrice(prop.price)}
                            {prop.listingType === "RENT" && "/mo"}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            {prop.bedrooms && <span>{prop.bedrooms} bed</span>}
                            {prop.bathrooms && <span>{prop.bathrooms} bath</span>}
                            {prop.area && <span>{prop.area} sqm</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{prop.province}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
