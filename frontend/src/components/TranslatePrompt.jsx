import React, { useEffect, useState } from "react";
import "./TranslatePrompt.css";

const STORAGE_KEY = "translatePromptDismissed";

const detectBrowser = () => {
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = isIOS || (/Safari/i.test(ua) && !/Chrome|CriOS|FxiOS/i.test(ua));
  const isFirefox = /Firefox|FxiOS/i.test(ua);
  const isSamsung = /SamsungBrowser/i.test(ua);
  return { isIOS, isSafari, isFirefox, isSamsung };
};

const detectMobile = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

const detectHebrewLikely = () => {
  const langs = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
  return langs.some((l) => l.toLowerCase().startsWith("he"));
};

const getInstruction = (browser) => {
  if (browser.isIOS && browser.isSafari) {
    return 'הקש על "Aa" בסרגל הכתובת ← בחר Translate to Hebrew.';
  }
  if (browser.isIOS) {
    return 'פתח את תפריט הדפדפן (⋯) ← בחר Translate.';
  }
  if (browser.isSamsung) {
    return "הקש על סמל הגלובוס בסרגל הכתובת כדי לתרגם לעברית.";
  }
  if (browser.isFirefox) {
    return "פיירפוקס לא תומך בתרגום מובנה. נסה דפדפן Chrome או Safari.";
  }
  // Chrome / Edge / other Chromium
  return "הקש על תפריט הדפדפן (⋮) ← בחר Translate ← Hebrew.";
};

export default function TranslatePrompt() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [browser, setBrowser] = useState({});

  useEffect(() => {
    // Only on mobile, only if not dismissed before
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // ignore storage errors
    }

    if (!detectMobile()) return;

    setBrowser(detectBrowser());

    // Slight delay to avoid competing with initial paint / other banners
    const delay = detectHebrewLikely() ? 800 : 2500;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const handleClick = () => {
    setExpanded(true);
  };

  if (!visible) return null;

  return (
    <div
      className={`translate-prompt${expanded ? " expanded" : ""}`}
      role="dialog"
      aria-live="polite"
    >
      {!expanded ? (
        <button
          type="button"
          className="translate-prompt-pill"
          onClick={handleClick}
          aria-label="Translate to Hebrew"
        >
          <span className="tp-globe" aria-hidden="true">
            🌐
          </span>
          <span className="tp-label">עברית ▸</span>
        </button>
      ) : (
        <div className="translate-prompt-panel">
          <button
            type="button"
            className="translate-prompt-close"
            onClick={dismiss}
            aria-label="Close"
          >
            ×
          </button>
          <p className="tp-title">תרגום לעברית</p>
          <p className="tp-text">{getInstruction(browser)}</p>
          <button
            type="button"
            className="translate-prompt-dismiss"
            onClick={dismiss}
          >
            הבנתי / Got it
          </button>
        </div>
      )}
    </div>
  );
}
