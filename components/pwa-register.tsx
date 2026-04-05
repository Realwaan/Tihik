"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    async function clearDevServiceWorkers() {
      if (!("serviceWorker" in navigator)) {
        return;
      }

      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch (error) {
        console.error("Failed to clear development service worker state", error);
      }
    }

    if (
      process.env.NODE_ENV !== "production"
    ) {
      clearDevServiceWorkers();
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch((error) => {
        console.error("Service worker registration failed", error);
      });
  }, []);

  return null;
}
