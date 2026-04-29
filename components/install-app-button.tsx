"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Smartphone } from "lucide-react";

import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type InstallAppButtonProps = {
  className?: string;
  compactLabel?: boolean;
};

export function InstallAppButton({ className, compactLabel = false }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isIos = useMemo(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua);
  }, []);

  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    const standaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
    const standaloneNavigator = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return standaloneMedia || standaloneNavigator;
  }, []);

  useEffect(() => {
    setMounted(true);

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setDeferredPrompt(null);
      setShowIosHint(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } finally {
        setIsInstalling(false);
        setDeferredPrompt(null);
      }
      return;
    }

    if (isIos) {
      setShowIosHint((prev) => !prev);
    }
  }

  if (!mounted || isStandalone) {
    return null;
  }

  if (!deferredPrompt && !isIos) {
    return null;
  }

  const label = compactLabel ? "Install" : "Download app";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={cn(
          "hover-rise inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-emerald-300/35 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-10 sm:w-auto sm:py-2",
          className
        )}
      >
        {isIos ? <Smartphone className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        {isInstalling ? "Preparing..." : label}
      </button>

      {showIosHint ? (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-white/20 bg-slate-950/95 p-3 text-xs leading-5 text-slate-200 shadow-xl backdrop-blur">
          <p className="font-semibold text-white">Install on iPhone</p>
          <p className="mt-1">Tap Share in Safari, then choose Add to Home Screen.</p>
        </div>
      ) : null}
    </div>
  );
}
