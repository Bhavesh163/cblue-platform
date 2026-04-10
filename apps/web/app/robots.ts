import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/subscription/forgot-password", "/subscription/reset-password"],
      },
    ],
    sitemap: "https://www.cblue.co.th/sitemap.xml",
  };
}
