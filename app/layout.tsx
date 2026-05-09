import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { AiAssistantWidget } from "@/components/ai-assistant-widget";
import { ToastProvider } from "@/components/toast-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import { KeyboardFocusAssist } from "@/components/keyboard-focus-assist";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { auth } from "@/auth";
import { SignInButton, SignUpButton } from "@/components/auth-buttons";
import { ClerkTopBarVisibility } from "@/components/layout/clerk-top-bar-visibility";
import { InstallAppButton } from "@/components/install-app-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfilePopupForm } from "@/components/profile-popup-form";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export const metadata: Metadata = {
  title: "TrackIt",
  description: "Expense tracking application",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TrackIt",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="overflow-x-hidden">
        <ThemeProvider>
          <ToastProvider>
            <PwaRegister />
            <KeyboardFocusAssist />

            <ClerkTopBarVisibility>
              <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                  <Link
                    href="/"
                    className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400"
                  >
                    TrackIt
                  </Link>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <InstallAppButton
                      compactLabel
                      className="hidden border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 sm:inline-flex"
                    />
                    <ThemeToggle />

                    {isAuthenticated ? (
                      <>
                        <ProfilePopupForm
                          initialName={session?.user?.name}
                          initialEmail={session?.user?.email}
                        />
                      </>
                    ) : (
                      <>
                        <SignInButton />
                        <SignUpButton className="hidden sm:inline-flex bg-slate-900 border-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900 dark:hover:bg-slate-200" />
                      </>
                    )}
                  </div>
                </div>
              </header>
            </ClerkTopBarVisibility>

            {children}
            <AiAssistantWidget />
            <SpeedInsights />
          </ToastProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
