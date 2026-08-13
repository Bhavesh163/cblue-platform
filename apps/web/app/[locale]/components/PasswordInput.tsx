"use client";

import { useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  locale: string;
};

function visibilityLabel(locale: string, visible: boolean): string {
  if (locale === "th") return visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน";
  if (locale === "zh") return visible ? "隐藏密码" : "显示密码";
  return visible ? "Hide password" : "Show password";
}

export default function PasswordInput({
  locale,
  className = "",
  ...inputProps
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const label = visibilityLabel(locale, visible);

  return (
    <div className="relative">
      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-500 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-600"
      >
        {visible ? (
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.7 5.1A10.9 10.9 0 0 1 12 5c5.5 0 9 5 9 7a8.6 8.6 0 0 1-2 3.4"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.6 6.6C4.4 8.1 3 10.4 3 12c0 2 3.5 7 9 7 1.6 0 3-.4 4.2-1"
            />
          </svg>
        ) : (
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7z"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
