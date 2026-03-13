"use client";

import { useEffect } from "react";

/**
 * In-app browsers (Facebook, Instagram, TikTok) on Android often hide the
 * focused input behind the keyboard. This scrolls it into view after the
 * keyboard animation settles (~400ms).
 */
export function KeyboardScrollFix() {
  useEffect(() => {
    function onFocusIn(e: FocusEvent) {
      const el = e.target as HTMLElement;
      if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return;
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  return null;
}
