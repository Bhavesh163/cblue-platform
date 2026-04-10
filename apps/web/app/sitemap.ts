import type { MetadataRoute } from "next";

const BASE_URL = "https://www.cblue.co.th";
const locales = ["th", "en", "zh"] as const;

const staticRoutes = [
  { path: "", priority: 1.0, changeFrequency: "daily" as const },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/services", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/booking", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/booking/household", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/booking/project", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/booking/professional", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/properties", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/properties/register", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/fixers", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/fixers/register", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/partner-zone", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/get-support", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/support-us", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/subscription/login", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/subscription/register", priority: 0.5, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of staticRoutes) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}${route.path}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${BASE_URL}/${l}${route.path}`])
          ),
        },
      });
    }
  }

  return entries;
}
