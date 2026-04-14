import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Root page redirect — ensures `/` always resolves to a locale.
 * next-intl middleware handles this in most cases, but Cloudflare Pages
 * may serve static assets before middleware fires for the root path.
 * This is the enterprise-standard belt-and-suspenders approach.
 */
export default async function RootPage() {
  const headersList = await headers();
  const acceptLang = headersList.get("accept-language") || "";

  // Detect browser language preference
  if (acceptLang.includes("zh")) redirect("/zh");
  if (acceptLang.includes("en")) redirect("/en");

  // Default: Thai (primary market)
  redirect("/th");
}
