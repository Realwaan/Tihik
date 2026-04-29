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
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClerkTopBarVisibility } from "@/components/layout/clerk-top-bar-visibility";
import { InstallAppButton } from "@/components/install-app-button";

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
  const { userId } = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="overflow-x-hidden">
        <ClerkProvider>
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

                      {!userId ? (
                        <>
                        <SignInButton mode="redirect" forceRedirectUrl="/dashboard">
                          <button className="inline-flex h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                            Sign in
                          </button>
                        </SignInButton>
                        <SignUpButton mode="redirect" forceRedirectUrl="/dashboard">
                          <button className="inline-flex h-10 items-center rounded-full bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
                            Sign up
                          </button>
                        </SignUpButton>
                        </>
                      ) : (
                        <UserButton
                          appearance={{
                            elements: {
                              avatarBox: "h-10 w-10",
                            },
                          }}
                        />
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
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
