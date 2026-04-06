"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

export function Footer() {
  const t = useTranslations();
  const locale = useLocale();
  const prefix = `/${locale}`;

  const footerLinks = {
    services: [
      { label: t("services.plumbing"), href: `${prefix}/services#plumbing` },
      { label: t("services.electrical"), href: `${prefix}/services#electrical` },
      { label: t("services.ac"), href: `${prefix}/services#ac` },
      { label: t("services.interior"), href: `${prefix}/services#interior` },
      { label: t("services.landscaping"), href: `${prefix}/services#landscaping` },
    ],
    company: [
      { label: t("footer.about"), href: `${prefix}/about` },
      { label: t("nav.services"), href: `${prefix}/services` },
      { label: t("nav.forFixers"), href: `${prefix}/fixers/register` },
      { label: t("footer.contact"), href: `${prefix}/contact` },
    ],
    support: [
      { label: t("booking.terms"), href: `${prefix}/terms` },
      { label: t("booking.privacy"), href: `${prefix}/privacy` },
    ],
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold">C</span>
              </div>
              <span className="text-lg font-bold text-white">CBLUE.co.th</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t("home.heroDesc")}
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {t("nav.services")}
            </h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {t("footer.company")}
            </h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Real Estate */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {t("nav.realEstate")}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href={`${prefix}/properties`} className="text-sm hover:text-white transition-colors">
                  {t("realEstate.searchProperty")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/properties/register`} className="text-sm hover:text-white transition-colors">
                  {t("realEstate.listProperty")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} CBLUE Co., Ltd. {t("footer.allRights")}
          </p>
          <div className="flex gap-4">
            <a href="https://cblue.co.th" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-white">
              cblue.co.th
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
