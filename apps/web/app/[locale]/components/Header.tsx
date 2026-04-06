"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { LanguageToggle } from "./LanguageToggle";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const t = useTranslations("nav");
  const locale = useLocale();

  const prefix = `/${locale}`;

  const navLinks = [
    { href: `${prefix}`, label: t("home") },
    { href: `${prefix}/services`, label: t("services") },
    {
      href: `${prefix}/booking`,
      label: t("projectTeam"),
      children: [
        { href: `${prefix}/booking/household`, label: t("household") },
        { href: `${prefix}/booking/project`, label: t("project") },
      ],
    },
    { href: `${prefix}/fixers/register`, label: t("forFixers") },
    { href: `${prefix}/properties`, label: t("realEstate") },
    { href: `${prefix}/dashboard`, label: t("dashboard") },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={`${prefix}`} className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-blue-700 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              CBLUE<span className="text-blue-600">.co.th</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) =>
              link.children ? (
                <div key={link.href} className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    {link.label}
                    <svg
                      className="ml-1 inline-block h-4 w-4"
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
                  </button>
                  {dropdownOpen && (
                    <div className="absolute left-0 mt-1 w-56 rounded-lg bg-white shadow-lg ring-1 ring-gray-200 py-1">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* Language Toggle + CTA + Mobile toggle */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>
            <Link
              href={`${prefix}/booking/household`}
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
            >
              {t("bookNow")}
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
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
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-lg"
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
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 rounded-lg"
              >
                {link.label}
              </Link>
            )
          )}
          <div className="mt-2 px-3 py-2">
            <LanguageToggle />
          </div>
          <Link
            href={`${prefix}/booking/household`}
            onClick={() => setMobileOpen(false)}
            className="mt-2 block w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg"
          >
            {t("bookNow")}
          </Link>
        </div>
      )}
    </header>
  );
}
