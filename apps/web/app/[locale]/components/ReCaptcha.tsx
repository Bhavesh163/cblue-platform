"use client";

import { useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
        },
      ) => number;
      reset: (widgetId: number) => void;
    };
    onRecaptchaLoad?: () => void;
  }
}

interface ReCaptchaProps {
  onVerify: (token: string) => void;
  onExpire: () => void;
  resetKey?: number;
}

const RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
  "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

export default function ReCaptcha({
  onVerify,
  onExpire,
  resetKey,
}: ReCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const renderedRef = useRef(false);
  const lastResetKeyRef = useRef(resetKey);

  const renderWidget = useCallback(() => {
    if (
      renderedRef.current ||
      !containerRef.current ||
      !window.grecaptcha?.render
    )
      return;
    renderedRef.current = true;
    widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
      sitekey: RECAPTCHA_SITE_KEY,
      callback: onVerify,
      "expired-callback": onExpire,
    });
  }, [onVerify, onExpire]);

  useEffect(() => {
    if (window.grecaptcha?.render) {
      renderWidget();
      return;
    }

    window.onRecaptchaLoad = renderWidget;

    if (!document.querySelector('script[src*="recaptcha/api.js"]')) {
      const script = document.createElement("script");
      script.src =
        "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    return () => {
      window.onRecaptchaLoad = undefined;
    };
  }, [renderWidget]);

  useEffect(() => {
    if (resetKey === undefined || resetKey === lastResetKeyRef.current) {
      return;
    }
    lastResetKeyRef.current = resetKey;
    if (widgetIdRef.current !== null && window.grecaptcha) {
      window.grecaptcha.reset(widgetIdRef.current);
    }
  }, [resetKey]);

  return <div ref={containerRef} />;
}
