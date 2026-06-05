"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { LanguageToggle } from "./LanguageToggle";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const t = useTranslations("nav");
  const locale = useLocale();

  const prefix = `/${locale}`;
  const lblueLabel =
    locale === "th" ? "AI กฎหมาย" : locale === "zh" ? "法律 AI" : "Legal AI";

  const navLinks = [
    { href: `${prefix}`, label: t("home") },
    { href: `${prefix}/services`, label: t("services") },
    {
      href: `${prefix}/booking`,
      label: t("projectTeam"),
      children: [
        { href: `${prefix}/booking/household`, label: t("household") },
        { href: `${prefix}/booking/project`, label: t("project") },
        { href: `${prefix}/booking/professional`, label: t("professional") },
      ],
    },
    { href: `${prefix}/properties`, label: t("realEstate") },
    { href: `${prefix}/dashboard`, label: t("dashboard") },
    { href: `${prefix}/fixers`, label: t("forFixers") },
  ];

  return (
    <header data-cblue-header-root className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-sm border-b border-sky-100 transition-[filter,opacity] duration-200 data-[modal-open=true]:blur-sm data-[modal-open=true]:opacity-50 data-[modal-open=true]:pointer-events-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href={`${prefix}`} className="flex items-center gap-2">
            <Image
              src="/images/logo.jpg"
              alt="CBLUE"
              width={95}
              height={36}
              loading="eager"
              className="h-[2.69rem] w-auto object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-auto">
            {navLinks.map((link) =>
              link.children ? (
                <div
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => setDropdownOpen(true)}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <Link
                    href={link.href}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors inline-flex items-center"
                  >
                    {link.label}
                    <svg
                      className={`ml-1 inline-block h-4 w-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </Link>
                  {dropdownOpen && (
                    <div className="absolute left-0 top-full w-56 z-50 pt-1">
                      <div className="rounded-lg bg-white shadow-lg ring-1 ring-gray-200 py-1">
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setDropdownOpen(false)}
                            className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-sky-50 hover:text-sky-600"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          {/* Language Toggle + CTA + Mobile toggle */}
          <div className="flex items-center gap-2">
            <a
              href="https://www.lblue.tech"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Lblue ${lblueLabel}`}
              className="hidden sm:flex h-14 min-w-[74px] flex-col items-center justify-center rounded-lg px-2 text-[10px] font-semibold leading-none text-gray-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
            >
              <Image
                src="/images/lblue-og-image.png"
                alt="Lblue"
                width={78}
                height={42}
                className="h-7 w-auto max-w-[66px] object-contain"
              />
              <span className="mt-0.5 whitespace-nowrap">{lblueLabel}</span>
            </a>
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>
            <Link
              href={`${prefix}/booking/household`}
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
            >
              {t("bookNow")}
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pb-4 pt-2">
          {navLinks.map((link) =>
            link.children ? (
              <div key={link.href}>
                <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {link.label}
                </p>
                {link.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-sky-50 rounded-lg"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-sky-50 rounded-lg"
              >
                {link.label}
              </Link>
            ),
          )}
          <a
            href="https://www.lblue.tech"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-sky-50"
          >
            <Image
              src="/images/lblue-og-image.png"
              alt="Lblue"
              width={78}
              height={42}
              className="h-8 w-auto object-contain"
            />
            <span>{lblueLabel}</span>
          </a>
          <div className="mt-2 px-3 py-2">
            <LanguageToggle />
          </div>
          <Link
            href={`${prefix}/booking/household`}
            onClick={() => setMobileOpen(false)}
            className="mt-2 block w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-lg"
          >
            {t("bookNow")}
          </Link>
        </div>
      )}
    </header>
  );
}
