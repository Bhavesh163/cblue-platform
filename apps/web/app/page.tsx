import { redirect } from "next/navigation";

/**
 * Root page fallback — redirects `/` to default locale `/th`.
 * Primary redirect is handled by next.config.js redirects (framework-level)
 * and next-intl middleware. This page is a static safety net for edge cases
 * where neither fires (e.g., Cloudflare Pages static asset layer).
 */
export default function RootPage() {
  redirect("/th");
}
