"use client";

import { useEffect } from "react";

function isFocusableField(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function KeyboardFocusAssist() {
  useEffect(() => {
    function handleFocusIn(event: FocusEvent) {
      if (!isFocusableField(event.target)) {
        return;
      }

      const target = event.target;
      const type = target instanceof HTMLInputElement ? target.type : "text";
      const delay = type === "date" ? 120 : 80;

      window.setTimeout(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: type === "date" ? "center" : "nearest",
          inline: "nearest",
        });
      }, delay);
    }

    window.addEventListener("focusin", handleFocusIn);
    return () => window.removeEventListener("focusin", handleFocusIn);
  }, []);

  return null;
}
